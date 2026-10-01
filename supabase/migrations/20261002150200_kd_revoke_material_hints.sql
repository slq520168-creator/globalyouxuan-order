-- The five-round search no longer derives options from paid answer bodies; close the hint RPC to clients.
revoke execute on function public.kd_material_hints(bigint) from public, anon, authenticated;
