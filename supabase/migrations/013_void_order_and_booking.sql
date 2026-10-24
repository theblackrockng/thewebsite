-- 013_void_order_and_booking.sql
-- Day-bounded void for completed orders and guest-house bookings.
--
-- Previously the only void we had was per-line-item on active orders.
-- Managers couldn't retroactively void a whole order after it was marked
-- completed, and had no way at all to void a guest-house booking (so a
-- superseded Room 101 ₦45,000 booking would keep sitting in Completed Today
-- next to the real ₦40,000 one).
--
-- This migration adds matching soft-delete + audit columns on both tables.
-- Backend handlers (void-order, void-booking) only accept same-day records
-- (Lagos time); EOD aggregators and the Front Desk display filter voided=true
-- out of revenue totals and move them into a dedicated "Voided" audit section.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS voided          BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS voided_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by_id    UUID        REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voided_by_name  TEXT,
  ADD COLUMN IF NOT EXISTS voided_reason   TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_voided
  ON public.orders (created_at)
  WHERE voided = FALSE;

ALTER TABLE public.guest_room_bookings
  ADD COLUMN IF NOT EXISTS voided          BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS voided_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by_id    UUID        REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voided_by_name  TEXT,
  ADD COLUMN IF NOT EXISTS voided_reason   TEXT;

CREATE INDEX IF NOT EXISTS idx_guest_room_bookings_voided
  ON public.guest_room_bookings (created_at)
  WHERE voided = FALSE;
