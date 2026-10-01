-- Five-round search decided server-side: every option is a real product_answer_options row that
-- matches the user's question; the final plan is one real material priced by its preset product.
-- Also closes an underpricing hole: an order's answer_id must belong to the ordered product tier.

create or replace function public.kd_clean_terms(p_terms text[], p_max int)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce((
    select array_agg(t order by first_ord)
    from (
      select btrim(x) as t, min(ord) as first_ord
      from unnest(coalesce(p_terms, '{}'::text[])) with ordinality as u(x, ord)
      where char_length(btrim(x)) between 2 and 24
      group by btrim(x)
      order by min(ord)
      limit greatest(0, least(coalesce(p_max, 0), 24))
    ) s
  ), '{}'::text[])
$$;

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
  v_q text := left(btrim(coalesce(p_question, '')), 200);
  v_cat text := case when p_category in ('personal_income','business_help','content_monetization') then p_category end;
  v_query text;
  v_core text[] := public.kd_clean_terms(p_core, 8);
  v_exp text[] := public.kd_clean_terms(p_exp, 12);
  v_picked bigint[] := coalesce(p_picked[1:30], '{}'::bigint[]);
  v_shown bigint[] := coalesce(p_shown[1:40], '{}'::bigint[]);
  v_hist text[] := '{}'::text[];
  v_pool_n int := 0;
  v_options jsonb := '[]'::jsonb;
begin
  if char_length(v_q) < 2 or p_round is null or p_round not between 1 and 5 then
    return jsonb_build_object('matched', 0, 'round', p_round, 'options', '[]'::jsonb);
  end if;
  v_query := case when v_cat is not null then '[GYXCAT:' || v_cat || '] ' else '' end || v_q;

  with pool0 as (
    select r.id, r.title, r.answer_summary, r.keywords, r.lexical_score as score
    from public.search_product_answers_hybrid_v3(v_query, v_core, v_exp, '{}'::text[], 60) r
  ), pool as (
    -- keep only materials that genuinely match the question: absolute floor + relative to best match
    select p.* from pool0 p
    where p.score >= greatest(20, (select max(score) from pool0) * 0.3)
  ), hist as (
    select public.kd_clean_terms(array_agg(t), 16) as terms
    from pool p
    cross join lateral unnest(coalesce(p.keywords[1:6], '{}'::text[]) || array[p.title]) as t
    where p_round > 1 and p.id = any(v_picked)
  ), rr as (
    select r.id, r.history_hits, r.lexical_score
    from hist h
    cross join lateral public.search_product_answers_hybrid_v3(v_query, v_core, v_exp, h.terms, 100) r
    where cardinality(coalesce(h.terms, '{}'::text[])) > 0
  ), ranked as (
    select p.id, p.title, p.answer_summary,
      case when p.id = any(v_picked) then 2 when p.id = any(v_shown) then 1 else 0 end as seen_rank,
      coalesce(x.history_hits, 0) as hh,
      coalesce(x.lexical_score, p.score) as s2,
      row_number() over (partition by lower(btrim(p.title)) order by p.score desc, p.id) as title_rn
    from pool p
    left join rr x on x.id = p.id
  ), picked5 as (
    select * from ranked where title_rn = 1
    order by seen_rank, hh desc, s2 desc, id
    limit 5
  )
  select (select count(*) from pool),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', id,
           'title', title,
           'answer_summary', left(coalesce(answer_summary, ''), 240),
           'repeat', seen_rank > 0
         ) order by seen_rank, hh desc, s2 desc, id), '[]'::jsonb)
    into v_pool_n, v_options
  from picked5;

  if coalesce(v_pool_n, 0) = 0 then
    return jsonb_build_object('matched', 0, 'round', p_round, 'options', '[]'::jsonb);
  end if;

  return jsonb_build_object('matched', v_pool_n, 'round', p_round, 'options', v_options);
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
  v_q text := left(btrim(coalesce(p_question, '')), 200);
  v_cat text := case when p_category in ('personal_income','business_help','content_monetization') then p_category end;
  v_query text;
  v_top float8;
  v_score float8;
  m record;
  pr record;
begin
  if char_length(v_q) < 2 or p_material_id is null then
    return jsonb_build_object('matched', false, 'reason', 'NO_MATERIAL');
  end if;
  v_query := case when v_cat is not null then '[GYXCAT:' || v_cat || '] ' else '' end || v_q;
  select max(r.lexical_score), max(r.lexical_score) filter (where r.id = p_material_id)
    into v_top, v_score
  from public.search_product_answers_hybrid_v3(v_query, public.kd_clean_terms(p_core, 8), public.kd_clean_terms(p_exp, 12), '{}'::text[], 60) r;
  if v_score is null or v_score < greatest(20, v_top * 0.3) then
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

revoke all on function public.kd_clean_terms(text[], int) from public, anon, authenticated;
revoke all on function public.kd_round_options(text, int, text, bigint[], bigint[], text[], text[]) from public;
revoke all on function public.kd_final_plan(text, bigint, text, text[], text[]) from public;
grant execute on function public.kd_round_options(text, int, text, bigint[], bigint[], text[], text[]) to anon, authenticated;
grant execute on function public.kd_final_plan(text, bigint, text, text[], text[]) to anon, authenticated;

-- Order guard: an order that references an answer must be for that answer's own preset product.
create or replace function private.order_answer_product_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product text;
begin
  if new.answer_id is not null then
    select o.product_id into v_product
    from public.product_answer_options o
    where o.id = new.answer_id and o.is_active = true;
    if v_product is null or v_product is distinct from new.product_id then
      raise exception 'ANSWER_PRODUCT_MISMATCH' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.order_answer_product_guard() from public, anon, authenticated;
drop trigger if exists orders_11_answer_product_guard on public.orders;
create trigger orders_11_answer_product_guard
  before insert on public.orders
  for each row execute function private.order_answer_product_guard();
