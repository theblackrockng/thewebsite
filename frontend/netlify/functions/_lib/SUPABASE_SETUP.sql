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
  phone       TEXT DEFAULT '08055238353 / 09030482774',
  email       TEXT DEFAULT 'theblackrock.ng@gmail.com',
  address     TEXT DEFAULT 'Ajao Road, off Adeniyi Jones Road, Ikeja, Lagos',
  instagram   TEXT DEFAULT '@blackrockrestaurantng',
  hours       TEXT DEFAULT '10:00 AM – 11:59 PM daily',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO restaurant_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
