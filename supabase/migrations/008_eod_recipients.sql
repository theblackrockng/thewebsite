-- EOD recipients: who gets the 6am EOD email + Telegram.
-- Managed from the console (Settings → EOD Recipients). RLS allows read/write
-- for authenticated staff with role super_admin/manager; cron reads via
-- service-role (bypasses RLS).
--
-- Pre-check:
--   select table_name from information_schema.tables
--    where table_schema = 'public' and table_name = 'eod_recipients';

CREATE TABLE IF NOT EXISTS public.eod_recipients (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text        NOT NULL CHECK (kind IN ('email', 'telegram')),
  value      text        NOT NULL,
  label      text,
  phone      text,
  mode       text        NOT NULL DEFAULT 'full' CHECK (mode IN ('full', 'kitchen')),
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  UNIQUE (kind, value)
);

ALTER TABLE public.eod_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eod_recipients_read  ON public.eod_recipients;
DROP POLICY IF EXISTS eod_recipients_write ON public.eod_recipients;

CREATE POLICY eod_recipients_read ON public.eod_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
       WHERE sp.id = auth.uid()
         AND sp.active = true
         AND sp.role IN ('super_admin', 'manager')
    )
  );

CREATE POLICY eod_recipients_write ON public.eod_recipients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
       WHERE sp.id = auth.uid()
         AND sp.active = true
         AND sp.role IN ('super_admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
       WHERE sp.id = auth.uid()
         AND sp.active = true
         AND sp.role IN ('super_admin', 'manager')
    )
  );

COMMENT ON TABLE public.eod_recipients IS
  'Recipients of the 6am EOD. kind=email|telegram, mode=full|kitchen. Managed from the console.';

INSERT INTO public.eod_recipients (kind, value, label, mode, active)
VALUES
  ('email', 'luchijudith35@gmail.com', 'Manager',   'full', true),
  ('email', 'theblaaqcheff@gmail.com', 'Head Chef', 'full', true)
ON CONFLICT (kind, value) DO NOTHING;
