import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const AI_ENDPOINT = "https://globalyouxuan-ai.slq520168.workers.dev/api/chat";
const HAN = /[\u3400-\u9fff]/;
const KHMER = /[\u1780-\u17ff]/;
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

const text = (value: unknown) => String(value ?? "").trim();

function envKey(name: string, fallback: string) {
  const modern = Deno.env.get(name);
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (typeof parsed.default === "string") return parsed.default;
    } catch {
      /* use fallback */
    }
  }
  const legacy = Deno.env.get(fallback);
  if (!legacy) throw new Error(`${name}_MISSING`);
  return legacy;
}

function cleanTitle(value: unknown) {
  return text(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

async function translateOne(source: string, lang: "zh" | "km") {
  const target = lang === "km" ? "natural Khmer" : "natural Simplified Chinese";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `Translate this job/opportunity title from English into ${target}. Output only the translated title. Keep brand names.`,
          },
          { role: "user", content: source },
        ],
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`AI_${response.status}`);
    let out = raw;
    try {
      const parsed = JSON.parse(raw);
      out = text(parsed?.response || parsed?.reply || parsed?.text || parsed?.content || parsed?.choices?.[0]?.message?.content || raw);
    } catch {
      out = raw;
    }
    out = cleanTitle(out.replace(/^```[\s\S]*?```$/g, "").replace(/^```(?:text)?\s*|```$/g, ""));
    if (lang === "zh" && !HAN.test(out)) throw new Error("CHINESE_TEXT_MISSING");
    if (lang === "km" && !KHMER.test(out)) throw new Error("KHMER_TEXT_MISSING");
    return out;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authorization = request.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "AUTH_REQUIRED" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publishableKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const serviceKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice(7);
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "INVALID_SESSION" }, 401);

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: feed, error: feedError } = await db
      .from("community_external_feed")
      .select("id,title")
      .order("batch_code")
      .order("opportunity_no")
      .limit(40);
    if (feedError) throw feedError;
    const rows = feed || [];
    const { data: cached } = await db
      .from("community_opportunity_translation_cache")
      .select("opportunity_id,lang,title")
      .in("opportunity_id", rows.map((row) => row.id));
    const have = new Set((cached || []).map((row) => `${row.opportunity_id}:${row.lang}`));

    let wrote = 0;
    for (const row of rows) {
      const source = cleanTitle(row.title);
      if (!source) continue;
      for (const lang of ["zh", "km"] as const) {
        if (have.has(`${row.id}:${lang}`)) continue;
        if (lang === "zh" && HAN.test(source)) {
          await db.from("community_opportunity_translation_cache").upsert({
            opportunity_id: row.id,
            lang,
            title: source,
            body: source,
          });
          wrote += 1;
          continue;
        }
        if (lang === "km" && KHMER.test(source)) {
          await db.from("community_opportunity_translation_cache").upsert({
            opportunity_id: row.id,
            lang,
            title: source,
            body: source,
          });
          wrote += 1;
          continue;
        }
        try {
          const title = await translateOne(source, lang);
          await db.from("community_opportunity_translation_cache").upsert({
            opportunity_id: row.id,
            lang,
            title,
            body: title,
          });
          wrote += 1;
        } catch (error) {
          console.warn("[community-opportunity-translate]", row.id, lang, text((error as Error)?.message));
        }
      }
    }

    return json({ ok: true, count: rows.length, wrote });
  } catch (error) {
    console.error("[community-opportunity-translate]", error);
    return json({ error: "FAILED", message: text((error as Error)?.message || error) }, 500);
  }
});
