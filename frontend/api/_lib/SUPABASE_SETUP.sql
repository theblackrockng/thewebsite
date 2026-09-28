-- ─────────────────────────────────────────────────────────────
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Email tracking columns on the reservations table
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_sent     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS day_of_sent       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS thankyou_sent     BOOLEAN DEFAULT FALSE;

-- 2. Website theme table (for Settings → Website Theme in the admin console)
CREATE TABLE IF NOT EXISTS site_theme (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  burgundy      TEXT DEFAULT '#7a1c1c',
  burgundy_deep TEXT DEFAULT '#5c1515',
  gold          TEXT DEFAULT '#c8a96e',
  gold_light    TEXT DEFAULT '#f7f0e3',
  charcoal      TEXT DEFAULT '#1a1614',
  charcoal_soft TEXT DEFAULT '#221e1b',
  warm_white    TEXT DEFAULT '#f5f0e8',
  muted         TEXT DEFAULT '#9c8e7a',
  font_heading  TEXT DEFAULT 'Cormorant Garamond',
  font_body     TEXT DEFAULT 'Montserrat',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one row ever exists
INSERT INTO site_theme (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Enable Realtime for live theme updates
ALTER PUBLICATION supabase_realtime ADD TABLE site_theme;

-- 3. Restaurant settings table (for Settings → Restaurant Info in the admin console)
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  name        TEXT DEFAULT 'BLACKROCK Restaurant & Lounge',
  phone       TEXT DEFAULT '+234 903 048 2774',
  email       TEXT DEFAULT 'theblackrock.ng@gmail.com',
  address     TEXT DEFAULT 'Ajao Road, off Adeniyi Jones Road, Ikeja, Lagos',
  instagram   TEXT DEFAULT '@blackrockrestaurantng',
  hours       TEXT DEFAULT '10:00 AM – 11:59 PM daily',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO restaurant_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 4. Orders table (online ordering)
CREATE TABLE IF NOT EXISTS orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         TEXT,
  guest_name           TEXT NOT NULL,
  guest_phone          TEXT NOT NULL,
  guest_email          TEXT,
  order_type           TEXT NOT NULL CHECK (order_type IN ('pickup', 'delivery')),
  delivery_address     TEXT,
  special_instructions TEXT,
  scheduled_time       TIMESTAMPTZ,
  payment_method       TEXT DEFAULT 'pay_on_arrival',
  payment_status       TEXT DEFAULT 'pay_on_arrival',
  order_status         TEXT DEFAULT 'new',
  subtotal             NUMERIC NOT NULL DEFAULT 0,
  delivery_fee         NUMERIC NOT NULL DEFAULT 0,
  total                NUMERIC NOT NULL DEFAULT 0,
  ip_address           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  item_name   TEXT NOT NULL,
  unit_price  NUMERIC NOT NULL DEFAULT 0,
  qty         INTEGER NOT NULL DEFAULT 1,
  line_total  NUMERIC NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Allow the API (service role) to insert/read orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically, so no extra policy needed.
-- If using anon key on client side, add policies here.
