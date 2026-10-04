-- hybrid-search-lab is retired (410); its RPCs no longer need to be callable by signed-in users (advisor 0029).
revoke all on function public.hybrid_product_search_lab(text, extensions.vector, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.match_product_answers_bge_lab(extensions.vector, integer) from public, anon, authenticated;
