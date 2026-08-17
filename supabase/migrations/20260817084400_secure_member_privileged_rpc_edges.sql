create or replace function public.gyx_member_checkin_service(p_user_id uuid)
returns table(day_no integer, points_awarded integer, checkin_balance integer, total_balance integer, expires_at timestamptz, already_checked boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',p_user_id::text,'role','authenticated')::text, true);
  return query select * from public.gyx_member_checkin();
end;
$$;

create or replace function public.gyx_redeem_member_reward_service(p_user_id uuid, p_reward_id uuid)
returns table(redemption_id bigint, reward_title text, delivery_text text, points_spent integer, balance integer)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',p_user_id::text,'role','authenticated')::text, true);
  return query select * from public.gyx_redeem_member_reward(p_reward_id);
end;
$$;

revoke all on function public.gyx_member_checkin_service(uuid) from public, anon, authenticated;
revoke all on function public.gyx_redeem_member_reward_service(uuid,uuid) from public, anon, authenticated;
grant execute on function public.gyx_member_checkin_service(uuid) to service_role;
grant execute on function public.gyx_redeem_member_reward_service(uuid,uuid) to service_role;

revoke execute on function public.gyx_member_checkin() from public, anon, authenticated;
revoke execute on function public.gyx_redeem_member_reward(uuid) from public, anon, authenticated;
revoke execute on function public.record_manual_payment_interest(bigint,text) from public, anon, authenticated;
revoke execute on function public.submit_manual_payment(bigint,text,text) from public, anon, authenticated;

grant execute on function public.gyx_member_checkin() to service_role;
grant execute on function public.gyx_redeem_member_reward(uuid) to service_role;
grant execute on function public.record_manual_payment_interest(bigint,text) to service_role;
grant execute on function public.submit_manual_payment(bigint,text,text) to service_role;