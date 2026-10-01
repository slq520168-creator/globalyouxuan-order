-- 自我学习定时任务（未执行）。前置：先在 Vault 建密钥 gyx_learn_worker_secret，并部署 learn-gap-worker。
--   select vault.create_secret('<随机长字符串>', 'gyx_learn_worker_secret');
-- 关闭：select cron.unschedule('gyx-learn-refresh'); select cron.unschedule('gyx-learn-gap-worker');

select cron.schedule('gyx-learn-refresh', '7 * * * *',
  $$select public.learn_refresh_gaps(); select public.learn_mine_synonyms();$$);

select cron.schedule('gyx-learn-gap-worker', '*/30 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'yx520_project_url') || '/functions/v1/learn-gap-worker',
    body := jsonb_build_object('scheduled_at', now()),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-learn-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gyx_learn_worker_secret')),
    timeout_milliseconds := 55000) as request_id;
$$);
