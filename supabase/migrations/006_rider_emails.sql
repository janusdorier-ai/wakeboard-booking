-- ============================================================
-- Wakeboard — Rider confirmation emails (006)
-- Slot notifications now go to Jenny AND every rider in the slot.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg          public.private_config;
  members_text TEXT;
  subject      TEXT;
  body_html    TEXT;
  all_emails   JSONB;
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

  -- Crew names for the email body
  SELECT string_agg(public.html_escape(p.full_name), ', ') INTO members_text
    FROM public.booking_members bm
    JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.booking_id = NEW.id;

  -- Recipient list: Jenny + every rider in the slot (UNION deduplicates)
  SELECT jsonb_agg(email) INTO all_emails
    FROM (
      SELECT cfg.notify_email AS email
      UNION
      SELECT au.email
        FROM auth.users au
        JOIN public.booking_members bm ON bm.user_id = au.id
        WHERE bm.booking_id = NEW.id
          AND au.email IS NOT NULL
    ) t;

  IF NEW.status = 'confirmed' THEN
    subject := format('Session confirmed: %s %s · %s',
                      NEW.date, NEW.period, to_char(NEW.start_time, 'HH24:MI'));
    body_html := format(
      '<h2 style="font-family:system-ui;color:#14305f">Your wakeboard session is on!</h2>
       <p style="font-family:system-ui"><b>%s</b> &nbsp;·&nbsp; <b>%s</b> &nbsp;·&nbsp; <b>%s — %s</b></p>
       <p style="font-family:system-ui">Crew (%s/4): <b>%s</b></p>
       <p style="font-family:system-ui;color:#64748b;font-size:13px">
         Session confirmed — more riders can still join before it starts.
       </p>',
      NEW.date, NEW.period,
      to_char(NEW.start_time, 'HH24:MI'),
      to_char(NEW.end_time,   'HH24:MI'),
      NEW.member_count,
      COALESCE(members_text, '—'));

  ELSIF NEW.status = 'full' THEN
    subject := format('Crew complete (4/4): %s %s · %s',
                      NEW.date, NEW.period, to_char(NEW.start_time, 'HH24:MI'));
    body_html := format(
      '<h2 style="font-family:system-ui;color:#14305f">Full crew!</h2>
       <p style="font-family:system-ui"><b>%s</b> &nbsp;·&nbsp; <b>%s</b> &nbsp;·&nbsp; <b>%s — %s</b></p>
       <p style="font-family:system-ui">Crew: <b>%s</b></p>',
      NEW.date, NEW.period,
      to_char(NEW.start_time, 'HH24:MI'),
      to_char(NEW.end_time,   'HH24:MI'),
      COALESCE(members_text, '—'));

  ELSE -- cancelled
    subject := format('Session cancelled: %s %s · %s',
                      NEW.date, NEW.period, to_char(NEW.start_time, 'HH24:MI'));
    body_html := format(
      '<h2 style="font-family:system-ui;color:#dc2626">Session cancelled</h2>
       <p style="font-family:system-ui">
         The <b>%s</b> session at <b>%s</b> on <b>%s</b> has been cancelled.
       </p>',
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
      'to',      COALESCE(all_emails, jsonb_build_array(cfg.notify_email)),
      'subject', subject,
      'html',    body_html
    )
  );

  RETURN NEW;
END;
$$;
