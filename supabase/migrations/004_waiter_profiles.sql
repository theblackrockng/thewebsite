-- Lightweight shift-attribution: names + hashed PINs for per-shift waiter identity.
-- PIN hashes are never exposed to the browser; all access via service-role API routes.
CREATE TABLE IF NOT EXISTS waiter_profiles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  pin_hash   text        NOT NULL,
  pin_salt   text        NOT NULL,
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Block all direct browser (anon/authenticated) access.
-- Only the service-role key (used in API routes) can read or write this table.
ALTER TABLE waiter_profiles ENABLE ROW LEVEL SECURITY;
