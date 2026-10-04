# Open library build scripts (not served; /tools is blocked by functions/_middleware.js)

Pipeline used on 2026-10-04 to build the open-web corpus (raw JSONL shards in Google Drive
「AI资料库/全网提取资料_2026-10」) and its compact search index in Supabase (`kb_docs`, `kb_terms`, `kb_shards`, `kb_meta`).

1. `ex_wiki.py` (Wikipedia zh/en, CC BY-SA 4.0), `ex_se.py` (Stack Exchange dumps, CC BY-SA 4.0),
   `ex_fw2.py` (FineWeb-2 cmn, ODC-By; Drive corpus only, never sold as a paid plan) → raw_*.jsonl
2. `build.py` → dedupe + 48 MB shards for Drive + `selected.json` (CC BY-SA subset for the paid index)
3. `index.py` → `kb_docs.jsonl` (title, summary, keywords, tier by depth, paid detail with attribution, tokens) + `kb_terms.tsv`
4. `load.py` → upsert into Supabase (one-off; loader function retired)

`tok.py` must stay identical to SQL `public.kb_tokens()`.
