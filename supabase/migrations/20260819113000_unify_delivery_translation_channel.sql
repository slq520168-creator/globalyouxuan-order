-- Delivery translations have one owner:
-- product_answer_options for reviewed static translations, and
-- order_delivery_translation_* for on-demand delivery translations.

-- Remove incomplete or mixed-language answer triples. The download edge will
-- translate these answers on demand and fall back to Chinese with a log if the
-- translation service is unavailable.
update public.product_answer_options
set title_en = null,
    answer_summary_en = null,
    answer_detail_en = null,
    updated_at = now()
where id in (41, 59, 134, 143, 157, 160)
   or concat_ws(' ', title_en, answer_summary_en, answer_detail_en) ~ '[㐀-鿿豈-﫿ក-៿]';

update public.product_answer_options
set title_km = null,
    answer_summary_km = null,
    answer_detail_km = null,
    updated_at = now()
where id in (41, 59, 134, 143, 157, 160)
   or concat_ws(' ', title_km, answer_summary_km, answer_detail_km) ~ '[㐀-鿿豈-﫿]'
   or concat_ws(' ', title_km, answer_summary_km, answer_detail_km)
      ~* '\m(agents?|agentic|prompts?|portfolios?|workflows?|clouds?|cloud-based)\M';

-- Failed translation attempts are retryable under the new worker. Remove the
-- old failed chunks first so no stale error can short-circuit a new delivery.
delete from public.order_delivery_translation_parts as part
using public.order_delivery_translation_cache as cache
where part.order_id = cache.order_id
  and part.locale = cache.locale
  and part.source_hash = cache.source_hash
  and cache.status = 'failed';

delete from public.order_delivery_translation_cache
where status = 'failed';

-- Retire duplicate and unused translation stores. No active client or RPC
-- reads these tables; product_answer_options is the sole reviewed answer table.
drop table if exists public.answer_translation_parts;
drop table if exists public.answer_translation_cache;
drop table if exists public.community_opportunity_translation_cache;
drop table if exists public.fixed_card_answer_options;

create or replace function public.claim_order_delivery_translation_part(
  p_order_id bigint,
  p_locale text,
  p_source_hash text
)
returns table(
  order_id bigint,
  locale text,
  source_hash text,
  chunk_index integer,
  source_text text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_active integer := 0;
begin
  -- Serialize claims for this order/locale/source while still allowing four
  -- different chunks to be translated concurrently.
  perform pg_advisory_xact_lock(
    hashtext('gyx_delivery_translation'),
    hashtext(p_order_id::text || ':' || p_locale || ':' || p_source_hash)
  );

  update public.order_delivery_translation_parts as part
     set status = 'pending',
         error_text = concat_ws(' | ', nullif(part.error_text, ''), 'stale worker recovered'),
         updated_at = v_now
   where part.order_id = p_order_id
     and part.locale = p_locale
     and part.source_hash = p_source_hash
     and part.status = 'processing'
     and part.updated_at < v_now - interval '90 seconds';

  select count(*)
    into v_active
    from public.order_delivery_translation_parts as part
   where part.order_id = p_order_id
     and part.locale = p_locale
     and part.source_hash = p_source_hash
     and part.status = 'processing'
     and part.updated_at >= v_now - interval '90 seconds';

  if v_active >= 4 then
    return;
  end if;

  return query
  with picked as (
    select part.order_id, part.locale, part.source_hash, part.chunk_index
      from public.order_delivery_translation_parts as part
     where part.order_id = p_order_id
       and part.locale = p_locale
       and part.source_hash = p_source_hash
       and part.status in ('pending', 'failed')
       and part.attempt_count < 5
     order by part.chunk_index
     for update skip locked
     limit 1
  ), claimed as (
    update public.order_delivery_translation_parts as part
       set status = 'processing',
           attempt_count = part.attempt_count + 1,
           error_text = null,
           updated_at = v_now
      from picked
     where part.order_id = picked.order_id
       and part.locale = picked.locale
       and part.source_hash = picked.source_hash
       and part.chunk_index = picked.chunk_index
    returning
      part.order_id,
      part.locale,
      part.source_hash,
      part.chunk_index,
      part.source_text,
      part.attempt_count
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_order_delivery_translation_part(bigint, text, text)
from public, anon, authenticated;
grant execute on function public.claim_order_delivery_translation_part(bigint, text, text)
to service_role;
