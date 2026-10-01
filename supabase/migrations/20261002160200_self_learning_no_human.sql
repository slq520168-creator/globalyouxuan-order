-- No human review at all: gaps the worker cannot solve become 'unresolved' and are retried automatically
-- (every 6 hours, up to 5 attempts; re-opened by new user signals). Nothing waits for a person.
alter table public.learn_gaps drop constraint if exists learn_gaps_status_check;
update public.learn_gaps set status = 'unresolved', attempts = least(attempts, 4) where status = 'needs_human';
alter table public.learn_gaps add constraint learn_gaps_status_check
  check (status in ('open','working','proposed','resolved','unresolved','ignored'));

-- learned material topics are recorded as active "missing material" notes (no review queue)
update public.learn_kb set status = 'active' where status = 'pending';
update public.learn_synonyms set status = 'active' where status = 'pending';

create or replace function public.learn_requeue_unresolved()
returns integer language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  update public.learn_gaps set status = 'open', updated_at = now()
   where status = 'unresolved' and attempts < 5 and updated_at < now() - interval '6 hours';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.learn_requeue_unresolved() from public, anon, authenticated;
grant execute on function public.learn_requeue_unresolved() to service_role;

create or replace function public.learn_admin_overview(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare lim int := greatest(1, least(coalesce(p_limit,50), 200));
begin
  if not public.gyx_is_active_admin() then raise exception 'ADMIN_ONLY'; end if;
  return jsonb_build_object(
    'open_gaps', (select coalesce(jsonb_agg(g),'[]') from (select id,kind,sample,hits,status,attempts,last_error,resolution,last_seen from public.learn_gaps where status in ('open','unresolved','proposed') order by hits desc, last_seen desc limit lim) g),
    'pending_synonyms', (select coalesce(jsonb_agg(s),'[]') from (select id,term,expansions,role,category,source,verified_hits,evidence,created_at from public.learn_synonyms where status='pending' order by verified_hits desc, created_at desc limit lim) s),
    'pending_kb', (select coalesce(jsonb_agg(k),'[]') from (select id,kind,question,answer_zh,risk,source,source_url,created_at from public.learn_kb where status='pending' order by created_at desc limit lim) k),
    'stats', jsonb_build_object(
      'search_events_7d', (select count(*) from public.learn_search_events where created_at > now()-interval '7 days'),
      'support_events_7d', (select count(*) from public.learn_support_events where created_at > now()-interval '7 days'),
      'active_synonyms', (select count(*) from public.learn_synonyms where status='active'),
      'active_kb', (select count(*) from public.learn_kb where status='active' and kind='support')));
end $$;
revoke all on function public.learn_admin_overview(integer) from public, anon;
