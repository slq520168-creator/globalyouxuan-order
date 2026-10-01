// learn-gap-worker：自我学习后台工人（由 pg_cron 每 30 分钟调用，verify_jwt=false + x-learn-secret 校验）
// 做的事：处理 learn_gaps 里“没搜到 / 没答上”的问题 → 自己去找（站内资料 → 维基百科 → 免费 AI）
//        → 写成 pending 的同义词 / 客服答案 / 资料草稿，等管理员审核（或按设置自动上线）。
// 不做的事：不改订单、付款、交付、商品价格；不写 product_answer_options；不在运行时替用户编答案。
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.112.0';

// 复用现有免费 AI 端点（Cloudflare Workers AI，同 website-support-chat / answer-auto-translate）
const AI_URL = Deno.env.get('LEARN_AI_URL') || 'https://globalyouxuan-ai.slq520168.workers.dev/api/chat';
const UA = 'GlobalYouXuan-LearnBot/1.0 (+https://globalyouxuan-order.pages.dev)';


export type Gap = { id: number; kind: 'search' | 'support'; normalized: string; sample: string; channel: string | null; locale: string | null; hits: number; attempts: number };
export type Material = { id: number; title: string; keywords: string[] | null; keywords_en: string[] | null; search_category: string | null; search_subcategory: string | null };

export const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[\s，。！？、；：,.!?;:()（）【】\[\]"'“”‘’_\-\/\\]+/g, '').slice(0, 200);
const MONEY = /(付款|支付|退款|到账|充值|提现|转账|钱包|地址|txid|usdt|trc20|价格|多少钱|费用|refund|payment|pay|wallet|price|withdraw|deposit)/i;

export function bigrams(s: string) { const x = norm(s), a = new Set<string>(); if (x.length === 1) a.add(x); for (let i = 0; i < x.length - 1; i++) a.add(x.slice(i, i + 2)); return a; }
export function dice(a: string, b: string) { const A = bigrams(a), B = bigrams(b); if (!A.size || !B.size) return 0; let h = 0; for (const x of A) if (B.has(x)) h++; return (2 * h) / (A.size + B.size); }

export function parseJsonLoose(raw: string): any {
  const s = String(raw || '').replace(/```json|```/gi, '').trim();
  try { return JSON.parse(s); } catch { /* fallthrough */ }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch { /* ignore */ } }
  return null;
}

// AI 端点可能回 JSON 或 SSE 流，两种都解析
export function extractAiText(raw: string) {
  const t = String(raw || '').trim(); if (!t) return '';
  try { const j = JSON.parse(t); return String(j.reply || j.response || j.text || j.content || j.message || j.output || j.answer || j.choices?.[0]?.message?.content || ''); } catch { /* sse */ }
  let out = '';
  for (const line of t.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue; const d = line.slice(5).trim(); if (!d || d === '[DONE]') continue;
    try { const j = JSON.parse(d); out += String(j.response ?? j.token ?? j.text ?? j.delta?.content ?? j.choices?.[0]?.delta?.content ?? ''); } catch { /* ignore */ }
  }
  return out.trim() || t;
}

export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([p, new Promise<T>((_, rej) => { timer = setTimeout(() => rej(new Error('TIMEOUT')), ms); })]); }
  finally { clearTimeout(timer); }
}

async function askAi(system: string, user: unknown): Promise<any> {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 18_000);
  try {
    const r = await fetch(AI_URL, { method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', origin: 'https://globalyouxuan-order.pages.dev', referer: 'https://globalyouxuan-order.pages.dev/' },
      body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: typeof user === 'string' ? user : JSON.stringify(user) }] }) });
    if (!r.ok) throw new Error('AI_HTTP_' + r.status);
    return parseJsonLoose(extractAiText(await r.text()));
  } finally { clearTimeout(timer); }
}

// 免费、无需密钥的网络查找：维基百科摘要（中文/英文）
async function wikiSummary(q: string): Promise<{ lang: string; title: string; extract: string; url: string } | null> {
  const langs = /[\u4e00-\u9fff]/.test(q) ? ['zh', 'en'] : ['en', 'zh'];
  for (const lang of langs) {
    try {
      const r = await withTimeout(fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.trim())}?redirect=true`, { headers: { 'user-agent': UA, accept: 'application/json', 'accept-language': lang === 'zh' ? 'zh-CN' : 'en' } }), 8_000);
      if (!r.ok) continue; const j: any = await r.json();
      if (j?.type === 'disambiguation' || !j?.extract) continue;
      return { lang, title: String(j.title || q), extract: String(j.extract).slice(0, 600), url: String(j.content_urls?.desktop?.page || '') };
    } catch { /* try next */ }
  }
  return null;
}

export async function setting(db: SupabaseClient, key: string, dflt: any) {
  const { data } = await db.from('learn_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? dflt;
}

// ---------- 搜索缺口 ----------
export function buildVocab(materials: Material[]) {
  const freq = new Map<string, number>();
  for (const m of materials) for (const k of new Set([...(m.keywords || []), ...(m.keywords_en || [])])) { const v = String(k || '').trim(); if (v.length >= 2 && v.length <= 16) freq.set(v, (freq.get(v) || 0) + 1); }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}
// 出现在太多资料里的词（如 AI、内容、投资）当扩展词没有区分度，丢掉
export function genericTerms(materials: Material[], ratio = 0.05) {
  const df = new Map<string, number>();
  for (const m of materials) for (const k of new Set([...(m.keywords || []), ...(m.keywords_en || [])])) { const v = String(k || '').trim(); df.set(v, (df.get(v) || 0) + 1); }
  const lim = Math.max(8, Math.floor(materials.length * ratio));
  return new Set([...df.entries()].filter(([, n]) => n > lim).map(([k]) => k).concat([...GENERIC]));
}

type Row = { id: number; keywords: string[] | null; lexical_score: number; core_hits: number; expansion_hits: number };
async function searchRows(db: SupabaseClient, query: string, terms: string[], role: 'core' | 'expansion'): Promise<Row[]> {
  const { data, error } = await db.rpc('search_product_answers_hybrid_v2', { query_text: query, core_terms: role === 'core' ? terms : [], expansion_terms: role === 'expansion' ? terms : [], history_terms: [], match_count: 30 });
  if (error || !Array.isArray(data)) return [];
  return (data as Row[]).filter(r => (+r.lexical_score || 0) >= 20 && ((+r.core_hits || 0) >= 1 || (+r.expansion_hits || 0) >= 2));
}
async function verifyExpansion(db: SupabaseClient, query: string, terms: string[], role: 'core' | 'expansion') { return (await searchRows(db, query, terms, role)).length; }
// 两种角色都试，取结果多的；再从命中资料里“顺藤摸瓜”补 1~3 个高频关键词（第二跳），能让结果更多才保留
const GENERIC = new Set(['ai', 'AI', '图片', '视频', '内容', '服务', '平台', '客户', '运营', '接单', '赚钱', '变现', '兼职', '副业', '收入']);
export async function bestExpansion(db: SupabaseClient, query: string, terms: string[], generic?: Set<string>) {
  if (!terms.length) return { role: 'expansion' as const, terms, after: 0 };
  const [c, e] = await Promise.all([searchRows(db, query, terms, 'core'), searchRows(db, query, terms, 'expansion')]);
  let role: 'core' | 'expansion' = c.length >= e.length ? 'core' : 'expansion';
  let rows = role === 'core' ? c : e, best = terms;
  if (rows.length && rows.length < 10) {
    const freq = new Map<string, number>();
    for (const r of rows.slice(0, 5)) for (const k of r.keywords || []) { const v = String(k).trim(); if (v.length >= 2 && v.length <= 8 && !(generic || GENERIC).has(v) && !terms.includes(v)) freq.set(v, (freq.get(v) || 0) + 1); }
    const hop = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    if (hop.length) { const more = [...terms, ...hop].slice(0, 10); const r2 = await searchRows(db, query, more, role); if (r2.length > rows.length) { rows = r2; best = more; } }
  }
  return { role, terms: best, after: rows.length };
}

export async function handleSearchGap(db: SupabaseClient, gap: Gap, ctx: { vocab: string[]; vocabSet: Set<string>; generic?: Set<string>; aiOn: boolean; webOn: boolean; autoOn: boolean }) {
  const q = gap.sample.trim();
  const before = await verifyExpansion(db, q, [], 'expansion');
  // 1) 站内：错别字 / 近似词 → 已有关键词（不花钱，不用 AI）
  const local = ctx.vocab.map(k => ({ k, s: dice(q, k) })).filter(x => x.s >= 0.5 && norm(x.k) !== norm(q)).sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.k);
  // 2) 网络：维基百科摘要（人名、品牌、地名、行业词）
  const web = ctx.webOn ? await wikiSummary(q) : null;
  // 2b) 百科摘要里直接出现的站内词（如“歌手”“演员”“餐厅”）——免费、确定
  const fromWeb = web ? ctx.vocab.filter(k => k.length >= 2 && !/^[a-z]{1,3}$/i.test(k) && web.extract.toLowerCase().includes(k.toLowerCase())).slice(0, 6) : [];
  // 3) 免费 AI：只允许从站内词表里挑词，杜绝编造
  let ai: any = null;
  if (ctx.aiOn) {
    const ctxText = q + ' ' + (web?.extract || '');
    const related = ctx.vocab.map(k => ({ k, s: dice(ctxText, k) })).sort((a, b) => b.s - a.s).slice(0, 120).map(x => x.k);
    const shortlist = [...new Set([...fromWeb, ...related, ...ctx.vocab.slice(0, 140)])].slice(0, 260);
    ai = await askAi(
      '你是搜索词典维护员。用户搜了一个词，站内资料没搜到。根据用户的词、可选的百科摘要，从“站内词表”里挑出最能代表用户意图的 1~6 个词，既要具体词（如 歌手、演员），也要上位类别词（如 明星、人物IP、餐饮、门店）。只能从词表里挑，禁止创造新词。只输出 JSON：{"expansions":["..."],"role":"core|expansion","category":"personal_income|business_help|content_monetization|null","missing_topic":"如果站内确实没有相关资料，用一句话写出应补充的资料主题，否则空字符串","translation_zh":"若用户词不是中文，给中文意思"}',
      { user_query: q, encyclopedia: web?.extract || '', site_vocabulary: shortlist },
    ).catch(() => null);
  }
  const aiTerms: string[] = Array.isArray(ai?.expansions) ? ai.expansions.map((x: unknown) => String(x || '').trim()).filter((x: string) => ctx.vocabSet.has(x)) : [];
  const picked = [...new Set([...local, ...fromWeb, ...aiTerms])].filter(k => !ctx.generic?.has(k)).slice(0, 8);
  const category = ['personal_income', 'business_help', 'content_monetization'].includes(ai?.category) ? ai.category : null;
  const { role, terms, after } = await bestExpansion(db, q, picked, ctx.generic);
  const evidence = { before, after, local, from_web: fromWeb, ai_terms: aiTerms, web: web ? { title: web.title, url: web.url, extract: web.extract.slice(0, 240) } : null, translation_zh: ai?.translation_zh || null, at: new Date().toISOString() };

  if (terms.length && after > before && after >= 1) {
    const status = ctx.autoOn && after >= 5 ? 'active' : 'pending';
    const { error } = await db.from('learn_synonyms').upsert({ term: q, term_norm: gap.normalized, expansions: terms, role, category, source: aiTerms.length ? 'ai' : fromWeb.length ? 'web' : 'mined', evidence, verified_hits: after, status }, { onConflict: 'term_norm,role' });
    if (error) throw new Error('SYN_WRITE ' + error.message);
    return { status: status === 'active' ? 'resolved' : 'proposed', resolution: { type: 'synonym', terms, role, after, before, resolved_at: new Date().toISOString() } };
  }
  // 站内确实缺资料 → 生成“资料草稿”给管理员，决定要不要补进资料库
  const topic = String(ai?.missing_topic || '').trim() || (web ? `${web.title}：${web.extract.slice(0, 80)}` : '');
  if (topic) {
    await db.from('learn_kb').insert({ kind: 'material_draft', question: q, q_norm: gap.normalized, answer_zh: topic.slice(0, 1200), source: web ? 'web' : 'ai', source_url: web?.url || null, evidence, status: 'pending', gap_id: gap.id });
    return { status: 'needs_human', resolution: { type: 'material_draft', topic: topic.slice(0, 200), evidence } };
  }
  return { status: 'needs_human', resolution: { type: 'nothing_found', evidence } };
}

// ---------- 客服缺口 ----------
const SITE_FACTS = [
  'GlobalYouXuan 帮用户把想法、技能、资源或实际问题，通过 AI 五轮搜索整理成可执行的个性化方案。',
  '注册：首页右下“客服/注册”或 login.html?mode=register，按页面必填项填写并提交；忘记密码在登录页点“忘记密码”，按邮件链接重设。',
  '会员中心 member.html：资料、收藏、搜索记录、订单、交付内容。资料修改（姓名、电话、微信、Telegram、WhatsApp、语言、登录邮箱）需提交申请，由管理员审核。会员等级、会员ID、消费金额、订单记录不能申请修改。',
  '付款：USDT-TRC20，价格以下单页面实时显示为准；付款后提交 TXID，由系统自动核验链上交易。客服不能确认到账、不能退款、不能改订单状态。',
  '交付：订单核验完成后，在会员中心“订单/交付内容”查看或下载。',
  '人工联系：Telegram @qqyousubot，邮箱 slq520168@gmail.com。',
  '语言：中文、English、ភាសាខ្មែរ。',
].join('\n');

export async function handleSupportGap(db: SupabaseClient, gap: Gap, ctx: { aiOn: boolean; autoOn: boolean }) {
  if (!ctx.aiOn) return { status: 'needs_human', resolution: { type: 'ai_disabled' } };
  const { data: known } = await db.from('learn_kb').select('question,answer_zh').eq('kind', 'support').eq('status', 'active').limit(40);
  const related = (known || []).map((k: any) => ({ ...k, s: dice(gap.sample, k.question) })).sort((a: any, b: any) => b.s - a.s).slice(0, 5).map(({ question, answer_zh }: any) => ({ question, answer_zh }));
  const ai = await askAi(
    '你是 GlobalYouXuan 客服知识库编辑。只能依据“站点事实”和“已审核问答”写答案，不知道就 answerable=false，绝不编造到账、退款、审核、发货状态，不承诺收益。答案简短礼貌。只输出 JSON：{"answerable":true|false,"answer_zh":"...","answer_en":"...","answer_km":"...","tags":["..."],"reason":"..."}',
    { customer_question: gap.sample, site_facts: SITE_FACTS, approved_qa: related },
  ).catch((e: Error) => ({ error: e.message }));
  if (!ai || ai.error || !ai.answerable || String(ai.answer_zh || '').trim().length < 6) {
    return { status: 'needs_human', resolution: { type: 'support_unanswerable', reason: String(ai?.reason || ai?.error || 'no_answer').slice(0, 200) } };
  }
  const risk = MONEY.test(gap.sample) || MONEY.test(String(ai.answer_zh)) ? 'high' : 'low';
  const status = ctx.autoOn && risk === 'low' ? 'active' : 'pending';
  const { error } = await db.from('learn_kb').insert({
    kind: 'support', channel: gap.channel === 'member' ? 'member' : 'any', question: gap.sample, q_norm: gap.normalized,
    answer_zh: String(ai.answer_zh).slice(0, 1200), answer_en: String(ai.answer_en || '').slice(0, 1200) || null, answer_km: String(ai.answer_km || '').slice(0, 1200) || null,
    tags: Array.isArray(ai.tags) ? ai.tags.slice(0, 8).map((x: unknown) => String(x).slice(0, 30)) : [], source: 'ai', risk, status, gap_id: gap.id,
    evidence: { reason: String(ai.reason || '').slice(0, 200), related: related.length },
  });
  if (error) throw new Error('KB_WRITE ' + error.message);
  return { status: status === 'active' ? 'resolved' : 'proposed', resolution: { type: 'support_answer', risk, status, resolved_at: new Date().toISOString() } };
}

