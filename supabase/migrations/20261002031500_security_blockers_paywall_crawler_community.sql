-- Security review fixes #1, #2, #3, #6 (anon part) + grant hygiene.
-- Applied to production project afzcohtnljnmucrkgcaz on 2026-10-02.

-- ---------------------------------------------------------------------------
-- #1 Paid answer bodies (answer_detail_*) must not be readable with the public key.
-- ---------------------------------------------------------------------------
revoke select on public.product_answer_options from anon, authenticated;
grant select (
  id, answer_code, module_code, title, answer_summary, keywords, product_id, priority,
  is_active, created_at, updated_at, title_en, title_km, answer_summary_en, answer_summary_km,
  source_name, content_version, image_url, delivery_scheme_id, keywords_en, keywords_km,
  candidate_i18n, search_category, search_subcategory
) on public.product_answer_options to anon, authenticated;

-- Five-round search hints: only short phrases (4-20 chars), capped at ~30% of the body
-- (max 160 chars, max 10 phrases). Never returns the full paid body.
create or replace function public.kd_material_hints(p_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  r record;
  p text;
  hints text[] := '{}';
  budget int;
  used int := 0;
begin
  select o.id, o.title, o.answer_summary, o.keywords, o.answer_detail_zh
    into r
    from public.product_answer_options o
   where o.id = p_id and o.is_active = true;
  if not found then
    return null;
  end if;
  budget := least(160, greatest(24, coalesce(char_length(r.answer_detail_zh), 0) * 30 / 100));
  for p in
    select btrim(regexp_replace(regexp_replace(t.s, '^[#*\-•>\s0-9.、)）]+|【[^】]*】', '', 'g'), '\s+', ' ', 'g'))
      from regexp_split_to_table(coalesce(r.answer_detail_zh, ''), '[\n。！？!?；;：:、，,/]+') with ordinality as t(s, ord)
     order by t.ord
  loop
    continue when p is null or char_length(p) < 4 or char_length(p) > 20;
    continue when p ~* '(https?://|www\.|t\.me|@|[0-9]{6,})';
    continue when p = any(hints);
    exit when used + char_length(p) > budget or coalesce(array_length(hints, 1), 0) >= 10;
    hints := hints || p;
    used := used + char_length(p);
  end loop;
  return jsonb_build_object(
    'id', r.id,
    'title', r.title,
    'answer_summary', r.answer_summary,
    'keywords', coalesce(to_jsonb(r.keywords), '[]'::jsonb),
    'hints', to_jsonb(hints)
  );
end;
$function$;
revoke all on function public.kd_material_hints(bigint) from public;
grant execute on function public.kd_material_hints(bigint) to anon, authenticated, service_role;

-- Admin fixed-card editor needs the full rows; admins share the authenticated role,
-- so give them a checked SECURITY DEFINER read instead of a column grant.
create or replace function public.gyx_admin_answer_options(p_ids bigint[])
returns setof public.product_answer_options
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.user_id = auth.uid() and coalesce(a.is_active, false)
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return query
    select o.* from public.product_answer_options o
     where o.id = any(coalesce(p_ids, '{}'::bigint[]))
     limit 200;
end;
$function$;
revoke all on function public.gyx_admin_answer_options(bigint[]) from public, anon;
grant execute on function public.gyx_admin_answer_options(bigint[]) to authenticated, service_role;

-- get_order_delivery returns the paid body only for the caller's own paid/delivered order.
-- It was SECURITY INVOKER and would break after the column revoke; keep the same checks as definer.
alter function public.get_order_delivery(bigint) security definer;
revoke all on function public.get_order_delivery(bigint) from public, anon;
grant execute on function public.get_order_delivery(bigint) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- #2 Internal secrets for cron / internal edge-function calls live in Vault.
-- Only service_role (edge functions) may read them through this helper.
-- ---------------------------------------------------------------------------
create or replace function public.gyx_internal_secret(p_name text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v text;
begin
  if p_name not in ('gyx_crawler_secret', 'gyx_learn_worker_secret', 'gyx_translate_internal_secret') then
    return null;
  end if;
  select s.decrypted_secret into v from vault.decrypted_secrets s where s.name = p_name limit 1;
  return v;
end;
$function$;
revoke all on function public.gyx_internal_secret(text) from public, anon, authenticated;
grant execute on function public.gyx_internal_secret(text) to service_role;

do $block$
begin
  if not exists (select 1 from vault.secrets where name = 'gyx_crawler_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'gyx_crawler_secret', 'x-cron-secret for community-feed-crawler');
  end if;
  if not exists (select 1 from vault.secrets where name = 'gyx_translate_internal_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'gyx_translate_internal_secret', 'x-internal-service for answer-auto-translate self calls');
  end if;
end;
$block$;

do $block$
begin
  if exists (select 1 from cron.job where jobname = 'community-opportunity-refresh-6h') then
    perform cron.unschedule('community-opportunity-refresh-6h');
  end if;
end;
$block$;

select cron.schedule(
  'community-opportunity-refresh-6h',
  '15 */6 * * *',
  $job$
  select net.http_post(
    url := 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/community-feed-crawler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gyx_crawler_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);

-- ---------------------------------------------------------------------------
-- #3 community_external_feed: body/source_url only via gyx_redeem_community_opportunity.
-- ---------------------------------------------------------------------------
drop policy if exists community_external_feed_authenticated_read on public.community_external_feed;
drop policy if exists community_external_feed_authenticated_read_open on public.community_external_feed;
revoke all on public.community_external_feed from anon, authenticated;
grant select (id, title, batch_code, batch_key, opportunity_no, opportunity_status, created_at, claimed_by)
  on public.community_external_feed to anon, authenticated;
create policy community_external_feed_authenticated_read_open
  on public.community_external_feed
  for select
  to authenticated
  using (opportunity_status = 'open' and claimed_by is null);

revoke execute on function public.gyx_redeem_community_opportunity(uuid) from public, anon;
grant execute on function public.gyx_redeem_community_opportunity(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- #6 SECURITY DEFINER functions that anon/authenticated must not call directly.
-- ---------------------------------------------------------------------------
revoke execute on function public.auto_hide_stale_checking_orders_after_one_hour() from public, anon, authenticated;
grant execute on function public.auto_hide_stale_checking_orders_after_one_hour() to service_role;
-- trigger functions (EXECUTE is only checked at CREATE TRIGGER time; triggers keep firing)
revoke execute on function public.gyx_deliver_business_growth_order() from public, anon, authenticated;
revoke execute on function public.gyx_spare_time_mark_delivered() from public, anon, authenticated;
revoke execute on function public.wake_notification_worker_on_priority_events() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grant hygiene found during the fix: anon/authenticated held TRUNCATE/TRIGGER/REFERENCES
-- (TRUNCATE bypasses RLS) and unused DML on point tables. PostgREST never needs these.
-- ---------------------------------------------------------------------------
do $block$
declare
  t record;
begin
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
  loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t.relname);
  end loop;
end;
$block$;
revoke insert, update, delete on public.member_point_accounts, public.member_point_checkins,
  public.member_point_ledger, public.member_point_redemptions, public.member_point_referrals
  from anon, authenticated;
revoke insert, update, delete on public.order_fulfillment_metrics from anon, authenticated;
