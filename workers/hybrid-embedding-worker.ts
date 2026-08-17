export interface Env { AI: Ai }

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
    if (request.method !== 'POST') return out({ error: 'METHOD_NOT_ALLOWED' }, 405);

    const url = new URL(request.url);
    if (url.pathname !== '/api/embeddings') return out({ error: 'NOT_FOUND' }, 404);

    try {
      const body = await request.json<any>();
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
    } catch (error: any) {
      return out({ error: 'EMBEDDING_FAILED', message: String(error?.message || error) }, 500);
    }
  }
} satisfies ExportedHandler<Env>;
