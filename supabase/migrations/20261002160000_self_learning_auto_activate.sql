-- User decision (2026-10-02): no human review. Everything the learner produces goes live directly.
-- Anti-scam filtering (links / Telegram / wallets / phones / e-mails stripped) stays in learn_redact + the worker.
insert into public.learn_settings(key, value) values
  ('auto_activate_synonyms', 'true'::jsonb),
  ('auto_activate_support', 'true'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
-- anything already waiting goes live as well
update public.learn_synonyms set status = 'active' where status = 'pending';
update public.learn_kb set status = 'active' where status = 'pending' and kind = 'support';
