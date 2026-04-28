-- ============================================================
-- Wakeboard Booking — Email notifications via Resend + pg_net
-- ============================================================
-- Notifies the club's notify_email when:
--   (a) a slot crystallizes (pending -> confirmed)
--   (b) a confirmed slot reaches capacity (confirmed -> full)
--   (c) a confirmed/full slot is cancelled
-- Plus a daily digest of tomorrow's confirmed sessions at 17:00 UTC.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- Private config: API key + notify email, RLS-locked to admins.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.private_config (
  id                INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notify_email      TEXT,
  resend_api_key    TEXT,
  notify_from_email TEXT NOT NULL DEFAULT 'onboarding@resend.dev',
  digest_enabled    BOOLEAN NOT NULL DEFAULT true,
  events_enabled    BOOLEAN NOT NULL DEFAULT true,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.private_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.private_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY private_config_admin_all ON public.private_config
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- Per-event notification trigger
-- ------------------------------------------------------------
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

  -- Trigger only on meaningful transitions:
  IF NOT (
    (OLD.status = 'pending'   AND NEW.status = 'confirmed') OR
    (OLD.status = 'confirmed' AND NEW.status = 'full')      OR
    (OLD.status IN ('confirmed','full') AND NEW.status = 'cancelled')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT string_agg(p.full_name, ', ') INTO members_text
    FROM public.booking_members bm
    JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.booking_id = NEW.id;

  IF NEW.status = 'confirmed' THEN
    subject := format('🌊 Slot confirmed: %s %s · %s',
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
    subject := format('🌊 Slot full (4/4): %s %s · %s',
                      NEW.date, NEW.period, to_char(NEW.start_time, 'HH24:MI'));
    body_html := format(
      '<h2 style="font-family:system-ui;color:#14305f">Slot reached capacity</h2>
       <p style="font-family:system-ui"><b>%s</b> · <b>%s</b> · <b>%s — %s</b></p>
       <p style="font-family:system-ui">Crew: %s</p>',
      NEW.date, NEW.period,
      to_char(NEW.start_time, 'HH24:MI'),
      to_char(NEW.end_time,   'HH24:MI'),
      COALESCE(members_text, '—'));
  ELSE -- cancelled
    subject := format('⚠️ Slot cancelled: %s %s · %s',
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

DROP TRIGGER IF EXISTS bookings_notify_change ON public.bookings;
CREATE TRIGGER bookings_notify_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

-- ------------------------------------------------------------
-- Daily digest: tomorrow's confirmed sessions
-- ------------------------------------------------------------
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
           (SELECT string_agg(p.full_name, ', ')
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
      'subject', format('🌊 Wakeboard schedule · %s', to_char(tomorrow, 'Dy DD Mon')),
      'html',    format(
        '<h2 style="font-family:system-ui;color:#14305f">Tomorrow''s sessions</h2>
         <p style="font-family:system-ui;color:#64748b">%s</p>%s',
        tomorrow, bookings_html)
    )
  );
END;
$$;

-- 17:00 UTC = 18:00 CET / 19:00 CEST
SELECT cron.unschedule('wakeboard_daily_digest') WHERE EXISTS
  (SELECT 1 FROM cron.job WHERE jobname = 'wakeboard_daily_digest');
SELECT cron.schedule(
  'wakeboard_daily_digest',
  '0 17 * * *',
  $$ SELECT public.send_daily_digest(); $$
);

GRANT EXECUTE ON FUNCTION public.send_daily_digest() TO authenticated;
