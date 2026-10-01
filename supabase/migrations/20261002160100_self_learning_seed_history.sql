-- One-time seed so the learner starts immediately from existing history (idempotent).
-- Support: distinct real customer questions from past support conversations (CJK text, redacted).
insert into public.learn_gaps (kind, normalized, sample, channel, locale, hits, last_seen)
select 'support', n, public.learn_redact(sample), 'home', 'zh', c, last_at
from (
  select public.learn_norm(m.content) n, (array_agg(m.content order by m.created_at desc))[1] sample,
         count(distinct m.conversation_id) c, max(m.created_at) last_at
  from public.support_conversation_messages m
  where m.role = 'user' and char_length(m.content) between 4 and 300
    and m.content ~ '[\u4e00-\u9fff]{2,}'
  group by 1
) s
where char_length(n) >= 2
on conflict (kind, normalized) do nothing;

-- Search: past test/real queries whose five-round pool is thin (< 3 related materials).
insert into public.learn_gaps (kind, normalized, sample, locale, hits, last_seen)
select 'search', public.learn_norm(q), public.learn_redact(q), 'zh', 1, now()
from (
  select distinct btrim(query) q from public.wealth_search_selftest_results where char_length(btrim(query)) between 2 and 60
  union
  select distinct btrim(question) from public.search_history where char_length(btrim(question)) between 2 and 60
) s
where (select count(*) from public.kd_pool(s.q, null, '{}'::text[], '{}'::text[])) < 3
  and public.learn_norm(q) !~ '^[0-9]+$'
on conflict (kind, normalized) do nothing;
