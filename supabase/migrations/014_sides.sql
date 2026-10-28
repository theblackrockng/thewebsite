-- 014_sides.sql
-- Console-managed sides: a `sides` table the console can CRUD, plus a per-dish
-- `has_sides` toggle on menu_items so any dish can be marked as side-eligible
-- without a code change. The four ordering surfaces (Order.jsx, OrderPreview.jsx,
-- WaiterOrder.jsx, Reservations.jsx via OrderPreview re-export) fetch active
-- sides from this table at mount and fall back to a static trio on failure.

CREATE TABLE IF NOT EXISTS public.sides (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  price       integer     NOT NULL CHECK (price >= 0),
  active      boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sides ENABLE ROW LEVEL SECURITY;
-- No policies defined → anon/authenticated roles have no access.
-- Service-role (used by the console with Bearer session) can read/write.
-- Console client reads/writes via the anon key but is gated by super_admin/manager
-- route guard; we grant the needed SELECT policy for authenticated staff below.

CREATE POLICY sides_select_authenticated
  ON public.sides
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed with the current hard-coded trio so nothing changes for the customer
-- the moment the migration runs. Prices in NGN (no kobo), matching the rest of
-- the schema.
INSERT INTO public.sides (name, price, sort_order) VALUES
  ('White Rice',    5000, 1),
  ('Yam Fries',     3000, 2),
  ('Potato Fries',  3000, 3)
ON CONFLICT (name) DO NOTHING;

-- Per-dish toggle. Default false so a dish only shows a side picker if the
-- Menu Management edit panel explicitly turns it on.
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS has_sides boolean NOT NULL DEFAULT false;

-- Preserve current behaviour: Charcoal Grills, Continental and Bush Bar Kitchen
-- dishes all show a side picker today (hard-coded `isGrill` branch in the
-- ordering surfaces). Flip the flag on so the DB-driven picker matches.
UPDATE public.menu_items
   SET has_sides = true
 WHERE category IN ('Charcoal Grills', 'Continental', 'Bush Bar Kitchen');
