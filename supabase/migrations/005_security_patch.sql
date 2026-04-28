-- ============================================================
-- Wakeboard — Security patch (audit fixes)
-- ============================================================

-- #1 CRITICAL: prevent users from changing their own role.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'role_change_forbidden';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_role ON public.profiles;
CREATE TRIGGER profiles_protect_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- #2 HIGH: allow authenticated users to read all profiles (so the
-- slot-card initials feature works for everyone, not just admins).
DROP POLICY IF EXISTS profiles_self_read          ON public.profiles;
DROP POLICY IF EXISTS profiles_authenticated_read ON public.profiles;
CREATE POLICY profiles_authenticated_read ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- #3 HIGH: HTML-escape full_name in email content to prevent injection.
CREATE OR REPLACE FUNCTION public.html_escape(s TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(replace(replace(COALESCE(s,''),
    '&', '&amp;'),
    '<', '&lt;'),
    '>', '&gt;'),
    '"', '&quot;'),
    '''', '&#39;');
$$;

CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg          public.private_config;
  members_text TEXT;
  subject      TEXT;
  body_html    TEXT;
BEGIN
  SELECT * INTO cfg FROM public.private_config WHERE id = 1;
  IF NOT cfg.events_enabled OR cfg.notify_email IS NULL OR cfg.resend_api_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'pending'   AND NEW.status = 'confirmed') OR
    (OLD.status = 'confirmed' AND NEW.status = 'full')      OR
    (OLD.status IN ('confirmed','full') AND NEW.status = 'cancelled')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT string_agg(public.html_escape(p.full_name), ', ') INTO members_text
    FROM public.booking_members bm
    JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.booking_id = NEW.id;

  IF NEW.status = 'confirmed' THEN
    subject := format('Slot confirmed: %s %s · %s',
                      NEW.date, NEW.period, to_char(NEW.start_time, 'HH24:MI'));
    body_html := format(
      '<h2 style="font-family:system-ui;color:#14305f">Wakeboard slot is on</h2>
       <p style="font-family:system-ui"><b>%s</b> · <b>%s</b> · <b>%s — %s</b></p>
       <p style="font-family:system-ui">Crew (%s/4): %s</p>',
      NEW.date, NEW.period,
      to_char(NEW.start_time, 'HH24:MI'),
      to_char(NEW.end_time,   'HH24:MI'),
      NEW.member_count,
      COALESCE(members_text, '—'));
  ELSIF NEW.status = 'full' THEN
    subject := format('Slot full (4/4): %s %s · %s',
                      NEW.date, NEW.period, to_char(NEW.start_time, 'HH24:MI'));
    body_html := format(
      '<h2 style="font-family:system-ui;color:#14305f">Slot reached capacity</h2>
       <p style="font-family:system-ui"><b>%s</b> · <b>%s</b> · <b>%s — %s</b></p>
       <p style="font-family:system-ui">Crew: %s</p>',
      NEW.date, NEW.period,
      to_char(NEW.start_time, 'HH24:MI'),
      to_char(NEW.end_time,   'HH24:MI'),
      COALESCE(members_text, '—'));
  ELSE
    subject := format('Slot cancelled: %s %s · %s',
                      NEW.date, NEW.period, to_char(NEW.start_time, 'HH24:MI'));
    body_html := format(
      '<h2 style="font-family:system-ui;color:#dc2626">Slot was cancelled</h2>
       <p style="font-family:system-ui">The %s slot at %s on %s has been cancelled.</p>',
      NEW.period, to_char(NEW.start_time, 'HH24:MI'), NEW.date);
  END IF;

  PERFORM net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cfg.resend_api_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'from',    cfg.notify_from_email,
      'to',      jsonb_build_array(cfg.notify_email),
      'subject', subject,
      'html',    body_html
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_daily_digest()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg           public.private_config;
  tomorrow      DATE;
  bookings_html TEXT := '';
  rec           RECORD;
BEGIN
  SELECT * INTO cfg FROM public.private_config WHERE id = 1;
  IF NOT cfg.digest_enabled OR cfg.notify_email IS NULL OR cfg.resend_api_key IS NULL THEN
    RETURN;
  END IF;

  tomorrow := (now() AT TIME ZONE 'Europe/Zurich')::date + 1;

  FOR rec IN
    SELECT b.id, b.period, b.start_time, b.end_time, b.member_count, b.status,
           (SELECT string_agg(public.html_escape(p.full_name), ', ')
              FROM public.booking_members bm
              JOIN public.profiles p ON p.id = bm.user_id
              WHERE bm.booking_id = b.id) AS members_text
      FROM public.bookings b
     WHERE b.date = tomorrow
       AND b.status IN ('confirmed','full')
     ORDER BY b.start_time
  LOOP
    bookings_html := bookings_html || format(
      '<li style="margin:6px 0"><b>%s [%s]</b> · %s/4 · %s</li>',
      to_char(rec.start_time, 'HH24:MI') || '–' || to_char(rec.end_time, 'HH24:MI'),
      rec.period, rec.member_count, COALESCE(rec.members_text, '—')
    );
  END LOOP;

  IF bookings_html = '' THEN
    bookings_html := '<p style="font-family:system-ui;color:#64748b"><i>No confirmed sessions tomorrow.</i></p>';
  ELSE
    bookings_html := '<ul style="font-family:system-ui;list-style:none;padding-left:0">' || bookings_html || '</ul>';
  END IF;

  PERFORM net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cfg.resend_api_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'from',    cfg.notify_from_email,
      'to',      jsonb_build_array(cfg.notify_email),
      'subject', format('Wakeboard schedule · %s', to_char(tomorrow, 'Dy DD Mon')),
      'html',    format(
        '<h2 style="font-family:system-ui;color:#14305f">Tomorrow''s sessions</h2>
         <p style="font-family:system-ui;color:#64748b">%s</p>%s',
        tomorrow, bookings_html)
    )
  );
END;
$$;

-- #5 MEDIUM: revoke digest RPC from rank-and-file users; expose
-- an admin-gated wrapper for the "Send test digest" button.
REVOKE EXECUTE ON FUNCTION public.send_daily_digest() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_daily_digest() FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_send_daily_digest()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM public.send_daily_digest();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_send_daily_digest() TO authenticated;
