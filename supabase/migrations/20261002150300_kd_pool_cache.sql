-- Five-round search v3: the question's material pool is computed once (round 1) and cached for 30 minutes,
-- so rounds 2-5 and the final plan are instant and never hit the anon statement timeout (seen with no category).
-- kd_pool (uncached) is renamed kd_pool_raw; the new kd_pool is the cached wrapper used by kd_round_options/kd_final_plan.

create table if not exists public.kd_pool_cache (
  key text primary key,
  rows jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists kd_pool_cache_created_idx on public.kd_pool_cache(created_at);
alter table public.kd_pool_cache enable row level security;
revoke all on public.kd_pool_cache from anon, authenticated;

alter function public.kd_pool(text, text, text[], text[]) rename to kd_pool_raw;

create or replace function public.kd_pool(p_question text, p_category text, p_core text[], p_exp text[])
returns table(id bigint, title text, answer_summary text, keywords text[], score float8)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_cat text := case when p_category in ('personal_income','business_help','content_monetization') then p_category end;
  k text := md5(lower(btrim(coalesce(p_question, ''))) || '|' || coalesce(v_cat, '') || '|' ||
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
$$;
revoke all on function public.kd_pool(text, text, text[], text[]) from public, anon, authenticated;
revoke all on function public.kd_pool_raw(text, text, text[], text[]) from public, anon, authenticated;

alter function public.kd_round_options(text, int, text, bigint[], bigint[], text[], text[]) volatile;
alter function public.kd_final_plan(text, bigint, text, text[], text[]) volatile;
