revoke all on table public.business_growth_cases from anon;
revoke delete on table public.business_growth_cases from authenticated;

revoke all on table public.business_growth_updates from anon;
revoke insert, delete on table public.business_growth_updates from authenticated;

revoke all on table public.community_blocked_terms from anon;

revoke all on table public.community_external_feed from anon;
revoke insert, update, delete on table public.community_external_feed from authenticated;

revoke all on table public.community_opportunity_stats from anon;
revoke update, delete on table public.community_opportunity_stats from authenticated;

revoke all on table public.manual_payment_settings from anon;
revoke insert, update, delete on table public.manual_payment_settings from authenticated;

revoke all on table public.member_point_rewards from anon;
revoke insert, update, delete on table public.member_point_rewards from authenticated;
