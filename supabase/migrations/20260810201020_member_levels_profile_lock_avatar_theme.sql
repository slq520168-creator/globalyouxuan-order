-- Member level counters, avatar storage, theme selection and the first profile
-- lock implementation. Later migrations in this series tighten its grants and
-- consolidate the lock trigger.

alter table public.profiles
  add column if not exists member_level integer not null default 1
    check (member_level between 1 and 4),
  add column if not exists member_level_override integer
    check (member_level_override between 1 and 4),
  add column if not exists valid_order_count integer not null default 0,
  add column if not exists total_spent numeric(12, 2) not null default 0,
  add column if not exists avatar_url text,
  add column if not exists theme_color text not null default 'blue'
    check (theme_color in ('blue', 'purple', 'green', 'orange', 'red', 'cyan')),
  add column if not exists profile_locked_at timestamptz;

insert into public.admin_users (user_id, role, is_active)
select id, 'admin', true
from auth.users
where lower(email) = 'slq520168@gmail.com'
on conflict (user_id) do update
set is_active = true,
    updated_at = now();

create or replace function public.refresh_member_level(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_spent numeric := 0;
  v_level integer := 1;
  v_override integer;
  v_admin boolean := false;
begin
  select count(*), coalesce(sum(payable_amount), 0)
  into v_count, v_spent
  from public.orders
  where user_id = p_user_id
    and status in ('paid', 'delivered');

  select member_level_override
  into v_override
  from public.profiles
  where user_id = p_user_id;

  select exists (
    select 1
    from public.admin_users
    where user_id = p_user_id
      and is_active = true
  )
  into v_admin;

  if v_admin then
    v_level := 4;
  elsif v_override is not null then
    v_level := v_override;
  elsif v_count >= 15 or v_spent >= 500 then
    v_level := 4;
  elsif v_count >= 5 or v_spent >= 100 then
    v_level := 3;
  elsif v_count >= 1 then
    v_level := 2;
  else
    v_level := 1;
  end if;

  update public.profiles
  set valid_order_count = v_count,
      total_spent = v_spent,
      member_level = v_level
  where user_id = p_user_id;
end;
$$;

create or replace function public.refresh_member_level_from_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_member_level(coalesce(new.user_id, old.user_id));
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.refresh_member_level(old.user_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_member_level on public.orders;
create trigger trg_refresh_member_level
after insert or update of status, payable_amount, user_id or delete
on public.orders
for each row execute function public.refresh_member_level_from_order();

create or replace function public.enforce_member_profile_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and auth.uid() = old.user_id then
    if old.profile_locked_at is not null then
      if new.display_name is distinct from old.display_name
        or new.phone is distinct from old.phone
        or new.phone_country_code is distinct from old.phone_country_code
        or new.phone_country_name is distinct from old.phone_country_name
        or new.wechat is distinct from old.wechat
        or new.whatsapp is distinct from old.whatsapp then
        raise exception 'PROFILE_LOCKED';
      end if;
      new.profile_locked_at := old.profile_locked_at;
    elsif coalesce(trim(new.display_name), '') <> ''
      and coalesce(trim(new.phone), '') <> '' then
      new.profile_locked_at := now();
    end if;
    new.member_level := old.member_level;
    new.member_level_override := old.member_level_override;
    new.valid_order_count := old.valid_order_count;
    new.total_spent := old.total_spent;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_member_profile_lock on public.profiles;
create trigger trg_enforce_member_profile_lock
before update on public.profiles
for each row execute function public.enforce_member_profile_lock();

update public.profiles
set profile_locked_at = coalesce(profile_locked_at, updated_at, now())
where profile_locked_at is null
  and coalesce(trim(display_name), '') <> ''
  and coalesce(trim(phone), '') <> '';

alter table public.profiles enable row level security;
drop policy if exists profiles_update_unlocked_own_once on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'member-avatars',
  'member-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists member_avatars_public_read on storage.objects;
drop policy if exists member_avatars_insert_own on storage.objects;
drop policy if exists member_avatars_update_own on storage.objects;
drop policy if exists member_avatars_delete_own on storage.objects;

create policy member_avatars_public_read
on storage.objects
for select
using (bucket_id = 'member-avatars');

create policy member_avatars_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy member_avatars_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy member_avatars_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

do $$
declare
  profile_row record;
begin
  for profile_row in select user_id from public.profiles loop
    perform public.refresh_member_level(profile_row.user_id);
  end loop;
end;
$$;
