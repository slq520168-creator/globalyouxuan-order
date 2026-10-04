// Block repository-internal files from being served by Cloudflare Pages.
// Pages Git deployments publish the repo root, and .assetsignore is not honoured there,
// so internal notes, migrations, edge-function sources and deploy configs are hidden here.
const BLOCKED_PREFIXES = ['/.monkeycode', '/.git', '/supabase', '/workers', '/functions', '/tools'];
const BLOCKED_FILES = new Set([
  '/wrangler.jsonc', '/wrangler.json', '/wrangler.toml', '/vercel.json', '/.gitignore',
  '/.assetsignore', '/_routes.json', '/home_layout_lock.txt', '/package.json', '/package-lock.json'
]);

function isBlocked(pathname) {
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch (_) { return true; }
  p = p.replace(/\/{2,}/g, '/').toLowerCase();
  if (BLOCKED_FILES.has(p)) return true;
  if (p.endsWith('.md') || p.endsWith('.sql') || p.endsWith('.ts') || p.endsWith('.toml') || p.endsWith('.py')) return true;
  return BLOCKED_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (isBlocked(url.pathname)) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
    });
  }
  return context.next();
}
