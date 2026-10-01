-- =====================================================================
-- 五轮搜索 + 在线客服 自我学习闭环（Self-learning loop）
-- 状态：只写成文件，未执行。需用户确认后再 apply。
-- 不触碰：订单 / 付款 / 交付 / 商家骑手 / 现有 RPC。只新增 learn_* 表与函数。
-- 浏览器只能：写日志（经限流 RPC）、读已启用同义词、查已启用客服知识。
-- 所有学习产物默认 pending，管理员审核后 active；可停用、可按版本回滚。
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------- 0. 公共工具 ----------
-- 与前端 knowledge-decision-v2.js 的 N() 保持一致：小写 + 去空白和标点
create or replace function public.learn_norm(p text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select left(regexp_replace(lower(coalesce(p,'')),
    '[[:space:]，。！？、；：,.!?;:()（）【】\[\]"''“”‘’_\-/\\]+','','g'),200);
$$;

-- 去掉邮箱、长数字（手机号、TXID 等），日志里不留个人信息
create or replace function public.learn_redact(p text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select left(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(p,''), '[^[:space:]@]+@[^[:space:]@]+', '[email]', 'g'),
      '[A-Za-z0-9]{24,}', '[id]', 'g'),
    '\+?[0-9][0-9 ()-]{5,}[0-9]', '[num]', 'g'),
  500);
$$;

-- ---------- 1. 设置（默认全部需要人工审核） ----------
create table if not exists public.learn_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.learn_settings(key, value) values
  ('auto_activate_synonyms',        'false'::jsonb),  -- true = 验证通过的同义词自动上线
  ('auto_activate_support_answers', 'false'::jsonb),  -- true = 低风险客服答案自动上线（钱相关永远人工）
  ('min_hits_for_gap',              '1'::jsonb),
  ('worker_batch',                  '8'::jsonb),
  ('ai_enabled',                    'true'::jsonb),
  ('web_lookup_enabled',            'true'::jsonb),
  ('event_retention_days',          '180'::jsonb)
on conflict (key) do nothing;

create or replace function public.learn_setting(p_key text, p_default jsonb)
returns jsonb language sql stable security definer set search_path = ''
as $$ select coalesce((select value from public.learn_settings where key = p_key), p_default); $$;

-- ---------- 2. 原始事件 ----------
create table if not exists public.learn_search_events (
  id bigint generated always as identity primary key,
  session_id text not null check (char_length(session_id) between 4 and 80),
  user_id uuid,
  query text not null,
  normalized text not null,
  category text,
  mode text check (mode in ('manual','auto')),
  round smallint not null default 1 check (round between 1 and 6),
  result_count smallint not null default 0,   -- RPC 返回条数
  strict_count smallint not null default 0,   -- 通过严格匹配的条数
  fill_count smallint not null default 0,     -- 用兜底填充的条数（越多说明越没搜到）
  picked_ids bigint[] not null default '{}',
  picked_texts text[] not null default '{}',
  completed boolean not null default false,
  locale text,
  created_at timestamptz not null default now()
);
create index if not exists learn_search_events_norm_idx on public.learn_search_events (normalized, created_at desc);
create index if not exists learn_search_events_session_idx on public.learn_search_events (session_id, created_at desc);

create table if not exists public.learn_support_events (
  id bigint generated always as identity primary key,
  session_id text not null check (char_length(session_id) between 4 and 80),
  channel text not null check (channel in ('home','member')),
  user_id uuid,
  question text not null,
  normalized text not null,
  topic text,
  answer_source text not null check (answer_source in ('rule','kb','none')),
  kb_id bigint,
  answered boolean not null default false,
  unhelpful boolean not null default false,   -- 用户紧接着说“还是不行/没用”
  locale text,
  created_at timestamptz not null default now()
);
create index if not exists learn_support_events_norm_idx on public.learn_support_events (normalized, created_at desc);
create index if not exists learn_support_events_session_idx on public.learn_support_events (session_id, created_at desc);

-- ---------- 3. 缺口队列 ----------
create table if not exists public.learn_gaps (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('search','support')),
  normalized text not null,
  sample text not null,
  channel text,
  locale text,
  hits integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text not null default 'open'
    check (status in ('open','working','proposed','resolved','needs_human','ignored')),
  attempts smallint not null default 0,
  last_error text,
  resolution jsonb,
  updated_at timestamptz not null default now(),
  unique (kind, normalized)
);
create index if not exists learn_gaps_status_idx on public.learn_gaps (status, hits desc, last_seen desc);

-- ---------- 4. 学到的东西（同义词 / 知识库），带版本 ----------
create table if not exists public.learn_synonyms (
  id bigint generated always as identity primary key,
  term text not null,
  term_norm text not null,
  expansions text[] not null check (cardinality(expansions) between 1 and 12),
  role text not null default 'expansion' check (role in ('core','expansion')),
  category text,
  locale text not null default 'zh',
  source text not null check (source in ('mined','ai','web','admin')),
  evidence jsonb not null default '{}'::jsonb,
  verified_hits integer not null default 0,
  status text not null default 'pending' check (status in ('pending','active','disabled')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid,
  unique (term_norm, role)
);

create table if not exists public.learn_kb (
  id bigint generated always as identity primary key,
  kind text not null default 'support' check (kind in ('support','material_draft')),
  channel text not null default 'any' check (channel in ('any','home','member')),
  question text not null,
  q_norm text not null,
  answer_zh text not null,
  answer_en text,
  answer_km text,
  tags text[] not null default '{}',
  source text not null check (source in ('admin','ai','web','site')),
  source_url text,
  evidence jsonb not null default '{}'::jsonb,
  risk text not null default 'low' check (risk in ('low','high')),
  status text not null default 'pending' check (status in ('pending','active','disabled')),
  version integer not null default 1,
  hits integer not null default 0,
  unhelpful integer not null default 0,
  gap_id bigint references public.learn_gaps(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);
create index if not exists learn_kb_active_idx on public.learn_kb (kind, status);
create index if not exists learn_kb_qnorm_trgm on public.learn_kb using gin (q_norm extensions.gin_trgm_ops);

-- 版本历史：每次改内容前存旧快照，用于回滚
create table if not exists public.learn_history (
  id bigint generated always as identity primary key,
  table_name text not null check (table_name in ('learn_synonyms','learn_kb')),
  row_id bigint not null,
  version integer not null,
  snapshot jsonb not null,
  changed_at timestamptz not null default now(),
  changed_by uuid
);
create index if not exists learn_history_row_idx on public.learn_history (table_name, row_id, version desc);

create or replace function public.learn_version_trigger()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['status','hits','unhelpful','verified_hits','updated_at','approved_at','approved_by','version'])
     is distinct from
     (to_jsonb(old) - array['status','hits','unhelpful','verified_hits','updated_at','approved_at','approved_by','version'])
     or new.status is distinct from old.status then
    insert into public.learn_history(table_name,row_id,version,snapshot,changed_by)
    values (tg_table_name, old.id, old.version, to_jsonb(old), auth.uid());
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists learn_synonyms_version on public.learn_synonyms;
create trigger learn_synonyms_version before update on public.learn_synonyms
  for each row execute function public.learn_version_trigger();
drop trigger if exists learn_kb_version on public.learn_kb;
create trigger learn_kb_version before update on public.learn_kb
  for each row execute function public.learn_version_trigger();

-- ---------- 5. 权限：表全部锁死，只走 RPC ----------
alter table public.learn_settings       enable row level security;
alter table public.learn_search_events  enable row level security;
alter table public.learn_support_events enable row level security;
alter table public.learn_gaps           enable row level security;
alter table public.learn_synonyms       enable row level security;
alter table public.learn_kb             enable row level security;
alter table public.learn_history        enable row level security;

revoke all on public.learn_settings, public.learn_search_events, public.learn_support_events,
  public.learn_gaps, public.learn_synonyms, public.learn_kb, public.learn_history
  from anon, authenticated;

-- 管理员只读（后台以后可直接 select）
drop policy if exists learn_gaps_admin_read on public.learn_gaps;
create policy learn_gaps_admin_read on public.learn_gaps for select to authenticated using (public.gyx_is_active_admin());
drop policy if exists learn_synonyms_admin_read on public.learn_synonyms;
create policy learn_synonyms_admin_read on public.learn_synonyms for select to authenticated using (public.gyx_is_active_admin());
drop policy if exists learn_kb_admin_read on public.learn_kb;
create policy learn_kb_admin_read on public.learn_kb for select to authenticated using (public.gyx_is_active_admin());
grant select on public.learn_gaps, public.learn_synonyms, public.learn_kb to authenticated;

-- ---------- 6. 浏览器可调 RPC（限流、截断、脱敏） ----------
create or replace function public.learn_log_search(
  p_session text, p_query text, p_category text default null, p_mode text default 'manual',
  p_round integer default 1, p_result_count integer default 0, p_strict_count integer default 0,
  p_fill_count integer default 0, p_picked_ids bigint[] default '{}', p_picked_texts text[] default '{}',
  p_completed boolean default false, p_locale text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare q text := public.learn_redact(left(trim(coalesce(p_query,'')),200));
begin
  if char_length(coalesce(p_session,'')) not between 4 and 80 or char_length(q) < 1 then return; end if;
  -- 每个会话每小时最多 60 条，防刷
  if (select count(*) from public.learn_search_events
      where session_id = p_session and created_at > now() - interval '1 hour') >= 60 then return; end if;
  insert into public.learn_search_events(session_id,user_id,query,normalized,category,mode,round,
    result_count,strict_count,fill_count,picked_ids,picked_texts,completed,locale)
  values (p_session, auth.uid(), q, public.learn_norm(q),
    nullif(left(coalesce(p_category,''),40),''),
    case when p_mode in ('manual','auto') then p_mode else null end,
    greatest(1,least(coalesce(p_round,1),6)),
    greatest(0,least(coalesce(p_result_count,0),1000)),
    greatest(0,least(coalesce(p_strict_count,0),1000)),
    greatest(0,least(coalesce(p_fill_count,0),5)),
    coalesce(p_picked_ids[1:12],'{}'),
    coalesce((select array_agg(left(x,120)) from unnest(p_picked_texts[1:12]) x),'{}'),
    coalesce(p_completed,false),
    left(coalesce(p_locale,''),10));
end $$;

create or replace function public.learn_log_support(
  p_session text, p_channel text, p_question text, p_topic text default null,
  p_source text default 'none', p_kb_id bigint default null, p_answered boolean default false,
  p_locale text default null)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare q text := public.learn_redact(left(trim(coalesce(p_question,'')),500)); new_id bigint;
begin
  if char_length(coalesce(p_session,'')) not between 4 and 80 or char_length(q) < 1
     or p_channel not in ('home','member') then return null; end if;
  if (select count(*) from public.learn_support_events
      where session_id = p_session and created_at > now() - interval '1 hour') >= 40 then return null; end if;
  insert into public.learn_support_events(session_id,channel,user_id,question,normalized,topic,answer_source,kb_id,answered,locale)
  values (p_session, p_channel, auth.uid(), q, public.learn_norm(q), left(coalesce(p_topic,''),40),
    case when p_source in ('rule','kb','none') then p_source else 'none' end,
    p_kb_id, coalesce(p_answered,false), left(coalesce(p_locale,''),10))
  returning id into new_id;
  if p_source = 'kb' and p_kb_id is not null then
    update public.learn_kb set hits = hits + 1 where id = p_kb_id and status = 'active';
  end if;
  return new_id;
end $$;

-- 用户回复“还是不行/没用” → 上一条答案记为没帮上
create or replace function public.learn_mark_support_unhelpful(p_session text, p_event_id bigint)
returns void language plpgsql security definer set search_path = ''
as $$
declare k bigint;
begin
  update public.learn_support_events set unhelpful = true
   where id = p_event_id and session_id = p_session and unhelpful = false
     and created_at > now() - interval '30 minutes'
  returning kb_id into k;
  if k is not null then update public.learn_kb set unhelpful = unhelpful + 1 where id = k; end if;
end $$;

-- 运行时读取：已启用同义词
create or replace function public.learn_get_synonyms()
returns table(term_norm text, expansions text[], role text, category text)
language sql stable security definer set search_path = ''
as $$
  select s.term_norm, s.expansions, s.role, s.category
  from public.learn_synonyms s where s.status = 'active'
  order by s.verified_hits desc, s.id limit 2000;
$$;

-- 运行时读取：客服知识库查找（只返回已启用条目）
create or replace function public.learn_support_lookup(p_question text, p_locale text default 'zh', p_channel text default 'home')
returns table(kb_id bigint, answer text, score real)
language sql stable security definer set search_path = ''
as $$
  with q as (select public.learn_norm(p_question) s)
  select k.id,
    case when p_locale like 'en%' and coalesce(k.answer_en,'') <> '' then k.answer_en
         when p_locale like 'km%' and coalesce(k.answer_km,'') <> '' then k.answer_km
         else k.answer_zh end,
    greatest(extensions.similarity(k.q_norm, q.s),
             case when char_length(k.q_norm) >= 2 and q.s like '%'||k.q_norm||'%' then 0.9 else 0 end)::real as score
  from public.learn_kb k, q
  where k.kind = 'support' and k.status = 'active' and k.channel in ('any', p_channel)
    and char_length(q.s) >= 2
    -- 被多次说“没用”的答案自动降级不再出
    and not (k.unhelpful >= 3 and k.unhelpful * 2 > k.hits)
    and (extensions.similarity(k.q_norm, q.s) >= 0.35 or (char_length(k.q_norm) >= 2 and q.s like '%'||k.q_norm||'%'))
  order by score desc, k.hits desc limit 1;
$$;

revoke all on function public.learn_log_search(text,text,text,text,integer,integer,integer,integer,bigint[],text[],boolean,text) from public;
revoke all on function public.learn_log_support(text,text,text,text,text,bigint,boolean,text) from public;
revoke all on function public.learn_mark_support_unhelpful(text,bigint) from public;
revoke all on function public.learn_get_synonyms() from public;
revoke all on function public.learn_support_lookup(text,text,text) from public;
grant execute on function public.learn_log_search(text,text,text,text,integer,integer,integer,integer,bigint[],text[],boolean,text) to anon, authenticated;
grant execute on function public.learn_log_support(text,text,text,text,text,bigint,boolean,text) to anon, authenticated;
grant execute on function public.learn_mark_support_unhelpful(text,bigint) to anon, authenticated;
grant execute on function public.learn_get_synonyms() to anon, authenticated;
grant execute on function public.learn_support_lookup(text,text,text) to anon, authenticated;

-- ---------- 7. 后台学习（只给 service_role / cron） ----------
-- 7a. 把“没搜到 / 没答上 / 被说没用”的问题汇总进缺口队列；已解决但还在失败的自动重开
create or replace function public.learn_refresh_gaps()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare n_search int := 0; n_support int := 0; min_hits int := coalesce((public.learn_setting('min_hits_for_gap','1'::jsonb))::text::int,1);
        keep_days int := coalesce((public.learn_setting('event_retention_days','180'::jsonb))::text::int,180);
begin
  with bad as (
    select normalized, (array_agg(query order by created_at desc))[1] sample,
           (array_agg(locale order by created_at desc))[1] loc, count(*) c, max(created_at) last_at
    from public.learn_search_events
    where created_at > now() - interval '14 days'
      and ((round = 1 and (result_count = 0 or strict_count < 3 or fill_count >= 2))
           or (round between 2 and 5 and fill_count >= 1))   -- 后面几轮凑不满 5 个方向 = 资料深度不够
      and char_length(normalized) >= 2 and normalized !~ '^[0-9]+$'
    group by normalized having count(*) >= min_hits
  ), up as (
    insert into public.learn_gaps as g (kind, normalized, sample, locale, hits, last_seen)
    select 'search', normalized, sample, loc, c, last_at from bad
    on conflict (kind, normalized) do update
      set hits = excluded.hits, last_seen = excluded.last_seen, sample = excluded.sample, updated_at = now(),
          status = case when g.status in ('resolved','proposed') and excluded.last_seen > coalesce((g.resolution->>'resolved_at')::timestamptz, g.updated_at)
                          and g.attempts < 5 then 'open' else g.status end
    returning 1
  ) select count(*) into n_search from up;

  with bad as (
    select normalized, (array_agg(question order by created_at desc))[1] sample,
           (array_agg(channel order by created_at desc))[1] ch,
           (array_agg(locale order by created_at desc))[1] loc, count(*) c, max(created_at) last_at
    from public.learn_support_events
    where created_at > now() - interval '14 days' and (answered = false or unhelpful = true)
      and char_length(normalized) >= 2 and normalized !~ '^[0-9]+$'
    group by normalized having count(*) >= min_hits
  ), up as (
    insert into public.learn_gaps as g (kind, normalized, sample, channel, locale, hits, last_seen)
    select 'support', normalized, sample, ch, loc, c, last_at from bad
    on conflict (kind, normalized) do update
      set hits = excluded.hits, last_seen = excluded.last_seen, sample = excluded.sample, updated_at = now(),
          status = case when g.status in ('resolved','proposed') and excluded.last_seen > coalesce((g.resolution->>'resolved_at')::timestamptz, g.updated_at)
                          and g.attempts < 5 then 'open' else g.status end
    returning 1
  ) select count(*) into n_support from up;

  delete from public.learn_search_events  where created_at < now() - make_interval(days => keep_days);
  delete from public.learn_support_events where created_at < now() - make_interval(days => keep_days);
  -- 卡在 working 超过 1 小时的放回队列
  update public.learn_gaps set status = 'open' where status = 'working' and updated_at < now() - interval '1 hour';
  return jsonb_build_object('search_gaps', n_search, 'support_gaps', n_support);
end $$;

-- 7b. 从“成功会话”里学：用户手动选完 5 轮的原始问题 → 他选中资料的关键词 = 同义扩展
create or replace function public.learn_mine_synonyms()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare n int := 0; auto boolean := coalesce((public.learn_setting('auto_activate_synonyms','false'::jsonb))::text::boolean,false);
begin
  with ok as (
    select e.normalized, (array_agg(e.query order by e.created_at desc))[1] q, e.category,
           array_agg(distinct pid) pids, count(distinct e.session_id) sessions
    from public.learn_search_events e
    cross join lateral unnest(e.picked_ids) pid
    where e.completed and e.mode = 'manual' and e.created_at > now() - interval '30 days'
      and char_length(e.normalized) between 2 and 24
      -- 只学“第一轮没搜好但用户仍然走完”的问题
      and exists (select 1 from public.learn_search_events f where f.session_id = e.session_id and f.round = 1
                  and (f.strict_count < 3 or f.fill_count >= 1))
    group by e.normalized, e.category
  ), kw as (
    select ok.normalized, ok.q, ok.category, ok.sessions,
           (select array_agg(k order by c desc) from (
              select k, count(*) c from public.product_answer_options p, unnest(p.keywords) k
              where p.id = any(ok.pids) and char_length(k) between 2 and 12
              group by k order by count(*) desc limit 6) z) exps
    from ok
  ), up as (
    insert into public.learn_synonyms as s (term, term_norm, expansions, role, category, source, evidence, verified_hits, status)
    select q, normalized, exps, 'expansion', category, 'mined',
           jsonb_build_object('sessions', sessions, 'mined_at', now()), sessions,
           case when auto and sessions >= 2 then 'active' else 'pending' end
    from kw where exps is not null and cardinality(exps) >= 1
    on conflict (term_norm, role) do update
      set expansions = (select array_agg(x) from (select distinct x from unnest(s.expansions || excluded.expansions) x limit 12) z),
          verified_hits = greatest(s.verified_hits, excluded.verified_hits),
          evidence = s.evidence || excluded.evidence
      where s.source in ('mined') and s.status <> 'disabled'
    returning 1
  ) select count(*) into n from up;
  return jsonb_build_object('mined', n);
end $$;

-- 7c. 边缘函数鉴权：校验 cron 带来的密钥（密钥存 Vault，名字 gyx_learn_worker_secret）
create or replace function public.learn_check_worker_secret(p text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(p,'') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'gyx_learn_worker_secret' and decrypted_secret = p);
$$;

revoke all on function public.learn_refresh_gaps() from public, anon, authenticated;
revoke all on function public.learn_mine_synonyms() from public, anon, authenticated;
revoke all on function public.learn_check_worker_secret(text) from public, anon, authenticated;
revoke all on function public.learn_setting(text,jsonb) from public, anon, authenticated;
grant execute on function public.learn_refresh_gaps() to service_role;
grant execute on function public.learn_mine_synonyms() to service_role;
grant execute on function public.learn_check_worker_secret(text) to service_role;
grant execute on function public.learn_setting(text,jsonb) to service_role;
grant select, insert, update on public.learn_gaps, public.learn_synonyms, public.learn_kb to service_role;
grant select on public.learn_settings, public.learn_search_events, public.learn_support_events to service_role;

-- ---------- 8. 管理员审核 / 停用 / 回滚 / 手工录入 ----------
create or replace function public.learn_admin_set_status(p_table text, p_id bigint, p_status text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  if not public.gyx_is_active_admin() then raise exception 'ADMIN_ONLY'; end if;
  if p_status not in ('pending','active','disabled') then raise exception 'BAD_STATUS'; end if;
  if p_table = 'learn_synonyms' then
    update public.learn_synonyms set status = p_status,
      approved_at = case when p_status='active' then now() else approved_at end,
      approved_by = case when p_status='active' then auth.uid() else approved_by end where id = p_id;
  elsif p_table = 'learn_kb' then
    update public.learn_kb set status = p_status,
      approved_at = case when p_status='active' then now() else approved_at end,
      approved_by = case when p_status='active' then auth.uid() else approved_by end where id = p_id;
  else raise exception 'BAD_TABLE'; end if;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.learn_admin_rollback(p_table text, p_id bigint, p_version integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare snap jsonb;
begin
  if not public.gyx_is_active_admin() then raise exception 'ADMIN_ONLY'; end if;
  select snapshot into snap from public.learn_history
   where table_name = p_table and row_id = p_id and version = p_version order by id desc limit 1;
  if snap is null then raise exception 'VERSION_NOT_FOUND'; end if;
  if p_table = 'learn_synonyms' then
    update public.learn_synonyms set
      expansions = array(select jsonb_array_elements_text(snap->'expansions')),
      role = snap->>'role', category = snap->>'category', status = snap->>'status'
    where id = p_id;
  elsif p_table = 'learn_kb' then
    update public.learn_kb set
      question = snap->>'question', q_norm = snap->>'q_norm', answer_zh = snap->>'answer_zh',
      answer_en = snap->>'answer_en', answer_km = snap->>'answer_km',
      tags = array(select jsonb_array_elements_text(snap->'tags')), risk = snap->>'risk', status = snap->>'status'
    where id = p_id;
  else raise exception 'BAD_TABLE'; end if;
  return jsonb_build_object('ok', found, 'restored_version', p_version);
end $$;

-- 管理员手工录入/修改一条客服问答（最可靠的“训练数据”）
create or replace function public.learn_admin_upsert_kb(
  p_id bigint, p_question text, p_answer_zh text, p_answer_en text default null, p_answer_km text default null,
  p_tags text[] default '{}', p_channel text default 'any', p_status text default 'active')
returns bigint language plpgsql security definer set search_path = ''
as $$
declare rid bigint;
begin
  if not public.gyx_is_active_admin() then raise exception 'ADMIN_ONLY'; end if;
  if char_length(coalesce(p_question,'')) < 2 or char_length(coalesce(p_answer_zh,'')) < 2 then raise exception 'EMPTY'; end if;
  if p_id is null then
    insert into public.learn_kb(question,q_norm,answer_zh,answer_en,answer_km,tags,channel,source,status,approved_at,approved_by)
    values (p_question, public.learn_norm(p_question), p_answer_zh, p_answer_en, p_answer_km, coalesce(p_tags,'{}'),
            p_channel, 'admin', p_status, case when p_status='active' then now() end, case when p_status='active' then auth.uid() end)
    returning id into rid;
  else
    update public.learn_kb set question = p_question, q_norm = public.learn_norm(p_question), answer_zh = p_answer_zh,
      answer_en = p_answer_en, answer_km = p_answer_km, tags = coalesce(p_tags,'{}'), channel = p_channel, status = p_status
    where id = p_id returning id into rid;
  end if;
  return rid;
end $$;

-- 管理员一眼看清：待审核、缺口、失败
create or replace function public.learn_admin_overview(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare lim int := greatest(1, least(coalesce(p_limit,50), 200));
begin
  if not public.gyx_is_active_admin() then raise exception 'ADMIN_ONLY'; end if;
  return jsonb_build_object(
    'open_gaps', (select coalesce(jsonb_agg(g),'[]') from (select id,kind,sample,hits,status,attempts,last_error,resolution,last_seen from public.learn_gaps where status in ('open','needs_human','proposed') order by hits desc, last_seen desc limit lim) g),
    'pending_synonyms', (select coalesce(jsonb_agg(s),'[]') from (select id,term,expansions,role,category,source,verified_hits,evidence,created_at from public.learn_synonyms where status='pending' order by verified_hits desc, created_at desc limit lim) s),
    'pending_kb', (select coalesce(jsonb_agg(k),'[]') from (select id,kind,question,answer_zh,risk,source,source_url,created_at from public.learn_kb where status='pending' order by created_at desc limit lim) k),
    'stats', jsonb_build_object(
      'search_events_7d', (select count(*) from public.learn_search_events where created_at > now()-interval '7 days'),
      'support_events_7d', (select count(*) from public.learn_support_events where created_at > now()-interval '7 days'),
      'active_synonyms', (select count(*) from public.learn_synonyms where status='active'),
      'active_kb', (select count(*) from public.learn_kb where status='active' and kind='support')));
end $$;

revoke all on function public.learn_admin_set_status(text,bigint,text) from public, anon;
revoke all on function public.learn_admin_rollback(text,bigint,integer) from public, anon;
revoke all on function public.learn_admin_upsert_kb(bigint,text,text,text,text,text[],text,text) from public, anon;
revoke all on function public.learn_admin_overview(integer) from public, anon;
grant execute on function public.learn_admin_set_status(text,bigint,text) to authenticated;
grant execute on function public.learn_admin_rollback(text,bigint,integer) to authenticated;
grant execute on function public.learn_admin_upsert_kb(bigint,text,text,text,text,text[],text,text) to authenticated;
grant execute on function public.learn_admin_overview(integer) to authenticated;

-- 一键全停（出问题时）：
--   update public.learn_synonyms set status='disabled' where status='active';
--   update public.learn_kb set status='disabled' where status='active';
