create table if not exists public.community_public_stats_snapshot (
  id smallint primary key default 1 check (id = 1),
  today_published bigint not null default 0,
  request_users bigint not null default 0,
  confirmed_users bigint not null default 0,
  confirmed_orders bigint not null default 0,
  today_taken bigint not null default 0,
  remaining bigint not null default 0,
  cumulative_taken bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.community_public_stats_snapshot enable row level security;

drop policy if exists community_public_stats_snapshot_read on public.community_public_stats_snapshot;
create policy community_public_stats_snapshot_read
on public.community_public_stats_snapshot
for select
to anon, authenticated
using (true);

revoke all on public.community_public_stats_snapshot from public, anon, authenticated;
grant select on public.community_public_stats_snapshot to anon, authenticated;
grant all on public.community_public_stats_snapshot to service_role;

create or replace function public.refresh_community_public_stats_snapshot()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.community_public_stats_snapshot (
    id,
    today_published,
    request_users,
    confirmed_users,
    confirmed_orders,
    today_taken,
    remaining,
    cumulative_taken,
    updated_at
  )
  with d as (
    select id, opportunity_status
    from public.community_external_feed
    where batch_key like to_char(now() at time zone 'Asia/Shanghai','YYYY-MM-DD') || '-%'
  ),
  agg as (
    select
      (select count(*) from d)::bigint as today_published,
      (select count(distinct s.user_id)
         from public.community_opportunity_stats s
         join d on d.id = s.opportunity_id
        where s.action = 'request_url')::bigint as request_users,
      (select count(distinct s.user_id)
         from public.community_opportunity_stats s
         join d on d.id = s.opportunity_id
        where s.action = 'confirmed_order')::bigint as confirmed_users,
      (select count(*)
         from public.community_opportunity_stats s
         join d on d.id = s.opportunity_id
        where s.action = 'confirmed_order')::bigint as confirmed_orders,
      (select count(*) from d where opportunity_status = 'closed')::bigint as today_taken,
      (select count(*) from d where opportunity_status <> 'closed')::bigint as remaining,
      (select count(*)
         from public.community_opportunity_status_history
        where status = 'closed' and closed_at is not null)::bigint as cumulative_taken
  )
  select 1, today_published, request_users, confirmed_users, confirmed_orders,
         today_taken, remaining, cumulative_taken, now()
  from agg
  on conflict (id) do update set
    today_published = excluded.today_published,
    request_users = excluded.request_users,
    confirmed_users = excluded.confirmed_users,
    confirmed_orders = excluded.confirmed_orders,
    today_taken = excluded.today_taken,
    remaining = excluded.remaining,
    cumulative_taken = excluded.cumulative_taken,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_community_public_stats_snapshot() from public, anon, authenticated;
grant execute on function public.refresh_community_public_stats_snapshot() to service_role;

create or replace function public.community_public_stats_snapshot_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_community_public_stats_snapshot();
  return null;
end;
$$;

revoke all on function public.community_public_stats_snapshot_trigger() from public, anon, authenticated;
grant execute on function public.community_public_stats_snapshot_trigger() to service_role;

drop trigger if exists trg_community_external_feed_public_stats on public.community_external_feed;
create trigger trg_community_external_feed_public_stats
after insert or update or delete on public.community_external_feed
for each statement execute function public.community_public_stats_snapshot_trigger();

drop trigger if exists trg_community_opportunity_stats_public_stats on public.community_opportunity_stats;
create trigger trg_community_opportunity_stats_public_stats
after insert or update or delete on public.community_opportunity_stats
for each statement execute function public.community_public_stats_snapshot_trigger();

drop trigger if exists trg_community_opportunity_status_history_public_stats on public.community_opportunity_status_history;
create trigger trg_community_opportunity_status_history_public_stats
after insert or update or delete on public.community_opportunity_status_history
for each statement execute function public.community_public_stats_snapshot_trigger();

select public.refresh_community_public_stats_snapshot();

create or replace function public.community_opportunity_public_stats()
returns table(today_published bigint, request_users bigint, confirmed_orders bigint)
language sql
security invoker
set search_path = public
as $$
  select s.today_published, s.request_users, s.confirmed_orders
  from public.community_public_stats_snapshot s
  where s.id = 1;
$$;

create or replace function public.community_opportunity_public_stats_v2()
returns table(today_published bigint, confirmed_users bigint, confirmed_orders bigint, request_users bigint)
language sql
security invoker
set search_path = public
as $$
  select s.today_published, s.confirmed_users, s.confirmed_orders, s.request_users
  from public.community_public_stats_snapshot s
  where s.id = 1;
$$;

create or replace function public.community_opportunity_public_stats_v3()
returns table(today_published bigint, today_taken bigint, remaining bigint, cumulative_taken bigint)
language sql
security invoker
set search_path = public
as $$
  select s.today_published, s.today_taken, s.remaining, s.cumulative_taken
  from public.community_public_stats_snapshot s
  where s.id = 1;
$$;

grant execute on function public.community_opportunity_public_stats() to anon, authenticated, service_role;
grant execute on function public.community_opportunity_public_stats_v2() to anon, authenticated, service_role;
grant execute on function public.community_opportunity_public_stats_v3() to anon, authenticated, service_role;
