do $block$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'community-opportunity-refresh-6h'
  ) then
    perform cron.unschedule('community-opportunity-refresh-6h');
  end if;
end;
$block$;

select cron.schedule(
  'community-opportunity-refresh-6h',
  '15 */6 * * *',
  $job$
  select net.http_post(
    url := 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/community-feed-crawler',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $job$
);

