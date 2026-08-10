-- Membership counters are maintained by trusted order/admin flows only.

revoke all on function public.refresh_member_level(uuid)
  from public, anon, authenticated;
revoke all on function public.refresh_member_level_from_order()
  from public, anon, authenticated;
grant execute on function public.refresh_member_level(uuid) to service_role;
grant execute on function public.refresh_member_level_from_order() to service_role;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);
