export interface Env {
  AI: Ai;
  TOKENHUB_API_KEY?: string;
  TOKENHUB_BASE_URL?: string;
  TOKENHUB_MODEL?: string;
}

const H = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function out(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: H });
}

function cleanJson(raw: string) {
  const s = raw.replace(/```json|```/gi, '').trim();
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) {
    try { return JSON.parse(s.slice(a, b + 1)); } catch {}
  }
  return null;
}

async function embeddings(body: any, env: Env) {
  const raw = body?.text ?? body?.input;
  const texts = (Array.isArray(raw) ? raw : [raw])
    .map((x: unknown) => String(x ?? '').trim())
    .filter(Boolean)
    .slice(0, 32);

  if (!texts.length) return out({ error: 'EMPTY_TEXT' }, 400);

  const result: any = await env.AI.run('@cf/baai/bge-m3', { text: texts });
  const data = Array.isArray(result?.data) ? result.data : [];
  if (!data.length) return out({ error: 'EMBEDDING_EMPTY', raw: result }, 502);

  return out({
    model: '@cf/baai/bge-m3',
    dimensions: Array.isArray(data[0]) ? data[0].length : null,
    embeddings: data
  });
}

async function rerank(body: any, env: Env) {
  const apiKey = String(env.TOKENHUB_API_KEY || '').trim();
  if (!apiKey) return out({ error: 'TOKENHUB_NOT_CONFIGURED' }, 503);

  const query = String(body?.query ?? body?.originalQuestion ?? '').trim().slice(0, 800);
  const history = (Array.isArray(body?.history) ? body.history : [])
    .map((x: unknown) => String(x ?? '').trim())
    .filter(Boolean)
    .slice(-5);
  const candidates = (Array.isArray(body?.candidates) ? body.candidates : [])
    .map((x: any) => ({
      id: String(x?.id ?? '').trim(),
      title: String(x?.title ?? '').trim().slice(0, 160),
      summary: String(x?.summary ?? x?.answer_summary ?? '').trim().slice(0, 260),
      keywords: Array.isArray(x?.keywords) ? x.keywords.map((k: unknown) => String(k ?? '').trim()).filter(Boolean).slice(0, 12) : []
    }))
    .filter((x: any) => x.id && x.title)
    .slice(0, 30);

  if (!query) return out({ error: 'EMPTY_QUERY' }, 400);
  if (candidates.length < 5) return out({ error: 'NOT_ENOUGH_CANDIDATES', count: candidates.length }, 400);

  const base = String(env.TOKENHUB_BASE_URL || 'https://tokenhub-intl.tencentcloudmaas.com/v1').replace(/\/$/, '');
  const model = String(env.TOKENHUB_MODEL || 'hy3').trim();
  const allowed = new Set(candidates.map((x: any) => x.id));

  const prompt = {
    task: '从候选资料中选择与用户当前问题最匹配的5条。只能选择候选ID，禁止创造新ID、禁止生成候选之外的答案。优先保持明确主体、人名、行业、技能和用户目标一致；历史选择用于继续收窄。5条应有区别但都必须相关。',
    query,
    history,
    candidates
  };

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是检索重排器，不是内容生成器。只输出JSON：{"selected_ids":["id1","id2","id3","id4","id5"],"reason":"简短说明"}。selected_ids必须严格来自候选ID。' },
        { role: 'user', content: JSON.stringify(prompt) }
      ],
      stream: false,
      temperature: 0.1,
      max_tokens: 260
    })
  });

  const raw = await response.text();
  if (!response.ok) return out({ error: 'TOKENHUB_FAILED', status: response.status, message: raw.slice(0, 600) }, 502);

  let content = '';
  try {
    const j = JSON.parse(raw);
    content = String(j?.choices?.[0]?.message?.content || '');
  } catch {
    return out({ error: 'TOKENHUB_BAD_RESPONSE' }, 502);
  }

  const parsed = cleanJson(content) || {};
  const ids = [...new Set((Array.isArray(parsed?.selected_ids) ? parsed.selected_ids : [])
    .map((x: unknown) => String(x ?? '').trim())
    .filter((id: string) => allowed.has(id)))]
    .slice(0, 5);

  if (ids.length !== 5) return out({ error: 'RERANK_INVALID', selected_ids: ids }, 422);

  return out({
    provider: 'tencent-tokenhub',
    endpoint_region: base.includes('intl') ? 'global-singapore' : 'china',
    model,
    selected_ids: ids,
    reason: String(parsed?.reason || '').slice(0, 240)
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
    if (request.method !== 'POST') return out({ error: 'METHOD_NOT_ALLOWED' }, 405);

    const url = new URL(request.url);
    try {
      const body = await request.json<any>();
      if (url.pathname === '/api/embeddings') return await embeddings(body, env);
      if (url.pathname === '/api/rerank') return await rerank(body, env);
      return out({ error: 'NOT_FOUND' }, 404);
    } catch (error: any) {
      return out({ error: 'REQUEST_FAILED', message: String(error?.message || error) }, 500);
    }
  }
} satisfies ExportedHandler<Env>;
