alter table public.member_point_redemptions
add column if not exists delivery_i18n jsonb not null default '{}'::jsonb;

comment on column public.member_point_redemptions.delivery_i18n is
'Cached dynamic delivery bodies produced only by answer-auto-translate; keys are zh-CN, en, or km.';

-- Normalize legacy opportunity snapshots that stored backslash-n characters
-- instead of line breaks. This only changes text encoding, not redemption data.
update public.member_point_redemptions
set delivery_text_snapshot = replace(
      replace(delivery_text_snapshot, E'\\r\\n', E'\n'),
      E'\\n',
      E'\n'
    )
where opportunity_id is not null
  and delivery_text_snapshot like E'%\\n%';
