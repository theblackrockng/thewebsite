-- Lightweight guesthouse-only staff: name + hashed PIN, no email, no auth account.
-- Independent from staff_profiles; used to gate Guest House actions on the Front Desk.
-- PIN hashes are never exposed to the browser; all access via service-role API routes.
CREATE TABLE IF NOT EXISTS guesthouse_staff (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  pin_hash   text        NOT NULL,
  pin_salt   text        NOT NULL,
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guesthouse_staff ENABLE ROW LEVEL SECURITY;
