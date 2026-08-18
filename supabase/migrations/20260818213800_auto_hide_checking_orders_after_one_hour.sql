create or replace function public.hide_own_stale_checking_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  hidden_count integer;
begin
  update public.orders
  set hidden_by_user = true
  where user_id = (select auth.uid())
    and status = 'checking'
    and hidden_by_user is false
    and created_at <= clock_timestamp() - interval '1 hour';

  get diagnostics hidden_count = row_count;
  return hidden_count;
end;
$$;

revoke all on function public.hide_own_stale_checking_orders() from public, anon;
grant execute on function public.hide_own_stale_checking_orders() to authenticated, service_role;

comment on function public.hide_own_stale_checking_orders() is
  'Hides only the caller-owned checking orders once they are at least one hour old. Paid, delivered and completed orders are never touched.';
