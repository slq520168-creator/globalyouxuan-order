-- Completed orders are valid member records and must remain visible.
-- Do not restore expired/cancelled/failed orders or stale hidden pending orders.

update public.orders
set hidden_by_user = false
where hidden_by_user is true
  and status = 'completed';
