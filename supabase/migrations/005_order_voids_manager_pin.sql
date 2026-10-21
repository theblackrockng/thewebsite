-- Front Desk void/edit on confirmed orders + manager PIN authorization.
--
-- Run this in the Supabase SQL Editor. Review each statement before running.
--
-- Pre-check:
--   select column_name from information_schema.columns
--    where table_name = 'order_items' and column_name in ('voided','voided_by','voided_at','void_reason');
--   select column_name from information_schema.columns
--    where table_name = 'staff_profiles' and column_name in ('can_void_orders','void_pin_hash','void_pin_salt');

-- 1. order_items: soft-delete columns for voided line items. We keep the row
--    so the audit trail survives even after totals are recomputed on the
--    orders row. UI drops voided rows from the receipt silently.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS voided      BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS voided_by   TEXT,
  ADD COLUMN IF NOT EXISTS voided_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_voided
  ON public.order_items (order_id)
  WHERE voided = FALSE;

-- 2. staff_profiles: void permission + optional manager PIN (hashed, salted,
--    service-role access only — same pattern as waiter_profiles).
--    super_admin and manager roles are implicitly authorized at the endpoint
--    layer and do not need can_void_orders=true.
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS can_void_orders BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS void_pin_hash   TEXT,
  ADD COLUMN IF NOT EXISTS void_pin_salt   TEXT;

-- 3. Extend the column-protection trigger so can_void_orders cannot be
--    flipped from a user JWT — must go through the server-side endpoint,
--    just like role, permissions, active and status.
CREATE OR REPLACE FUNCTION public.protect_staff_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role            IS DISTINCT FROM OLD.role
     OR NEW.permissions  IS DISTINCT FROM OLD.permissions
     OR NEW.active       IS DISTINCT FROM OLD.active
     OR NEW.status       IS DISTINCT FROM OLD.status
     OR NEW.can_void_orders IS DISTINCT FROM OLD.can_void_orders
     OR NEW.void_pin_hash   IS DISTINCT FROM OLD.void_pin_hash
     OR NEW.void_pin_salt   IS DISTINCT FROM OLD.void_pin_salt THEN
    RAISE EXCEPTION 'role, permissions, active, status, can_void_orders and void_pin_* can only be changed by a server-side endpoint';
  END IF;

  RETURN NEW;
END;
$$;
