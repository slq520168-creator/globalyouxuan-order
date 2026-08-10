-- Member-centre ownership, deletion and one-time profile write rules.

alter table public.profiles
  add column if not exists profile_locked_at timestamptz;

comment on column public.profiles.profile_locked_at is
  'Set after the first complete member save. Members cannot edit a locked profile; administrators may edit through the server-side admin API.';

-- Existing complete profiles are locked immediately. Incomplete profiles remain
-- writable once so their owner can supply the required name and phone number.
update public.profiles
set profile_locked_at = coalesce(updated_at, created_at, now())
where profile_locked_at is null
  and nullif(btrim(display_name), '') is not null
  and nullif(btrim(phone), '') is not null;

create or replace function private.enforce_member_profile_lock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  profile_complete boolean;
begin
  profile_complete :=
    nullif(btrim(new.display_name), '') is not null
    and nullif(btrim(new.phone), '') is not null;

  if caller_id is not null and caller_id = old.user_id then
    if old.profile_locked_at is not null then
      raise exception using
        errcode = '42501',
        message = 'PROFILE_LOCKED';
    end if;

    if not profile_complete then
      raise exception using
        errcode = '23514',
        message = 'PROFILE_REQUIRED_FIELDS';
    end if;

    new.profile_locked_at := clock_timestamp();
  elsif caller_id is null
    and old.profile_locked_at is null
    and profile_complete then
    -- Server-side administrator updates may complete an unfinished profile.
    new.profile_locked_at := clock_timestamp();
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_10_enforce_member_lock on public.profiles;
create trigger profiles_10_enforce_member_lock
before update on public.profiles
for each row execute function private.enforce_member_profile_lock();

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_unlocked_own_once
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and profile_locked_at is null
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and profile_locked_at is not null
);

-- Members may update only profile fields, never ownership or lock metadata.
revoke update on table public.profiles from anon, authenticated;
grant update (
  display_name,
  phone,
  locale,
  phone_country_code,
  phone_country_name,
  wechat,
  whatsapp
) on public.profiles to authenticated;

-- Favorites and search history stay browser-accessible only to signed-in users.
-- RLS below remains the final row-level ownership boundary.
revoke all on table public.answer_favorites from anon;
revoke all on table public.search_history from anon;

revoke all on table public.answer_favorites from authenticated;
grant select, insert, update, delete on table public.answer_favorites to authenticated;

revoke all on table public.search_history from authenticated;
grant select, insert, delete on table public.search_history to authenticated;

drop policy if exists answer_favorites_select_own on public.answer_favorites;
drop policy if exists answer_favorites_insert_own on public.answer_favorites;
drop policy if exists answer_favorites_update_own on public.answer_favorites;
drop policy if exists answer_favorites_delete_own on public.answer_favorites;

create policy answer_favorites_select_own
on public.answer_favorites
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy answer_favorites_insert_own
on public.answer_favorites
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy answer_favorites_update_own
on public.answer_favorites
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

create policy answer_favorites_delete_own
on public.answer_favorites
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

drop policy if exists search_history_select_own on public.search_history;
drop policy if exists search_history_insert_own on public.search_history;
drop policy if exists search_history_delete_own on public.search_history;

create policy search_history_select_own
on public.search_history
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy search_history_insert_own
on public.search_history
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy search_history_delete_own
on public.search_history
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

-- An order can be hidden by its member only after the server has explicitly
-- moved it to a terminal invalid state. Pending/checking/paid/delivered orders
-- are protected at the database layer from both single and bulk removal.
drop policy if exists orders_update_hide_own on public.orders;
create policy orders_update_hide_invalid_own
on public.orders
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and status in ('expired', 'failed', 'cancelled')
  and hidden_by_user is false
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and status in ('expired', 'failed', 'cancelled')
  and hidden_by_user is true
);

revoke update on table public.orders from authenticated;
grant update (hidden_by_user) on public.orders to authenticated;

create or replace function public.hide_own_order(p_order_id bigint)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.orders
  set hidden_by_user = true
  where id = p_order_id
    and user_id = (select auth.uid())
    and status in ('expired', 'failed', 'cancelled')
    and hidden_by_user is false;

  return found;
end;
$$;

create or replace function public.hide_own_invalid_orders()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  hidden_count integer;
begin
  update public.orders
  set hidden_by_user = true
  where user_id = (select auth.uid())
    and status in ('expired', 'failed', 'cancelled')
    and hidden_by_user is false;

  get diagnostics hidden_count = row_count;
  return hidden_count;
end;
$$;

revoke all on function public.hide_own_order(bigint) from public, anon;
revoke all on function public.hide_own_invalid_orders() from public, anon;
grant execute on function public.hide_own_order(bigint) to authenticated, service_role;
grant execute on function public.hide_own_invalid_orders() to authenticated, service_role;

comment on function public.hide_own_invalid_orders() is
  'Hides only the caller owned expired, failed or cancelled orders and returns the affected count.';
