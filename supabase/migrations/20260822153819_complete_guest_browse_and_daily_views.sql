alter table public.community_external_feed enable row level security;

revoke all on table public.community_external_feed from anon;
grant select on table public.community_external_feed to anon;

drop policy if exists community_external_feed_anon_read on public.community_external_feed;
create policy community_external_feed_anon_read
on public.community_external_feed
for select
to anon
using (
  opportunity_status = 'open'
  and claimed_by is null
  and created_at >= now() - interval '36 hours'
);

create table if not exists public.site_daily_views (
  view_date date primary key,
  page_views bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.site_daily_views enable row level security;
revoke all on table public.site_daily_views from public, anon, authenticated;
grant all on table public.site_daily_views to service_role;

create or replace function public.gyx_record_page_view()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  current_views bigint;
begin
  insert into public.site_daily_views (view_date, page_views, updated_at)
  values ((timezone('Asia/Shanghai', now()))::date, 1, now())
  on conflict (view_date) do update
  set page_views = public.site_daily_views.page_views + 1,
      updated_at = now()
  returning page_views into current_views;

  return current_views;
end;
$function$;

revoke all on function public.gyx_record_page_view() from public;
grant execute on function public.gyx_record_page_view() to anon, authenticated, service_role;

grant select on table storage.objects to anon;

drop policy if exists "guests read free zone media" on storage.objects;
create policy "guests read free zone media"
on storage.objects
for select
to anon
using (bucket_id = 'free-zone-media');

drop policy if exists "guests read free zone legacy image" on storage.objects;
create policy "guests read free zone legacy image"
on storage.objects
for select
to anon
using (
  bucket_id = 'admin-assets'
  and name = '70f7ee18-fd9e-444d-b051-b2749c6e85ec/1786574292704-b6635533-free-zone-1786574289583-962E1E92-A8D2-4F6B-8AE2-944CA72E8407.png'
);

