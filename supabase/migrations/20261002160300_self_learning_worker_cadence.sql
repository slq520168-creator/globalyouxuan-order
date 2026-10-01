-- Worker handles ~2 gaps per run (free AI endpoint is slow), so run it every 10 minutes instead of 30.
select cron.alter_job((select jobid from cron.job where jobname = 'gyx-learn-gap-worker'), schedule := '*/10 * * * *');
-- rows left half-done by the pre-v3 worker during the switch-over
update public.learn_kb set status = 'active' where status = 'pending';
update public.learn_gaps set status = 'resolved', resolution = jsonb_build_object('type','material_draft','resolved_at', now())
 where status = 'working' and exists (select 1 from public.learn_kb k where k.gap_id = learn_gaps.id);
update public.learn_gaps set status = 'open' where status = 'working';
