-- Guest House: 5 rooms, bookings, and guesthouse staff PIN authorization.
--
-- Run this in the Supabase SQL Editor. Review each statement before running.
--
-- Pre-check:
--   select table_name from information_schema.tables
--    where table_schema = 'public' and table_name in ('guest_rooms','guest_room_bookings');
--   select column_name from information_schema.columns
--    where table_name = 'staff_profiles'
--      and column_name in ('can_manage_guesthouse','guesthouse_pin_hash','guesthouse_pin_salt');

-- 1. Rooms registry. Price is per night. status is a free text, UI uses
--    'available' / 'occupied' / 'cleaning' / 'maintenance'.
CREATE TABLE IF NOT EXISTS public.guest_rooms (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number   text        NOT NULL UNIQUE,
  room_type     text        NOT NULL,
  price         integer     NOT NULL,
  status        text        NOT NULL DEFAULT 'available',
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.guest_rooms (room_number, room_type, price)
VALUES
  ('101', 'Executive Room', 45000),
  ('102', 'Standard Room',  35000),
  ('103', 'Standard Room',  35000),
  ('104', 'Standard Room',  35000),
  ('105', 'Standard Room',  35000)
ON CONFLICT (room_number) DO NOTHING;

-- 2. Bookings. Each check-in creates one row. Base amount is price × nights;
--    discount is an absolute naira amount subtracted; total_amount is the
--    final charge. All actor fields are TEXT so the audit survives even if
--    the staff account is later deactivated.
CREATE TABLE IF NOT EXISTS public.guest_room_bookings (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id                  uuid        NOT NULL REFERENCES public.guest_rooms(id) ON DELETE RESTRICT,
  room_number              text        NOT NULL,
  guest_name               text        NOT NULL,
  guest_phone              text,
  guest_email              text,
  check_in_at              timestamptz NOT NULL DEFAULT now(),
  check_out_at             timestamptz,
  nights                   integer     NOT NULL DEFAULT 1,
  base_amount              integer     NOT NULL,
  discount                 integer     NOT NULL DEFAULT 0,
  total_amount             integer     NOT NULL,
  payment_status           text        NOT NULL DEFAULT 'unpaid',
  payment_method           text,
  status                   text        NOT NULL DEFAULT 'active',
  notes                    text,
  checked_in_by_id         uuid,
  checked_in_by_name       text        NOT NULL,
  key_encoded_by_id        uuid,
  key_encoded_by_name      text,
  key_encoded_at           timestamptz,
  checked_out_by_id        uuid,
  checked_out_by_name      text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_room_bookings_room_active
  ON public.guest_room_bookings (room_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_guest_room_bookings_check_in
  ON public.guest_room_bookings (check_in_at DESC);

-- 3. staff_profiles: guesthouse authorization + optional PIN (hashed, salted).
--    super_admin and manager roles are implicitly authorized at the endpoint
--    layer and do not need can_manage_guesthouse=true.
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS can_manage_guesthouse BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guesthouse_pin_hash   TEXT,
  ADD COLUMN IF NOT EXISTS guesthouse_pin_salt   TEXT;

-- 4. Extend the column-protection trigger so the new columns can only be
--    flipped by a server-side endpoint (same pattern as can_void_orders).
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
     OR NEW.can_void_orders       IS DISTINCT FROM OLD.can_void_orders
     OR NEW.void_pin_hash         IS DISTINCT FROM OLD.void_pin_hash
     OR NEW.void_pin_salt         IS DISTINCT FROM OLD.void_pin_salt
     OR NEW.can_manage_guesthouse IS DISTINCT FROM OLD.can_manage_guesthouse
     OR NEW.guesthouse_pin_hash   IS DISTINCT FROM OLD.guesthouse_pin_hash
     OR NEW.guesthouse_pin_salt   IS DISTINCT FROM OLD.guesthouse_pin_salt THEN
    RAISE EXCEPTION 'role, permissions, active, status, void/guesthouse auth columns can only be changed by a server-side endpoint';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. RLS: both guesthouse tables are service-role-only. All reads/writes go
--    through the /api/front-desk endpoint which authenticates the caller.
ALTER TABLE public.guest_rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_room_bookings  ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated roles. service_role bypasses RLS.
