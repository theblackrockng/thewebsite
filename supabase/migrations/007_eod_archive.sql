-- EOD archive: one row per report date, snapshot stored as JSONB.
-- Written by the 6am cron (Phase 4). Phase 3 reads from here first, then
-- falls back to live computation when no snapshot exists for the requested date.
--
-- Run this in the Supabase SQL Editor. Review each statement before running.
--
-- Pre-check:
--   select table_name from information_schema.tables
--    where table_schema = 'public' and table_name = 'eod_archives';

CREATE TABLE IF NOT EXISTS public.eod_archives (
  report_date  date        PRIMARY KEY,
  snapshot     jsonb       NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   text
);

ALTER TABLE public.eod_archives ENABLE ROW LEVEL SECURITY;
-- No policies defined → anon/authenticated roles have no access.
-- Only service_role (used by the EOD cron and the front-desk API) can read/write.

COMMENT ON TABLE public.eod_archives IS
  'One frozen EOD snapshot per date, written by the 6am cron. Contains sections, items, totals, and the orders/bookings that fed them.';
