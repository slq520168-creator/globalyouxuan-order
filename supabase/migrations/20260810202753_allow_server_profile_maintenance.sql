-- Keep one-time member profile locking scoped to direct member writes.
-- Trusted server-side functions still need to maintain member level and totals.

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

  if current_user = 'authenticated' then
    if caller_id is null or caller_id <> old.user_id then
      raise exception using
        errcode = '42501',
        message = 'PROFILE_OWNER_REQUIRED';
    end if;

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
  elsif old.profile_locked_at is null and profile_complete then
    -- Administrators and trusted server functions may complete an unfinished
    -- profile; once complete it follows the same permanent lock state.
    new.profile_locked_at := clock_timestamp();
  end if;

  return new;
end;
$$;
