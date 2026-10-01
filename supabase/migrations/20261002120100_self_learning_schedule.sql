-- 自我学习定时任务。2026-10-02 上线。
-- 密钥：Vault gyx_learn_worker_secret（数据库内随机生成，任何人都看不到明文；learn-gap-worker 经 service_role-only 的
--       public.gyx_internal_secret() 读取并做常量时间比较；learn-gap-worker verify_jwt=false，但没有这个密钥一律 401）。
-- 关闭：select cron.unschedule('gyx-learn-refresh'); select cron.unschedule('gyx-learn-gap-worker');

do $block$
begin
  if not exists (select 1 from vault.secrets where name = 'gyx_learn_worker_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'gyx_learn_worker_secret', 'x-learn-secret for learn-gap-worker');
  end if;
  if exists (select 1 from cron.job where jobname = 'gyx-learn-refresh') then
    perform cron.unschedule('gyx-learn-refresh');
  end if;
  if exists (select 1 from cron.job where jobname = 'gyx-learn-gap-worker') then
    perform cron.unschedule('gyx-learn-gap-worker');
  end if;
end;
$block$;

select cron.schedule('gyx-learn-refresh', '7 * * * *',
  $$select public.learn_refresh_gaps(); select public.learn_mine_synonyms();$$);

select cron.schedule('gyx-learn-gap-worker', '*/30 * * * *', $$
  select net.http_post(
    url := 'https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/learn-gap-worker',
    body := jsonb_build_object('scheduled_at', now()),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-learn-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gyx_learn_worker_secret')),
    timeout_milliseconds := 55000) as request_id;
$$);
