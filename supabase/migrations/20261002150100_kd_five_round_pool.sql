-- Five-round search v2: one shared relevance pool, no second full-text pass per round (latency),
-- relevance = the material genuinely hits the question (core term hit, or >=2 expansion hits with a positive score).

create or replace function public.kd_pool(p_question text, p_category text, p_core text[], p_exp text[])
returns table(id bigint, title text, answer_summary text, keywords text[], score float8)
language sql
stable
set search_path = ''
as $$
  select r.id, r.title, r.answer_summary, r.keywords, r.lexical_score
  from public.search_product_answers_hybrid_v3(
         case when p_category in ('personal_income','business_help','content_monetization')
              then '[GYXCAT:' || p_category || '] ' else '' end || left(btrim(coalesce(p_question, '')), 200),
         public.kd_clean_terms(p_core, 8), public.kd_clean_terms(p_exp, 12), '{}'::text[], 60) r
  where char_length(btrim(coalesce(p_question, ''))) >= 2
    and (r.core_hits >= 1 or (r.expansion_hits >= 2 and r.lexical_score >= 20))
$$;
revoke all on function public.kd_pool(text, text, text[], text[]) from public, anon, authenticated;

create or replace function public.kd_round_options(
  p_question text,
  p_round int,
  p_category text default null,
  p_picked bigint[] default '{}'::bigint[],
  p_shown bigint[] default '{}'::bigint[],
  p_core text[] default '{}'::text[],
  p_exp text[] default '{}'::text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_picked bigint[] := coalesce(p_picked[1:30], '{}'::bigint[]);
  v_shown bigint[] := coalesce(p_shown[1:40], '{}'::bigint[]);
  v_pool_n int := 0;
  v_options jsonb := '[]'::jsonb;
begin
  if char_length(btrim(coalesce(p_question, ''))) < 2 or p_round is null or p_round not between 1 and 5 then
    return jsonb_build_object('matched', 0, 'round', p_round, 'options', '[]'::jsonb);
  end if;

  with pool as (
    select * from public.kd_pool(p_question, p_category, p_core, p_exp)
  ), hist as (
    -- terms of the materials the user picked in earlier rounds (public title/keywords only)
    select coalesce(public.kd_clean_terms(array_agg(t), 16), '{}'::text[]) as terms
    from pool p
    cross join lateral unnest(coalesce(p.keywords[1:6], '{}'::text[]) || array[p.title]) as t
    where p_round > 1 and p.id = any(v_picked)
  ), ranked as (
    select p.id, p.title, p.answer_summary, p.score,
      case when p.id = any(v_picked) then 2 when p.id = any(v_shown) then 1 else 0 end as seen_rank,
      (select count(*) from hist h, unnest(h.terms) ht
        where p.id <> all(v_picked)
          and (strpos(lower(coalesce(p.title, '')), lower(ht)) > 0
               or exists (select 1 from unnest(coalesce(p.keywords, '{}'::text[])) k where lower(k) = lower(ht))
               or strpos(lower(coalesce(p.answer_summary, '')), lower(ht)) > 0)) as hh,
      row_number() over (partition by lower(btrim(p.title)) order by p.score desc, p.id) as title_rn
    from pool p
  ), picked5 as (
    select * from ranked where title_rn = 1
    order by seen_rank, hh desc, score desc, id
    limit 5
  )
  select (select count(*) from pool),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', id,
           'title', title,
           'answer_summary', left(coalesce(answer_summary, ''), 240),
           'repeat', seen_rank > 0
         ) order by seen_rank, hh desc, score desc, id), '[]'::jsonb)
    into v_pool_n, v_options
  from picked5;

  return jsonb_build_object('matched', coalesce(v_pool_n, 0), 'round', p_round,
                            'options', case when coalesce(v_pool_n, 0) = 0 then '[]'::jsonb else v_options end);
end;
$$;

create or replace function public.kd_final_plan(
  p_question text,
  p_material_id bigint,
  p_category text default null,
  p_core text[] default '{}'::text[],
  p_exp text[] default '{}'::text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m record;
  pr record;
begin
  if char_length(btrim(coalesce(p_question, ''))) < 2 or p_material_id is null then
    return jsonb_build_object('matched', false, 'reason', 'NO_MATERIAL');
  end if;
  if not exists (select 1 from public.kd_pool(p_question, p_category, p_core, p_exp) k where k.id = p_material_id) then
    return jsonb_build_object('matched', false, 'reason', 'MATERIAL_NOT_RELATED');
  end if;

  select o.id, o.title, o.answer_summary, o.keywords, o.product_id
    into m
  from public.product_answer_options o
  where o.id = p_material_id and o.is_active = true and o.product_id like 'answer-%';
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
    'tier', substr(pr.id, 8)
  );
end;
$$;

revoke all on function public.kd_round_options(text, int, text, bigint[], bigint[], text[], text[]) from public;
revoke all on function public.kd_final_plan(text, bigint, text, text[], text[]) from public;
grant execute on function public.kd_round_options(text, int, text, bigint[], bigint[], text[], text[]) to anon, authenticated;
grant execute on function public.kd_final_plan(text, bigint, text, text[], text[]) to anon, authenticated;
