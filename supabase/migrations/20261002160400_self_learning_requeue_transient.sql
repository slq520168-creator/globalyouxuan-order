-- Gaps that failed only because the free AI endpoint was down/over quota get a fresh set of attempts every 6 hours,
-- so an AI outage never parks them permanently (still no human queue).
create or replace function public.learn_requeue_unresolved()
returns integer language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  update public.learn_gaps
     set status = 'open', updated_at = now(),
         attempts = case when coalesce(last_error,'') ~ '^(AI_UNAVAILABLE|TIMEOUT)' then 0 else attempts end
   where status = 'unresolved' and updated_at < now() - interval '6 hours'
     and (attempts < 5 or coalesce(last_error,'') ~ '^(AI_UNAVAILABLE|TIMEOUT)');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.learn_requeue_unresolved() from public, anon, authenticated;
grant execute on function public.learn_requeue_unresolved() to service_role;
