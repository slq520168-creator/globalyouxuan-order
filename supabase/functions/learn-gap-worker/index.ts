// learn-gap-worker 入口：鉴权 + 批处理。逻辑在 learn-core.ts。
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.112.0';
import { buildVocab, genericTerms, handleSearchGap, handleSupportGap, setting, withTimeout, type Gap, type Material } from './learn-core.ts';

const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const DEADLINE_MS = 20_000; // 最后一个缺口最晚在 20s 开始，单个缺口上限 32s → 整体 < pg_net 55s 超时
// 鉴权：Vault 密钥 gyx_learn_worker_secret（经 service_role-only RPC gyx_internal_secret 读取），常量时间比较
let cachedSecret = '';
async function sha256(v: string) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))); }
async function safeEqual(a: string, b: string) { const [x, y] = await Promise.all([sha256(a), sha256(b)]); let d = a.length === b.length ? 0 : 1; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0; }
async function workerSecret(db: any) {
  if (cachedSecret) return cachedSecret;
  const { data, error } = await db.rpc('gyx_internal_secret', { p_name: 'gyx_learn_worker_secret' });
  if (error || typeof data !== 'string' || data.length < 32) return '';
  cachedSecret = data; return cachedSecret;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!SB_URL || !SERVICE) return json({ error: 'NOT_CONFIGURED' }, 500);
  const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const provided = req.headers.get('x-learn-secret') || '';
  const expected = await workerSecret(db).catch(() => '');
  if (!expected || !provided || !(await safeEqual(provided, expected))) return json({ error: 'UNAUTHORIZED' }, 401);

  const started = Date.now();
  const refreshed = await db.rpc('learn_refresh_gaps');
  const mined = await db.rpc('learn_mine_synonyms');
  await db.rpc('learn_requeue_unresolved'); // 无人工审核：未解决的缺口每 6 小时自动重试（最多 5 次）
  const batch = Math.max(1, Math.min(20, Number(await setting(db, 'worker_batch', 8)) || 8));
  const aiOn = (await setting(db, 'ai_enabled', true)) === true;
  const webOn = (await setting(db, 'web_lookup_enabled', true)) === true;
  const autoSyn = (await setting(db, 'auto_activate_synonyms', false)) === true;
  const autoSupport = (await setting(db, 'auto_activate_support', false)) === true;

  const { data: gaps, error } = await db.from('learn_gaps').select('id,kind,normalized,sample,channel,locale,hits,attempts')
    .eq('status', 'open').lt('attempts', 5).order('hits', { ascending: false }).order('last_seen', { ascending: false }).limit(batch);
  if (error) return json({ error: 'GAP_READ', detail: error.message }, 500);

  let vocab: string[] = [], generic = new Set<string>();
  if ((gaps || []).some((g: Gap) => g.kind === 'search')) {
    const { data: mats } = await db.from('product_answer_options').select('id,title,keywords,keywords_en,search_category,search_subcategory').eq('is_active', true).like('product_id', 'answer-%').limit(2000);
    vocab = buildVocab((mats || []) as Material[]);
    generic = genericTerms((mats || []) as Material[]);
  }
  const vocabSet = new Set(vocab);
  const results: unknown[] = [];
  for (const gap of (gaps || []) as Gap[]) {
    if (Date.now() - started > DEADLINE_MS) break;
    // 原子认领：并发的两次调用（cron + 手动）不会处理同一个缺口
    const { data: claimed } = await db.from('learn_gaps').update({ status: 'working', attempts: gap.attempts + 1, updated_at: new Date().toISOString() }).eq('id', gap.id).eq('status', 'open').select('id');
    if (!claimed?.length) continue;
    try {
      const r = gap.kind === 'search'
        ? await withTimeout(handleSearchGap(db, gap, { vocab, vocabSet, generic, aiOn, webOn, autoOn: autoSyn }), 32_000)
        : await withTimeout(handleSupportGap(db, gap, { aiOn, autoActivate: autoSupport }), 32_000);
      await db.from('learn_gaps').update({ status: r.status, resolution: r.resolution, last_error: null, updated_at: new Date().toISOString() }).eq('id', gap.id);
      results.push({ id: gap.id, kind: gap.kind, status: r.status });
    } catch (e) {
      const msg = String((e as Error)?.message || e).slice(0, 300);
      await db.from('learn_gaps').update({ status: gap.attempts + 1 >= 5 ? 'unresolved' : 'open', last_error: msg, updated_at: new Date().toISOString() }).eq('id', gap.id);
      results.push({ id: gap.id, kind: gap.kind, error: msg });
    }
  }
  return json({ ok: true, refreshed: refreshed.data ?? refreshed.error?.message, mined: mined.data ?? mined.error?.message, processed: results.length, results, ms: Date.now() - started });
});
