-- Allow 'room' as a valid order_items.category so the Front Desk
-- "Add Room to Bill" flow can insert a room-charge line onto an open order.
--
-- Prior constraint allowed only ('food', 'drink') (NULL also passed because
-- CHECK NULL = unknown). We additionally allow 'room' so the room charge
-- shows up on the combined thermal receipt alongside food and drinks.
--
-- The EOD aggregator (frontend/api/_lib/eod-report.js and
-- frontend/src/pages/FrontDeskDisplay.jsx buildEndOfDayHtml) explicitly skips
-- items with category='room' so revenue isn't double-counted against the
-- Guest House section — the authoritative room-revenue number stays on
-- guest_room_bookings.

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_category_check;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_category_check
  CHECK (category IS NULL OR category IN ('food', 'drink', 'room'));
