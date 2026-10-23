-- Backfill existing PINs across the two column pairs so the unified Manager PIN
-- works everywhere without staff having to re-enter their PIN.
--
-- Context: `void_pin_hash` / `guesthouse_pin_hash` were two independent PINs
-- before. The console now writes identical hash+salt to both pairs when a
-- `manager_pin` is set, but existing staff only have ONE pair populated.
-- This script copies the existing hash into the empty pair and flips the
-- matching authorization flag so verify-void-pin / verify-guesthouse-pin
-- accept the same PIN at both endpoints.
--
-- Safe to run multiple times (idempotent — only updates rows where the target
-- pair is NULL). Rows that already have both pairs populated independently
-- (e.g. a staff who deliberately set two different PINs) are left untouched.
--
-- Must be run as superuser from the Supabase SQL Editor — the
-- `protect_staff_profile_columns` trigger allows writes when auth.uid() IS NULL.

-- 1) Rows that only have a guesthouse PIN → copy to void columns + grant void auth.
UPDATE public.staff_profiles
SET
  void_pin_hash   = guesthouse_pin_hash,
  void_pin_salt   = guesthouse_pin_salt,
  can_void_orders = true
WHERE active = true
  AND guesthouse_pin_hash IS NOT NULL
  AND void_pin_hash IS NULL;

-- 2) Rows that only have a void PIN → copy to guesthouse columns + grant guest house auth.
UPDATE public.staff_profiles
SET
  guesthouse_pin_hash    = void_pin_hash,
  guesthouse_pin_salt    = void_pin_salt,
  can_manage_guesthouse  = true
WHERE active = true
  AND void_pin_hash IS NOT NULL
  AND guesthouse_pin_hash IS NULL;

-- 3) Report what we touched (optional — comment out if you don't want the output).
SELECT
  id,
  full_name,
  email,
  role,
  (void_pin_hash IS NOT NULL) AS has_void_pin,
  (guesthouse_pin_hash IS NOT NULL) AS has_guesthouse_pin,
  can_void_orders,
  can_manage_guesthouse
FROM public.staff_profiles
WHERE active = true
  AND (void_pin_hash IS NOT NULL OR guesthouse_pin_hash IS NOT NULL)
ORDER BY full_name;
