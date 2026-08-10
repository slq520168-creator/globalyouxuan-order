-- Undo valid orders hidden by the previous unrestricted member delete action.
-- Terminal invalid orders intentionally hidden by members stay hidden.

update public.orders
set hidden_by_user = false
where hidden_by_user is true
  and status in ('pending', 'checking', 'paid', 'delivered');
