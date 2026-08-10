-- Re-apply the core profile lock after the Telegram contact field was added.

create or replace function public.enforce_member_profile_lock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  profile_complete boolean;
  member_profile_changed boolean;
begin
  profile_complete :=
    nullif(btrim(new.display_name), '') is not null
    and nullif(btrim(new.phone), '') is not null;

  member_profile_changed :=
    new.display_name is distinct from old.display_name
    or new.phone is distinct from old.phone
    or new.locale is distinct from old.locale
    or new.phone_country_code is distinct from old.phone_country_code
    or new.phone_country_name is distinct from old.phone_country_name
    or new.wechat is distinct from old.wechat
    or new.whatsapp is distinct from old.whatsapp
    or new.telegram is distinct from old.telegram;

  if current_user = 'authenticated' then
    if caller_id is null or caller_id <> old.user_id then
      raise exception using
        errcode = '42501',
        message = 'PROFILE_OWNER_REQUIRED';
    end if;

    if member_profile_changed and old.profile_locked_at is not null then
      raise exception using
        errcode = '42501',
        message = 'PROFILE_LOCKED';
    end if;

    if member_profile_changed and not profile_complete then
      raise exception using
        errcode = '23514',
        message = 'PROFILE_REQUIRED_FIELDS';
    end if;

    if old.profile_locked_at is null and profile_complete then
      new.profile_locked_at := clock_timestamp();
    else
      new.profile_locked_at := old.profile_locked_at;
    end if;

    new.member_level := old.member_level;
    new.member_level_override := old.member_level_override;
    new.valid_order_count := old.valid_order_count;
    new.total_spent := old.total_spent;
  elsif old.profile_locked_at is null and profile_complete then
    new.profile_locked_at := clock_timestamp();
  end if;

  return new;
end;
$$;

grant update (telegram) on public.profiles to authenticated;
revoke update (updated_at) on public.profiles from authenticated;
