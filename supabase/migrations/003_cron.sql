-- ============================================================
-- pg_cron: hourly auto-release of stale pending solo bookings
-- ============================================================
-- Requires: enable the pg_cron extension via Database > Extensions in Supabase.

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'wakeboard_release_stale_pending',
  '17 * * * *',  -- every hour at :17
  $$ SELECT public.release_stale_pending(); $$
);
