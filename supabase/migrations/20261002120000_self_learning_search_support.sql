-- =====================================================================
-- 五轮搜索 + 在线客服 自我学习闭环（Self-learning loop）
-- 状态：2026-10-02 按安全审查 #4 #5 #11 #12 修订后上线（apply_migration）。
-- 修订要点：限流/去重按服务端可信身份（auth.uid() 或 cf-connecting-ip 哈希）而不是浏览器 session_id；
--   kb_id 必须是服务端刚返回过的；没用票按身份去重 + 每日上限；管理员录入答案不会被自动降级；
--   同义词挖掘只统计登录用户且 ≥5 个不同用户；缺口门槛 ≥3 个不同身份；客服答案永远人工审核。
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

-- 服务端可信身份：登录用户用 auth.uid()；匿名用 Cloudflare 的 cf-connecting-ip（客户端无法伪造）的加盐哈希。
-- 浏览器传来的 session_id 只做关联展示，不参与限流 / 去重 / 计票。
create or replace function public.learn_actor()
returns text language plpgsql stable security definer set search_path = ''
as $$
declare h json; ip text; uid uuid := auth.uid();
begin
  if uid is not null then return 'u:' || uid::text; end if;
  begin h := nullif(current_setting('request.headers', true), '')::json; exception when others then h := null; end;
  ip := coalesce(nullif(btrim(h->>'cf-connecting-ip'), ''),
                 nullif(btrim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', -1)), ''));
  if ip is null then return 'anon:unknown'; end if;
  return 'ip:' || left(encode(extensions.digest(ip || ':gyx-learn-v1', 'sha256'), 'hex'), 32);
end $$;

-- ---------- 1. 设置（默认全部需要人工审核） ----------
create table if not exists public.learn_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.learn_settings(key, value) values
  ('auto_activate_synonyms',        'false'::jsonb),  -- true = 验证通过的同义词自动上线
  ('min_hits_for_gap',              '3'::jsonb),      -- 至少 3 个不同身份（用户/IP 哈希）报告才算缺口，最低强制 3
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
  actor text not null default 'anon:unknown',
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
create index if not exists learn_search_events_actor_idx on public.learn_search_events (actor, created_at desc);
create index if not exists learn_search_events_created_idx on public.learn_search_events (created_at desc);

create table if not exists public.learn_support_events (
  id bigint generated always as identity primary key,
  session_id text not null check (char_length(session_id) between 4 and 80),
  actor text not null default 'anon:unknown',
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
create index if not exists learn_support_events_actor_idx on public.learn_support_events (actor, created_at desc);
create index if not exists learn_support_events_created_idx on public.learn_support_events (created_at desc);

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

-- #4：服务端记录“本次实际返回给这个身份的 kb 条目”，learn_log_support 只认这里的 kb_id
create table if not exists public.learn_support_served (
  id bigint generated always as identity primary key,
  actor text not null,
  kb_id bigint not null references public.learn_kb(id) on delete cascade,
  served_at timestamptz not null default now(),
  used boolean not null default false
);
create index if not exists learn_support_served_actor_idx on public.learn_support_served (actor, kb_id, served_at desc);
create index if not exists learn_support_served_time_idx on public.learn_support_served (served_at);

-- #4：没用票，每个身份对每条答案只算一次
create table if not exists public.learn_kb_votes (
  kb_id bigint not null references public.learn_kb(id) on delete cascade,
  actor text not null,
  voted_at timestamptz not null default now(),
  primary key (kb_id, actor)
);
create index if not exists learn_kb_votes_actor_idx on public.learn_kb_votes (actor, voted_at desc);
create index if not exists learn_kb_votes_time_idx on public.learn_kb_votes (kb_id, voted_at desc);

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
alter table public.learn_support_served enable row level security;
alter table public.learn_kb_votes       enable row level security;

revoke all on public.learn_settings, public.learn_search_events, public.learn_support_events,
  public.learn_gaps, public.learn_synonyms, public.learn_kb, public.learn_history,
  public.learn_support_served, public.learn_kb_votes
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
declare q text := public.learn_redact(left(trim(coalesce(p_query,'')),200)); a text := public.learn_actor();
begin
  if char_length(coalesce(p_session,'')) not between 4 and 80 or char_length(q) < 1 then return; end if;
  -- 每个可信身份每小时最多 60 条；全站每分钟最多 300 条（总闸门）
  if (select count(*) from public.learn_search_events
      where actor = a and created_at > now() - interval '1 hour') >= 60 then return; end if;
  if (select count(*) from public.learn_search_events
      where created_at > now() - interval '1 minute') >= 300 then return; end if;
  insert into public.learn_search_events(session_id,actor,user_id,query,normalized,category,mode,round,
    result_count,strict_count,fill_count,picked_ids,picked_texts,completed,locale)
  values (p_session, a, auth.uid(), q, public.learn_norm(q),
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
        a text := public.learn_actor(); kb bigint := null;
begin
  if char_length(coalesce(p_session,'')) not between 4 and 80 or char_length(q) < 1
     or p_channel not in ('home','member') then return null; end if;
  if (select count(*) from public.learn_support_events
      where actor = a and created_at > now() - interval '1 hour') >= 40 then return null; end if;
  if (select count(*) from public.learn_support_events
      where created_at > now() - interval '1 minute') >= 300 then return null; end if;
  -- 只接受 10 分钟内服务端真的返回给这个身份、且还没被记过的 kb_id（客户端传的 kb_id 不可信）
  if p_source = 'kb' and p_kb_id is not null then
    update public.learn_support_served s set used = true
     where s.id = (select s2.id from public.learn_support_served s2
                    where s2.actor = a and s2.kb_id = p_kb_id and s2.used = false
                      and s2.served_at > now() - interval '10 minutes'
                    order by s2.served_at desc limit 1)
    returning s.kb_id into kb;
  end if;
  insert into public.learn_support_events(session_id,actor,channel,user_id,question,normalized,topic,answer_source,kb_id,answered,locale)
  values (p_session, a, p_channel, auth.uid(), q, public.learn_norm(q), left(coalesce(p_topic,''),40),
    case when p_source in ('rule','kb','none') then p_source else 'none' end,
    kb, coalesce(p_answered,false), left(coalesce(p_locale,''),10))
  returning id into new_id;
  if kb is not null then
    update public.learn_kb set hits = hits + 1 where id = kb and status = 'active';
  end if;
  return new_id;
end $$;

-- 用户回复“还是不行/没用” → 上一条答案记为没帮上
create or replace function public.learn_mark_support_unhelpful(p_session text, p_event_id bigint)
returns void language plpgsql security definer set search_path = ''
as $$
declare k bigint; a text := public.learn_actor();
begin
  -- 事件必须属于同一个可信身份（不是浏览器自报的 session）
  update public.learn_support_events set unhelpful = true
   where id = p_event_id and actor = a and unhelpful = false
     and created_at > now() - interval '30 minutes'
  returning kb_id into k;
  if k is null then return; end if;
  -- 每个身份每天最多 20 票；每条答案每天最多计 10 票；同一身份对同一答案只计一次
  if (select count(*) from public.learn_kb_votes v where v.actor = a and v.voted_at > now() - interval '1 day') >= 20 then return; end if;
  if (select count(*) from public.learn_kb_votes v where v.kb_id = k and v.voted_at > now() - interval '1 day') >= 10 then return; end if;
  insert into public.learn_kb_votes(kb_id, actor) values (k, a) on conflict (kb_id, actor) do nothing;
  if found then update public.learn_kb set unhelpful = unhelpful + 1 where id = k; end if;
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

-- 运行时读取：客服知识库查找（只返回已启用条目）；返回的同时在服务端记下“给谁返回了哪条”
create or replace function public.learn_support_lookup(p_question text, p_locale text default 'zh', p_channel text default 'home')
returns table(kb_id bigint, answer text, score real)
language plpgsql volatile security definer set search_path = ''
as $$
declare a text := public.learn_actor(); qs text := public.learn_norm(p_question); r record;
begin
  if char_length(qs) < 2 then return; end if;
  if (select count(*) from public.learn_support_served s
       where s.actor = a and s.served_at > now() - interval '1 hour') >= 120 then return; end if;
  select k.id,
    case when p_locale like 'en%' and coalesce(k.answer_en,'') <> '' then k.answer_en
         when p_locale like 'km%' and coalesce(k.answer_km,'') <> '' then k.answer_km
         else k.answer_zh end as ans,
    greatest(extensions.similarity(k.q_norm, qs),
             case when char_length(k.q_norm) >= 2 and qs like '%'||k.q_norm||'%' then 0.9 else 0 end)::real as sc
    into r
  from public.learn_kb k
  where k.kind = 'support' and k.status = 'active' and k.channel in ('any', p_channel)
    -- 被多个不同身份说“没用”的非管理员答案自动降级；管理员录入的答案只提示复核，不会被刷下线
    and not (k.source <> 'admin' and k.unhelpful >= 5 and k.unhelpful * 2 > k.hits)
    and (extensions.similarity(k.q_norm, qs) >= 0.35 or (char_length(k.q_norm) >= 2 and qs like '%'||k.q_norm||'%'))
  order by sc desc, k.hits desc limit 1;
  if not found then return; end if;
  insert into public.learn_support_served(actor, kb_id) values (a, r.id);
  delete from public.learn_support_served where served_at < now() - interval '2 days';
  kb_id := r.id; answer := r.ans; score := r.sc;
  return next;
end $$;

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
declare n_search int := 0; n_support int := 0; min_hits int := greatest(3, coalesce((public.learn_setting('min_hits_for_gap','3'::jsonb))::text::int,3));
        keep_days int := coalesce((public.learn_setting('event_retention_days','180'::jsonb))::text::int,180);
begin
  with bad as (
    select normalized, (array_agg(query order by created_at desc))[1] sample,
           (array_agg(locale order by created_at desc))[1] loc, count(distinct actor) c, max(created_at) last_at
    from public.learn_search_events
    where created_at > now() - interval '14 days'
      and ((round = 1 and (result_count = 0 or strict_count < 3 or fill_count >= 2))
           or (round between 2 and 5 and fill_count >= 1))   -- 后面几轮凑不满 5 个方向 = 资料深度不够
      and char_length(normalized) >= 2 and normalized !~ '^[0-9]+$'
    group by normalized having count(distinct actor) >= min_hits
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
           (array_agg(locale order by created_at desc))[1] loc, count(distinct actor) c, max(created_at) last_at
    from public.learn_support_events
    where created_at > now() - interval '14 days' and (answered = false or unhelpful = true)
      and char_length(normalized) >= 2 and normalized !~ '^[0-9]+$'
    group by normalized having count(distinct actor) >= min_hits
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
           array_agg(distinct pid) pids, count(distinct e.user_id) users
    from public.learn_search_events e
    cross join lateral unnest(e.picked_ids) pid
    -- 只统计登录用户（匿名会话可无限伪造），且至少 5 个不同用户
    where e.completed and e.mode = 'manual' and e.user_id is not null and e.created_at > now() - interval '30 days'
      and char_length(e.normalized) between 2 and 24
      -- 只学“第一轮没搜好但用户仍然走完”的问题
      and exists (select 1 from public.learn_search_events f where f.session_id = e.session_id and f.user_id = e.user_id
                  and f.round = 1 and (f.strict_count < 3 or f.fill_count >= 1))
    group by e.normalized, e.category
    having count(distinct e.user_id) >= 5
  ), kw as (
    select ok.normalized, ok.q, ok.category, ok.users,
           (select array_agg(k order by c desc) from (
              select k, count(*) c from public.product_answer_options p, unnest(p.keywords) k
              where p.id = any(ok.pids) and char_length(k) between 2 and 12
              group by k order by count(*) desc limit 6) z) exps
    from ok
  ), up as (
    insert into public.learn_synonyms as s (term, term_norm, expansions, role, category, source, evidence, verified_hits, status)
    select q, normalized, exps, 'expansion', category, 'mined',
           jsonb_build_object('users', users, 'mined_at', now()), users,
           case when auto and users >= 5 then 'active' else 'pending' end
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

-- 7c. 边缘函数鉴权：learn-gap-worker 通过 public.gyx_internal_secret('gyx_learn_worker_secret')（仅 service_role）取 Vault 密钥，
--     在函数内做常量时间比较（见 supabase/functions/learn-gap-worker/index.ts）。

revoke all on function public.learn_refresh_gaps() from public, anon, authenticated;
revoke all on function public.learn_mine_synonyms() from public, anon, authenticated;
revoke all on function public.learn_actor() from public, anon, authenticated;
revoke all on function public.learn_version_trigger() from public, anon, authenticated;
revoke all on function public.learn_setting(text,jsonb) from public, anon, authenticated;
grant execute on function public.learn_refresh_gaps() to service_role;
grant execute on function public.learn_mine_synonyms() to service_role;
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
