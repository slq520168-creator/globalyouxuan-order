create or replace function public.submit_manual_payment_atomic(
  p_user_id uuid,
  p_order_id bigint,
  p_method text,
  p_reference text
)
returns table(
  submission_id bigint,
  order_no text,
  status text,
  quote_amount numeric,
  quote_currency text,
  usd_cny_rate numeric,
  locked boolean
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_order public.orders%rowtype;
  v_quote public.manual_payment_quotes%rowtype;
  v_sub public.manual_payment_submissions%rowtype;
  v_now timestamptz := now();
  v_method text := lower(trim(coalesce(p_method,'')));
  v_reference text := left(trim(coalesce(p_reference,'')),120);
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_order_id is null or p_order_id<=0 then raise exception 'VALID_ORDER_ID_REQUIRED' using errcode='23514'; end if;
  if v_method not in ('wechat','alipay','bank') then raise exception 'INVALID_METHOD' using errcode='23514'; end if;
  if length(v_reference)<3 then raise exception 'INVALID_REFERENCE' using errcode='23514'; end if;
  if not exists(
    select 1 from public.manual_payment_settings s
    where s.method=v_method and s.is_active=true and nullif(trim(s.account_value),'') is not null
  ) then raise exception 'PAYMENT_METHOD_NOT_AVAILABLE' using errcode='23514'; end if;

  select o.* into v_order
  from public.orders o
  where o.id=p_order_id and o.user_id=p_user_id
  for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode='P0002'; end if;

  if v_order.status='checking' then
    select m.* into v_sub
    from public.manual_payment_submissions m
    where m.order_id=v_order.id and m.user_id=p_user_id and m.status in ('submitted','checking')
    order by m.created_at desc limit 1;
    if v_sub.id is not null then
      update public.orders
      set payment_method=v_sub.method,updated_at=v_now
      where id=v_order.id and payment_method is distinct from v_sub.method;
      return query select v_sub.id,v_order.order_no,'checking'::text,v_sub.quote_amount,v_sub.quote_currency,v_sub.usd_cny_rate,true;
      return;
    end if;
    raise exception 'PAYMENT_ROUTE_LOCKED' using errcode='23514';
  end if;

  if v_order.status not in ('pending','failed') then raise exception 'ORDER_NOT_OPEN' using errcode='23514'; end if;
  if v_order.created_at is null or v_now >= v_order.created_at + interval '30 minutes' then
    update public.orders set status='expired',updated_at=v_now where id=v_order.id;
    raise exception 'ORDER_EXPIRED' using errcode='23514';
  end if;
  if v_order.txid is not null then raise exception 'PAYMENT_ROUTE_LOCKED' using errcode='23514'; end if;

  select q.* into v_quote
  from public.manual_payment_quotes q
  where q.order_id=v_order.id and q.user_id=p_user_id and q.expires_at>v_now
  order by q.created_at desc limit 1
  for update;
  if v_quote.id is null then raise exception 'QUOTE_EXPIRED' using errcode='23514'; end if;

  select m.* into v_sub
  from public.manual_payment_submissions m
  where m.order_id=v_order.id and m.user_id=p_user_id and m.status in ('submitted','checking')
  order by m.created_at desc limit 1;
  if v_sub.id is not null then
    update public.orders
    set payment_method=v_sub.method,updated_at=v_now
    where id=v_order.id and payment_method is distinct from v_sub.method;
    return query select v_sub.id,v_order.order_no,'checking'::text,v_sub.quote_amount,v_sub.quote_currency,v_sub.usd_cny_rate,true;
    return;
  end if;

  insert into public.manual_payment_submissions(
    order_id,user_id,method,reference,status,quote_amount,quote_currency,usd_cny_rate,quote_id
  ) values(
    v_order.id,p_user_id,v_method,v_reference,'submitted',v_quote.quote_amount,v_quote.quote_currency,v_quote.usd_cny_rate,v_quote.id
  ) returning * into v_sub;

  update public.orders
  set status='checking',payment_method=v_method,payment_submitted_at=v_now,updated_at=v_now
  where id=v_order.id;

  insert into public.member_inbox_messages(user_id,order_id,message_type,title,body,txid,dedupe_key,is_read)
  values(
    p_user_id,v_order.id,'manual_payment_submitted','付款凭证已提交，等待核验',
    '订单 '||v_order.order_no||' 的付款凭证已经提交，正在等待管理员核验，请勿重复付款。',
    null,'member_manual_payment_submitted:'||v_sub.id::text,false
  ) on conflict(dedupe_key) do nothing;

  return query select v_sub.id,v_order.order_no,'checking'::text,v_sub.quote_amount,v_sub.quote_currency,v_sub.usd_cny_rate,true;
end;
$function$;

revoke all on function public.submit_manual_payment_atomic(uuid,bigint,text,text) from public, anon, authenticated;
grant execute on function public.submit_manual_payment_atomic(uuid,bigint,text,text) to service_role;

with latest_submission as (
  select distinct on (m.order_id) m.order_id,m.method
  from public.manual_payment_submissions m
  where m.status in ('submitted','checking')
    and m.method in ('wechat','alipay','bank')
  order by m.order_id,m.created_at desc
)
update public.orders o
set payment_method=l.method,updated_at=now()
from latest_submission l
where o.id=l.order_id
  and o.status='checking'
  and o.payment_method is distinct from l.method;
