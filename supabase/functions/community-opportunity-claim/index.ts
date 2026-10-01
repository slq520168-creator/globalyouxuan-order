// Retired 2026-10-02 (security review #3): this legacy endpoint let any logged-in user claim
// opportunities without spending points. The only supported path is the RPC
// public.gyx_redeem_community_opportunity (charges 2000 points, used by community-page.js).
// Deployed as a stub that always answers 410 Gone because the MCP tooling cannot delete functions.
Deno.serve(() =>
  Response.json(
    { ok: false, error: 'GONE', message: 'community-opportunity-claim is retired; use gyx_redeem_community_opportunity' },
    { status: 410 },
  )
);
