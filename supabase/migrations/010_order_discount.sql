-- 010_order_discount.sql
-- Whole-order manager discount (₦ off), reusing the Void/Edit manager PIN flow.
-- Adds audit columns to orders; discount is applied as a flat Naira amount
-- subtracted from the recomputed subtotal to produce the stored total.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount  INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_by_id   UUID        REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_by_name TEXT,
  ADD COLUMN IF NOT EXISTS discount_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discount_reason  TEXT;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_discount_amount_nonneg CHECK (discount_amount >= 0);
