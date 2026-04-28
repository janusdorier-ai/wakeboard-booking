-- ============================================================
-- Wakeboard Booking — Transactional booking functions
-- ============================================================

-- Returns the duration (minutes) for a slot of N members per club_config.
CREATE OR REPLACE FUNCTION public.duration_for(member_count INT)
RETURNS INT LANGUAGE plpgsql STABLE AS $$
DECLARE
  cfg public.club_config;
BEGIN
  SELECT * INTO cfg FROM public.club_config WHERE id = 1;
  RETURN CASE
    WHEN member_count <= 1 THEN cfg.duration_2_minutes  -- pending solo claims a 2-person slot worth of room
    WHEN member_count = 2 THEN cfg.duration_2_minutes
    WHEN member_count = 3 THEN cfg.duration_3_minutes
    ELSE                       cfg.duration_4_minutes
  END;
END;
$$;

-- Window of a period (AM or PM) for a given date, considering overrides.
-- Returns NULL,NULL if the period is closed.
CREATE OR REPLACE FUNCTION public.period_window(p_date DATE, p_period TEXT)
RETURNS TABLE(window_start TIME, window_end TIME)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  cfg public.club_config;
  ovr public.day_overrides;
  is_open BOOLEAN := TRUE;
BEGIN
  SELECT * INTO cfg FROM public.club_config WHERE id = 1;
  SELECT * INTO ovr FROM public.day_overrides WHERE date = p_date;
  IF FOUND THEN
    is_open := CASE WHEN p_period = 'AM' THEN ovr.am_open ELSE ovr.pm_open END;
  END IF;
  IF NOT is_open THEN
    RETURN;
  END IF;
  IF p_period = 'AM' THEN
    window_start := cfg.am_start; window_end := cfg.am_end;
  ELSE
    window_start := cfg.pm_start; window_end := cfg.pm_end;
  END IF;
  RETURN NEXT;
END;
$$;

-- Core: join a booking at p_start_time, or create a new one if none exists there.
-- Enforces cluster gap, overlap, group-size, period window, and one-booking-per-period rules.
-- All work happens in a single transaction with FOR UPDATE locking.
CREATE OR REPLACE FUNCTION public.join_or_create_booking(
  p_date       DATE,
  p_period     TEXT,
  p_start_time TIME
) RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid             UUID := auth.uid();
  cfg             public.club_config;
  win_start       TIME;
  win_end         TIME;
  existing        public.bookings;
  new_count       INT;
  new_end         TIME;
  cluster_min     TIME;
  cluster_max     TIME;
  rec             RECORD;
  conflict_id     UUID;
  period_start_ts TIMESTAMPTZ;
  enforce_cluster BOOLEAN;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_period NOT IN ('AM','PM') THEN RAISE EXCEPTION 'invalid_period'; END IF;

  SELECT * INTO cfg FROM public.club_config WHERE id = 1;

  -- Check period is open today and start_time is inside the window
  SELECT pw.window_start, pw.window_end INTO win_start, win_end
    FROM public.period_window(p_date, p_period) pw;
  IF win_start IS NULL THEN RAISE EXCEPTION 'period_closed'; END IF;
  IF p_start_time < win_start OR p_start_time >= win_end THEN
    RAISE EXCEPTION 'outside_window';
  END IF;

  -- Cluster lock-in: only enforce the cluster rule once we're within
  -- cluster_lockin_hours of the period start. Earlier than that, any slot is fair game.
  period_start_ts := (p_date + win_start) AT TIME ZONE current_setting('TIMEZONE');
  enforce_cluster := (period_start_ts - now()) <= (cfg.cluster_lockin_hours || ' hours')::INTERVAL;

  -- Lock all active bookings for this (date, period) so we serialize concurrent joiners.
  PERFORM 1 FROM public.bookings
    WHERE date = p_date AND period = p_period AND status <> 'cancelled'
    FOR UPDATE;

  -- (Doodle-style: a waker can hold many slots in the same period as long as
  -- they don't time-overlap. Per-slot membership is still unique — see below.)

  -- Cluster bounds across all active bookings in this (date, period)
  SELECT MIN(start_time), MAX(end_time) INTO cluster_min, cluster_max
    FROM public.bookings
    WHERE date = p_date AND period = p_period AND status <> 'cancelled';

  -- Try to load an existing booking at exact start_time
  SELECT * INTO existing
    FROM public.bookings
    WHERE date = p_date AND period = p_period AND start_time = p_start_time
      AND status <> 'cancelled'
    FOR UPDATE;

  IF FOUND THEN
    -- JOIN PATH ------------------------------------------------
    IF EXISTS (SELECT 1 FROM public.booking_members
               WHERE booking_id = existing.id AND user_id = uid) THEN
      RAISE EXCEPTION 'already_in_this_slot';
    END IF;

    IF existing.member_count >= 4 THEN RAISE EXCEPTION 'slot_full'; END IF;

    new_count := existing.member_count + 1;
    new_end   := existing.start_time + (public.duration_for(new_count) || ' minutes')::INTERVAL;

    -- The new (extended) end_time must not overlap a later booking, and must fit window.
    IF new_end > win_end THEN RAISE EXCEPTION 'overflows_window'; END IF;

    SELECT id INTO conflict_id FROM public.bookings
      WHERE date = p_date AND period = p_period AND status <> 'cancelled'
        AND id <> existing.id
        AND start_time < new_end
        AND start_time >= existing.start_time
      LIMIT 1;
    IF conflict_id IS NOT NULL THEN RAISE EXCEPTION 'extension_conflicts'; END IF;

    -- Block waker from joining a slot that time-overlaps another of their bookings.
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.booking_members bm ON bm.booking_id = b.id
      WHERE bm.user_id = uid
        AND b.date = p_date AND b.period = p_period
        AND b.status <> 'cancelled'
        AND b.id <> existing.id
        AND b.start_time < new_end
        AND b.end_time   > existing.start_time
    ) THEN
      RAISE EXCEPTION 'overlaps_your_other_slot';
    END IF;

    INSERT INTO public.booking_members (booking_id, user_id) VALUES (existing.id, uid);

    UPDATE public.bookings
      SET member_count = new_count,
          end_time     = new_end,
          status       = CASE WHEN new_count >= 4 THEN 'full'
                              WHEN new_count >= 2 THEN 'confirmed'
                              ELSE 'pending' END,
          updated_at   = now()
      WHERE id = existing.id
      RETURNING * INTO existing;

    RETURN existing;
  END IF;

  -- CREATE PATH ------------------------------------------------
  -- Cluster check: if cluster exists AND we're inside the lock-in window,
  -- the new slot must be within gap of it.
  IF enforce_cluster AND cluster_min IS NOT NULL THEN
    IF p_start_time < cluster_min - (cfg.cluster_gap_minutes || ' minutes')::INTERVAL
       OR p_start_time > cluster_max + (cfg.cluster_gap_minutes || ' minutes')::INTERVAL THEN
      RAISE EXCEPTION 'outside_cluster';
    END IF;
  END IF;

  new_end := p_start_time + (public.duration_for(1) || ' minutes')::INTERVAL;
  IF new_end > win_end THEN RAISE EXCEPTION 'overflows_window'; END IF;

  -- Overlap check: candidate [start, end) must not intersect any existing booking [b.start, b.end)
  FOR rec IN
    SELECT start_time, end_time FROM public.bookings
    WHERE date = p_date AND period = p_period AND status <> 'cancelled'
  LOOP
    IF p_start_time < rec.end_time AND new_end > rec.start_time THEN
      RAISE EXCEPTION 'overlaps_existing';
    END IF;
  END LOOP;

  -- Block waker from creating a slot that time-overlaps another of their bookings.
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.booking_members bm ON bm.booking_id = b.id
    WHERE bm.user_id = uid
      AND b.date = p_date AND b.period = p_period
      AND b.status <> 'cancelled'
      AND b.start_time < new_end
      AND b.end_time   > p_start_time
  ) THEN
    RAISE EXCEPTION 'overlaps_your_other_slot';
  END IF;

  INSERT INTO public.bookings (date, period, start_time, end_time, member_count, status)
    VALUES (p_date, p_period, p_start_time, new_end, 1, 'pending')
    RETURNING * INTO existing;

  INSERT INTO public.booking_members (booking_id, user_id) VALUES (existing.id, uid);

  RETURN existing;
END;
$$;

-- Leave a booking. If user was the last member, the booking is cancelled.
-- Otherwise, the slot shrinks to the duration for (count-1) members.
CREATE OR REPLACE FUNCTION public.leave_booking(p_booking_id UUID)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid       UUID := auth.uid();
  bk        public.bookings;
  new_count INT;
  new_end   TIME;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO bk FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;

  DELETE FROM public.booking_members
    WHERE booking_id = p_booking_id AND user_id = uid
    RETURNING 1 INTO new_count; -- using new_count as a found-flag here
  IF new_count IS NULL THEN RAISE EXCEPTION 'not_a_member'; END IF;

  new_count := bk.member_count - 1;

  IF new_count <= 0 THEN
    UPDATE public.bookings SET status = 'cancelled', member_count = 0, updated_at = now()
      WHERE id = p_booking_id RETURNING * INTO bk;
    RETURN bk;
  END IF;

  new_end := bk.start_time + (public.duration_for(new_count) || ' minutes')::INTERVAL;

  UPDATE public.bookings
    SET member_count = new_count,
        end_time     = new_end,
        status       = CASE WHEN new_count >= 4 THEN 'full'
                            WHEN new_count >= 2 THEN 'confirmed'
                            ELSE 'pending' END,
        updated_at   = now()
    WHERE id = p_booking_id
    RETURNING * INTO bk;

  RETURN bk;
END;
$$;

-- Admin can cancel any booking outright.
CREATE OR REPLACE FUNCTION public.admin_cancel_booking(p_booking_id UUID)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bk public.bookings;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.bookings SET status = 'cancelled', updated_at = now()
    WHERE id = p_booking_id RETURNING * INTO bk;
  RETURN bk;
END;
$$;

-- Auto-release stale solo (1-member) pending bookings older than club_config.solo_timeout_hours.
-- Schedule with pg_cron (see 003_cron.sql).
CREATE OR REPLACE FUNCTION public.release_stale_pending()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg public.club_config;
  released INT;
BEGIN
  SELECT * INTO cfg FROM public.club_config WHERE id = 1;
  WITH stale AS (
    UPDATE public.bookings
       SET status = 'cancelled', updated_at = now()
     WHERE status = 'pending'
       AND member_count = 1
       AND created_at < now() - (cfg.solo_timeout_hours || ' hours')::INTERVAL
     RETURNING id
  )
  SELECT COUNT(*) INTO released FROM stale;
  RETURN released;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_or_create_booking(DATE, TEXT, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duration_for(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.period_window(DATE, TEXT) TO authenticated;
