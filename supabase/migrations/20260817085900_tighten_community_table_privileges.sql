revoke all on table public.community_posts from anon, authenticated;
grant select, insert, delete on table public.community_posts to authenticated;

revoke all on table public.community_comments from anon, authenticated;
grant select, insert, delete on table public.community_comments to authenticated;

revoke all on table public.community_messages from anon, authenticated;
grant select, insert, update on table public.community_messages to authenticated;

revoke all on table public.community_public_stats_snapshot from anon, authenticated;
grant select on table public.community_public_stats_snapshot to anon, authenticated;
