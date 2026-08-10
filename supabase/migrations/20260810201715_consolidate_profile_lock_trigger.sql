-- Remove the earlier private trigger and keep a single public lock trigger.

drop trigger if exists profiles_10_enforce_member_lock on public.profiles;

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
        raise exception using errcode = '42501', message = 'PROFILE_LOCKED';
      end if;
      new.profile_locked_at := old.profile_locked_at;
    else
      if coalesce(trim(new.display_name), '') = ''
        or coalesce(trim(new.phone), '') = '' then
        raise exception using
          errcode = '23514',
          message = 'PROFILE_REQUIRED_FIELDS';
      end if;
      new.profile_locked_at := now();
    end if;
    new.member_level := old.member_level;
    new.member_level_override := old.member_level_override;
    new.valid_order_count := old.valid_order_count;
    new.total_spent := old.total_spent;
  elsif auth.uid() is null
    and old.profile_locked_at is null
    and coalesce(trim(new.display_name), '') <> ''
    and coalesce(trim(new.phone), '') <> '' then
    new.profile_locked_at := now();
  end if;
  return new;
end;
$$;
