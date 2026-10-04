-- Five-round search: each UI language shows only content in that language.
-- zh: unchanged. en: English open-library docs + curated rows with title_en.
-- km: Khmer rows (title_km) when any exist for the question, otherwise English (never CJK).
drop function if exists public.kd_round_options(text, integer, text, bigint[], bigint[], text[], text[]);
create function public.kd_round_options(p_question text, p_round integer, p_category text default null,
  p_picked bigint[] default '{}', p_shown bigint[] default '{}', p_core text[] default '{}', p_exp text[] default '{}',
  p_lang text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_lang text := case when lower(coalesce(p_lang, '')) in ('en', 'km') then lower(p_lang) else 'zh' end;
  v_picked bigint[] := coalesce(p_picked[1:30], '{}'::bigint[]);
  v_shown bigint[] := coalesce(p_shown[1:40], '{}'::bigint[]);
  v_pool_n int := 0;
  v_options jsonb := '[]'::jsonb;
begin
  if char_length(btrim(coalesce(p_question, ''))) < 2 or p_round is null or p_round not between 1 and 5 then
    return jsonb_build_object('matched', 0, 'round', p_round, 'options', '[]'::jsonb);
  end if;

  with pool0 as (
    select * from public.kd_pool(p_question, p_category, p_core, p_exp)
  ), pool1 as (
    select p.id, p.keywords, p.score, l.title, l.answer_summary
    from pool0 p
    left join public.product_answer_options o on p.id < 9000000000 and o.id = p.id
    left join public.kb_docs d on p.id >= 9000000000 and d.id = p.id
    cross join lateral (
      select
        case when v_lang = 'zh' then p.title
             when p.id >= 9000000000 then case when d.lang = 'en' then p.title end
             when v_lang = 'km' and nullif(btrim(o.title_km), '') is not null then btrim(o.title_km)
             else nullif(btrim(o.title_en), '') end as title,
        case when v_lang = 'zh' then p.answer_summary
             when p.id >= 9000000000 then p.answer_summary
             when v_lang = 'km' and nullif(btrim(o.title_km), '') is not null then coalesce(nullif(btrim(o.answer_summary_km), ''), '')
             else coalesce(nullif(btrim(o.answer_summary_en), ''), '') end as answer_summary
    ) l
    where v_lang = 'zh' or (l.title is not null and l.title !~ '[\u3400-\u9fff]')
  ), pool as (
    -- km: if any Khmer material exists for this question, show only Khmer; otherwise English (never CJK)
    select * from pool1 p
    where v_lang <> 'km' or p.title ~ '[\u1780-\u17ff]'
       or not exists (select 1 from pool1 x where x.title ~ '[\u1780-\u17ff]')
  ), hist as (
    select coalesce(public.kd_clean_terms(array_agg(t), 16), '{}'::text[]) as terms
    from pool p
    cross join lateral unnest(coalesce(p.keywords[1:6], '{}'::text[]) || array[p.title]) as t
    where p_round > 1 and p.id = any(v_picked)
  ), ranked as (
    select p.id, p.title,
      case when v_lang <> 'zh' and p.answer_summary ~ '[\u3400-\u9fff]' then '' else p.answer_summary end as answer_summary,
      p.score,
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
           'id', id, 'title', title, 'answer_summary', left(coalesce(answer_summary, ''), 240), 'repeat', seen_rank > 0
         ) order by seen_rank, hh desc, score desc, id), '[]'::jsonb)
    into v_pool_n, v_options
  from picked5;

  return jsonb_build_object('matched', coalesce(v_pool_n, 0), 'round', p_round, 'lang', v_lang,
                            'options', case when coalesce(v_pool_n, 0) = 0 then '[]'::jsonb else v_options end);
end;
$function$;
revoke all on function public.kd_round_options(text, integer, text, bigint[], bigint[], text[], text[], text) from public;
grant execute on function public.kd_round_options(text, integer, text, bigint[], bigint[], text[], text[], text) to anon, authenticated, service_role;

drop function if exists public.kd_final_plan(text, bigint, text, text[], text[]);
create function public.kd_final_plan(p_question text, p_material_id bigint, p_category text default null,
  p_core text[] default '{}', p_exp text[] default '{}', p_lang text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_lang text := case when lower(coalesce(p_lang, '')) in ('en', 'km') then lower(p_lang) else 'zh' end;
  m record;
  pr record;
  kd record;
  v_id bigint := p_material_id;
  v_title text;
  v_summary text;
begin
  if char_length(btrim(coalesce(p_question, ''))) < 2 or p_material_id is null then
    return jsonb_build_object('matched', false, 'reason', 'NO_MATERIAL');
  end if;
  if not exists (select 1 from public.kd_pool(p_question, p_category, p_core, p_exp) k where k.id = p_material_id) then
    return jsonb_build_object('matched', false, 'reason', 'MATERIAL_NOT_RELATED');
  end if;

  if p_material_id >= 9000000000 then
    select d.id, d.title, d.summary, d.keywords, d.detail, d.tier, d.cat, d.lang, d.answer_option_id
      into kd from public.kb_docs d where d.id = p_material_id;
    if kd.id is null then
      return jsonb_build_object('matched', false, 'reason', 'NO_MATERIAL');
    end if;
    if v_lang <> 'zh' and kd.lang <> 'en' then
      return jsonb_build_object('matched', false, 'reason', 'NO_LOCALIZED_MATERIAL');
    end if;
    v_id := null;
    select o.id into v_id from public.product_answer_options o where o.id = kd.answer_option_id;
    if v_id is null then
      insert into public.product_answer_options(answer_code, module_code, title, answer_summary, keywords, product_id, priority, is_active,
                                                title_en, answer_summary_en, answer_detail_zh, answer_detail_en, source_name, search_category, search_subcategory)
      values ('kb-' || kd.id,
              case kd.cat when 'personal_income' then 'work' when 'content_monetization' then 'creation' else 'business' end,
              case when char_length(kd.title) >= 2 then left(kd.title, 80) else rpad(kd.title, 2, '.') end,
              case when char_length(kd.summary) >= 8 then left(kd.summary, 300) else rpad(kd.summary, 8, '.') end,
              coalesce(kd.keywords[1:8], '{}'),
              'answer-' || kd.tier, 50, true,
              case when kd.lang = 'en' then left(kd.title, 80) end, case when kd.lang = 'en' then left(kd.summary, 300) end,
              kd.detail, case when kd.lang = 'en' then kd.detail end,
              'GYX open library (CC BY-SA 4.0)', kd.cat, 'kb-open-library')
      on conflict (answer_code) do update set updated_at = now()
      returning id into v_id;
      update public.kb_docs set answer_option_id = v_id where id = kd.id;
    end if;
  end if;

  select o.id, o.title, o.answer_summary, o.keywords, o.product_id, o.title_en, o.title_km, o.answer_summary_en, o.answer_summary_km
    into m
  from public.product_answer_options o
  where o.id = v_id and o.is_active = true and o.product_id like 'answer-%';
  if m.id is null then
    return jsonb_build_object('matched', false, 'reason', 'NO_MATERIAL');
  end if;

  if v_lang = 'zh' then
    v_title := m.title; v_summary := m.answer_summary;
  elsif v_lang = 'km' and nullif(btrim(m.title_km), '') is not null then
    v_title := btrim(m.title_km); v_summary := coalesce(nullif(btrim(m.answer_summary_km), ''), '');
  elsif p_material_id >= 9000000000 then
    v_title := coalesce(nullif(btrim(m.title_en), ''), m.title); v_summary := coalesce(nullif(btrim(m.answer_summary_en), ''), m.answer_summary);
  else
    v_title := nullif(btrim(m.title_en), ''); v_summary := coalesce(nullif(btrim(m.answer_summary_en), ''), '');
  end if;
  if v_lang <> 'zh' and (v_title is null or v_title ~ '[\u3400-\u9fff]') then
    return jsonb_build_object('matched', false, 'reason', 'NO_LOCALIZED_MATERIAL');
  end if;
  if v_lang <> 'zh' and v_summary ~ '[\u3400-\u9fff]' then v_summary := ''; end if;

  select p.id, p.product_name, p.product_price, p.currency, p.description
    into pr
  from public.products p
  where p.id = m.product_id and p.is_active = true;
  if pr.id is null or pr.product_price is null then
    return jsonb_build_object('matched', false, 'reason', 'NO_PRESET_PRICE');
  end if;

  return jsonb_build_object(
    'matched', true,
    'material', jsonb_build_object('id', m.id, 'title', v_title, 'answer_summary', v_summary,
                                   'keywords', case when v_lang = 'zh' then coalesce(to_jsonb(m.keywords[1:8]), '[]'::jsonb) else '[]'::jsonb end),
    'product', jsonb_build_object('id', pr.id, 'product_name', pr.product_name, 'product_price', pr.product_price,
                                  'currency', coalesce(pr.currency, 'USDT'), 'description', pr.description, 'is_active', true),
    'tier', substr(pr.id, 8),
    'lang', v_lang,
    'source', case when p_material_id >= 9000000000 then 'open-library' else 'curated' end
  );
end;
$function$;
revoke all on function public.kd_final_plan(text, bigint, text, text[], text[], text) from public;
grant execute on function public.kd_final_plan(text, bigint, text, text[], text[], text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
