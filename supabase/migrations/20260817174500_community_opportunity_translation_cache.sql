create table if not exists public.community_opportunity_translation_cache (
  opportunity_id uuid not null references public.community_external_feed(id) on delete cascade,
  lang text not null check (lang in ('zh','km')),
  title text not null,
  body text not null,
  translated_at timestamptz not null default now(),
  primary key(opportunity_id,lang)
);
alter table public.community_opportunity_translation_cache enable row level security;
revoke all on public.community_opportunity_translation_cache from public, anon, authenticated;
grant all on public.community_opportunity_translation_cache to service_role;
