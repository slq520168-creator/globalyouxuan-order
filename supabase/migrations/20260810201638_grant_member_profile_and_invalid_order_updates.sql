-- Grants required by the member profile, theme/avatar and protected invalid
-- order controls. Later migrations revoke metadata fields again.

grant update (
  display_name,
  phone,
  locale,
  phone_country_code,
  phone_country_name,
  wechat,
  whatsapp,
  avatar_url,
  theme_color,
  updated_at
) on public.profiles to authenticated;

grant update (hidden_by_user) on public.orders to authenticated;
grant execute on function public.hide_own_order(bigint) to authenticated;
