-- Open library (index of the Google Drive corpus) + five-round integration + legacy search speed-up.
-- Applied to production afzcohtnljnmucrkgcaz on 2026-10-04 via MCP migrations kb_open_library_schema_v1, kb_open_library_storage,
-- kb_terms_weight, kb_open_library_search_v5, kd_five_round_open_library, kd_final_plan_kb_title_fix, legacy_search_prefilter_*.
-- Data (kb_docs 16,478 rows, kb_terms 97,047, kb_shards 27) is loaded by tools/kb/load.py, not by this file.

-- GlobalYouXuan open knowledge library (index only; raw corpus lives in Google Drive 「AI资料库/全网提取资料_2026-10」)
create table if not exists public.kb_shards (
  no smallint primary key, name text not null unique, grp text not null, drive_file_id text, bytes bigint not null, records int not null
);
create table if not exists public.kb_docs (
  id bigint primary key check (id >= 9000000000),
  src text not null, lang text not null check (lang in ('zh','en')),
  cat text not null check (cat in ('personal_income','business_help','content_monetization')),
  tier text not null check (tier in ('standard','detailed','professional')),
  title text not null, summary text not null, keywords text[] not null default '{}',
  detail text not null, url text, shard smallint references public.kb_shards(no), line int,
  toks_t text[] not null default '{}', toks_b text[] not null default '{}',
  answer_option_id bigint references public.product_answer_options(id) on delete set null
);
create index if not exists kb_docs_toks_t_gin on public.kb_docs using gin (toks_t);
create index if not exists kb_docs_toks_b_gin on public.kb_docs using gin (toks_b);
create table if not exists public.kb_terms (term text primary key, df int not null);
create table if not exists public.kb_xlat (zh text primary key, en text[] not null);
create table if not exists public.kb_meta (key text primary key, value jsonb not null);
alter table public.kb_shards enable row level security;
alter table public.kb_docs enable row level security;
alter table public.kb_terms enable row level security;
alter table public.kb_xlat enable row level security;
alter table public.kb_meta enable row level security;
revoke all on public.kb_shards, public.kb_docs, public.kb_terms, public.kb_xlat, public.kb_meta from anon, authenticated;

insert into public.kb_xlat(zh, en) values
('赚钱', array['money','income','earn']::text[]),
('副业', array['side','income','freelance']::text[]),
('兼职', array['part','time','freelance']::text[]),
('收入', array['income','salary']::text[]),
('被动收入', array['passive','income']::text[]),
('理财', array['personal','finance','investing','budget']::text[]),
('投资', array['investing','investment']::text[]),
('股票', array['stock']::text[]),
('基金', array['fund','index']::text[]),
('储蓄', array['saving']::text[]),
('存钱', array['saving','budget']::text[]),
('预算', array['budget']::text[]),
('退休', array['retirement']::text[]),
('养老金', array['pension','retirement']::text[]),
('贷款', array['loan']::text[]),
('信用卡', array['credit','card']::text[]),
('债务', array['debt']::text[]),
('税', array['tax']::text[]),
('报税', array['tax','return']::text[]),
('保险', array['insurance']::text[]),
('房贷', array['mortgage']::text[]),
('买房', array['buying','house','mortgage']::text[]),
('租房', array['rent']::text[]),
('工资', array['salary']::text[]),
('加薪', array['raise','salary']::text[]),
('跳槽', array['job','change']::text[]),
('面试', array['interview']::text[]),
('简历', array['resume']::text[]),
('求职', array['job','search']::text[]),
('辞职', array['resign','quit']::text[]),
('老板', array['owner','manager']::text[]),
('同事', array['coworker']::text[]),
('职场', array['workplace','career']::text[]),
('升职', array['promotion']::text[]),
('绩效', array['performance','review']::text[]),
('远程', array['remote']::text[]),
('加班', array['overtime']::text[]),
('裁员', array['layoff']::text[]),
('自由职业', array['freelancing','freelancer']::text[]),
('接单', array['client','freelance']::text[]),
('客户', array['client','customer']::text[]),
('报价', array['quote','rate','pricing']::text[]),
('定价', array['pricing','price']::text[]),
('合同', array['contract']::text[]),
('发票', array['invoice']::text[]),
('外包', array['outsourcing']::text[]),
('网站', array['website']::text[]),
('建站', array['website','wordpress']::text[]),
('域名', array['domain']::text[]),
('服务器', array['server','hosting']::text[]),
('流量', array['traffic']::text[]),
('seo', array['seo']::text[]),
('搜索引擎', array['search','engine','seo']::text[]),
('谷歌', array['google']::text[]),
('广告', array['advertising','ad','adsense']::text[]),
('联盟营销', array['affiliate']::text[]),
('电商', array['ecommerce','online','store']::text[]),
('网店', array['online','store','ecommerce']::text[]),
('店铺', array['store','shop']::text[]),
('亚马逊', array['amazon']::text[]),
('支付', array['payment']::text[]),
('用户体验', array['user','experience','ux']::text[]),
('设计', array['design']::text[]),
('平面设计', array['graphic','design']::text[]),
('logo', array['logo']::text[]),
('品牌', array['brand','branding']::text[]),
('营销', array['marketing']::text[]),
('推广', array['promotion','marketing']::text[]),
('社交媒体', array['social','media']::text[]),
('视频', array['video']::text[]),
('剪辑', array['video','editing']::text[]),
('拍摄', array['shooting','camera']::text[]),
('摄影', array['photography','photo']::text[]),
('音频', array['audio']::text[]),
('播客', array['podcast']::text[]),
('直播', array['live','streaming']::text[]),
('写作', array['writing']::text[]),
('博客', array['blog']::text[]),
('电子书', array['ebook']::text[]),
('出版', array['publishing']::text[]),
('版权', array['copyright']::text[]),
('商标', array['trademark']::text[]),
('法律', array['law','legal']::text[]),
('公司', array['company','business']::text[]),
('创业', array['startup','business']::text[]),
('注册公司', array['company','registration','llc']::text[]),
('管理', array['management']::text[]),
('项目管理', array['project','management']::text[]),
('团队', array['team']::text[]),
('会议', array['meeting']::text[]),
('人工智能', array['artificial','intelligence','ai']::text[]),
('机器学习', array['machine','learning']::text[]),
('模型', array['model']::text[]),
('聊天机器人', array['chatbot']::text[]),
('提示词', array['prompt']::text[]),
('自动化', array['automation']::text[]),
('软件', array['software']::text[]),
('工具', array['tool']::text[]),
('经济', array['economic','economy']::text[]),
('通货膨胀', array['inflation']::text[]),
('利率', array['interest','rate']::text[]),
('汇率', array['exchange','rate','currency']::text[]),
('比特币', array['bitcoin']::text[]),
('加密货币', array['cryptocurrency']::text[]),
('手工', array['craft','handmade']::text[]),
('做菜', array['cooking']::text[]),
('餐厅', array['restaurant']::text[]),
('外卖', array['delivery','food']::text[]),
('移民', array['immigration','expat']::text[]),
('出国', array['abroad','expat']::text[]),
('签证', array['visa']::text[]),
('海外', array['oversea','expat']::text[]),
('开源', array['open','source']::text[]),
('数据', array['data']::text[]),
('分析', array['analysi','analytic']::text[]),
('量化', array['quantitative','trading']::text[]),
('交易', array['trading','trade']::text[]),
('期权', array['option']::text[]),
('产品经理', array['product','manager']::text[]),
('需求', array['requirement']::text[]),
('用户', array['user']::text[]),
('转化率', array['conversion','rate']::text[]),
('邮件', array['email']::text[]),
('订阅', array['subscription']::text[]),
('会员', array['membership','subscription']::text[]),
('课程', array['course']::text[]),
('教学', array['teaching','course']::text[]),
('翻译', array['translation']::text[]),
('变现', array['monetize','monetization']::text[]),
('小红书', array['social','media','content','creator']::text[]),
('抖音', array['tiktok','short','video']::text[]),
('自媒体', array['content','creator','blog','youtube']::text[]),
('youtube', array['youtube']::text[]),
('公众号', array['blog','newsletter']::text[]),
('私域', array['customer','community','email','list']::text[])
on conflict (zh) do update set en = excluded.en;

-- tokenizer: identical to /workspace/kb/tok.py (CJK bigrams + latin words, light plural stemming)
create or replace function public.kb_tokens(p text)
returns text[] language plpgsql immutable parallel safe set search_path = '' as $f$
declare
  s text := lower(coalesce(left(p, 4000), ''));
  run text; w text; i int; b text; o text[] := '{}';
  zs constant text[] := array['一个','一些','不是','也是','什么','他们','以及','但是','你们','关于','其中','可以','因为','如何','如果','对于','就是','已经','应该','怎么','怎样','我们','或者','所以','时候','没有','现在','由于','能够','自己','还是','这个','这些','进行','通过','那个','那些','都是','问题','需要']::text[];
  es constant text[] := array['a','about','all','also','an','and','another','answer','any','are','as','at','be','been','being','best','both','but','by','can','com','could','did','do','does','doing','don','each','else','few','for','from','get','got','had','has','have','having','he','help','her','him','how','http','https','i','if','in','into','is','it','its','just','like','made','make','may','me','might','more','most','must','my','need','no','not','now','of','on','one','only','or','other','our','over','own','question','s','same','score','shall','she','should','so','some','such','t','than','that','the','their','them','then','these','they','this','those','to','too','two','under','us','use','used','using','very','want','was','way','ways','we','were','what','when','where','which','who','whom','whose','why','will','with','would','www','you','your']::text[];
begin
  for run in select m[1] from regexp_matches(s, '([\u4e00-\u9fff]+)', 'g') as m loop
    continue when char_length(run) < 2;
    for i in 1 .. char_length(run) - 1 loop
      b := substr(run, i, 2);
      if not (b = any(zs)) then o := o || b; end if;
    end loop;
  end loop;
  for w in select m[1] from regexp_matches(s, '([a-z0-9][a-z0-9+#]*)', 'g') as m loop
    continue when char_length(w) < 2 or w = any(es) or w ~ '^[0-9]+$';
    if char_length(w) > 4 and right(w, 3) = 'ies' then w := left(w, -3) || 'y';
    elsif char_length(w) > 3 and right(w, 1) = 's' and right(w, 2) <> 'ss' then w := left(w, -1);
    end if;
    o := o || left(w, 24);
  end loop;
  return o;
end $f$;

alter table public.kb_docs alter column detail set compression lz4;
alter table public.kb_docs alter column summary set compression lz4;
alter table public.kb_docs set (toast_tuple_target = 256);
alter table public.kb_terms add column if not exists wt real not null default 1;

create or replace function public.kb_search(p_question text, p_category text default null, p_core text[] default '{}', p_exp text[] default '{}', p_limit int default 60)
returns table(id bigint, title text, answer_summary text, keywords text[], score double precision, coverage double precision)
language plpgsql stable security definer set search_path = '' as $f$
declare
  v_n double precision;
  v_q text := left(btrim(coalesce(p_question, '')), 200);
  v_cat text := case when p_category in ('personal_income','business_help','content_monetization') then p_category end;
  t jsonb;
  v_body double precision; v_thr double precision; v_xf double precision; v_tm double precision; v_pen double precision; v_xw double precision;
begin
  if char_length(v_q) < 2 then return; end if;
  select (m.value->>'n')::double precision into v_n from public.kb_meta m where m.key = 'stats';
  select m.value into t from public.kb_meta m where m.key = 'tuning';
  v_n := coalesce(v_n, 1);
  v_body := coalesce((t->>'body_cov')::float8, 0.85); v_thr := coalesce((t->>'thr')::float8, 0.5);
  v_xf := coalesce((t->>'xlat_factor')::float8, 0.85); v_tm := coalesce((t->>'title_mult')::float8, 3);
  v_pen := coalesce((t->>'unknown_pen')::float8, 0.6); v_xw := coalesce((t->>'xlat_w')::float8, 0.7);
  return query
  with raw as (
    select x.t, 1.0::double precision as w, true as direct from unnest(public.kb_tokens(v_q)) x(t)
    union all select x.t, 1.0, true from unnest(public.kb_tokens(array_to_string(coalesce(p_core[1:8], '{}'), ' '))) x(t)
    union all select x.t, 0.5, false from unnest(public.kb_tokens(array_to_string(coalesce(p_exp[1:12], '{}'), ' '))) x(t)
    union all select y.t, v_xw, false from public.kb_xlat x, unnest(x.en) y(t) where strpos(lower(v_q), x.zh) > 0
  ), qt as (
    select r.t, max(r.w) as w, bool_or(r.direct) as direct from raw r group by r.t
  ), qi as (
    select qt.t, qt.w * coalesce(k.wt, 1) as w, qt.w as w0, qt.direct, k.df,
           case when k.df is not null then ln(1 + v_n / k.df) end as idf,
           case when qt.t ~ '^[a-z0-9]' then 'en' else 'zh' end as lg
    from qt left join public.kb_terms k on k.term = qt.t
  ), known as (
    select qi.t, qi.w, qi.idf, qi.lg, qi.direct from qi where qi.df is not null and qi.df < v_n * 0.2
  ), den as (
    select coalesce(sum(k.w * k.idf) filter (where k.lg = 'zh'), 0) as tz,
           coalesce(sum(k.w * k.idf) filter (where k.lg = 'en'), 0)
             + coalesce((select sum(qi.w0) * ln(1 + v_n) * v_pen from qi where qi.df is null and qi.lg = 'en' and qi.t ~ '^[a-z]' and qi.direct), 0) as te,
           count(*) filter (where k.lg = 'zh' and k.w >= 1) as nz,
           count(*) filter (where k.lg = 'en') as ne,
           coalesce(bool_or(k.lg = 'en' and k.direct), false) as en_direct
    from known k
  ), rare as (
    select array_agg(k.t) as arr from (select known.t from known order by known.w * known.idf desc limit 8) k
  ), cand as (
    select d.id from public.kb_docs d, rare where rare.arr is not null and (d.toks_t && rare.arr or d.toks_b && rare.arr)
    limit 5000
  ), m as (
    select d.id, k.lg, k.w * k.idf as wi, k.w, (k.t = any(d.toks_t)) as in_t
    from cand c join public.kb_docs d on d.id = c.id
    join known k on (k.t = any(d.toks_t) or k.t = any(d.toks_b))
  ), sc as (
    select m.id,
           sum(m.wi * case when m.in_t then v_tm else 1.0 end) as s,
           coalesce(sum(m.wi * case when m.in_t then 1.0 else v_body end) filter (where m.lg = 'zh'), 0) as cz,
           coalesce(sum(m.wi * case when m.in_t then 1.0 else v_body end) filter (where m.lg = 'en'), 0) as ce,
           count(*) filter (where m.lg = 'zh' and m.w >= 1) as hz,
           count(*) filter (where m.lg = 'en') as he,
           count(*) filter (where m.in_t and m.w >= 1) as ht
    from m group by m.id
  ), cov as (
    select sc.*, greatest(
      case when den.tz > 0 and sc.hz >= case when den.nz >= 3 then 2 else 1 end then sc.cz / den.tz else 0 end,
      case when den.te > 0 and sc.he >= case when den.ne >= 3 or not den.en_direct then least(2, den.ne) else 1 end
           then sc.ce / den.te * case when den.en_direct then 1.0 else v_xf end else 0 end) as c
    from sc, den
  )
  select d.id, d.title, d.summary, d.keywords,
         (cov.s * (0.5 + cov.c) * (1 + 0.25 * least(cov.ht, 3)) * case when v_cat is not null and d.cat = v_cat then 1.15 else 1 end)::double precision,
         cov.c::double precision
  from cov join public.kb_docs d on d.id = cov.id
  where cov.c >= v_thr
  order by 5 desc, 1
  limit greatest(1, least(coalesce(p_limit, 60), 100));
end $f$;
revoke all on function public.kb_search(text, text, text[], text[], int) from public, anon, authenticated;
grant execute on function public.kb_search(text, text, text[], text[], int) to service_role;

insert into public.kb_meta(key, value) values ('tuning', '{"thr":0.6,"body_cov":0.85,"xlat_factor":0.85,"title_mult":3,"unknown_pen":0.6,"xlat_w":0.7}')
  on conflict (key) do nothing;

-- Five-round search now draws from curated answers + the open library (kb_docs). Signatures/grants unchanged.
create or replace function public.kd_pool_raw(p_question text, p_category text, p_core text[], p_exp text[])
returns table(id bigint, title text, answer_summary text, keywords text[], score double precision)
language sql stable set search_path = '' as $f$
  with q as (
    select public.kb_tokens(left(btrim(coalesce(p_question, '')), 200) || ' ' ||
             array_to_string(public.kd_clean_terms(p_core, 8), ' ') || ' ' ||
             array_to_string(public.kd_clean_terms(p_exp, 12), ' ')) as toks
  ), legacy as (
    select r.id, r.title, r.answer_summary, r.keywords, r.lexical_score as s
    from public.search_product_answers_hybrid_v3(
           case when p_category in ('personal_income','business_help','content_monetization')
                then '[GYXCAT:' || p_category || '] ' else '' end || left(btrim(coalesce(p_question, '')), 200),
           public.kd_clean_terms(p_core, 8), public.kd_clean_terms(p_exp, 12), '{}'::text[], 60) r
    join public.product_answer_options o on o.id = r.id
    cross join q
    where char_length(btrim(coalesce(p_question, ''))) >= 2
      and o.answer_code not like 'kb-%'
      and (r.core_hits >= 1 or (r.expansion_hits >= 2 and r.lexical_score >= 20))
      -- relevance gate: at least one meaningful query token must really occur in the answer (fixes gibberish matches)
      and public.kb_tokens(concat_ws(' ', o.title, o.title_en, array_to_string(o.keywords, ' '), array_to_string(o.keywords_en, ' '),
                                     o.answer_summary, o.answer_summary_en)) && q.toks
  ), kb as (
    select k.id, k.title, k.answer_summary, k.keywords, k.score as s
    from public.kb_search(p_question, p_category, p_core, p_exp, 60) k
  )
  select l.id, l.title, l.answer_summary, l.keywords, 10 + 100 * l.s / nullif(max(l.s) over (), 0) from legacy l
  union all
  select k.id, k.title, k.answer_summary, k.keywords, 100 * k.s / nullif(max(k.s) over (), 0) from kb k
$f$;
revoke all on function public.kd_pool_raw(text, text, text[], text[]) from public, anon, authenticated;
grant execute on function public.kd_pool_raw(text, text, text[], text[]) to service_role;

create or replace function public.kd_final_plan(p_question text, p_material_id bigint, p_category text default null, p_core text[] default '{}', p_exp text[] default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $f$
declare
  m record;
  pr record;
  kd record;
  v_id bigint := p_material_id;
begin
  if char_length(btrim(coalesce(p_question, ''))) < 2 or p_material_id is null then
    return jsonb_build_object('matched', false, 'reason', 'NO_MATERIAL');
  end if;
  if not exists (select 1 from public.kd_pool(p_question, p_category, p_core, p_exp) k where k.id = p_material_id) then
    return jsonb_build_object('matched', false, 'reason', 'MATERIAL_NOT_RELATED');
  end if;

  if p_material_id >= 9000000000 then
    -- open-library document: materialize a deliverable answer row once (tier decides the preset product/price)
    select d.id, d.title, d.summary, d.keywords, d.detail, d.tier, d.cat, d.lang, d.answer_option_id
      into kd from public.kb_docs d where d.id = p_material_id;
    if kd.id is null then
      return jsonb_build_object('matched', false, 'reason', 'NO_MATERIAL');
    end if;
    v_id := null;
    select o.id into v_id from public.product_answer_options o where o.id = kd.answer_option_id;
    if v_id is null then
      insert into public.product_answer_options(answer_code, module_code, title, answer_summary, keywords, product_id, priority, is_active,
                                                title_en, answer_summary_en, answer_detail_zh, answer_detail_en, source_name, search_category, search_subcategory)
      values ('kb-' || kd.id,
              case kd.cat when 'personal_income' then 'work' when 'content_monetization' then 'creation' else 'business' end,
              case when char_length(kd.title) >= 2 then left(kd.title, 80) else rpad(kd.title, 2, '.') end, case when char_length(kd.summary) >= 8 then left(kd.summary, 300) else rpad(kd.summary, 8, '.') end, coalesce(kd.keywords[1:8], '{}'),
              'answer-' || kd.tier, 50, true,
              case when kd.lang = 'en' then left(kd.title, 80) end, case when kd.lang = 'en' then left(kd.summary, 300) end,
              kd.detail, case when kd.lang = 'en' then kd.detail end,
              'GYX open library (CC BY-SA 4.0)', kd.cat, 'kb-open-library')
      on conflict (answer_code) do update set updated_at = now()
      returning id into v_id;
      update public.kb_docs set answer_option_id = v_id where id = kd.id;
    end if;
  end if;

  select o.id, o.title, o.answer_summary, o.keywords, o.product_id
    into m
  from public.product_answer_options o
  where o.id = v_id and o.is_active = true and o.product_id like 'answer-%';
  if m.id is null then
    return jsonb_build_object('matched', false, 'reason', 'NO_MATERIAL');
  end if;

  select p.id, p.product_name, p.product_price, p.currency, p.description
    into pr
  from public.products p
  where p.id = m.product_id and p.is_active = true;
  if pr.id is null or pr.product_price is null then
    return jsonb_build_object('matched', false, 'reason', 'NO_PRESET_PRICE');
  end if;

  return jsonb_build_object(
    'matched', true,
    'material', jsonb_build_object('id', m.id, 'title', m.title, 'answer_summary', m.answer_summary,
                                   'keywords', coalesce(to_jsonb(m.keywords[1:8]), '[]'::jsonb)),
    'product', jsonb_build_object('id', pr.id, 'product_name', pr.product_name, 'product_price', pr.product_price,
                                  'currency', coalesce(pr.currency, 'USDT'), 'description', pr.description, 'is_active', true),
    'tier', substr(pr.id, 8),
    'source', case when p_material_id >= 9000000000 then 'open-library' else 'curated' end
  );
end;
$f$;

-- cache key salted ('kb1|') so pre-library cached pools are not served
create or replace function public.kd_pool(p_question text, p_category text, p_core text[], p_exp text[])
returns table(id bigint, title text, answer_summary text, keywords text[], score double precision)
language plpgsql security definer set search_path = '' as $f$
declare
  v_cat text := case when p_category in ('personal_income','business_help','content_monetization') then p_category end;
  k text := md5('kb1|' || lower(btrim(coalesce(p_question, ''))) || '|' || coalesce(v_cat, '') || '|' ||
                array_to_string(public.kd_clean_terms(p_core, 8), ',') || '|' || array_to_string(public.kd_clean_terms(p_exp, 12), ','));
  v jsonb;
begin
  select c.rows into v from public.kd_pool_cache c where c.key = k and c.created_at > now() - interval '30 minutes';
  if v is null then
    select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'answer_summary', p.answer_summary,
                                                 'keywords', coalesce(to_jsonb(p.keywords), '[]'::jsonb), 'score', p.score)
                              order by p.score desc, p.id), '[]'::jsonb)
      into v
    from public.kd_pool_raw(p_question, v_cat, p_core, p_exp) p;
    insert into public.kd_pool_cache(key, rows, created_at) values (k, v, now())
      on conflict (key) do update set rows = excluded.rows, created_at = excluded.created_at;
    if random() < 0.05 then
      delete from public.kd_pool_cache where created_at < now() - interval '2 hours';
    end if;
  end if;
  return query
    select (e->>'id')::bigint, e->>'title', e->>'answer_summary',
           array(select jsonb_array_elements_text(coalesce(e->'keywords', '[]'::jsonb))), (e->>'score')::float8
    from jsonb_array_elements(v) e;
end;
$f$;


-- Legacy curated search: identical results, but only (row, term) pairs that can score > 0 are evaluated
-- (verified identical on 12 queries against the frozen copy search_product_answers_hybrid_base_orig; long English queries 3.3s -> 0.6s).
do $do$
declare d text; f text;
begin
  d := pg_get_functiondef('public.search_product_answers_hybrid_base(text,text[],text[],text[],integer)'::regprocedure);
  if strpos(d, 'p.hay like') > 0 then return; end if;
  execute replace(d, 'FUNCTION public.search_product_answers_hybrid_base(', 'FUNCTION public.search_product_answers_hybrid_base_orig(');
  f := replace(d, '), matches0 as (', $r$), cand as (
  select p.*, lower(coalesce(p.title,'') || ' ' || coalesce(array_to_string(p.keywords,' '),'') || ' ' || coalesce(p.answer_summary,'')) as hay
  from public.product_answer_options p cross join cfg
  where p.is_active=true and p.product_id like 'answer-%' and p.module_code in ('business','work','creation','automation')
    and (cfg.cat is null or p.search_category=cfg.cat)
), matches0 as ($r$);
  f := replace(f, '  from public.product_answer_options p cross join terms t cross join cfg', '  from cand p cross join terms t cross join cfg');
  f := replace(f, E'    and (cfg.cat is null or p.search_category=cfg.cat)\n), matches as (',
               E'    and (cfg.cat is null or p.search_category=cfg.cat)\n    and (p.hay like ''%'' || lower(t.term) || ''%''\n         or (char_length(t.term) >= 3 and exists (select 1 from unnest(coalesce(p.keywords, array[]::text[])) k where char_length(k) >= 3 and lower(t.term) like ''%'' || lower(k) || ''%'')))\n), matches as (');
  execute f;
end $do$;
revoke all on function public.search_product_answers_hybrid_base_orig(text,text[],text[],text[],integer) from public, anon, authenticated;
