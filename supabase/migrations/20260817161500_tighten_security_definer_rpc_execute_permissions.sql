revoke execute on function public.submit_manual_payment_atomic(uuid,bigint,text,text) from public, anon, authenticated;
grant execute on function public.submit_manual_payment_atomic(uuid,bigint,text,text) to service_role;

revoke execute on function public.upsert_manual_payment_quote(bigint,uuid,numeric,numeric,numeric,text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.upsert_manual_payment_quote(bigint,uuid,numeric,numeric,numeric,text,timestamptz,timestamptz) to service_role;

revoke execute on function public.record_manual_payment_interest(bigint,text) from public, anon;
grant execute on function public.record_manual_payment_interest(bigint,text) to authenticated, service_role;

revoke execute on function public.submit_manual_payment(bigint,text,text) from public, anon;
grant execute on function public.submit_manual_payment(bigint,text,text) to authenticated, service_role;

revoke execute on function public.gyx_auto_assign_delivery_on_paid() from public, anon, authenticated;
revoke execute on function public.gyx_order_points_trigger() from public, anon, authenticated;
revoke execute on function public.gyx_profile_points_trigger() from public, anon, authenticated;
revoke execute on function public.gyx_trim_user_records_10() from public, anon, authenticated;
revoke execute on function public.validate_fixed_order_scheme() from public, anon, authenticated;
revoke execute on function public.community_validate_text() from public, anon, authenticated;

grant execute on function public.gyx_auto_assign_delivery_on_paid() to service_role;
grant execute on function public.gyx_order_points_trigger() to service_role;
grant execute on function public.gyx_profile_points_trigger() to service_role;
grant execute on function public.gyx_trim_user_records_10() to service_role;
grant execute on function public.validate_fixed_order_scheme() to service_role;
grant execute on function public.community_validate_text() to service_role;
