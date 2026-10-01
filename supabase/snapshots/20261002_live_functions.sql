-- Live snapshot of public/private function definitions and ACLs, project afzcohtnljnmucrkgcaz.
-- Generated 2026-10-02 (UTC+8) via pg_get_functiondef. Reference only: NOT a migration, do not apply blindly.

-- public.admin_delete_nonpaid_orders()
CREATE OR REPLACE FUNCTION public.admin_delete_nonpaid_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count integer;
begin
  if not exists(select 1 from public.admin_users where user_id=auth.uid() and is_active=true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  with d as (
    delete from public.orders where status <> 'paid' returning id
  ) select count(*) into v_count from d;
  insert into public.admin_action_audit(admin_user_id,action,target,detail)
  values(auth.uid(),'delete_nonpaid_orders','orders',jsonb_build_object('deleted',v_count));
  return v_count;
end;
$function$
;

-- public.admin_delete_order(bigint)
CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_status text;
begin
  if not exists(select 1 from public.admin_users where user_id=auth.uid() and is_active=true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  select status into v_status from public.orders where id=p_order_id;
  if v_status is null then return false; end if;
  if v_status='paid' then raise exception 'PAID_ORDER_PROTECTED'; end if;
  delete from public.orders where id=p_order_id;
  insert into public.admin_action_audit(admin_user_id,action,target,detail)
  values(auth.uid(),'delete_order',p_order_id::text,jsonb_build_object('status',v_status));
  return true;
end;
$function$
;

-- public.admin_list_auth_sessions()
CREATE OR REPLACE FUNCTION public.admin_list_auth_sessions()
 RETURNS TABLE(user_id uuid, email text, session_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, not_after timestamp with time zone, refreshed_at timestamp without time zone, user_agent text, ip inet)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.user_id=auth.uid() and a.is_active=true
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  return query
  select
    u.id::uuid,
    u.email::text,
    s.id::uuid,
    s.created_at::timestamptz,
    s.updated_at::timestamptz,
    s.not_after::timestamptz,
    s.refreshed_at::timestamp without time zone,
    s.user_agent::text,
    s.ip::inet
  from auth.sessions s
  join auth.users u on u.id=s.user_id
  order by s.updated_at desc
  limit 500;
end;
$function$
;

-- public.admin_list_auth_sessions(uuid)
CREATE OR REPLACE FUNCTION public.admin_list_auth_sessions(p_admin_uid uuid)
 RETURNS TABLE(user_id uuid, email text, session_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, not_after timestamp with time zone, refreshed_at timestamp without time zone, user_agent text, ip inet)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_admin_uid is null or not exists (
    select 1 from public.admin_users a where a.user_id=p_admin_uid and a.is_active=true
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  return query
  select
    u.id::uuid,
    u.email::text,
    s.id::uuid,
    s.created_at::timestamptz,
    s.updated_at::timestamptz,
    s.not_after::timestamptz,
    s.refreshed_at::timestamp without time zone,
    s.user_agent::text,
    s.ip::inet
  from auth.sessions s
  join auth.users u on u.id=s.user_id
  order by s.updated_at desc
  limit 500;
end;
$function$
;

-- public.admin_reject_manual_payment(bigint,text)
CREATE OR REPLACE FUNCTION public.admin_reject_manual_payment(p_order_id bigint, p_reason text DEFAULT '付款信息未通过，请重新提交'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_admin boolean;
  v_order public.orders%rowtype;
  v_sub public.manual_payment_submissions%rowtype;
  v_reason text:=left(trim(coalesce(p_reason,'付款信息未通过，请重新提交')),300);
begin
  select exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.is_active=true) into v_admin;
  if not v_admin then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select o.* into v_order from public.orders o where o.id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode='P0002'; end if;
  select m.* into v_sub from public.manual_payment_submissions m where m.order_id=v_order.id and m.status='submitted' order by m.created_at desc limit 1 for update;
  if not found then raise exception 'MANUAL_SUBMISSION_NOT_FOUND' using errcode='P0002'; end if;
  update public.manual_payment_submissions set status='rejected', rejection_reason=v_reason, reviewed_at=now(), updated_at=now() where id=v_sub.id;
  update public.orders set status='failed', updated_at=now() where id=v_order.id and status='checking';
  insert into public.member_inbox_messages(user_id,order_id,message_type,title,body,dedupe_key,is_read)
  values(v_order.user_id,v_order.id,'manual_payment','付款信息未通过',v_reason||'。请返回订单重新提交正确的付款信息。','manual_payment_rejected:'||v_sub.id::text,false)
  on conflict(dedupe_key) do nothing;
  insert into public.notification_outbox(event_type,order_id,dedupe_key,payload)
  values('manual_payment_rejected',v_order.id,'manual_payment_rejected:'||v_sub.id::text,jsonb_build_object('submission_id',v_sub.id,'method',v_sub.method,'reference',v_sub.reference,'reason',v_reason,'order_no',v_order.order_no))
  on conflict(dedupe_key) do nothing;
  return true;
end;
$function$
;

-- public.aimusic_record_play(uuid)
CREATE OR REPLACE FUNCTION public.aimusic_record_play(track_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare new_plays bigint;
begin
  update public.aimusic_tracks
  set plays = plays + 1
  where id = track_id and status = 'approved'
  returning plays into new_plays;
  return coalesce(new_plays,0);
end;
$function$
;

-- public.auto_hide_stale_checking_orders_after_one_hour()
CREATE OR REPLACE FUNCTION public.auto_hide_stale_checking_orders_after_one_hour()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  affected integer;
begin
  update public.orders
  set hidden_by_user = true,
      updated_at = now()
  where status = 'checking'
    and hidden_by_user is false
    and payment_submitted_at is not null
    and payment_submitted_at <= now() - interval '1 hour';

  get diagnostics affected = row_count;
  return affected;
end;
$function$
;

-- private.capture_txid()
CREATE OR REPLACE FUNCTION private.capture_txid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.txid is not distinct from old.txid then
    return new;
  end if;

  if old.status not in ('pending','failed') then
    raise exception 'ORDER_NOT_OPEN_FOR_PAYMENT' using errcode = '23514';
  end if;

  if old.status = 'pending' and old.txid is not null then
    raise exception 'ORDER_NOT_OPEN_FOR_PAYMENT' using errcode = '23514';
  end if;

  new.txid := upper(trim(new.txid));
  if new.txid !~ '^[0-9A-F]{64}$' then
    raise exception 'INVALID_TRON_TXID' using errcode = '23514';
  end if;

  new.status := 'checking';
  new.payment_submitted_at := now();
  new.paid_at := null;
  new.delivered_at := null;
  new.updated_at := now();

  insert into public.payments
    (order_id, user_id, txid, expected_amount, status, submitted_at)
  values
    (old.id, old.user_id, new.txid, old.payable_amount, 'submitted', now());

  return new;
end;
$function$
;

-- public.claim_download(uuid,bigint)
CREATE OR REPLACE FUNCTION public.claim_download(p_user_id uuid, p_order_id bigint)
 RETURNS TABLE(grant_id bigint, product_id text, bucket_id text, object_path text, original_filename text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  return query
  with claimed as (
    update public.download_grants dg
    set download_count = dg.download_count + 1,
        last_downloaded_at = now(),
        status = case
          when dg.download_count + 1 >= dg.max_downloads then 'used'
          else dg.status
        end,
        updated_at = now()
    where dg.order_id = p_order_id
      and dg.user_id = p_user_id
      and dg.status = 'active'
      and dg.expires_at > now()
      and dg.download_count < dg.max_downloads
      and exists (
        select 1
        from public.product_files pf0
        where pf0.product_id = dg.product_id
          and pf0.is_active = true
      )
    returning dg.id, dg.product_id
  )
  select c.id, c.product_id, pf.bucket_id, pf.object_path, pf.original_filename
  from claimed c
  join public.product_files pf on pf.product_id = c.product_id
  where pf.is_active = true;
end;
$function$
;

-- public.claim_notifications(integer)
CREATE OR REPLACE FUNCTION public.claim_notifications(p_limit integer DEFAULT 20)
 RETURNS TABLE(id bigint, event_type text, order_id bigint, payload jsonb, attempt_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  with picked as (
    select n.id
    from public.notification_outbox n
    where (
      (n.status in ('pending','failed') and n.next_attempt_at <= now())
      or (n.status = 'processing' and n.locked_at < now() - interval '5 minutes')
    )
      and n.attempt_count < 10
    order by n.next_attempt_at, n.id
    for update skip locked
    limit least(greatest(coalesce(p_limit,20),1),100)
  ), updated as (
    update public.notification_outbox n
    set status='processing',
        attempt_count=n.attempt_count+1,
        locked_at=now(),
        updated_at=now()
    from picked p
    where n.id=p.id
    returning n.id,n.event_type,n.order_id,n.payload,n.attempt_count
  )
  select u.id,u.event_type,u.order_id,u.payload,u.attempt_count from updated u;
end;
$function$
;

-- public.claim_order_delivery_translation_part(bigint,text,text)
CREATE OR REPLACE FUNCTION public.claim_order_delivery_translation_part(p_order_id bigint, p_locale text, p_source_hash text)
 RETURNS TABLE(order_id bigint, locale text, source_hash text, chunk_index integer, source_text text, attempt_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- public.claim_payment_verifications(integer)
CREATE OR REPLACE FUNCTION public.claim_payment_verifications(p_limit integer DEFAULT 20)
 RETURNS TABLE(order_id bigint, order_no text, user_id uuid, product_id text, product_name text, payable_amount numeric, txid text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  with candidates as (
    select p.id as payment_id
    from public.payments p
    join public.orders o on o.id = p.order_id
    where o.status = 'checking'
      and o.txid is not null
      and p.status in ('submitted','verifying')
      and (p.checked_at is null or p.checked_at < now() - interval '30 seconds')
    order by coalesce(p.checked_at,p.submitted_at),p.id
    for update of p skip locked
    limit least(greatest(coalesce(p_limit,20),1),100)
  ), marked as (
    update public.payments p
    set status='verifying', checked_at=now()
    from candidates c
    where p.id=c.payment_id
    returning p.order_id,p.txid
  )
  select o.id,o.order_no,o.user_id,o.product_id,o.product_name,o.payable_amount,o.txid,
         least(
           o.created_at,
           coalesce((select min(p2.submitted_at) from public.payments p2 where p2.txid=o.txid), o.created_at)
         ) as created_at
  from marked m
  join public.orders o on o.id=m.order_id;
end;
$function$
;

-- public.community_opportunity_public_feed_v1()
CREATE OR REPLACE FUNCTION public.community_opportunity_public_feed_v1()
 RETURNS TABLE(id uuid, title text, batch_code text, opportunity_no integer, batch_key text, opportunity_status text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with eligible as (
    select
      f.id,
      f.title,
      f.batch_code,
      f.opportunity_no,
      f.batch_key,
      f.opportunity_status,
      f.created_at
    from public.community_external_feed f
    where f.opportunity_status = 'open'
      and f.created_at >= now() - interval '36 hours'
      and f.batch_code in ('A', 'B')
  ),
  latest_batch as (
    select distinct on (e.batch_code)
      e.batch_code,
      e.batch_key
    from eligible e
    order by e.batch_code, e.created_at desc
  )
  select
    e.id,
    e.title,
    e.batch_code,
    e.opportunity_no,
    e.batch_key,
    e.opportunity_status
  from eligible e
  join latest_batch b
    on b.batch_code = e.batch_code
   and b.batch_key = e.batch_key
  order by e.batch_code, e.opportunity_no
  limit 40;
$function$
;

-- public.community_opportunity_public_stats()
CREATE OR REPLACE FUNCTION public.community_opportunity_public_stats()
 RETURNS TABLE(today_published bigint, request_users bigint, confirmed_orders bigint)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select s.today_published, s.request_users, s.confirmed_orders
  from public.community_public_stats_snapshot s
  where s.id = 1;
$function$
;

-- public.community_opportunity_public_stats_v2()
CREATE OR REPLACE FUNCTION public.community_opportunity_public_stats_v2()
 RETURNS TABLE(today_published bigint, confirmed_users bigint, confirmed_orders bigint, request_users bigint)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select s.today_published, s.confirmed_users, s.confirmed_orders, s.request_users
  from public.community_public_stats_snapshot s
  where s.id = 1;
$function$
;

-- public.community_opportunity_public_stats_v3()
CREATE OR REPLACE FUNCTION public.community_opportunity_public_stats_v3()
 RETURNS TABLE(today_published bigint, today_taken bigint, remaining bigint, cumulative_taken bigint)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select s.today_published, s.today_taken, s.remaining, s.cumulative_taken
  from public.community_public_stats_snapshot s
  where s.id = 1;
$function$
;

-- public.community_public_stats_snapshot_trigger()
CREATE OR REPLACE FUNCTION public.community_public_stats_snapshot_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.refresh_community_public_stats_snapshot();
  return null;
end;
$function$
;

-- public.community_validate_text()
CREATE OR REPLACE FUNCTION public.community_validate_text()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare t text:=lower(coalesce(new.body,'')); hit text; begin if t ~ '(https?://|www\.|[a-z0-9-]+\.(com|net|org|io|ai|app|xyz|top|vip|cc|me|co|cn|hk|tw|kh)(/|\b))' then raise exception '禁止发布网址或外部链接'; end if; select term into hit from public.community_blocked_terms where is_active and position(lower(term) in t)>0 limit 1; if hit is not null then raise exception '内容包含社区禁用词'; end if; return new; end $function$
;

-- public.complete_payment(bigint,text,numeric,text,text)
CREATE OR REPLACE FUNCTION public.complete_payment(p_order_id bigint, p_txid text, p_received_amount numeric, p_from_address text, p_to_address text)
 RETURNS TABLE(order_no text, status text, download_ready boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_has_file boolean;
  v_final_status text;
  v_now timestamptz := now();
  v_updated integer;
  v_answer_id bigint;
  v_answer_title text;
begin
  select o.* into v_order from public.orders o where o.id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode='P0002'; end if;
  if v_order.txid is distinct from upper(trim(p_txid)) then raise exception 'ORDER_TXID_MISMATCH' using errcode='23514'; end if;
  if v_order.status in ('paid','delivered') then
    return query select v_order.order_no,v_order.status,(v_order.status='delivered' or v_order.answer_id is not null); return;
  end if;
  if v_order.status<>'checking' then raise exception 'ORDER_NOT_AWAITING_VERIFICATION' using errcode='23514'; end if;

  if v_order.answer_id is null then
    select a.id,a.title into v_answer_id,v_answer_title
    from public.product_answer_options a
    where a.product_id=v_order.product_id and a.is_active=true
    order by (case when v_order.product_id like '%-trial' then a.priority else -a.priority end) asc, a.id asc
    limit 1;
    if v_answer_id is not null then
      update public.orders o set answer_id=v_answer_id,matched_answer_title=v_answer_title,
        answer_tier=coalesce(nullif(o.answer_tier,''),'standard')
      where o.id=v_order.id returning o.* into v_order;
    end if;
  end if;

  select exists(select 1 from public.product_files pf where pf.product_id=v_order.product_id and pf.is_active=true) into v_has_file;
  v_final_status:=case when v_has_file or v_order.answer_id is not null then 'delivered' else 'paid' end;

  update public.payments p set status='confirmed',checked_at=v_now,confirmed_at=v_now,
    received_amount=p_received_amount,from_address=nullif(trim(p_from_address),''),to_address=nullif(trim(p_to_address),''),rejection_reason=null
  where p.order_id=v_order.id and p.txid=v_order.txid;
  get diagnostics v_updated=row_count;
  if v_updated<>1 then raise exception 'PAYMENT_ROW_NOT_FOUND' using errcode='P0002'; end if;

  update public.orders o set status=v_final_status,paid_at=v_now,
    delivered_at=case when v_final_status='delivered' then v_now else null end
  where o.id=v_order.id returning o.* into v_order;

  return query select v_order.order_no,v_order.status,(v_order.status='delivered' or v_order.answer_id is not null);
end;
$function$
;

-- public.consume_telegram_binding_challenge(text,bigint,text,text,text)
CREATE OR REPLACE FUNCTION public.consume_telegram_binding_challenge(p_challenge text, p_chat_id bigint, p_telegram_username text, p_first_name text, p_bot_username text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_consumed boolean;
begin
  if p_challenge is null or p_challenge !~ '^[a-f0-9]{36}$' then
    return false;
  end if;
  if p_chat_id is null or p_chat_id <= 0 then
    return false;
  end if;
  if lower(trim(coalesce(p_bot_username, ''))) <> 'globalyouxuan_notify_bot' then
    return false;
  end if;

  update private.telegram_binding_challenge
  set consumed_at = now()
  where singleton = true
    and consumed_at is null
    and expires_at > now()
    and token_hash = extensions.digest(p_challenge, 'sha256')
  returning true into v_consumed;

  if coalesce(v_consumed, false) is not true then
    return false;
  end if;

  insert into private.telegram_notification_recipient
    (singleton, chat_id, telegram_username, first_name, bot_username, confirmed_at, updated_at)
  values
    (
      true,
      p_chat_id,
      nullif(left(trim(coalesce(p_telegram_username, '')), 100), ''),
      nullif(left(trim(coalesce(p_first_name, '')), 100), ''),
      'globalyouxuan_notify_bot',
      now(),
      now()
    )
  on conflict (singleton) do update
  set chat_id = excluded.chat_id,
      telegram_username = excluded.telegram_username,
      first_name = excluded.first_name,
      bot_username = excluded.bot_username,
      confirmed_at = now(),
      updated_at = now();

  return true;
end;
$function$
;

-- public.count_recent_support_messages(text)
CREATE OR REPLACE FUNCTION public.count_recent_support_messages(p_ip text)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select count(*)::integer
  from public.support_conversation_messages m
  join public.support_conversations c on c.id=m.conversation_id
  where coalesce(c.ip_address::text,'')=coalesce(p_ip,'')
    and m.created_at > now()-interval '15 minutes';
$function$
;

-- public.count_recent_support_starts(text)
CREATE OR REPLACE FUNCTION public.count_recent_support_starts(p_ip text)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select count(*)::integer from public.support_conversations
  where coalesce(ip_address::text,'')=coalesce(p_ip,'')
    and started_at > now()-interval '15 minutes';
$function$
;

-- private.enforce_backend_order_rate_limit()
CREATE OR REPLACE FUNCTION private.enforce_backend_order_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid;
  v_recent_count integer;
begin
  v_uid := coalesce((select auth.uid()), new.user_id);
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;
  new.user_id := v_uid;

  update public.orders
    set status='expired', updated_at=now()
    where user_id=v_uid
      and status='pending'
      and created_at <= now() - interval '30 minutes';

  if exists(
    select 1 from public.orders o
    where o.user_id=v_uid
      and o.product_id=new.product_id
      and coalesce(o.hidden_by_user,false)=false
      and o.status in ('pending','checking')
  ) then
    raise exception 'OPEN_ORDER_ALREADY_EXISTS' using errcode='23505';
  end if;

  select count(*) into v_recent_count
  from public.orders o
  where o.user_id=v_uid and o.created_at > now()-interval '10 minutes';
  if v_recent_count>=5 then
    raise exception 'ORDER_RATE_LIMITED' using errcode='54000';
  end if;
  return new;
end;
$function$
;

-- private.enforce_member_profile_lock()
CREATE OR REPLACE FUNCTION private.enforce_member_profile_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  caller_id uuid := (select auth.uid());
  profile_complete boolean;
begin
  profile_complete :=
    nullif(btrim(new.display_name), '') is not null
    and nullif(btrim(new.phone), '') is not null;

  if current_user = 'authenticated' then
    if caller_id is null or caller_id <> old.user_id then
      raise exception using
        errcode = '42501',
        message = 'PROFILE_OWNER_REQUIRED';
    end if;

    if old.profile_locked_at is not null then
      raise exception using
        errcode = '42501',
        message = 'PROFILE_LOCKED';
    end if;

    if not profile_complete then
      raise exception using
        errcode = '23514',
        message = 'PROFILE_REQUIRED_FIELDS';
    end if;

    new.profile_locked_at := clock_timestamp();
  elsif old.profile_locked_at is null and profile_complete then
    -- Administrators and trusted server functions may complete an unfinished
    -- profile; once complete it follows the same permanent lock state.
    new.profile_locked_at := clock_timestamp();
  end if;

  return new;
end;
$function$
;

-- public.enforce_member_profile_lock()
CREATE OR REPLACE FUNCTION public.enforce_member_profile_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  caller_id uuid := (select auth.uid());
  profile_complete boolean;
  member_profile_changed boolean;
begin
  profile_complete := nullif(btrim(new.display_name), '') is not null and nullif(btrim(new.phone), '') is not null;
  if tg_op = 'INSERT' then
    if current_user = 'authenticated' then
      raise exception using errcode='42501', message='PROFILE_INSERT_NOT_ALLOWED';
    end if;
    if profile_complete then new.profile_locked_at := coalesce(new.profile_locked_at, clock_timestamp()); end if;
    return new;
  end if;
  member_profile_changed :=
    new.display_name is distinct from old.display_name or
    new.phone is distinct from old.phone or
    new.locale is distinct from old.locale or
    new.phone_country_code is distinct from old.phone_country_code or
    new.phone_country_name is distinct from old.phone_country_name or
    new.wechat is distinct from old.wechat or
    new.whatsapp is distinct from old.whatsapp or
    new.telegram is distinct from old.telegram;
  if current_user = 'authenticated' then
    if caller_id is null or caller_id <> old.user_id then
      raise exception using errcode='42501', message='PROFILE_OWNER_REQUIRED';
    end if;
    if member_profile_changed and old.profile_locked_at is not null then
      raise exception using errcode='42501', message='PROFILE_LOCKED';
    end if;
    if member_profile_changed and not profile_complete then
      raise exception using errcode='23514', message='PROFILE_REQUIRED_FIELDS';
    end if;
    if old.profile_locked_at is null and profile_complete then new.profile_locked_at := clock_timestamp(); else new.profile_locked_at := old.profile_locked_at; end if;
    new.member_level := old.member_level;
    new.member_level_override := old.member_level_override;
    new.valid_order_count := old.valid_order_count;
    new.total_spent := old.total_spent;
  elsif old.profile_locked_at is null and profile_complete then
    new.profile_locked_at := clock_timestamp();
  end if;
  return new;
end;
$function$
;

-- private.enqueue_order_notification()
CREATE OR REPLACE FUNCTION private.enqueue_order_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_dedupe text;
  v_result text;
begin
  if tg_op = 'INSERT' then
    v_dedupe := 'order_created:' || new.id::text || ':' || coalesce(new.txid, 'none') || ':' || new.status;
    insert into public.notification_outbox(event_type,order_id,dedupe_key,payload)
    values('order_created',new.id,v_dedupe,jsonb_build_object('event','order_created','order_id',new.id,'order_no',new.order_no,'status',new.status,'product_id',new.product_id,'product_name',new.product_name,'amount',new.payable_amount,'currency',new.currency,'network',new.network,'txid',new.txid,'created_at',new.created_at))
    on conflict(dedupe_key) do nothing;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'checking' and new.txid is not null then
      v_dedupe := 'payment_submitted:' || new.id::text || ':' || new.txid;
      insert into public.notification_outbox(event_type,order_id,dedupe_key,payload)
      values('payment_submitted',new.id,v_dedupe,jsonb_build_object('event','payment_submitted','order_id',new.id,'order_no',new.order_no,'status',new.status,'product_id',new.product_id,'product_name',new.product_name,'amount',new.payable_amount,'currency',new.currency,'network',new.network,'txid',new.txid,'created_at',new.created_at))
      on conflict(dedupe_key) do nothing;

      insert into public.member_inbox_messages(user_id,order_id,message_type,title,body,txid,dedupe_key,is_read)
      values(new.user_id,new.id,'payment_submitted','付款已提交，正在核验',
        '订单 '||new.order_no||' 的付款信息已经提交。系统会自动核验到账，请勿重复付款。',new.txid,
        'member_payment_submitted:'||new.id::text||':'||new.txid,false)
      on conflict(dedupe_key) do nothing;
    end if;

    if new.status in ('paid','failed','delivered') then
      v_result := case when new.status='failed' then 'failed' else 'confirmed' end;
      v_dedupe := 'payment_result:' || new.id::text || ':' || coalesce(new.txid,'none') || ':' || v_result;
      insert into public.notification_outbox(event_type,order_id,dedupe_key,payload)
      values('payment_result',new.id,v_dedupe,jsonb_build_object('event','payment_result','result',v_result,'order_id',new.id,'order_no',new.order_no,'status',new.status,'product_id',new.product_id,'product_name',new.product_name,'amount',new.payable_amount,'currency',new.currency,'network',new.network,'txid',new.txid,'created_at',new.created_at))
      on conflict(dedupe_key) do nothing;

      if new.status='failed' then
        insert into public.member_inbox_messages(user_id,order_id,message_type,title,body,txid,dedupe_key,is_read)
        values(new.user_id,new.id,'payment_failed','付款核验未通过',
          '订单 '||new.order_no||' 暂未核验通过。请检查 TXID、金额、TRC20 网络和收款地址后重新提交。',new.txid,
          'member_payment_failed:'||new.id::text||':'||coalesce(new.txid,'none'),false)
        on conflict(dedupe_key) do nothing;
      elsif new.status='paid' then
        insert into public.member_inbox_messages(user_id,order_id,message_type,title,body,txid,dedupe_key,is_read)
        values(new.user_id,new.id,'payment_confirmed','付款已确认',
          '订单 '||new.order_no||' 已确认到账，订单正在进入交付处理。',new.txid,
          'member_payment_paid:'||new.id::text||':'||coalesce(new.txid,'none'),false)
        on conflict(dedupe_key) do nothing;
      elsif new.status='delivered' then
        insert into public.member_inbox_messages(user_id,order_id,message_type,title,body,txid,dedupe_key,is_read)
        values(new.user_id,new.id,'order_delivered','付款成功，交付已就绪',
          '订单 '||new.order_no||' 已确认到账并完成自动交付。请到会员中心的订单或下载中心查看交付内容。',new.txid,
          'member_order_delivered:'||new.id::text||':'||coalesce(new.txid,'none'),false)
        on conflict(dedupe_key) do nothing;
      end if;
    end if;

    if new.status = 'delivered' then
      v_dedupe := 'order_delivered:' || new.id::text || ':' || coalesce(new.txid,'none') || ':delivered';
      insert into public.notification_outbox(event_type,order_id,dedupe_key,payload)
      values('order_delivered',new.id,v_dedupe,jsonb_build_object('event','order_delivered','order_id',new.id,'order_no',new.order_no,'status',new.status,'product_id',new.product_id,'product_name',new.product_name,'amount',new.payable_amount,'currency',new.currency,'network',new.network,'txid',new.txid,'created_at',new.created_at))
      on conflict(dedupe_key) do nothing;
    end if;
  end if;
  return new;
end;
$function$
;

-- public.enqueue_profile_change_request_notification()
CREATE OR REPLACE FUNCTION public.enqueue_profile_change_request_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_email text;
  v_name text;
begin
  select u.email into v_email from auth.users u where u.id = new.user_id;
  select p.display_name into v_name from public.profiles p where p.user_id = new.user_id;
  insert into public.notification_outbox(event_type,order_id,dedupe_key,payload,status,next_attempt_at,created_at,updated_at)
  values(
    'profile_change_requested',
    null,
    'profile_change_requested:' || new.id::text,
    jsonb_build_object(
      'request_id', new.id,
      'user_id', new.user_id,
      'member_name', coalesce(v_name,''),
      'member_email', coalesce(v_email,''),
      'requested_changes', new.requested_changes,
      'requested_email', new.requested_email,
      'created_at', new.created_at
    ),
    'pending',now(),now(),now()
  )
  on conflict (dedupe_key) do nothing;
  return new;
end;
$function$
;

-- public.expire_pending_orders_after_three_hours()
CREATE OR REPLACE FUNCTION public.expire_pending_orders_after_three_hours()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  n integer;
begin
  update public.orders
  set status = 'expired',
      hidden_by_user = true,
      updated_at = now()
  where hidden_by_user is false
    and status = 'pending'
    and created_at <= now() - interval '30 minutes';
  get diagnostics n = row_count;
  return n;
end;
$function$
;

-- private.expire_stale_pending_order_before_insert()
CREATE OR REPLACE FUNCTION private.expire_stale_pending_order_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  update public.orders
     set status = 'expired',
         updated_at = now()
   where user_id = new.user_id
     and product_id = new.product_id
     and status = 'pending'
     and created_at < now() - interval '30 minutes';
  return new;
end;
$function$
;

-- public.finish_notification(bigint,boolean,text)
CREATE OR REPLACE FUNCTION public.finish_notification(p_id bigint, p_success boolean, p_error text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.notification_outbox n
  set status = case when p_success then 'sent' else 'failed' end,
      sent_at = case when p_success then now() else n.sent_at end,
      locked_at = null,
      last_error = case when p_success then null else left(coalesce(p_error, 'UNKNOWN_ERROR'), 500) end,
      next_attempt_at = case
        when p_success then n.next_attempt_at
        else now() + make_interval(secs => least(1800, 30 * (2 ^ least(n.attempt_count, 6)))::integer)
      end,
      updated_at = now()
  where n.id = p_id and n.status = 'processing';
end;
$function$
;

-- public.get_globalyouxuan_support_bot_secrets()
CREATE OR REPLACE FUNCTION public.get_globalyouxuan_support_bot_secrets()
 RETURNS TABLE(bot_token text, webhook_secret text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    (select decrypted_secret from vault.decrypted_secrets where name='globalyouxuan_support_bot_token' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name='globalyouxuan_support_webhook_secret' limit 1);
$function$
;

-- public.get_order_delivery(bigint)
CREATE OR REPLACE FUNCTION public.get_order_delivery(p_order_id bigint)
 RETURNS TABLE(order_id bigint, order_no text, delivery_locale text, answer_id bigint, answer_title text, answer_summary text, answer_detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  return query
  select o.id,o.order_no,coalesce(o.delivery_locale,'zh-CN'),a.id,
    case coalesce(o.delivery_locale,'zh-CN')
      when 'en' then coalesce(nullif(a.title_en,''),a.title)
      when 'km' then coalesce(nullif(a.title_km,''),a.title)
      else a.title
    end,
    case coalesce(o.delivery_locale,'zh-CN')
      when 'en' then coalesce(nullif(a.answer_summary_en,''),a.answer_summary)
      when 'km' then coalesce(nullif(a.answer_summary_km,''),a.answer_summary)
      else a.answer_summary
    end,
    case coalesce(o.delivery_locale,'zh-CN')
      when 'en' then coalesce(nullif(a.answer_detail_en,''),a.answer_detail_zh)
      when 'km' then coalesce(nullif(a.answer_detail_km,''),a.answer_detail_zh)
      else a.answer_detail_zh
    end
  from public.orders o
  left join public.product_answer_options a on a.id=o.answer_id
  where o.id=p_order_id and o.user_id=v_uid and o.status in ('paid','delivered');
end;
$function$
;

-- public.get_support_bot_config()
CREATE OR REPLACE FUNCTION public.get_support_bot_config()
 RETURNS TABLE(bot_token text, webhook_secret text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    (select decrypted_secret from vault.decrypted_secrets where name='globalyouxuan_support_bot_token' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name='globalyouxuan_support_webhook_secret' limit 1);
$function$
;

-- public.get_support_bot_runtime_secrets()
CREATE OR REPLACE FUNCTION public.get_support_bot_runtime_secrets()
 RETURNS TABLE(bot_token text, webhook_secret text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    (select decrypted_secret from vault.decrypted_secrets where name='globalyouxuan_support_bot_token' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name='globalyouxuan_support_webhook_secret' limit 1);
$function$
;

-- public.get_telegram_notification_recipient()
CREATE OR REPLACE FUNCTION public.get_telegram_notification_recipient()
 RETURNS TABLE(chat_id bigint, bot_username text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select r.chat_id, r.bot_username
  from private.telegram_notification_recipient r
  where r.singleton = true;
$function$
;

-- public.get_telegram_webhook_secret()
CREATE OR REPLACE FUNCTION public.get_telegram_webhook_secret()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select d.decrypted_secret
  from vault.decrypted_secrets d
  where d.name = 'yx520_telegram_webhook_secret'
  limit 1;
$function$
;

-- public.gyx_admin_answer_options(bigint[])
CREATE OR REPLACE FUNCTION public.gyx_admin_answer_options(p_ids bigint[])
 RETURNS SETOF public.product_answer_options
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

-- public.gyx_admin_badge_counts()
CREATE OR REPLACE FUNCTION public.gyx_admin_badge_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_messages bigint; v_notifications bigint; v_profile bigint;
begin
  if auth.uid() is null or not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and coalesce(a.is_active,false)) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  select count(*) into v_messages from public.member_inbox_messages where coalesce(is_read,false)=false;
  select count(*) into v_notifications from public.notification_outbox where coalesce(status,'') not in ('sent','done','completed');
  select count(*) into v_profile from public.member_profile_change_requests where status='pending';
  return jsonb_build_object('messages',v_messages,'notifications',v_notifications,'profile_requests',v_profile,'total',v_messages+v_notifications+v_profile);
end;$function$
;

-- public.gyx_admin_daily_page_views(integer)
CREATE OR REPLACE FUNCTION public.gyx_admin_daily_page_views(p_days integer DEFAULT 31)
 RETURNS TABLE(view_date date, page_views bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_days integer := least(greatest(coalesce(p_days, 31), 1), 366);
  v_today date := (timezone('Asia/Shanghai', now()))::date;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.is_active = true
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  with days as (
    select (v_today - s.day_offset)::date as day
    from generate_series(0, v_days - 1) as s(day_offset)
  )
  select
    d.day as view_date,
    coalesce(v.page_views, 0)::bigint as page_views
  from days d
  left join public.site_daily_views v on v.view_date = d.day
  order by d.day desc;
end;
$function$
;

-- public.gyx_admin_delete_push_endpoint(text)
CREATE OR REPLACE FUNCTION public.gyx_admin_delete_push_endpoint(p_endpoint text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n int;
begin
 if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.is_active=true) then raise exception 'ADMIN_REQUIRED'; end if;
 delete from public.web_push_subscriptions where endpoint=p_endpoint;
 get diagnostics v_n=row_count;
 return v_n>0;
end $function$
;

-- public.gyx_admin_find_user_by_email(text)
CREATE OR REPLACE FUNCTION public.gyx_admin_find_user_by_email(p_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_id uuid;
begin
 if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.is_active=true) then raise exception 'ADMIN_REQUIRED'; end if;
 select u.id into v_id from auth.users u where lower(u.email)=lower(trim(p_email)) limit 1;
 return v_id;
end $function$
;

-- public.gyx_admin_members_overview(integer)
CREATE OR REPLACE FUNCTION public.gyx_admin_members_overview(p_limit integer DEFAULT 300)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and coalesce(a.is_active,false)) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.registered_at desc),'[]'::jsonb) into v_result
  from (
    select u.id as user_id,u.email,p.display_name,p.phone,p.phone_country_code,p.phone_country_name,p.locale,p.telegram,p.wechat,p.whatsapp,
           coalesce(p.member_level,1) as member_level,u.created_at as registered_at,u.last_sign_in_at,u.email_confirmed_at,u.banned_until,
           le.ip_address::text as ip_address,le.country_code,le.region,le.city,le.device_type,le.browser_name,le.os_name,le.created_at as last_login_event_at
    from auth.users u
    left join public.profiles p on p.user_id=u.id
    left join lateral (
      select l.ip_address,l.country_code,l.region,l.city,l.device_type,l.browser_name,l.os_name,l.created_at
      from public.login_audit_events l where l.user_id=u.id order by l.created_at desc limit 1
    ) le on true
    order by u.created_at desc
    limit greatest(1,least(coalesce(p_limit,300),500))
  ) x;
  return v_result;
end;$function$
;

-- public.gyx_admin_push_subscriptions(uuid)
CREATE OR REPLACE FUNCTION public.gyx_admin_push_subscriptions(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(endpoint text, p256dh text, auth_key text, user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.is_active=true) then raise exception 'ADMIN_REQUIRED'; end if;
 return query select s.endpoint,s.p256dh,s.auth_key,s.user_id from public.web_push_subscriptions s where p_user_id is null or s.user_id=p_user_id;
end $function$
;

-- public.gyx_admin_record_system_push(text,uuid,text,text,text,text,integer,integer,integer)
CREATE OR REPLACE FUNCTION public.gyx_admin_record_system_push(p_target_type text, p_target_user_id uuid, p_title text, p_body text, p_click_url text, p_icon_url text, p_subscription_count integer, p_sent_count integer, p_failed_count integer)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id bigint;
begin
 if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.is_active=true) then raise exception 'ADMIN_REQUIRED'; end if;
 insert into public.system_push_broadcasts(admin_user_id,target_type,target_user_id,title,body,click_url,icon_url,subscription_count,sent_count,failed_count)
 values(auth.uid(),p_target_type,p_target_user_id,p_title,p_body,p_click_url,p_icon_url,p_subscription_count,p_sent_count,p_failed_count)
 returning id into v_id;
 return v_id;
end $function$
;

-- public.gyx_admin_system_push_history(integer)
CREATE OR REPLACE FUNCTION public.gyx_admin_system_push_history(p_limit integer DEFAULT 100)
 RETURNS TABLE(id bigint, target_type text, target_user_id uuid, title text, body text, click_url text, icon_url text, subscription_count integer, sent_count integer, failed_count integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.is_active=true) then raise exception 'ADMIN_REQUIRED'; end if;
 return query select b.id,b.target_type,b.target_user_id,b.title,b.body,b.click_url,b.icon_url,b.subscription_count,b.sent_count,b.failed_count,b.created_at
 from public.system_push_broadcasts b order by b.created_at desc limit greatest(1,least(coalesce(p_limit,100),500));
end $function$
;

-- public.gyx_admin_three_month_stats()
CREATE OR REPLACE FUNCTION public.gyx_admin_three_month_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and coalesce(a.is_active,false)) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  with months as (
    select date_trunc('month', current_date)::date as m
    union all select (date_trunc('month', current_date)-interval '1 month')::date
    union all select (date_trunc('month', current_date)-interval '2 month')::date
  ), stats as (
    select m.m,
      (select count(*) from public.orders o where o.created_at>=m.m and o.created_at<m.m+interval '1 month') as orders,
      (select count(*) from public.orders o where o.paid_at>=m.m and o.paid_at<m.m+interval '1 month') as paid,
      (select count(*) from public.orders o where o.delivered_at>=m.m and o.delivered_at<m.m+interval '1 month') as delivered,
      (select count(*) from public.profiles p where p.created_at>=m.m and p.created_at<m.m+interval '1 month') as new_members,
      (select coalesce(sum(o.payable_amount),0) from public.orders o where o.paid_at>=m.m and o.paid_at<m.m+interval '1 month') as paid_amount
    from months m
  )
  select jsonb_agg(jsonb_build_object('month',to_char(m,'YYYY-MM'),'orders',orders,'paid',paid,'delivered',delivered,'new_members',new_members,'paid_amount',paid_amount) order by m desc) into v_result from stats;
  return coalesce(v_result,'[]'::jsonb);
end;$function$
;

-- public.gyx_apply_referral(uuid,text)
CREATE OR REPLACE FUNCTION public.gyx_apply_referral(p_invitee uuid, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_inviter uuid; v_code text:=upper(btrim(coalesce(p_code,''))); v_inserted integer:=0;
begin
 if p_invitee is null or v_code='' then return false; end if;
 select user_id into v_inviter from public.member_point_accounts where referral_code=v_code;
 if v_inviter is null or v_inviter=p_invitee then return false; end if;
 insert into public.member_point_referrals(inviter_id,invitee_id,referral_code) values(v_inviter,p_invitee,v_code) on conflict(invitee_id) do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted<>1 then return false; end if;
 perform public.gyx_award_points(v_inviter,'referral_inviter:'||p_invitee::text,500,'referral','成功邀请新会员 +500积分',jsonb_build_object('invitee_id',p_invitee));
 perform public.gyx_award_points(p_invitee,'referral_invitee:'||v_inviter::text,500,'referral','通过会员邀请注册 +500积分',jsonb_build_object('inviter_id',v_inviter));
 return true;
end$function$
;

-- public.gyx_auto_assign_delivery_on_paid()
CREATE OR REPLACE FUNCTION public.gyx_auto_assign_delivery_on_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_answer_id bigint;
  v_title text;
  v_has_file boolean := false;
  v_has_generated boolean := false;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    if new.answer_id is null then
      select p.id, p.title
        into v_answer_id, v_title
      from public.product_answer_options p
      where p.product_id = new.product_id
        and p.is_active = true
        and coalesce(p.answer_detail_zh,'') <> ''
      order by p.priority desc nulls last, p.id asc
      limit 1;

      if v_answer_id is not null then
        new.answer_id := v_answer_id;
        new.matched_answer_title := coalesce(nullif(new.matched_answer_title,''), v_title);
        new.answer_tier := coalesce(nullif(new.answer_tier,''),'standard');
      end if;
    end if;

    select exists(
      select 1
      from public.product_files pf
      where pf.product_id = new.product_id
        and pf.is_active = true
    ) into v_has_file;

    v_has_generated := new.generated_delivery is not null
      and jsonb_typeof(new.generated_delivery) = 'object'
      and coalesce(nullif(trim(new.generated_delivery->>'detailed_plan'),''),'') <> '';

    if new.answer_id is not null or v_has_file or v_has_generated then
      new.status := 'delivered';
      new.delivered_at := coalesce(new.delivered_at, now());
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$function$
;

-- public.gyx_award_points(uuid,text,integer,text,text,jsonb)
CREATE OR REPLACE FUNCTION public.gyx_award_points(p_user_id uuid, p_event_key text, p_points integer, p_source text, p_description text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  inserted_count integer := 0;
begin
  if p_user_id is null or p_points <= 0 then return false; end if;
  insert into public.member_point_accounts(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata)
  values(p_user_id,p_event_key,p_source,p_points,p_description,coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,event_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 1 then
    update public.member_point_accounts
       set balance = balance + p_points,
           lifetime_earned = lifetime_earned + p_points,
           updated_at = now()
     where user_id = p_user_id;
    return true;
  end if;
  return false;
end;
$function$
;

-- public.gyx_delete_web_push_endpoint(text)
CREATE OR REPLACE FUNCTION public.gyx_delete_web_push_endpoint(p_endpoint text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ delete from public.web_push_subscriptions where endpoint=p_endpoint $function$
;

-- public.gyx_deliver_business_growth_order()
CREATE OR REPLACE FUNCTION public.gyx_deliver_business_growth_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c public.business_growth_cases%rowtype;
  plan_title text;
  plan_summary text;
  plan_detail text;
begin
  if new.product_id = 'business-growth' and new.status = 'paid' and new.source_case_id is not null then
    select * into c from public.business_growth_cases where id = new.source_case_id;
    if found and c.analysis is not null then
      plan_title := '实体经营改善 · ' || coalesce(c.selected_days, 0)::text || '天执行计划';
      plan_summary := coalesce(c.analysis->>'headline', c.analysis->>'strategy', '已根据客户经营资料生成完整经营改善方案');
      plan_detail := concat_ws(E'\n\n',
        '【经营分析】' || E'\n' || coalesce(c.analysis->>'headline',''),
        '【核心策略】' || E'\n' || coalesce(c.analysis->>'strategy',''),
        '【所选执行周期】' || E'\n' || coalesce(c.selected_days,0)::text || '天',
        '【完整方案全文】' || E'\n' || jsonb_pretty(c.analysis)
      );
      new.status := 'delivered';
      new.delivered_at := coalesce(new.delivered_at, now());
      new.source_module := coalesce(nullif(new.source_module,''), 'business_growth');
      new.source_type := coalesce(nullif(new.source_type,''), 'business_growth_plan');
      new.matched_answer_title := coalesce(nullif(new.matched_answer_title,''), plan_title);
      new.generated_delivery := coalesce(new.generated_delivery, jsonb_build_object(
        'title', plan_title,
        'summary', plan_summary,
        'detailed_plan', plan_detail,
        'deliverables', jsonb_build_array('完整经营分析','所选周期执行框架','关键指标与风险','客户每日执行结果后续分析')
      ));
    end if;
  end if;
  return new;
end;
$function$
;

-- public.gyx_expire_checkin_points()
CREATE OR REPLACE FUNCTION public.gyx_expire_checkin_points()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; n integer:=0; v_event text;
begin
 for r in select user_id,checkin_balance,checkin_expires_at from public.member_point_accounts where checkin_balance>0 and checkin_expires_at is not null and checkin_expires_at<=now() for update loop
   v_event:='checkin_expire:'||to_char(r.checkin_expires_at at time zone 'UTC','YYYYMMDDHH24MISS');
   insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata)
   values(r.user_id,v_event,'checkin_expire',-r.checkin_balance,'本轮签到积分到期',jsonb_build_object('expired_points',r.checkin_balance,'expired_at',r.checkin_expires_at))
   on conflict(user_id,event_key) do nothing;
   update public.member_point_accounts set balance=greatest(0,balance-r.checkin_balance),checkin_balance=0,checkin_expires_at=null,updated_at=now() where user_id=r.user_id;
   n:=n+1;
 end loop;
 return n;
end$function$
;

-- public.gyx_internal_secret(text)
CREATE OR REPLACE FUNCTION public.gyx_internal_secret(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v text;
begin
  if p_name not in ('gyx_crawler_secret', 'gyx_learn_worker_secret', 'gyx_translate_internal_secret') then
    return null;
  end if;
  select s.decrypted_secret into v from vault.decrypted_secrets s where s.name = p_name limit 1;
  return v;
end;
$function$
;

-- public.gyx_is_active_admin()
CREATE OR REPLACE FUNCTION public.gyx_is_active_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid() and a.is_active = true
  );
$function$
;

-- public.gyx_keep_claimed_opportunity_closed()
CREATE OR REPLACE FUNCTION public.gyx_keep_claimed_opportunity_closed()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if new.claimed_by is not null then new.opportunity_status := 'closed'; if new.claimed_at is null then new.claimed_at := now(); end if; end if; return new; end; $function$
;

-- public.gyx_member_checkin()
CREATE OR REPLACE FUNCTION public.gyx_member_checkin()
 RETURNS TABLE(day_no integer, points_awarded integer, checkin_balance integer, total_balance integer, expires_at timestamp with time zone, already_checked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_user uuid:=auth.uid(); v_today date:=(now() at time zone 'UTC')::date; v_last public.member_point_checkins%rowtype; v_day integer; v_points integer; v_start date; v_exp timestamptz; v_acc public.member_point_accounts%rowtype; v_old_checkin integer;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.member_point_accounts(user_id) values(v_user) on conflict(user_id) do nothing;
 select * into v_acc from public.member_point_accounts a where a.user_id=v_user for update;
 if v_acc.checkin_balance>0 and v_acc.checkin_expires_at is not null and v_acc.checkin_expires_at<=now() then
   v_old_checkin:=v_acc.checkin_balance;
   insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata) values(v_user,'checkin_expire:'||to_char(v_acc.checkin_expires_at at time zone 'UTC','YYYYMMDDHH24MISS'),'checkin_expire',-v_old_checkin,'本轮签到积分到期',jsonb_build_object('expired_points',v_old_checkin)) on conflict(user_id,event_key) do nothing;
   update public.member_point_accounts a set balance=greatest(0,a.balance-v_old_checkin),checkin_balance=0,checkin_expires_at=null,updated_at=now() where a.user_id=v_user returning * into v_acc;
 end if;
 select * into v_last from public.member_point_checkins c where c.user_id=v_user order by c.checkin_date desc limit 1;
 if found and v_last.checkin_date=v_today then
   select * into v_acc from public.member_point_accounts a where a.user_id=v_user;
   return query select v_last.day_no,v_last.points,v_acc.checkin_balance,v_acc.balance,v_acc.checkin_expires_at,true; return;
 end if;
 if found and v_last.checkin_date=v_today-1 and v_last.day_no<7 then v_day:=v_last.day_no+1;v_start:=v_last.cycle_start;
 else
   if v_acc.checkin_balance>0 then
     v_old_checkin:=v_acc.checkin_balance;
     insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata) values(v_user,'checkin_break:'||v_today::text,'checkin_expire',-v_old_checkin,'连续签到中断，本轮签到积分失效',jsonb_build_object('expired_points',v_old_checkin)) on conflict(user_id,event_key) do nothing;
     update public.member_point_accounts a set balance=greatest(0,a.balance-v_old_checkin),checkin_balance=0,checkin_expires_at=null,updated_at=now() where a.user_id=v_user returning * into v_acc;
   end if;
   v_day:=1;v_start:=v_today;
 end if;
 v_points:=v_day*10;
 v_exp:=((v_start+7)::timestamp at time zone 'UTC');
 insert into public.member_point_checkins(user_id,checkin_date,cycle_start,day_no,points) values(v_user,v_today,v_start,v_day,v_points);
 insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata) values(v_user,'checkin:'||v_today::text,'checkin',v_points,'连续签到第'||v_day||'天',jsonb_build_object('day_no',v_day,'cycle_start',v_start,'expires_at',v_exp)) on conflict(user_id,event_key) do nothing;
 update public.member_point_accounts a set balance=a.balance+v_points,lifetime_earned=a.lifetime_earned+v_points,checkin_balance=a.checkin_balance+v_points,checkin_expires_at=v_exp,updated_at=now() where a.user_id=v_user returning * into v_acc;
 return query select v_day,v_points,v_acc.checkin_balance,v_acc.balance,v_acc.checkin_expires_at,false;
end$function$
;

-- public.gyx_member_checkin_service(uuid)
CREATE OR REPLACE FUNCTION public.gyx_member_checkin_service(p_user_id uuid)
 RETURNS TABLE(day_no integer, points_awarded integer, checkin_balance integer, total_balance integer, expires_at timestamp with time zone, already_checked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',p_user_id::text,'role','authenticated')::text, true);
  return query select * from public.gyx_member_checkin();
end;
$function$
;

-- public.gyx_order_points_trigger()
CREATE OR REPLACE FUNCTION public.gyx_order_points_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_points integer;
begin
  if new.user_id is null then return new; end if;
  if lower(coalesce(new.status,'')) in ('paid','delivered','completed')
     and (new.paid_at is not null or new.manual_payment_confirmed_at is not null)
     and coalesce(new.payable_amount,0) > 0 then
    v_points := floor(new.payable_amount * 20)::integer;
    if v_points > 0 then
      perform public.gyx_award_points(new.user_id,'order:'||new.id::text,v_points,'purchase','真实消费获得积分',jsonb_build_object('order_id',new.id,'order_no',new.order_no,'amount',new.payable_amount,'rate',20));
    end if;
    insert into public.member_point_accounts(user_id,redemption_unlocked,unlocked_at)
    values(new.user_id,true,now())
    on conflict(user_id) do update set redemption_unlocked=true,unlocked_at=coalesce(public.member_point_accounts.unlocked_at,now()),updated_at=now();
  end if;
  return new;
end;
$function$
;

-- public.gyx_point_account_code_trigger()
CREATE OR REPLACE FUNCTION public.gyx_point_account_code_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.referral_code is null or btrim(new.referral_code)='' then new.referral_code:=upper(substr(md5(new.user_id::text),1,8)); end if;
  return new;
end$function$
;

-- public.gyx_profile_points_trigger()
CREATE OR REPLACE FUNCTION public.gyx_profile_points_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_email text;
begin
  if tg_op = 'INSERT' then
    perform public.gyx_award_points(new.user_id,'registration',1000,'registration','注册奖励','{}'::jsonb);
    select email into v_email from auth.users where id = new.user_id;
    if coalesce(trim(v_email),'') <> '' then
      perform public.gyx_award_points(new.user_id,'profile:email',20,'profile','完善登录邮箱 +20积分','{}'::jsonb);
    end if;
    if coalesce(trim(new.display_name),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:display_name',20,'profile','完善姓名 +20积分','{}'::jsonb); end if;
    if coalesce(trim(new.phone),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:phone',20,'profile','完善电话 +20积分','{}'::jsonb); end if;
    if coalesce(trim(new.wechat),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:wechat',20,'profile','完善微信 +20积分','{}'::jsonb); end if;
    if coalesce(trim(new.telegram),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:telegram',20,'profile','完善Telegram +20积分','{}'::jsonb); end if;
    if coalesce(trim(new.whatsapp),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:whatsapp',20,'profile','完善WhatsApp +20积分','{}'::jsonb); end if;
    if coalesce(trim(new.locale),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:locale',20,'profile','完善语言 +20积分','{}'::jsonb); end if;
  else
    if coalesce(trim(old.display_name),'') = '' and coalesce(trim(new.display_name),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:display_name',20,'profile','完善姓名 +20积分','{}'::jsonb); end if;
    if coalesce(trim(old.phone),'') = '' and coalesce(trim(new.phone),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:phone',20,'profile','完善电话 +20积分','{}'::jsonb); end if;
    if coalesce(trim(old.wechat),'') = '' and coalesce(trim(new.wechat),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:wechat',20,'profile','完善微信 +20积分','{}'::jsonb); end if;
    if coalesce(trim(old.telegram),'') = '' and coalesce(trim(new.telegram),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:telegram',20,'profile','完善Telegram +20积分','{}'::jsonb); end if;
    if coalesce(trim(old.whatsapp),'') = '' and coalesce(trim(new.whatsapp),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:whatsapp',20,'profile','完善WhatsApp +20积分','{}'::jsonb); end if;
    if coalesce(trim(old.locale),'') = '' and coalesce(trim(new.locale),'') <> '' then perform public.gyx_award_points(new.user_id,'profile:locale',20,'profile','完善语言 +20积分','{}'::jsonb); end if;
  end if;
  return new;
end;
$function$
;

-- public.gyx_record_page_view()
CREATE OR REPLACE FUNCTION public.gyx_record_page_view()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_today date := (timezone('Asia/Shanghai', now()))::date;
  v_actor text := public.learn_actor();
  v_hits integer;
  v_total bigint;
begin
  insert into public.site_view_actor_daily as a (view_date, actor, hits)
  values (v_today, v_actor, 1)
  on conflict (view_date, actor) do update set hits = a.hits + 1
  returning hits into v_hits;

  if v_hits > 200 then
    select page_views into v_total from public.site_daily_views where view_date = v_today;
    return coalesce(v_total, 0);
  end if;

  insert into public.site_daily_views as current_day (view_date, page_views, updated_at)
  values (v_today, 1, now())
  on conflict (view_date) do update
    set page_views = current_day.page_views + 1, updated_at = excluded.updated_at
  returning page_views into v_total;

  if random() < 0.01 then
    delete from public.site_view_actor_daily where view_date < v_today - 2;
  end if;
  return v_total;
end;
$function$
;

-- public.gyx_redeem_community_opportunity(uuid)
CREATE OR REPLACE FUNCTION public.gyx_redeem_community_opportunity(p_opportunity_id uuid)
 RETURNS TABLE(redemption_id bigint, reward_title text, delivery_text text, points_spent integer, balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_account public.member_point_accounts%rowtype;
  v_reward public.member_point_rewards%rowtype;
  v_op public.community_external_feed%rowtype;
  v_redemption_id bigint;
  v_use_checkin integer:=0;
  v_old_checkin integer;
  v_delivery text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_account from public.member_point_accounts a where a.user_id=v_user for update;
  if not found then raise exception 'POINT_ACCOUNT_NOT_FOUND'; end if;
  if v_account.checkin_balance>0 and v_account.checkin_expires_at is not null and v_account.checkin_expires_at<=now() then
    v_old_checkin:=v_account.checkin_balance;
    insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata)
    values(v_user,'checkin_expire:'||to_char(v_account.checkin_expires_at at time zone 'UTC','YYYYMMDDHH24MISS'),'checkin_expire',-v_old_checkin,'本轮签到积分到期',jsonb_build_object('expired_points',v_old_checkin))
    on conflict(user_id,event_key) do nothing;
    update public.member_point_accounts a set balance=greatest(0,a.balance-v_old_checkin),checkin_balance=0,checkin_expires_at=null,updated_at=now() where a.user_id=v_user returning * into v_account;
  end if;
  select * into v_op from public.community_external_feed where id=p_opportunity_id and coalesce(opportunity_status,'open')='open';
  if not found then raise exception 'OPPORTUNITY_NOT_AVAILABLE'; end if;
  if exists(select 1 from public.member_point_redemptions r where r.user_id=v_user and r.opportunity_id=p_opportunity_id) then raise exception 'ALREADY_REDEEMED'; end if;
  select * into v_reward from public.member_point_rewards where code='community_opportunity' and active=true limit 1;
  if not found then raise exception 'REWARD_NOT_AVAILABLE'; end if;
  if v_account.balance < 2000 then raise exception 'INSUFFICIENT_POINTS:%',2000-v_account.balance; end if;
  v_delivery:=concat_ws(E'\n\n',v_op.title,v_op.body,case when nullif(v_op.source_url,'') is not null then '原始地址 / Source: '||v_op.source_url end);
  v_use_checkin:=least(v_account.checkin_balance,2000);
  insert into public.member_point_redemptions(user_id,reward_id,points_spent,reward_title,reference_value_rmb,delivery_text_snapshot,status,opportunity_id)
  values(v_user,v_reward.id,2000,v_op.title,1,v_delivery,'fulfilled',p_opportunity_id)
  returning id into v_redemption_id;
  insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata)
  values(v_user,'community_opportunity:'||p_opportunity_id::text,'community_opportunity',-2000,'积分接单：'||v_op.title,jsonb_build_object('opportunity_id',p_opportunity_id,'redemption_id',v_redemption_id,'checkin_points_used',v_use_checkin));
  update public.member_point_accounts a set balance=a.balance-2000,lifetime_spent=a.lifetime_spent+2000,checkin_balance=greatest(0,a.checkin_balance-v_use_checkin),checkin_expires_at=case when a.checkin_balance-v_use_checkin<=0 then null else a.checkin_expires_at end,updated_at=now() where a.user_id=v_user returning * into v_account;
  insert into public.community_opportunity_stats(user_id,opportunity_id,action) values(v_user,p_opportunity_id,'request_url') on conflict(user_id,opportunity_id,action) do nothing;
  return query select v_redemption_id,v_op.title,v_delivery,2000,v_account.balance;
end;$function$
;

-- public.gyx_redeem_member_reward(uuid)
CREATE OR REPLACE FUNCTION public.gyx_redeem_member_reward(p_reward_id uuid)
 RETURNS TABLE(redemption_id bigint, reward_title text, delivery_text text, points_spent integer, balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_user uuid:=auth.uid(); v_reward public.member_point_rewards%rowtype; v_account public.member_point_accounts%rowtype; v_redemption_id bigint; v_use_checkin integer:=0; v_old_checkin integer;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_account from public.member_point_accounts a where a.user_id=v_user for update;
 if not found then raise exception 'POINT_ACCOUNT_NOT_FOUND'; end if;
 if v_account.checkin_balance>0 and v_account.checkin_expires_at is not null and v_account.checkin_expires_at<=now() then
   v_old_checkin:=v_account.checkin_balance;
   insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata) values(v_user,'checkin_expire:'||to_char(v_account.checkin_expires_at at time zone 'UTC','YYYYMMDDHH24MISS'),'checkin_expire',-v_old_checkin,'本轮签到积分到期',jsonb_build_object('expired_points',v_old_checkin)) on conflict(user_id,event_key) do nothing;
   update public.member_point_accounts a set balance=greatest(0,a.balance-v_old_checkin),checkin_balance=0,checkin_expires_at=null,updated_at=now() where a.user_id=v_user returning * into v_account;
 end if;
 if not v_account.redemption_unlocked then raise exception 'REAL_PURCHASE_REQUIRED'; end if;
 select * into v_reward from public.member_point_rewards r where r.id=p_reward_id and r.active=true;
 if not found then raise exception 'REWARD_NOT_AVAILABLE'; end if;
 if exists(select 1 from public.member_point_redemptions x where x.user_id=v_user and x.reward_id=v_reward.id) then raise exception 'ALREADY_REDEEMED'; end if;
 if v_account.balance<v_reward.points_cost then raise exception 'INSUFFICIENT_POINTS'; end if;
 v_use_checkin:=least(v_account.checkin_balance,v_reward.points_cost);
 insert into public.member_point_redemptions(user_id,reward_id,points_spent,reward_title,reference_value_rmb,delivery_text_snapshot) values(v_user,v_reward.id,v_reward.points_cost,v_reward.title,v_reward.reference_value_rmb,v_reward.delivery_text) returning id into v_redemption_id;
 insert into public.member_point_ledger(user_id,event_key,source,points_delta,description,metadata) values(v_user,'redemption:'||v_redemption_id::text,'redemption',-v_reward.points_cost,'积分兑换：'||v_reward.title,jsonb_build_object('reward_id',v_reward.id,'redemption_id',v_redemption_id,'checkin_points_used',v_use_checkin));
 update public.member_point_accounts a set balance=a.balance-v_reward.points_cost,lifetime_spent=a.lifetime_spent+v_reward.points_cost,checkin_balance=greatest(0,a.checkin_balance-v_use_checkin),checkin_expires_at=case when a.checkin_balance-v_use_checkin<=0 then null else a.checkin_expires_at end,updated_at=now() where a.user_id=v_user returning * into v_account;
 return query select v_redemption_id,v_reward.title,v_reward.delivery_text,v_reward.points_cost,v_account.balance;
end$function$
;

-- public.gyx_redeem_member_reward_service(uuid,uuid)
CREATE OR REPLACE FUNCTION public.gyx_redeem_member_reward_service(p_user_id uuid, p_reward_id uuid)
 RETURNS TABLE(redemption_id bigint, reward_title text, delivery_text text, points_spent integer, balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',p_user_id::text,'role','authenticated')::text, true);
  return query select * from public.gyx_redeem_member_reward(p_reward_id);
end;
$function$
;

-- public.gyx_remove_web_push_subscription(text)
CREATE OR REPLACE FUNCTION public.gyx_remove_web_push_subscription(p_endpoint text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.web_push_subscriptions where user_id=v_uid and endpoint=trim(p_endpoint);
  get diagnostics v_n = row_count;
  return v_n > 0;
end $function$
;

-- public.gyx_save_web_push_subscription(text,text,text,text)
CREATE OR REPLACE FUNCTION public.gyx_save_web_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_id bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(length(trim(p_endpoint)),0) < 20 then raise exception 'VALID_ENDPOINT_REQUIRED'; end if;
  if coalesce(length(trim(p_p256dh)),0) < 20 then raise exception 'VALID_P256DH_REQUIRED'; end if;
  if coalesce(length(trim(p_auth)),0) < 8 then raise exception 'VALID_AUTH_REQUIRED'; end if;
  insert into public.web_push_subscriptions(user_id,endpoint,p256dh,auth_key,user_agent,updated_at)
  values(v_uid,trim(p_endpoint),trim(p_p256dh),trim(p_auth),left(coalesce(p_user_agent,''),500),now())
  on conflict(endpoint) do update set
    user_id=excluded.user_id,
    p256dh=excluded.p256dh,
    auth_key=excluded.auth_key,
    user_agent=excluded.user_agent,
    updated_at=now()
  returning id into v_id;
  return v_id;
end $function$
;

-- public.gyx_security_alert_to_outbox()
CREATE OR REPLACE FUNCTION public.gyx_security_alert_to_outbox()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.level not in ('medium','high') then
    return new;
  end if;

  insert into public.security_alert_outbox(alert_event_id,fingerprint,level,alert_type,message,status,attempts,created_at,updated_at)
  values(new.id,new.fingerprint,new.level,new.alert_type,new.detail,'pending',0,now(),now())
  on conflict (fingerprint) where status='pending'
  do update set
    alert_event_id=excluded.alert_event_id,
    level=excluded.level,
    alert_type=excluded.alert_type,
    message=excluded.message,
    updated_at=now();

  return new;
end;
$function$
;

-- public.gyx_security_retention_cleanup()
CREATE OR REPLACE FUNCTION public.gyx_security_retention_cleanup()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.security_admin_access_events
  where created_at < now() - interval '30 days';

  delete from public.security_alert_outbox
  where status in ('sent','dismissed','failed')
    and coalesce(updated_at, created_at) < now() - interval '180 days';

  delete from public.security_alert_events a
  where a.last_seen_at < now() - interval '180 days'
    and not exists (
      select 1 from public.security_alert_outbox o
      where o.alert_event_id = a.id and o.status = 'pending'
    );

  delete from public.security_monitor_snapshots s
  where s.created_at < now() - interval '90 days'
    and not exists (
      select 1 from public.security_alert_events a
      where a.snapshot_id = s.id
    );
end;
$function$
;

-- public.gyx_spare_time_mark_delivered()
CREATE OR REPLACE FUNCTION public.gyx_spare_time_mark_delivered()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.source_module = 'spare_time_plan'
     and new.generated_delivery is not null
     and new.status = 'paid'
     and old.status is distinct from 'delivered' then
    new.status := 'delivered';
    new.delivered_at := coalesce(new.delivered_at, now());
  end if;
  return new;
end;
$function$
;

-- public.gyx_trim_user_records_10()
CREATE OR REPLACE FUNCTION public.gyx_trim_user_records_10()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_table_name = 'answer_favorites' then
    delete from public.answer_favorites
    where id in (
      select id from public.answer_favorites
      where user_id = new.user_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
      offset 10
    );
  elsif tg_table_name = 'search_history' then
    delete from public.search_history
    where id in (
      select id from public.search_history
      where user_id = new.user_id
      order by created_at desc nulls last, id desc
      offset 10
    );
  elsif tg_table_name = 'member_materials' then
    delete from public.member_materials
    where id in (
      select id from public.member_materials
      where user_id = new.user_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
      offset 10
    );
  end if;
  return new;
end;
$function$
;

-- private.handle_new_user()
CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$function$
;

-- public.hide_own_invalid_orders()
CREATE OR REPLACE FUNCTION public.hide_own_invalid_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  affected integer;
begin
  update public.orders
  set hidden_by_user = true
  where user_id = (select auth.uid())
    and hidden_by_user is false
    and (
      status in ('expired','failed','cancelled')
      or (status = 'pending' and created_at <= now() - interval '30 minutes')
    );
  get diagnostics affected = row_count;
  return affected;
end;
$function$
;

-- public.hide_own_order(bigint)
CREATE OR REPLACE FUNCTION public.hide_own_order(p_order_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.orders
  set hidden_by_user = true
  where id = p_order_id
    and user_id = (select auth.uid())
    and hidden_by_user is false
    and (
      status in ('expired','failed','cancelled')
      or (status = 'pending' and created_at <= now() - interval '30 minutes')
    );
  return found;
end;
$function$
;

-- public.hide_own_orders(bigint[])
CREATE OR REPLACE FUNCTION public.hide_own_orders(p_order_ids bigint[])
 RETURNS TABLE(hidden_id bigint)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  update public.orders
  set hidden_by_user = true
  where id = any(p_order_ids)
    and user_id = (select auth.uid())
    and status not in ('paid','delivered')
    and hidden_by_user is false
  returning id;
$function$
;

-- public.hybrid_product_search_lab(text,extensions.vector,integer,integer,integer,integer)
CREATE OR REPLACE FUNCTION public.hybrid_product_search_lab(query_text text, query_embedding extensions.vector, match_count integer DEFAULT 10, lexical_pool integer DEFAULT 60, semantic_pool integer DEFAULT 60, rrf_k integer DEFAULT 50)
 RETURNS TABLE(id bigint, title text, answer_summary text, keywords text[], source_name text, lexical_rank bigint, semantic_rank bigint, semantic_similarity double precision, rrf_score double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
with lexical as (
  select s.id,
         row_number() over(order by s.lexical_score desc, s.id desc) lexical_rank
  from public.search_product_answers_hybrid_base(query_text, array[]::text[], array[]::text[], array[]::text[], least(greatest(lexical_pool,10),100)) s
  limit least(greatest(lexical_pool,10),100)
), semantic as (
  select e.material_id id,
         row_number() over(order by e.embedding <=> query_embedding) semantic_rank,
         (1 - (e.embedding <=> query_embedding))::float8 semantic_similarity
  from public.product_answer_embeddings_lab e
  where e.embedding is not null
  order by e.embedding <=> query_embedding
  limit least(greatest(semantic_pool,10),100)
), fused as (
  select coalesce(l.id,s.id) id,
         l.lexical_rank,
         s.semantic_rank,
         s.semantic_similarity,
         (coalesce(1.0/(rrf_k+l.lexical_rank),0.0)+coalesce(1.0/(rrf_k+s.semantic_rank),0.0))::float8 rrf_score
  from lexical l full outer join semantic s on s.id=l.id
)
select p.id,p.title,p.answer_summary,p.keywords,p.source_name,
       f.lexical_rank,f.semantic_rank,f.semantic_similarity,f.rrf_score
from fused f join public.product_answer_options p on p.id=f.id
where p.is_active=true
order by f.rrf_score desc, coalesce(f.semantic_similarity,-1) desc
limit least(greatest(match_count,1),30)
$function$
;

-- public.im_claim_red_packet_atomic(uuid,text)
CREATE OR REPLACE FUNCTION public.im_claim_red_packet_atomic(p_packet_id uuid, p_firebase_uid text)
 RETURNS TABLE(claim_amount numeric, wallet_balance numeric, packet_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  p public.im_red_packets%rowtype;
  existing public.im_red_packet_claims%rowtype;
  remaining numeric(18,6);
  slots integer;
  cap numeric(18,6);
  amt numeric(18,6);
  next_status text;
  bal numeric(18,6);
begin
  select * into p from public.im_red_packets where id=p_packet_id for update;
  if not found then raise exception 'PACKET_NOT_FOUND'; end if;
  if not (p_firebase_uid = any(p.member_uids)) then raise exception 'NOT_MEMBER'; end if;

  select * into existing from public.im_red_packet_claims
  where packet_id=p_packet_id and firebase_uid=p_firebase_uid;
  if found then
    select balance into bal from public.im_wallet_accounts where firebase_uid=p_firebase_uid;
    return query select existing.amount, coalesce(bal,0), p.status;
    return;
  end if;

  if p.status <> 'active' then raise exception 'PACKET_NOT_ACTIVE'; end if;

  remaining := p.total_amount - p.claimed_amount;
  slots := p.count - p.claimed_count;
  if slots <= 0 or remaining <= 0 then raise exception 'PACKET_EMPTY'; end if;

  if slots = 1 then
    amt := remaining;
  elsif p.split = 'equal' then
    amt := trunc(p.total_amount / p.count, 2);
    if amt < 0.01 then amt := 0.01; end if;
    if amt > remaining - (slots - 1) * 0.01 then
      amt := remaining - (slots - 1) * 0.01;
    end if;
  else
    cap := least(remaining - (slots - 1) * 0.01, (remaining / slots) * 2);
    if cap <= 0.01 then
      amt := 0.01;
    else
      amt := trunc(0.01 + (random()::numeric * (cap - 0.01)), 2);
      if amt < 0.01 then amt := 0.01; end if;
    end if;
  end if;

  if amt <= 0 or amt > remaining then raise exception 'INVALID_ALLOCATION'; end if;

  insert into public.im_red_packet_claims(packet_id,firebase_uid,amount)
  values(p_packet_id,p_firebase_uid,amt);

  insert into public.im_wallet_accounts(firebase_uid,balance,updated_at)
  values(p_firebase_uid,amt,now())
  on conflict(firebase_uid) do update
    set balance=public.im_wallet_accounts.balance + excluded.balance, updated_at=now()
  returning balance into bal;

  insert into public.im_wallet_ledger(firebase_uid,amount,kind,ref_id)
  values(p_firebase_uid,amt,'red_packet_claim',p_packet_id)
  on conflict(firebase_uid,kind,ref_id) do nothing;

  next_status := case when slots = 1 then 'finished' else 'active' end;
  update public.im_red_packets
  set claimed_count=claimed_count+1,
      claimed_amount=claimed_amount+amt,
      status=next_status,
      updated_at=now()
  where id=p_packet_id;

  return query select amt, bal, next_status;
end;
$function$
;

-- public.im_credit_tip_atomic(uuid,text)
CREATE OR REPLACE FUNCTION public.im_credit_tip_atomic(p_order_id uuid, p_sender_uid text)
 RETURNS TABLE(wallet_balance numeric, target_uid text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o public.im_payment_orders%rowtype;
  target text;
  bal numeric(18,6);
begin
  select * into o from public.im_payment_orders
  where id=p_order_id and firebase_uid=p_sender_uid and kind='tip'
  for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status <> 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  target := nullif(o.meta->>'targetUid','');
  if target is null then raise exception 'TARGET_MISSING'; end if;

  if exists(select 1 from public.im_wallet_ledger where firebase_uid=target and kind='tip_received' and ref_id=p_order_id) then
    select balance into bal from public.im_wallet_accounts where firebase_uid=target;
    return query select coalesce(bal,0), target;
    return;
  end if;

  insert into public.im_wallet_accounts(firebase_uid,balance,updated_at)
  values(target,o.amount,now())
  on conflict(firebase_uid) do update
    set balance=public.im_wallet_accounts.balance + excluded.balance, updated_at=now()
  returning balance into bal;

  insert into public.im_wallet_ledger(firebase_uid,amount,kind,ref_id)
  values(target,o.amount,'tip_received',p_order_id)
  on conflict(firebase_uid,kind,ref_id) do nothing;

  return query select bal,target;
end;
$function$
;

-- public.issue_telegram_binding_challenge()
CREATE OR REPLACE FUNCTION public.issue_telegram_binding_challenge()
 RETURNS TABLE(payload text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_payload text := encode(extensions.gen_random_bytes(18), 'hex');
  v_expires_at timestamptz := now() + interval '10 minutes';
begin
  insert into private.telegram_binding_challenge
    (singleton, token_hash, expires_at, consumed_at, created_at)
  values
    (true, extensions.digest(v_payload, 'sha256'), v_expires_at, null, now())
  on conflict (singleton) do update
  set token_hash = excluded.token_hash,
      expires_at = excluded.expires_at,
      consumed_at = null,
      created_at = now();

  return query select v_payload, v_expires_at;
end;
$function$
;

-- public.kd_clean_terms(text[],integer)
CREATE OR REPLACE FUNCTION public.kd_clean_terms(p_terms text[], p_max integer)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
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
$function$
;

-- public.kd_final_plan(text,bigint,text,text[],text[])
CREATE OR REPLACE FUNCTION public.kd_final_plan(p_question text, p_material_id bigint, p_category text DEFAULT NULL::text, p_core text[] DEFAULT '{}'::text[], p_exp text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

-- public.kd_material_hints(bigint)
CREATE OR REPLACE FUNCTION public.kd_material_hints(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

-- public.kd_pool(text,text,text[],text[])
CREATE OR REPLACE FUNCTION public.kd_pool(p_question text, p_category text, p_core text[], p_exp text[])
 RETURNS TABLE(id bigint, title text, answer_summary text, keywords text[], score double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select r.id, r.title, r.answer_summary, r.keywords, r.lexical_score
  from public.search_product_answers_hybrid_v3(
         case when p_category in ('personal_income','business_help','content_monetization')
              then '[GYXCAT:' || p_category || '] ' else '' end || left(btrim(coalesce(p_question, '')), 200),
         public.kd_clean_terms(p_core, 8), public.kd_clean_terms(p_exp, 12), '{}'::text[], 60) r
  where char_length(btrim(coalesce(p_question, ''))) >= 2
    and (r.core_hits >= 1 or (r.expansion_hits >= 2 and r.lexical_score >= 20))
$function$
;

-- public.kd_round_options(text,integer,text,bigint[],bigint[],text[],text[])
CREATE OR REPLACE FUNCTION public.kd_round_options(p_question text, p_round integer, p_category text DEFAULT NULL::text, p_picked bigint[] DEFAULT '{}'::bigint[], p_shown bigint[] DEFAULT '{}'::bigint[], p_core text[] DEFAULT '{}'::text[], p_exp text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

-- public.learn_actor()
CREATE OR REPLACE FUNCTION public.learn_actor()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare h json; ip text; uid uuid := auth.uid();
begin
  if uid is not null then return 'u:' || uid::text; end if;
  begin h := nullif(current_setting('request.headers', true), '')::json; exception when others then h := null; end;
  ip := coalesce(nullif(btrim(h->>'cf-connecting-ip'), ''),
                 nullif(btrim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', -1)), ''));
  if ip is null then return 'anon:unknown'; end if;
  return 'ip:' || left(encode(extensions.digest(ip || ':gyx-learn-v1', 'sha256'), 'hex'), 32);
end $function$
;

-- public.learn_admin_overview(integer)
CREATE OR REPLACE FUNCTION public.learn_admin_overview(p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- public.learn_admin_rollback(text,bigint,integer)
CREATE OR REPLACE FUNCTION public.learn_admin_rollback(p_table text, p_id bigint, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- public.learn_admin_set_status(text,bigint,text)
CREATE OR REPLACE FUNCTION public.learn_admin_set_status(p_table text, p_id bigint, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- public.learn_admin_upsert_kb(bigint,text,text,text,text,text[],text,text)
CREATE OR REPLACE FUNCTION public.learn_admin_upsert_kb(p_id bigint, p_question text, p_answer_zh text, p_answer_en text DEFAULT NULL::text, p_answer_km text DEFAULT NULL::text, p_tags text[] DEFAULT '{}'::text[], p_channel text DEFAULT 'any'::text, p_status text DEFAULT 'active'::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- public.learn_get_synonyms()
CREATE OR REPLACE FUNCTION public.learn_get_synonyms()
 RETURNS TABLE(term_norm text, expansions text[], role text, category text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select s.term_norm, s.expansions, s.role, s.category
  from public.learn_synonyms s where s.status = 'active'
  order by s.verified_hits desc, s.id limit 2000;
$function$
;

-- public.learn_log_search(text,text,text,text,integer,integer,integer,integer,bigint[],text[],boolean,text)
CREATE OR REPLACE FUNCTION public.learn_log_search(p_session text, p_query text, p_category text DEFAULT NULL::text, p_mode text DEFAULT 'manual'::text, p_round integer DEFAULT 1, p_result_count integer DEFAULT 0, p_strict_count integer DEFAULT 0, p_fill_count integer DEFAULT 0, p_picked_ids bigint[] DEFAULT '{}'::bigint[], p_picked_texts text[] DEFAULT '{}'::text[], p_completed boolean DEFAULT false, p_locale text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare q text := public.learn_redact(left(trim(coalesce(p_query,'')),200)); a text := public.learn_actor();
begin
  if char_length(coalesce(p_session,'')) not between 4 and 80 or char_length(q) < 1 then return; end if;
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
end $function$
;

-- public.learn_log_support(text,text,text,text,text,bigint,boolean,text)
CREATE OR REPLACE FUNCTION public.learn_log_support(p_session text, p_channel text, p_question text, p_topic text DEFAULT NULL::text, p_source text DEFAULT 'none'::text, p_kb_id bigint DEFAULT NULL::bigint, p_answered boolean DEFAULT false, p_locale text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare q text := public.learn_redact(left(trim(coalesce(p_question,'')),500)); new_id bigint;
        a text := public.learn_actor(); kb bigint := null;
begin
  if char_length(coalesce(p_session,'')) not between 4 and 80 or char_length(q) < 1
     or p_channel not in ('home','member') then return null; end if;
  if (select count(*) from public.learn_support_events
      where actor = a and created_at > now() - interval '1 hour') >= 40 then return null; end if;
  if (select count(*) from public.learn_support_events
      where created_at > now() - interval '1 minute') >= 300 then return null; end if;
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
end $function$
;

-- public.learn_mark_support_unhelpful(text,bigint)
CREATE OR REPLACE FUNCTION public.learn_mark_support_unhelpful(p_session text, p_event_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k bigint; a text := public.learn_actor();
begin
  update public.learn_support_events set unhelpful = true
   where id = p_event_id and actor = a and unhelpful = false
     and created_at > now() - interval '30 minutes'
  returning kb_id into k;
  if k is null then return; end if;
  if (select count(*) from public.learn_kb_votes v where v.actor = a and v.voted_at > now() - interval '1 day') >= 20 then return; end if;
  if (select count(*) from public.learn_kb_votes v where v.kb_id = k and v.voted_at > now() - interval '1 day') >= 10 then return; end if;
  insert into public.learn_kb_votes(kb_id, actor) values (k, a) on conflict (kb_id, actor) do nothing;
  if found then update public.learn_kb set unhelpful = unhelpful + 1 where id = k; end if;
end $function$
;

-- public.learn_mine_synonyms()
CREATE OR REPLACE FUNCTION public.learn_mine_synonyms()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n int := 0; auto boolean := coalesce((public.learn_setting('auto_activate_synonyms','false'::jsonb))::text::boolean,false);
begin
  with ok as (
    select e.normalized, (array_agg(e.query order by e.created_at desc))[1] q, e.category,
           array_agg(distinct pid) pids, count(distinct e.user_id) users
    from public.learn_search_events e
    cross join lateral unnest(e.picked_ids) pid
    where e.completed and e.mode = 'manual' and e.user_id is not null and e.created_at > now() - interval '30 days'
      and char_length(e.normalized) between 2 and 24
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
end $function$
;

-- public.learn_norm(text)
CREATE OR REPLACE FUNCTION public.learn_norm(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select left(regexp_replace(lower(coalesce(p,'')),
    '[[:space:]，。！？、；：,.!?;:()（）【】\[\]"''“”‘’_\-/\\]+','','g'),200);
$function$
;

-- public.learn_redact(text)
CREATE OR REPLACE FUNCTION public.learn_redact(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select left(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(coalesce(p,''), '(https?://|www\.)[^[:space:]]+', '[link]', 'gi'),
          '(t|telegram)\.me/[^[:space:]]*', '[link]', 'gi'),
        '[^[:space:]@]+@[^[:space:]@]+', '[email]', 'g'),
      '@[A-Za-z0-9_]{3,}', '[handle]', 'g'),
    '([A-Za-z0-9]{24,})|(\+?[0-9][0-9 ()-]{5,}[0-9])', '[id]', 'g'),
  500);
$function$
;

-- public.learn_refresh_gaps()
CREATE OR REPLACE FUNCTION public.learn_refresh_gaps()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n_search int := 0; n_support int := 0; min_hits int := greatest(3, coalesce((public.learn_setting('min_hits_for_gap','3'::jsonb))::text::int,3));
        keep_days int := coalesce((public.learn_setting('event_retention_days','180'::jsonb))::text::int,180);
begin
  with bad as (
    select normalized, (array_agg(query order by created_at desc))[1] sample,
           (array_agg(locale order by created_at desc))[1] loc, count(distinct actor) c, max(created_at) last_at
    from public.learn_search_events
    where created_at > now() - interval '14 days'
      and ((round = 1 and (result_count = 0 or strict_count < 3 or fill_count >= 2))
           or (round between 2 and 5 and fill_count >= 1))
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
  update public.learn_gaps set status = 'open' where status = 'working' and updated_at < now() - interval '1 hour';
  return jsonb_build_object('search_gaps', n_search, 'support_gaps', n_support);
end $function$
;

-- public.learn_setting(text,jsonb)
CREATE OR REPLACE FUNCTION public.learn_setting(p_key text, p_default jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select coalesce((select value from public.learn_settings where key = p_key), p_default); $function$
;

-- public.learn_support_lookup(text,text,text)
CREATE OR REPLACE FUNCTION public.learn_support_lookup(p_question text, p_locale text DEFAULT 'zh'::text, p_channel text DEFAULT 'home'::text)
 RETURNS TABLE(kb_id bigint, answer text, score real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    and not (k.source <> 'admin' and k.unhelpful >= 5 and k.unhelpful * 2 > k.hits)
    and (extensions.similarity(k.q_norm, qs) >= 0.35 or (char_length(k.q_norm) >= 2 and qs like '%'||k.q_norm||'%'))
  order by sc desc, k.hits desc limit 1;
  if not found then return; end if;
  insert into public.learn_support_served(actor, kb_id) values (a, r.id);
  delete from public.learn_support_served where served_at < now() - interval '2 days';
  kb_id := r.id; answer := r.ans; score := r.sc;
  return next;
end $function$
;

-- public.learn_version_trigger()
CREATE OR REPLACE FUNCTION public.learn_version_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- private.lock_home_fixed_order_scheme()
CREATE OR REPLACE FUNCTION private.lock_home_fixed_order_scheme()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.fixed_order_schemes%rowtype;
  a_title text;
begin
  select * into s
  from public.fixed_order_schemes
  where product_id = new.product_id and is_active = true
  limit 1;

  if s.scheme_id is null then
    return new;
  end if;

  select title into a_title
  from public.product_answer_options
  where id = s.answer_id and product_id = s.product_id and is_active = true
  limit 1;

  if a_title is null then
    raise exception 'FIXED_SCHEME_DELIVERY_NOT_READY' using errcode='23514';
  end if;

  new.source_module := coalesce(nullif(new.source_module,''), s.source_module);
  new.source_type := coalesce(nullif(new.source_type,''), s.source_type);
  new.answer_id := s.answer_id;
  new.answer_tier := 'fixed';
  new.matched_answer_title := a_title;
  return new;
end;
$function$
;

-- public.match_product_answers(text,integer)
CREATE OR REPLACE FUNCTION public.match_product_answers(p_query text, p_round integer DEFAULT 1)
 RETURNS TABLE(answer_id bigint, answer_code text, module_code text, module_name text, module_emoji text, answer_title text, answer_summary text, product_id text, product_name text, product_price numeric, currency text, round_no integer, choice_no integer, total_rounds integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_query text;
  v_offset integer;
begin
  v_query := lower(btrim(regexp_replace(coalesce(p_query, ''), '[[:space:]]+', ' ', 'g')));

  if char_length(v_query) < 2 then
    raise exception using errcode = '22023', message = 'QUERY_TOO_SHORT';
  end if;
  if char_length(v_query) > 200 then
    raise exception using errcode = '22023', message = 'QUERY_TOO_LONG';
  end if;
  if p_round is null or p_round < 1 or p_round > 6 then
    raise exception using errcode = '22023', message = 'ROUND_MUST_BE_1_TO_6';
  end if;

  v_offset := (p_round - 1) * 5;

  return query
  with module_scores as (
    select
      m.module_code,
      m.sort_order,
      coalesce(sum(
        case
          when position(lower(k.keyword) in v_query) > 0
            then 10 + char_length(k.keyword)
          else 0
        end
      ), 0)::integer as score
    from public.product_answer_modules m
    left join lateral unnest(m.keywords) as k(keyword) on true
    where m.is_active
    group by m.module_code, m.sort_order
  ),
  chosen_module as (
    select ms.module_code
    from module_scores ms
    where ms.score > 0
    order by ms.score desc, ms.sort_order
    limit 1
  ),
  candidates as (
    select
      a.id,
      a.answer_code,
      a.module_code,
      m.module_name,
      m.emoji,
      m.sort_order as module_sort_order,
      a.title,
      a.answer_summary,
      a.product_id,
      p.product_name,
      p.product_price,
      p.currency,
      a.priority,
      coalesce((
        select sum(
          case
            when position(lower(answer_keyword) in v_query) > 0
              then 100 + (char_length(answer_keyword) * 10)
            else 0
          end
        )
        from unnest(a.keywords) as answer_keyword
      ), 0)::integer
      + case when position(lower(a.title) in v_query) > 0 then 500 else 0 end
      as relevance_score
    from public.product_answer_options a
    join public.product_answer_modules m on m.module_code = a.module_code
    join public.products p on p.id = a.product_id
    where a.is_active
      and m.is_active
      and p.is_active
      and (
        not exists (select 1 from chosen_module)
        or a.module_code = (select cm.module_code from chosen_module cm)
      )
  ),
  ranked as (
    select
      c.*,
      row_number() over (
        order by c.relevance_score desc, c.priority, c.module_sort_order, c.id
      )::integer as absolute_rank
    from candidates c
  )
  select
    r.id,
    r.answer_code,
    r.module_code,
    r.module_name,
    r.emoji,
    r.title,
    r.answer_summary,
    r.product_id,
    r.product_name,
    r.product_price,
    r.currency,
    p_round,
    r.absolute_rank - v_offset,
    6
  from ranked r
  where r.absolute_rank > v_offset
    and r.absolute_rank <= v_offset + 5
  order by r.absolute_rank;
end;
$function$
;

-- public.match_product_answers_bge_lab(extensions.vector,integer)
CREATE OR REPLACE FUNCTION public.match_product_answers_bge_lab(query_embedding extensions.vector, match_count integer DEFAULT 20)
 RETURNS TABLE(id bigint, title text, answer_summary text, keywords text[], source_name text, semantic_similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select p.id,p.title,p.answer_summary,p.keywords,p.source_name,
         1 - (e.embedding <=> query_embedding) as semantic_similarity
  from public.product_answer_embeddings_bge_lab e
  join public.product_answer_options p on p.id=e.material_id
  where p.is_active=true
  order by e.embedding <=> query_embedding
  limit greatest(1,least(coalesce(match_count,20),100));
$function$
;

-- private.order_answer_product_guard()
CREATE OR REPLACE FUNCTION private.order_answer_product_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

-- private.prepare_order()
CREATE OR REPLACE FUNCTION private.prepare_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_product public.products%rowtype;
  v_uid uuid;
  v_match_count integer;
  v_recent_count integer;
  v_wallet text;
  v_currency text;
  v_network text;
  v_service boolean := coalesce(auth.jwt()->>'role','')='service_role';
  v_growth boolean := false;
  v_growth_base numeric;
  v_growth_usdt numeric;
  v_growth_days integer;
  v_profile_locale text;
begin
  v_uid := (select auth.uid());
  if v_uid is not null then new.user_id := v_uid;
  elsif new.user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;

  if v_uid is not null then
    update public.orders set status='expired', updated_at=now()
      where user_id=v_uid and status='pending' and created_at <= now() - interval '30 minutes';

    if exists(
      select 1 from public.orders o
      where o.user_id=v_uid
        and o.product_id=new.product_id
        and coalesce(o.hidden_by_user,false)=false
        and o.status in ('pending','checking')
    ) then
      raise exception 'OPEN_ORDER_ALREADY_EXISTS' using errcode='23505';
    end if;

    select count(*) into v_recent_count from public.orders o
      where o.user_id=v_uid and o.created_at > now()-interval '10 minutes';
    if v_recent_count>=5 then raise exception 'ORDER_RATE_LIMITED' using errcode='54000'; end if;
  end if;

  select p.* into v_product from public.products p where p.id=new.product_id and p.is_active=true limit 1;
  if v_product.id is null and nullif(trim(new.plan_name),'') is not null then
    select count(*) into v_match_count from public.products p where p.is_active=true and (p.id=trim(new.plan_name) or p.product_name=trim(new.plan_name));
    if v_match_count>1 then raise exception 'PRODUCT_ID_REQUIRED_FOR_AMBIGUOUS_NAME' using errcode='23514';
    elsif v_match_count=1 then select p.* into v_product from public.products p where p.is_active=true and (p.id=trim(new.plan_name) or p.product_name=trim(new.plan_name)) limit 1; end if;
  end if;
  if v_product.id is null then raise exception 'PRODUCT_NOT_FOUND_OR_INACTIVE' using errcode='23503'; end if;

  select case
    when lower(coalesce(p.locale,'')) like 'en%' then 'en'
    when lower(coalesce(p.locale,'')) like 'km%' then 'km'
    else 'zh-CN'
  end into v_profile_locale
  from public.profiles p where p.user_id=new.user_id;
  new.delivery_locale := coalesce(nullif(new.delivery_locale,''), v_profile_locale, 'zh-CN');
  if new.delivery_locale not in ('zh-CN','en','km') then new.delivery_locale := 'zh-CN'; end if;

  v_growth := v_service
    and v_product.id='business-growth'
    and new.source_module='business_growth'
    and new.source_snapshot is not null;

  if v_growth then
    begin
      v_growth_base := (new.source_snapshot #>> '{payment,base_amount}')::numeric;
      v_growth_usdt := (new.source_snapshot #>> '{selected,price_usdt}')::numeric;
      v_growth_days := (new.source_snapshot #>> '{selected,days}')::integer;
    exception when others then
      raise exception 'INVALID_BUSINESS_GROWTH_ORDER' using errcode='23514';
    end;
    if v_growth_days not in (3,7,15)
       or (v_growth_days=3 and v_growth_usdt<>29.99)
       or (v_growth_days=7 and v_growth_usdt<>59.99)
       or (v_growth_days=15 and v_growth_usdt<>99.99)
       or v_growth_base is null or v_growth_base<=0 or v_growth_base>500
       or v_growth_base<>v_growth_usdt then
      raise exception 'INVALID_BUSINESS_GROWTH_ORDER' using errcode='23514';
    end if;
    new.product_id:=v_product.id;
    new.product_name:='实体经营改善·'||v_growth_days::text||'天执行计划';
    new.product_price:=v_growth_base;
    new.payable_amount:=v_growth_base;
    new.plan_name:=v_growth_days::text||'天执行计划';
    new.plan_price:=trim(to_char(v_growth_usdt,'FM999999990.00'))||' USDT';
  else
    new.product_id:=v_product.id;
    new.product_name:=v_product.product_name;
    new.product_price:=v_product.product_price;
    new.payable_amount:=v_product.product_price;
    new.plan_name:=v_product.product_name;
    new.plan_price:=v_product.product_price::text||' USDT';
  end if;

  new.customer_name:=nullif(trim(coalesce(nullif(new.customer_name,''),split_part(coalesce(new.contact,''),'|',1))), '');
  new.customer_email:=lower(nullif(trim(coalesce(nullif(new.customer_email,''),nullif(split_part(coalesce(new.contact,''),'|',2),''),(select auth.jwt()->>'email'))),''));
  new.customer_phone:=nullif(trim(coalesce(nullif(new.customer_phone,''),nullif(split_part(coalesce(new.contact,''),'|',3),''))), '');
  if new.customer_name is null or length(new.customer_name)>120 then raise exception 'VALID_CUSTOMER_NAME_REQUIRED' using errcode='23514'; end if;
  if new.customer_email is null or length(new.customer_email)>254 or new.customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'VALID_CUSTOMER_EMAIL_REQUIRED' using errcode='23514'; end if;
  if new.customer_phone is not null and (length(new.customer_phone)<6 or length(new.customer_phone)>40) then raise exception 'VALID_CUSTOMER_PHONE_REQUIRED' using errcode='23514'; end if;

  select value into v_wallet from public.site_settings where key='payment_wallet';
  select value into v_currency from public.site_settings where key='payment_currency';
  select value into v_network from public.site_settings where key='payment_network';
  new.contact:=concat_ws(' | ',new.customer_name,new.customer_email,new.customer_phone);
  new.order_no:='GYX'||to_char(clock_timestamp() at time zone 'utc','YYYYMMDDHH24MISSMS')||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  new.status:='pending'; new.txid:=null; new.wallet_address:=coalesce(nullif(v_wallet,''),'TKfQoN7kZirALGYxMkxU4SoqMWJRqXsh7k'); new.download_url:=null; new.payment_submitted_at:=null; new.paid_at:=null; new.delivered_at:=null; new.currency:=coalesce(nullif(v_currency,''),'USDT'); new.network:=coalesce(nullif(v_network,''),'TRC20'); new.created_at:=now(); new.updated_at:=now();
  return new;
end;
$function$
;

-- public.purge_expired_orders_automatically()
CREATE OR REPLACE FUNCTION public.purge_expired_orders_automatically()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  n integer;
begin
  delete from public.orders
  where status = 'expired';
  get diagnostics n = row_count;
  return n;
end;
$function$
;

-- public.record_manual_payment_interest(bigint,text)
CREATE OR REPLACE FUNCTION public.record_manual_payment_interest(p_order_id bigint, p_method text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_method text:=lower(trim(coalesce(p_method,'')));
begin
  if v_method not in ('wechat','alipay','bank') then raise exception 'INVALID_PAYMENT_METHOD' using errcode='23514'; end if;
  select o.* into v_order from public.orders o where o.id=p_order_id and o.user_id=(select auth.uid());
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode='P0002'; end if;
  insert into public.notification_outbox(event_type,order_id,dedupe_key,payload)
  values('manual_payment_opened',v_order.id,'manual_payment_opened:'||v_order.id::text||':'||v_method,jsonb_build_object('method',v_method,'order_no',v_order.order_no,'amount',v_order.payable_amount,'currency',v_order.currency,'product_name',v_order.product_name))
  on conflict(dedupe_key) do nothing;
  return true;
end;
$function$
;

-- public.record_payment_txid(uuid,bigint,text)
CREATE OR REPLACE FUNCTION public.record_payment_txid(p_user_id uuid, p_order_id bigint, p_txid text)
 RETURNS TABLE(id bigint, order_no text, user_id uuid, product_id text, product_name text, payable_amount numeric, status text, txid text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_txid text;
begin
  v_txid := upper(trim(coalesce(p_txid, '')));
  if v_txid !~ '^[0-9A-F]{64}$' then
    raise exception 'INVALID_TRON_TXID' using errcode = '23514';
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id and o.user_id = p_user_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_order.txid = v_txid and v_order.status in ('checking', 'paid', 'delivered') then
    return query
      select v_order.id, v_order.order_no, v_order.user_id, v_order.product_id,
             v_order.product_name, v_order.payable_amount, v_order.status,
             v_order.txid, v_order.created_at;
    return;
  end if;

  if v_order.status not in ('pending','failed') then
    raise exception 'ORDER_NOT_OPEN_FOR_PAYMENT' using errcode = '23514';
  end if;

  if v_order.status = 'pending' and v_order.txid is not null and v_order.txid <> v_txid then
    raise exception 'ORDER_ALREADY_HAS_DIFFERENT_TXID' using errcode = '23505';
  end if;

  if v_order.status = 'failed' and v_order.txid = v_txid then
    raise exception 'FAILED_TXID_CANNOT_BE_REUSED' using errcode = '23505';
  end if;

  update public.orders o
  set txid = v_txid
  where o.id = v_order.id
  returning o.* into v_order;

  return query
    select v_order.id, v_order.order_no, v_order.user_id, v_order.product_id,
           v_order.product_name, v_order.payable_amount, v_order.status,
           v_order.txid, v_order.created_at;
end;
$function$
;

-- public.refresh_community_public_stats_snapshot()
CREATE OR REPLACE FUNCTION public.refresh_community_public_stats_snapshot()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.community_public_stats_snapshot (
    id,
    today_published,
    request_users,
    confirmed_users,
    confirmed_orders,
    today_taken,
    remaining,
    cumulative_taken,
    updated_at
  )
  with d as (
    select id
    from public.community_external_feed
    where batch_key like to_char(now() at time zone 'Asia/Shanghai','YYYY-MM-DD') || '-%'
  ),
  agg as (
    select
      (select count(*) from d)::bigint as today_published,
      (select count(distinct s.user_id)
         from public.community_opportunity_stats s
         join d on d.id = s.opportunity_id
        where s.action = 'request_url')::bigint as request_users,
      (select count(distinct s.user_id)
         from public.community_opportunity_stats s
         join d on d.id = s.opportunity_id
        where s.action = 'confirmed_order')::bigint as confirmed_users,
      (select count(*)
         from public.community_opportunity_stats s
         join d on d.id = s.opportunity_id
        where s.action = 'confirmed_order')::bigint as confirmed_orders,
      (select count(*)
         from public.community_opportunity_status_history h
        where h.status = 'closed'
          and h.closed_at is not null
          and (h.closed_at at time zone 'Asia/Shanghai')::date = (now() at time zone 'Asia/Shanghai')::date)::bigint as today_taken,
      greatest(
        (select count(*) from d) -
        (select count(*)
           from public.community_opportunity_status_history h
          where h.status = 'closed'
            and h.closed_at is not null
            and (h.closed_at at time zone 'Asia/Shanghai')::date = (now() at time zone 'Asia/Shanghai')::date),
        0
      )::bigint as remaining,
      (select count(*)
         from public.community_opportunity_status_history h
        where h.status = 'closed' and h.closed_at is not null)::bigint as cumulative_taken
  )
  select 1, today_published, request_users, confirmed_users, confirmed_orders,
         today_taken, remaining, cumulative_taken, now()
  from agg
  on conflict (id) do update set
    today_published = excluded.today_published,
    request_users = excluded.request_users,
    confirmed_users = excluded.confirmed_users,
    confirmed_orders = excluded.confirmed_orders,
    today_taken = excluded.today_taken,
    remaining = excluded.remaining,
    cumulative_taken = excluded.cumulative_taken,
    updated_at = excluded.updated_at;
end;
$function$
;

-- public.refresh_member_level(uuid)
CREATE OR REPLACE FUNCTION public.refresh_member_level(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_count integer:=0;
  v_spent numeric:=0;
  v_level integer:=1;
  v_override integer;
  v_admin boolean:=false;
begin
  select count(*),coalesce(sum(payable_amount),0) into v_count,v_spent
  from public.orders
  where user_id=p_user_id and status in ('paid','delivered');
  select member_level_override into v_override from public.profiles where user_id=p_user_id;
  select exists(select 1 from public.admin_users where user_id=p_user_id and is_active=true) into v_admin;
  if v_admin then v_level:=4;
  elsif v_override is not null then v_level:=v_override;
  elsif v_count>=15 or v_spent>=500 then v_level:=4;
  elsif v_count>=5 or v_spent>=100 then v_level:=3;
  elsif v_count>=1 then v_level:=2;
  else v_level:=1;
  end if;
  update public.profiles set valid_order_count=v_count,total_spent=v_spent,member_level=v_level where user_id=p_user_id;
end;
$function$
;

-- public.refresh_member_level_from_order()
CREATE OR REPLACE FUNCTION public.refresh_member_level_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.refresh_member_level(coalesce(new.user_id,old.user_id));
  if tg_op='UPDATE' and old.user_id is distinct from new.user_id then perform public.refresh_member_level(old.user_id); end if;
  return coalesce(new,old);
end;
$function$
;

-- public.reject_payment(bigint,text,numeric,text,text,text)
CREATE OR REPLACE FUNCTION public.reject_payment(p_order_id bigint, p_txid text, p_received_amount numeric, p_from_address text, p_to_address text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_now timestamptz := now();
begin
  select o.* into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.txid is distinct from upper(trim(p_txid)) then
    raise exception 'ORDER_TXID_MISMATCH' using errcode = '23514';
  end if;
  if v_order.status = 'failed' then
    return;
  end if;
  if v_order.status <> 'checking' then
    raise exception 'ORDER_NOT_AWAITING_VERIFICATION' using errcode = '23514';
  end if;

  update public.payments p
  set status = 'rejected',
      checked_at = v_now,
      received_amount = p_received_amount,
      from_address = nullif(trim(p_from_address), ''),
      to_address = nullif(trim(p_to_address), ''),
      rejection_reason = left(coalesce(p_reason, 'PAYMENT_MISMATCH'), 300)
  where p.order_id = v_order.id and p.txid = v_order.txid;

  update public.orders o set status = 'failed' where o.id = v_order.id;
end;
$function$
;

-- public.search_product_answers_hybrid(text,text[],integer)
CREATE OR REPLACE FUNCTION public.search_product_answers_hybrid(query_text text, query_terms text[] DEFAULT ARRAY[]::text[], match_count integer DEFAULT 30)
 RETURNS TABLE(id bigint, module_code text, title text, answer_summary text, keywords text[], priority smallint, source_name text, lexical_score double precision, matched_terms text[])
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
with cleaned as (
  select distinct trim(t) as term
  from unnest(array_prepend(coalesce(query_text,''), coalesce(query_terms,array[]::text[]))) t
  where length(trim(t)) >= 2
), scored as (
  select
    p.id,p.module_code,p.title,p.answer_summary,p.keywords,p.priority,p.source_name,
    coalesce(max(
      case
        when lower(p.title) = lower(c.term) then 45
        when lower(p.title) like '%'||lower(c.term)||'%' then 30
        when lower(coalesce(p.answer_summary,'')) like '%'||lower(c.term)||'%' then 16
        when exists(select 1 from unnest(coalesce(p.keywords,array[]::text[])) k where lower(k)=lower(c.term)) then 36
        when exists(select 1 from unnest(coalesce(p.keywords,array[]::text[])) k where lower(k) like '%'||lower(c.term)||'%' or lower(c.term) like '%'||lower(k)||'%') then 24
        else 0
      end
      + 14 * similarity(lower(coalesce(p.title,'')), lower(c.term))
      + 7 * similarity(lower(coalesce(p.answer_summary,'')), lower(c.term))
    ),0)
    + least(coalesce(p.priority,0),100) * 0.03 as lexical_score,
    array_remove(array_agg(distinct case when
      lower(coalesce(p.title,'')) like '%'||lower(c.term)||'%'
      or lower(coalesce(p.answer_summary,'')) like '%'||lower(c.term)||'%'
      or exists(select 1 from unnest(coalesce(p.keywords,array[]::text[])) k where lower(k) like '%'||lower(c.term)||'%' or lower(c.term) like '%'||lower(k)||'%')
      or similarity(lower(coalesce(p.title,'')), lower(c.term)) >= 0.28
      then c.term end), null) as matched_terms
  from public.product_answer_options p
  cross join cleaned c
  where p.is_active=true
    and p.module_code in ('business','work','creation','automation')
  group by p.id,p.module_code,p.title,p.answer_summary,p.keywords,p.priority,p.source_name
)
select * from scored
where lexical_score >= 4
order by lexical_score desc, priority desc, id desc
limit greatest(1,least(coalesce(match_count,30),100));
$function$
;

-- public.search_product_answers_hybrid_base(text,text[],text[],text[],integer)
CREATE OR REPLACE FUNCTION public.search_product_answers_hybrid_base(query_text text, core_terms text[] DEFAULT ARRAY[]::text[], expansion_terms text[] DEFAULT ARRAY[]::text[], history_terms text[] DEFAULT ARRAY[]::text[], match_count integer DEFAULT 50)
 RETURNS TABLE(id bigint, module_code text, title text, answer_summary text, keywords text[], priority smallint, source_name text, lexical_score double precision, core_hits integer, expansion_hits integer, history_hits integer, matched_terms text[])
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
with cfg as (
  select case
    when coalesce(query_text,'') ~* '\[GYXCAT:personal_income\]' then 'personal_income'
    when coalesce(query_text,'') ~* '\[GYXCAT:business_help\]' then 'business_help'
    when coalesce(query_text,'') ~* '\[GYXCAT:content_monetization\]' then 'content_monetization'
    else null end::text as cat,
    regexp_replace(coalesce(query_text,''),'\[GYXCAT:(personal_income|business_help|content_monetization)\][[:space:]]*','','gi') as clean_query
), q as (
  select regexp_replace(lower(cfg.clean_query), '[[:space:]，。！？、；：,.!?;:()（）【】\[\]"''_\\/\-]+', '', 'g') as s from cfg
), qgrams as (
  select distinct substr(q.s,pos,n) as term,
    case when substr(q.s,pos,n) ~ '(兼职|赚钱|副业|客流|复购|获客|成交|转化|效率|收入|变现|接单|客户|平台|服务|内容|门店|预约)' then 'query_soft'
         when n>=3 then 'query' else 'query_soft' end::text as kind,
    case when n>=3 then 1.10 else 0.72 end::float8 as weight
  from q cross join lateral generate_series(2,4) n cross join lateral generate_series(1,greatest(0,char_length(q.s)-n+1)) pos
  where char_length(q.s)>=n and not (substr(q.s,pos,n) ~ '(我会|我想|我要|想做|想要|帮我|怎么|怎样|如何|可以|什么|是否|有没|能不|需要|提高|增加)')
), raw_terms as (
  select unnest(coalesce(core_terms,array[]::text[])) term,'core'::text kind,1.0::float8 preset_weight
  union all select unnest(coalesce(expansion_terms,array[]::text[])),'expansion',1.0
  union all select unnest(coalesce(history_terms,array[]::text[])),'history',1.0
  union all select term,kind,weight from qgrams
), terms as (
  select distinct trim(r.term) term,
    case when r.kind='core' and lower(trim(r.term)) in ('客流','获客','赚钱','变现','副业','兼职','收入','复购','成交','转化','效率','接单','客户','平台','服务','内容','门店','预约') then 'expansion'
         when r.kind='history' and lower(trim(r.term)) in ('客户','门店','预约','上门','本地服务','复购','到店','短视频','接单','平台','服务','内容') then 'expansion'
         else r.kind end as kind,
    case when r.kind in ('query','query_soft') then r.preset_weight
         when r.kind='history' and lower(trim(r.term)) not in ('客户','门店','预约','上门','本地服务','复购','到店','短视频','接单','平台','服务','内容') then 1.85
         when r.kind='core' and lower(trim(r.term)) not in ('客流','获客','赚钱','变现','副业','兼职','收入','复购','成交','转化','效率','接单','客户','平台','服务','内容','门店','预约') then 1.45
         when r.kind='expansion' and lower(trim(r.term)) in ('赚钱','变现','接单','兼职','副业','收入','客户','平台') and (select s from q) ~ '(赚钱|变现|接单|兼职|副业|收入)' then 3.0
         when r.kind='expansion' and lower(trim(r.term)) in ('客流','获客','到店','复购','成交','转化') and (select s from q) ~ '(客流|获客|到店|复购|成交|转化|增加客)' then 1.6
         else 0.55 end::float8 as weight
  from raw_terms r where length(trim(r.term))>=2
), matches0 as (
  select p.id,p.module_code,p.title,p.answer_summary,p.keywords,p.priority,p.source_name,t.term,t.kind,t.weight,
    case when lower(coalesce(p.title,''))=lower(t.term) then 44
         when lower(coalesce(p.title,'')) like '%'||lower(t.term)||'%' then 30
         when exists(select 1 from unnest(coalesce(p.keywords,array[]::text[])) k where lower(k)=lower(t.term)) then 36
         when exists(select 1 from unnest(coalesce(p.keywords,array[]::text[])) k where lower(k) like '%'||lower(t.term)||'%' or (char_length(k)>=3 and lower(t.term) like '%'||lower(k)||'%')) then 22
         when lower(coalesce(p.answer_summary,'')) like '%'||lower(t.term)||'%' then 12 else 0 end as base_score,
    exists(select 1 from unnest(coalesce(p.keywords,array[]::text[])) k where lower(k)=lower(t.term)) as exact_keyword
  from public.product_answer_options p cross join terms t cross join cfg
  where p.is_active=true and p.product_id like 'answer-%' and p.module_code in ('business','work','creation','automation')
    and (cfg.cat is null or p.search_category=cfg.cat)
), matches as (
  select id,module_code,title,answer_summary,keywords,priority,source_name,term,
    case when kind='query_soft' and not (lower(term) ~ '(兼职|赚钱|副业|客流|复购|获客|成交|转化|效率|收入|变现|接单|客户|平台|服务|内容|门店|预约)')
      and (exact_keyword or lower(coalesce(title,'')) like lower(term)||'%') then 'core'
      when kind='query_soft' then 'expansion' else kind end as kind,
    base_score*weight as term_score
  from matches0
), agg as (
  select id,module_code,title,answer_summary,keywords,priority,source_name,
    sum(term_score)+least(coalesce(priority,0),100)*0.03 as lexical_score,
    count(*) filter(where kind='core' and term_score>0)::int as core_hits,
    count(*) filter(where kind='expansion' and term_score>0)::int as expansion_hits,
    count(*) filter(where kind='history' and term_score>0)::int as history_hits,
    array_agg(distinct lower(term)) filter(where term_score>0) as base_matched_terms
  from matches group by id,module_code,title,answer_summary,keywords,priority,source_name
), enriched as (
  select a.*,array(select distinct x from unnest(coalesce(a.base_matched_terms,array[]::text[]) || case when a.core_hits>0 or a.history_hits>0 then coalesce(a.keywords[1:3],array[]::text[]) else array[]::text[] end) x where length(trim(x))>=2) as matched_terms
  from agg a
), gated as (
  select e.* from enriched e cross join q
  where (q.s !~ '(赚钱|变现|接单|兼职|副业|收入)' or exists(select 1 from unnest(coalesce(e.base_matched_terms,array[]::text[])) x where x ~ '(赚钱|变现|接单|兼职|副业|收入|客户|平台)'))
    and (q.s !~ '(客流|获客|到店|复购|成交|转化|增加客)' or exists(select 1 from unnest(coalesce(e.base_matched_terms,array[]::text[])) x where x ~ '(客流|获客|到店|复购|成交|转化)'))
), scored as (
  select g.*,max(lexical_score) filter(where core_hits>0) over() as max_core_score from gated g
)
select id,module_code,title,answer_summary,keywords,priority,source_name,lexical_score,core_hits,expansion_hits,history_hits,matched_terms
from scored
where lexical_score>=8 and (core_hits>0 or history_hits>0 or expansion_hits>=2)
  and (coalesce(cardinality(history_terms),0)>0 or core_hits=0 or max_core_score is null or lexical_score>=max_core_score*0.32)
order by lexical_score desc,priority desc,id desc limit greatest(1,least(coalesce(match_count,50),100));
$function$
;

-- public.search_product_answers_hybrid_v2(text,text[],text[],text[],integer)
CREATE OR REPLACE FUNCTION public.search_product_answers_hybrid_v2(query_text text, core_terms text[] DEFAULT ARRAY[]::text[], expansion_terms text[] DEFAULT ARRAY[]::text[], history_terms text[] DEFAULT ARRAY[]::text[], match_count integer DEFAULT 50)
 RETURNS TABLE(id bigint, module_code text, title text, answer_summary text, keywords text[], priority smallint, source_name text, lexical_score double precision, core_hits integer, expansion_hits integer, history_hits integer, matched_terms text[])
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
select * from public.search_product_answers_hybrid_v3(query_text,core_terms,expansion_terms,history_terms,match_count);
$function$
;

-- public.search_product_answers_hybrid_v3(text,text[],text[],text[],integer)
CREATE OR REPLACE FUNCTION public.search_product_answers_hybrid_v3(query_text text, core_terms text[] DEFAULT ARRAY[]::text[], expansion_terms text[] DEFAULT ARRAY[]::text[], history_terms text[] DEFAULT ARRAY[]::text[], match_count integer DEFAULT 50)
 RETURNS TABLE(id bigint, module_code text, title text, answer_summary text, keywords text[], priority smallint, source_name text, lexical_score double precision, core_hits integer, expansion_hits integer, history_hits integer, matched_terms text[])
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
with cfg0 as (
  select case
    when coalesce(query_text,'') ~* '\[GYXCAT:personal_income\]' then 'personal_income'
    when coalesce(query_text,'') ~* '\[GYXCAT:business_help\]' then 'business_help'
    when coalesce(query_text,'') ~* '\[GYXCAT:content_monetization\]' then 'content_monetization'
    else null end::text as cat,
    regexp_replace(coalesce(query_text,''),'\[GYXCAT:(personal_income|business_help|content_monetization)\][[:space:]]*','','gi') as clean_query
), q as (
  select cat,clean_query,
         lower(regexp_replace(clean_query,'[[:space:]，。！？、；：,.!?;:()（）【】\[\]"''_\\/\-]+','','g')) as s,
         case
           when cat='personal_income' and lower(clean_query) ~ '(涨粉|粉丝|流量|账号|自媒体|tiktok|抖音|小红书|youtube|reels)' then 'audience_growth'
           when cat='personal_income' and lower(clean_query) ~ '(接单|客户|自由职业|fiverr|upwork|外包|剪辑|设计|修图|翻译|文案)' then 'skill_services'
           when cat='personal_income' and lower(clean_query) ~ '(兼职|副业|居家|在家|远程|零工|任务|空闲|下班)' then 'side_hustle'
           when cat='personal_income' and lower(clean_query) ~ '(电商|带货|选品|shopify|etsy|jumia|ozon|商品|跨境)' then 'ecommerce'
           when cat='personal_income' and lower(clean_query) ~ '(数字产品|模板|课程|资料包|电子书|知识变现)' then 'digital_products'
           when cat='personal_income' and lower(clean_query) ~ '(ai|人工智能|agent|api|自动化|机器人|提示词|gemini|groq)' then 'ai_tools'
           when cat='personal_income' and lower(clean_query) ~ '(办公|表格|文档|ppt|邮件|效率|整理|excel|word|notion)' then 'office_efficiency'
           when cat='business_help' and lower(clean_query) ~ '(复购|回头客|会员|老客|留存)' then 'repeat_business'
           when cat='business_help' and lower(clean_query) ~ '(客流|到店|没人|没客人|进店)' then 'foot_traffic'
           when cat='business_help' and lower(clean_query) ~ '(拉新|新客|获客|客户增长)' then 'new_customers'
           when cat='business_help' and lower(clean_query) ~ '(短视频|视频|直播|内容营销)' then 'video_leads'
           when cat='business_help' and lower(clean_query) ~ '(线上|地图|社群|私域|google|facebook|instagram|tiktok)' then 'online_marketing'
           when cat='business_help' and lower(clean_query) ~ '(活动|促销|优惠|折扣|节日|新品)' then 'promotions'
           when cat='business_help' and lower(clean_query) ~ '(效率|自动|预约|排班|派单|客服|流程)' then 'efficiency'
           when cat='content_monetization' and lower(clean_query) ~ '(明星|c罗|梅西|人物|历史人物|粉丝|应援)' then 'celebrity_ip'
           when cat='content_monetization' and lower(clean_query) ~ '(动漫|动画|漫画|漫剧|游戏|角色|二次元)' then 'anime_game'
           when cat='content_monetization' and lower(clean_query) ~ '(涨粉|粉丝增长|流量|账号增长)' then 'audience_growth'
           when cat='content_monetization' and lower(clean_query) ~ '(粉丝变现|周边|应援|会员|社群变现)' then 'fan_monetization'
           when cat='content_monetization' and lower(clean_query) ~ '(ip|人设|品牌化|角色设定|世界观)' then 'ip_building'
           when cat='content_monetization' and lower(clean_query) ~ '(短视频|视频|tiktok|抖音|youtube|reels)' then 'short_video'
           when cat='content_monetization' and lower(clean_query) ~ '(图文|海报|图片|摄影|文案|帖子)' then 'graphic_content'
           else null end::text as subcat
  from cfg0
), base as (
  select b.*
  from q
  cross join lateral public.search_product_answers_hybrid_base(q.clean_query,core_terms,expansion_terms,history_terms,100) b
), ranked as (
  select b.*,
    case when exists (
      select 1 from unnest(coalesce(b.keywords,array[]::text[])) k, q
      where char_length(trim(k))>=2
        and lower(trim(k)) not in ('ai','图片','视频','音乐','网站','内容','服务','平台','客户','运营','接单','赚钱','变现','兼职','副业','收入','客流','获客','复购','预约','美容','门店','短视频','社媒')
        and q.s like '%'||lower(regexp_replace(trim(k),'[[:space:]，。！？、；：,.!?;:()（）【】\[\]"''_\\/\-]+','','g'))||'%'
    ) then 220 else 0 end as entity_boost,
    case
      when q.subcat is not null and p.search_subcategory=q.subcat then 220
      when q.subcat is not null and p.search_subcategory is distinct from q.subcat then -90
      else 0 end as subcat_adjust,
    case
      when q.cat='personal_income' and q.subcat='side_hustle' and p.search_subcategory='ai_tools'
           and lower(q.clean_query) !~ '(ai|人工智能|api|agent|自动化|gemini|groq|机器人|提示词)' then -260
      else 0 end as anti_drift
  from base b
  join public.product_answer_options p on p.id=b.id
  cross join q
  where q.cat is null or p.search_category=q.cat
)
select id,module_code,title,answer_summary,keywords,priority,source_name,
       lexical_score+entity_boost+subcat_adjust+anti_drift,
       core_hits,expansion_hits,history_hits,matched_terms
from ranked
order by lexical_score+entity_boost+subcat_adjust+anti_drift desc,priority desc,id desc
limit greatest(1,least(coalesce(match_count,50),100));
$function$
;

-- public.search_product_answers_local_rrf_lab(text,integer)
CREATE OR REPLACE FUNCTION public.search_product_answers_local_rrf_lab(query_text text, match_count integer DEFAULT 20)
 RETURNS TABLE(id bigint, title text, answer_summary text, keywords text[], subject_score double precision, fuzzy_score double precision, goal_score double precision, rrf_score double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
with q as (
  select lower(coalesce(query_text,'')) raw,
         regexp_replace(lower(coalesce(query_text,'')), '[[:space:]，。！？、；：,.!?;:()（）【】\[\]"''_\\/\-]+', '', 'g') s
), grams as (
  select distinct substr(q.s,pos,n) term,n
  from q cross join lateral generate_series(2,6) n
         cross join lateral generate_series(1,greatest(0,char_length(q.s)-n+1)) pos
  where char_length(q.s)>=n
    and substr(q.s,pos,n) !~ '(我会|我想|我要|想做|想要|帮我|怎么|怎样|如何|可以|什么|是否|有没|能不|需要|提高|增加|赚钱|收入|变现|副业|兼职|接单|客户|平台|服务|内容|门店|预约|客流|获客|到店|复购|成交|转化|效率)'
), docs as (
  select p.id,p.title,p.answer_summary,p.keywords,
         lower(coalesce(p.title,'')||' '||array_to_string(coalesce(p.keywords,array[]::text[]),' ')||' '||coalesce(p.answer_summary,'')) doc
  from public.product_answer_options p
  where p.is_active=true and p.module_code in ('business','work','creation','automation')
), base as (
  select d.*,
    coalesce((select sum(
      case when lower(d.title)=g.term then 80
           when lower(d.title) like '%'||g.term||'%' then 24 + g.n*5
           when exists(select 1 from unnest(coalesce(d.keywords,array[]::text[])) k where lower(k)=g.term) then 70
           when exists(select 1 from unnest(coalesce(d.keywords,array[]::text[])) k where lower(k) like '%'||g.term||'%') then 18 + g.n*4
           when lower(coalesce(d.answer_summary,'')) like '%'||g.term||'%' then 6 + g.n*2
           else 0 end) from grams g),0)::float8 subject_score,
    greatest(similarity((select s from q), regexp_replace(lower(coalesce(d.title,'')), '[[:space:]，。！？、；：,.!?;:()（）【】\[\]"''_\\/\-]+','','g')),
             coalesce((select max(similarity((select s from q), regexp_replace(lower(k),'[[:space:]，。！？、；：,.!?;:()（）【】\[\]"''_\\/\-]+','','g'))) from unnest(coalesce(d.keywords,array[]::text[])) k),0))::float8 fuzzy_score,
    (case when (select s from q) ~ '(赚钱|变现|接单|兼职|副业|收入)' then
        case when d.doc ~ '(赚钱|变现|接单|兼职|副业|收入|客户|交付|报价|订单)' then 1 else 0 end
      when (select s from q) ~ '(客流|获客|到店|复购|成交|转化|增加客)' then
        case when d.doc ~ '(客流|获客|到店|复购|成交|转化|引流|拉新)' then 1 else 0 end
      else 1 end)::float8 goal_score
  from docs d
), ranked as (
  select b.*,
         row_number() over(order by subject_score desc,fuzzy_score desc,id) rs,
         row_number() over(order by fuzzy_score desc,subject_score desc,id) rf
  from base b
  where subject_score>0 or fuzzy_score>=0.18
), fused as (
  select r.*,
    ((case when subject_score>0 then 1.0/(50+rs) else 0 end)+
     (case when fuzzy_score>=0.18 then 1.0/(50+rf) else 0 end)+
     goal_score*0.018)::float8 rrf_score
  from ranked r
)
select id,title,answer_summary,keywords,subject_score,fuzzy_score,goal_score,rrf_score
from fused
where goal_score>0
order by rrf_score desc,subject_score desc,fuzzy_score desc
limit greatest(1,least(coalesce(match_count,20),100));
$function$
;

-- public.set_telegram_notification_recipient(bigint,text,text,text)
CREATE OR REPLACE FUNCTION public.set_telegram_notification_recipient(p_chat_id bigint, p_telegram_username text, p_first_name text, p_bot_username text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_chat_id is null or p_chat_id <= 0 then
    raise exception 'INVALID_TELEGRAM_CHAT_ID' using errcode = '23514';
  end if;
  if lower(trim(coalesce(p_bot_username, ''))) <> 'globalyouxuan_notify_bot' then
    raise exception 'BOT_IDENTITY_MISMATCH' using errcode = '23514';
  end if;

  insert into private.telegram_notification_recipient
    (singleton, chat_id, telegram_username, first_name, bot_username, confirmed_at, updated_at)
  values
    (true, p_chat_id, nullif(left(trim(coalesce(p_telegram_username, '')), 100), ''),
     nullif(left(trim(coalesce(p_first_name, '')), 100), ''),
     'globalyouxuan_notify_bot', now(), now())
  on conflict (singleton) do update
  set chat_id = excluded.chat_id,
      telegram_username = excluded.telegram_username,
      first_name = excluded.first_name,
      bot_username = excluded.bot_username,
      confirmed_at = now(),
      updated_at = now();
end;
$function$
;

-- private.set_updated_at()
CREATE OR REPLACE FUNCTION private.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

-- public.submit_manual_payment(bigint,text,text)
CREATE OR REPLACE FUNCTION public.submit_manual_payment(p_order_id bigint, p_method text, p_reference text)
 RETURNS TABLE(submission_id bigint, status text, quote_amount numeric, quote_currency text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid(); v_order public.orders%rowtype; v_quote public.manual_payment_quotes%rowtype; v_id bigint; v_method text := lower(trim(coalesce(p_method,''))); v_ref text := trim(coalesce(p_reference,''));
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  if v_method not in ('wechat','alipay','bank') then raise exception 'INVALID_METHOD' using errcode='23514'; end if;
  if length(v_ref) < 3 or length(v_ref) > 120 then raise exception 'INVALID_REFERENCE' using errcode='23514'; end if;
  select * into v_order from public.orders where id=p_order_id and user_id=v_uid for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode='P0002'; end if;
  if v_order.status not in ('pending','failed') then raise exception 'ORDER_NOT_OPEN' using errcode='23514'; end if;
  select * into v_quote from public.manual_payment_quotes where order_id=v_order.id and user_id=v_uid and expires_at>now() order by created_at desc limit 1;
  if not found then raise exception 'QUOTE_EXPIRED' using errcode='23514'; end if;
  update public.manual_payment_submissions set status='superseded',updated_at=now() where order_id=v_order.id and user_id=v_uid and status='submitted';
  insert into public.manual_payment_submissions(order_id,user_id,method,reference,status,quote_amount,quote_currency,usd_cny_rate,quote_id)
  values(v_order.id,v_uid,v_method,v_ref,'submitted',v_quote.quote_amount,v_quote.quote_currency,v_quote.usd_cny_rate,v_quote.id) returning id into v_id;
  update public.orders set status='checking',updated_at=now() where id=v_order.id;
  insert into public.notification_outbox(event_type,order_id,dedupe_key,payload,status,attempt_count,next_attempt_at)
  values('manual_payment_submitted',v_order.id,'manual_payment_submitted:'||v_id::text,jsonb_build_object('submission_id',v_id,'method',v_method,'reference',v_ref,'quote_amount',v_quote.quote_amount,'quote_currency',v_quote.quote_currency,'usd_cny_rate',v_quote.usd_cny_rate),'pending',0,now()) on conflict(dedupe_key) do nothing;
  return query select v_id,'submitted'::text,v_quote.quote_amount,v_quote.quote_currency;
end;
$function$
;

-- public.submit_manual_payment_atomic(uuid,bigint,text,text)
CREATE OR REPLACE FUNCTION public.submit_manual_payment_atomic(p_user_id uuid, p_order_id bigint, p_method text, p_reference text)
 RETURNS TABLE(submission_id bigint, order_no text, status text, quote_amount numeric, quote_currency text, usd_cny_rate numeric, locked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

-- private.sync_download_grant()
CREATE OR REPLACE FUNCTION private.sync_download_grant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_has_file boolean;
begin
  if new.status = 'delivered' and old.status is distinct from new.status then
    new.download_url := null;
    new.delivered_at := coalesce(new.delivered_at, now());

    select exists(
      select 1 from public.product_files pf
      where pf.product_id=new.product_id and pf.is_active=true
    ) into v_has_file;

    if v_has_file then
      insert into public.download_grants
        (order_id, user_id, product_id, status, expires_at, max_downloads, download_count)
      values
        (new.id, new.user_id, new.product_id, 'active', now() + interval '24 hours', 1, 0)
      on conflict (order_id) do update
        set status = 'active',
            expires_at = now() + interval '24 hours',
            max_downloads = 1,
            download_count = 0,
            last_downloaded_at = null,
            updated_at = now();
    end if;
  end if;
  return new;
end;
$function$
;

-- private.sync_manual_payment_review()
CREATE OR REPLACE FUNCTION private.sync_manual_payment_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status in ('paid','delivered') and old.status is distinct from new.status then
    update public.manual_payment_submissions
      set status='confirmed', reviewed_at=now(), updated_at=now(), rejection_reason=null
    where id=(select m.id from public.manual_payment_submissions m where m.order_id=new.id and m.status='submitted' order by m.created_at desc limit 1);
  end if;
  return new;
end;
$function$
;

-- public.touch_translation_cache_updated_at()
CREATE OR REPLACE FUNCTION public.touch_translation_cache_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$ begin new.updated_at=now(); return new; end $function$
;

-- public.trim_answer_favorites_to_10()
CREATE OR REPLACE FUNCTION public.trim_answer_favorites_to_10()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin delete from public.answer_favorites where id in (select id from public.answer_favorites where user_id=new.user_id order by updated_at desc nulls last, id desc offset 10); return new; end $function$
;

-- public.trim_member_materials_to_10()
CREATE OR REPLACE FUNCTION public.trim_member_materials_to_10()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin delete from public.member_materials where id in (select id from public.member_materials where user_id=new.user_id order by updated_at desc nulls last, id desc offset 10); return new; end $function$
;

-- public.trim_search_history_to_10()
CREATE OR REPLACE FUNCTION public.trim_search_history_to_10()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin delete from public.search_history where id in (select id from public.search_history where user_id=new.user_id order by created_at desc nulls last, id desc offset 10); return new; end $function$
;

-- public.upsert_manual_payment_quote(bigint,uuid,numeric,numeric,numeric,text,timestamp with time zone,timestamp with time zone)
CREATE OR REPLACE FUNCTION public.upsert_manual_payment_quote(p_order_id bigint, p_user_id uuid, p_base_amount numeric, p_rate numeric, p_quote_amount numeric, p_rate_source text, p_rate_updated_at timestamp with time zone, p_expires_at timestamp with time zone)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare v_id bigint; begin insert into public.manual_payment_quotes(order_id,user_id,base_amount,base_currency,quote_currency,usd_cny_rate,quote_amount,rate_source,rate_updated_at,expires_at) values(p_order_id,p_user_id,p_base_amount,'USDT','CNY',p_rate,p_quote_amount,p_rate_source,p_rate_updated_at,p_expires_at) on conflict(order_id) do update set user_id=excluded.user_id,base_amount=excluded.base_amount,usd_cny_rate=excluded.usd_cny_rate,quote_amount=excluded.quote_amount,rate_source=excluded.rate_source,rate_updated_at=excluded.rate_updated_at,expires_at=excluded.expires_at,created_at=now() returning id into v_id; return v_id; end; $function$
;

-- public.validate_fixed_order_scheme()
CREATE OR REPLACE FUNCTION public.validate_fixed_order_scheme()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_answer_product text;
  v_product_price numeric;
begin
  select product_id into v_answer_product from public.product_answer_options where id=new.answer_id and is_active=true;
  if v_answer_product is distinct from new.product_id then
    raise exception 'FIXED_SCHEME_ANSWER_PRODUCT_MISMATCH';
  end if;
  select product_price into v_product_price from public.products where id=new.product_id and is_active=true;
  if v_product_price is null or round(v_product_price::numeric,2) <> round(new.fixed_price::numeric,2) then
    raise exception 'FIXED_SCHEME_PRICE_MISMATCH';
  end if;
  new.source_module := 'home_fixed';
  new.updated_at := now();
  return new;
end;
$function$
;

-- public.validate_telegram_webhook_secret(text)
CREATE OR REPLACE FUNCTION public.validate_telegram_webhook_secret(p_secret text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((
    select d.decrypted_secret = p_secret
    from vault.decrypted_secrets d
    where d.name = 'yx520_telegram_webhook_secret'
    limit 1
  ), false);
$function$
;

-- public.validate_worker_secret(text)
CREATE OR REPLACE FUNCTION public.validate_worker_secret(p_secret text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((
    select d.decrypted_secret = p_secret
    from vault.decrypted_secrets d
    where d.name = 'yx520_worker_secret'
    limit 1
  ), false);
$function$
;

-- public.wake_notification_worker_on_priority_events()
CREATE OR REPLACE FUNCTION public.wake_notification_worker_on_priority_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
begin
  if new.event_type in ('payment_result','payment_confirmed','payment_failed','order_delivered') then
    perform net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'yx520_project_url'
      ) || '/functions/v1/notification-worker',
      body := jsonb_build_object('triggered_at', now(), 'event_type', new.event_type, 'outbox_id', new.id),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-worker-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'yx520_worker_secret'
        )
      ),
      timeout_milliseconds := 20000
    );
  end if;
  return new;
end;
$function$
;

-- public.youxi_generate_public_id()
CREATE OR REPLACE FUNCTION public.youxi_generate_public_id()
 RETURNS character
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  candidate char(8);
begin
  loop
    candidate := lpad((floor(random() * 90000000) + 10000000)::bigint::text, 8, '0');
    exit when not exists (select 1 from public.youxi_profiles where public_id = candidate);
  end loop;
  return candidate;
end;
$function$
;

-- public.youxi_handle_new_user()
CREATE OR REPLACE FUNCTION public.youxi_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  app_name text;
  nick text;
  phone_value text;
begin
  app_name := coalesce(new.raw_user_meta_data->>'app','');
  if app_name <> 'youxi' then
    return new;
  end if;

  nick := btrim(coalesce(new.raw_user_meta_data->>'nickname',''));
  phone_value := btrim(coalesce(new.raw_user_meta_data->>'phone',''));

  if char_length(nick) < 2 then
    raise exception 'YOUXI_NICKNAME_INVALID';
  end if;
  if char_length(phone_value) < 6 then
    raise exception 'YOUXI_PHONE_INVALID';
  end if;

  insert into public.youxi_profiles(user_id, public_id, nickname, phone, email)
  values (
    new.id,
    public.youxi_generate_public_id(),
    nick,
    phone_value,
    coalesce(new.email,'')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;

-- ===== GRANTS =====
-- private.capture_txid(): postgres=X/postgres
-- private.enforce_backend_order_rate_limit(): default
-- private.enforce_member_profile_lock(): default
-- private.enqueue_order_notification(): postgres=X/postgres
-- private.expire_stale_pending_order_before_insert(): default
-- private.handle_new_user(): postgres=X/postgres
-- private.lock_home_fixed_order_scheme(): default
-- private.order_answer_product_guard(): postgres=X/postgres
-- private.prepare_order(): postgres=X/postgres
-- private.set_updated_at(): postgres=X/postgres
-- private.sync_download_grant(): postgres=X/postgres
-- private.sync_manual_payment_review(): default
-- public.admin_delete_nonpaid_orders(): postgres=X/postgres,service_role=X/postgres
-- public.admin_delete_order(bigint): postgres=X/postgres,service_role=X/postgres
-- public.admin_list_auth_sessions(): postgres=X/postgres,service_role=X/postgres
-- public.admin_list_auth_sessions(uuid): postgres=X/postgres,service_role=X/postgres
-- public.admin_reject_manual_payment(bigint,text): postgres=X/postgres,service_role=X/postgres
-- public.aimusic_record_play(uuid): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.auto_hide_stale_checking_orders_after_one_hour(): postgres=X/postgres,service_role=X/postgres
-- public.claim_download(uuid,bigint): postgres=X/postgres,service_role=X/postgres
-- public.claim_notifications(integer): postgres=X/postgres,service_role=X/postgres
-- public.claim_order_delivery_translation_part(bigint,text,text): postgres=X/postgres,service_role=X/postgres
-- public.claim_payment_verifications(integer): postgres=X/postgres,service_role=X/postgres
-- public.community_opportunity_public_feed_v1(): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.community_opportunity_public_stats_v2(): =X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.community_opportunity_public_stats_v3(): =X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.community_opportunity_public_stats(): =X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.community_public_stats_snapshot_trigger(): postgres=X/postgres,service_role=X/postgres
-- public.community_validate_text(): postgres=X/postgres,service_role=X/postgres
-- public.complete_payment(bigint,text,numeric,text,text): postgres=X/postgres,service_role=X/postgres
-- public.consume_telegram_binding_challenge(text,bigint,text,text,text): postgres=X/postgres,service_role=X/postgres
-- public.count_recent_support_messages(text): postgres=X/postgres,service_role=X/postgres
-- public.count_recent_support_starts(text): postgres=X/postgres,service_role=X/postgres
-- public.enforce_member_profile_lock(): postgres=X/postgres,service_role=X/postgres
-- public.enqueue_profile_change_request_notification(): postgres=X/postgres,service_role=X/postgres
-- public.expire_pending_orders_after_three_hours(): postgres=X/postgres,service_role=X/postgres
-- public.finish_notification(bigint,boolean,text): postgres=X/postgres,service_role=X/postgres
-- public.get_globalyouxuan_support_bot_secrets(): postgres=X/postgres,service_role=X/postgres
-- public.get_order_delivery(bigint): postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.get_support_bot_config(): postgres=X/postgres,service_role=X/postgres
-- public.get_support_bot_runtime_secrets(): postgres=X/postgres,service_role=X/postgres
-- public.get_telegram_notification_recipient(): postgres=X/postgres,service_role=X/postgres
-- public.get_telegram_webhook_secret(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_admin_answer_options(bigint[]): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_badge_counts(): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_daily_page_views(integer): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_delete_push_endpoint(text): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_find_user_by_email(text): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_members_overview(integer): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_push_subscriptions(uuid): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_record_system_push(text,uuid,text,text,text,text,integer,integer,integer): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_system_push_history(integer): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_admin_three_month_stats(): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_apply_referral(uuid,text): postgres=X/postgres,service_role=X/postgres
-- public.gyx_auto_assign_delivery_on_paid(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_award_points(uuid,text,integer,text,text,jsonb): postgres=X/postgres,service_role=X/postgres
-- public.gyx_delete_web_push_endpoint(text): postgres=X/postgres,service_role=X/postgres
-- public.gyx_deliver_business_growth_order(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_expire_checkin_points(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_internal_secret(text): postgres=X/postgres,service_role=X/postgres
-- public.gyx_is_active_admin(): postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.gyx_keep_claimed_opportunity_closed(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_member_checkin_service(uuid): postgres=X/postgres,service_role=X/postgres
-- public.gyx_member_checkin(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_order_points_trigger(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_point_account_code_trigger(): =X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.gyx_profile_points_trigger(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_record_page_view(): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.gyx_redeem_community_opportunity(uuid): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_redeem_member_reward_service(uuid,uuid): postgres=X/postgres,service_role=X/postgres
-- public.gyx_redeem_member_reward(uuid): postgres=X/postgres,service_role=X/postgres
-- public.gyx_remove_web_push_subscription(text): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_save_web_push_subscription(text,text,text,text): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.gyx_security_alert_to_outbox(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_security_retention_cleanup(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_spare_time_mark_delivered(): postgres=X/postgres,service_role=X/postgres
-- public.gyx_trim_user_records_10(): postgres=X/postgres,service_role=X/postgres
-- public.hide_own_invalid_orders(): postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.hide_own_order(bigint): postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.hide_own_orders(bigint[]): postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.hybrid_product_search_lab(text,extensions.vector,integer,integer,integer,integer): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.im_claim_red_packet_atomic(uuid,text): postgres=X/postgres,service_role=X/postgres
-- public.im_credit_tip_atomic(uuid,text): postgres=X/postgres,service_role=X/postgres
-- public.issue_telegram_binding_challenge(): postgres=X/postgres,service_role=X/postgres
-- public.kd_clean_terms(text[],integer): postgres=X/postgres,service_role=X/postgres
-- public.kd_final_plan(text,bigint,text,text[],text[]): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.kd_material_hints(bigint): postgres=X/postgres,service_role=X/postgres
-- public.kd_pool(text,text,text[],text[]): postgres=X/postgres,service_role=X/postgres
-- public.kd_round_options(text,integer,text,bigint[],bigint[],text[],text[]): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.learn_actor(): postgres=X/postgres,service_role=X/postgres
-- public.learn_admin_overview(integer): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.learn_admin_rollback(text,bigint,integer): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.learn_admin_set_status(text,bigint,text): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.learn_admin_upsert_kb(bigint,text,text,text,text,text[],text,text): postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres
-- public.learn_get_synonyms(): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.learn_log_search(text,text,text,text,integer,integer,integer,integer,bigint[],text[],boolean,text): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.learn_log_support(text,text,text,text,text,bigint,boolean,text): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.learn_mark_support_unhelpful(text,bigint): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.learn_mine_synonyms(): postgres=X/postgres,service_role=X/postgres
-- public.learn_norm(text): =X/postgres,postgres=X/postgres,service_role=X/postgres
-- public.learn_redact(text): =X/postgres,postgres=X/postgres,service_role=X/postgres
-- public.learn_refresh_gaps(): postgres=X/postgres,service_role=X/postgres
-- public.learn_setting(text,jsonb): postgres=X/postgres,service_role=X/postgres
-- public.learn_support_lookup(text,text,text): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.learn_version_trigger(): postgres=X/postgres,service_role=X/postgres
-- public.match_product_answers_bge_lab(extensions.vector,integer): postgres=X/postgres,service_role=X/postgres
-- public.match_product_answers(text,integer): postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.purge_expired_orders_automatically(): postgres=X/postgres,service_role=X/postgres
-- public.record_manual_payment_interest(bigint,text): postgres=X/postgres,service_role=X/postgres
-- public.record_payment_txid(uuid,bigint,text): postgres=X/postgres,service_role=X/postgres
-- public.refresh_community_public_stats_snapshot(): postgres=X/postgres,service_role=X/postgres
-- public.refresh_member_level_from_order(): postgres=X/postgres,service_role=X/postgres
-- public.refresh_member_level(uuid): postgres=X/postgres,service_role=X/postgres
-- public.reject_payment(bigint,text,numeric,text,text,text): postgres=X/postgres,service_role=X/postgres
-- public.search_product_answers_hybrid_base(text,text[],text[],text[],integer): =X/postgres,postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres
-- public.search_product_answers_hybrid_v2(text,text[],text[],text[],integer): =X/postgres,postgres=X/postgres,service_role=X/postgres
-- public.search_product_answers_hybrid_v3(text,text[],text[],text[],integer): =X/postgres,postgres=X/postgres,service_role=X/postgres
-- public.search_product_answers_hybrid(text,text[],integer): postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- public.search_product_answers_local_rrf_lab(text,integer): postgres=X/postgres,service_role=X/postgres
-- public.set_telegram_notification_recipient(bigint,text,text,text): postgres=X/postgres,service_role=X/postgres
-- public.submit_manual_payment_atomic(uuid,bigint,text,text): postgres=X/postgres,service_role=X/postgres
-- public.submit_manual_payment(bigint,text,text): postgres=X/postgres,service_role=X/postgres
-- public.touch_translation_cache_updated_at(): postgres=X/postgres,service_role=X/postgres
-- public.trim_answer_favorites_to_10(): postgres=X/postgres,service_role=X/postgres
-- public.trim_member_materials_to_10(): postgres=X/postgres,service_role=X/postgres
-- public.trim_search_history_to_10(): postgres=X/postgres,service_role=X/postgres
-- public.upsert_manual_payment_quote(bigint,uuid,numeric,numeric,numeric,text,timestamp with time zone,timestamp with time zone): postgres=X/postgres,service_role=X/postgres
-- public.validate_fixed_order_scheme(): postgres=X/postgres,service_role=X/postgres
-- public.validate_telegram_webhook_secret(text): postgres=X/postgres,service_role=X/postgres
-- public.validate_worker_secret(text): postgres=X/postgres,service_role=X/postgres
-- public.wake_notification_worker_on_priority_events(): postgres=X/postgres,service_role=X/postgres
-- public.youxi_generate_public_id(): postgres=X/postgres,service_role=X/postgres
-- public.youxi_handle_new_user(): postgres=X/postgres,service_role=X/postgres,supabase_auth_admin=X/postgres