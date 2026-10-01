// 已下线（2026-10-02 安全修复）：实验检索函数，前端从未调用；原版本无鉴权且 backfill 可被匿名触发批量写入 / 消耗算力。
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

Deno.serve(() => new Response(JSON.stringify({ error: "FUNCTION_RETIRED" }), { status: 410, headers }));
