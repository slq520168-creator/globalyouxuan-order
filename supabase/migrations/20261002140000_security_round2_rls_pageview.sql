-- 安全修复第二轮（2026-10-02）
-- #18 四张表开启 RLS：anon / authenticated 本来就没有任何表权限，aimusic-* 等 Edge Function 走 service_role（绕过 RLS），
--     所以开启 RLS（无策略 = 默认拒绝）不影响任何现有调用，只是多一道防线。
alter table public.aimusic_guest_accounts enable row level security;
alter table public.aimusic_guest_point_ledger enable row level security;
alter table public.security_hardening_log enable row level security;
alter table public.product_answer_embeddings_bge_lab enable row level security;
revoke all on public.aimusic_guest_accounts, public.aimusic_guest_point_ledger,
              public.security_hardening_log, public.product_answer_embeddings_bge_lab from anon, authenticated;

-- 前端不再使用的实验检索 RPC：收回匿名 / 登录执行权
revoke execute on function public.match_product_answers_bge_lab(extensions.vector, integer) from public, anon, authenticated;
revoke execute on function public.search_product_answers_local_rrf_lab(text, integer) from public, anon, authenticated;

-- #15 页面浏览计数限流：每个可信身份（登录用户 uid / Cloudflare 真实 IP 哈希）每天最多计 200 次，超过后只返回当前总数不再累加
create table if not exists public.site_view_actor_daily (
  view_date date not null,
  actor text not null,
  hits integer not null default 0,
  primary key (view_date, actor)
);
alter table public.site_view_actor_daily enable row level security;
revoke all on public.site_view_actor_daily from anon, authenticated;

create or replace function public.gyx_record_page_view()
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_today date := (timezone('Asia/Shanghai', now()))::date;
  v_actor text := public.learn_actor();
  v_hits integer;
  v_total bigint;
begin
  insert into public.site_view_actor_daily as a (view_date, actor, hits)
  values (v_today, v_actor, 1)
  on conflict (view_date, actor) do update set hits = a.hits + 1
  returning hits into v_hits;

  if v_hits > 200 then
    select page_views into v_total from public.site_daily_views where view_date = v_today;
    return coalesce(v_total, 0);
  end if;

  insert into public.site_daily_views as current_day (view_date, page_views, updated_at)
  values (v_today, 1, now())
  on conflict (view_date) do update
    set page_views = current_day.page_views + 1, updated_at = excluded.updated_at
  returning page_views into v_total;

  if random() < 0.01 then
    delete from public.site_view_actor_daily where view_date < v_today - 2;
  end if;
  return v_total;
end;
$$;
revoke all on function public.gyx_record_page_view() from public;
grant execute on function public.gyx_record_page_view() to anon, authenticated;
