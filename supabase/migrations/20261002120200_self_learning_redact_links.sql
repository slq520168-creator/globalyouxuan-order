-- 自学习日志脱敏加强：除邮箱 / 长 ID / 电话外，再去掉外链、t.me、www、@账号（日志不留引流信息，worker 侧另有二次清洗）
create or replace function public.learn_redact(p text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select left(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(coalesce(p,''), '(https?://|www\.)[^[:space:]]+', '[link]', 'gi'),
          '(t|telegram)\.me/[^[:space:]]*', '[link]', 'gi'),
        '[^[:space:]@]+@[^[:space:]@]+', '[email]', 'g'),
      '@[A-Za-z0-9_]{3,}', '[handle]', 'g'),
    '([A-Za-z0-9]{24,})|(\+?[0-9][0-9 ()-]{5,}[0-9])', '[id]', 'g'),
  500);
$$;
