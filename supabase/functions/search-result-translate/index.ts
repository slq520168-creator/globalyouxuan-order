import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const AI_ENDPOINT = "https://globalyouxuan-ai.slq520168.workers.dev/api/chat";
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
};
const HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
const KHMER = /[\u1780-\u17ff]/;
const VERSION = "search-ui-v2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}
function text(value: unknown) {
  return String(value ?? "").trim();
}
function envKey(name: string, fallback: string) {
  const modern = Deno.env.get(name);
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (typeof parsed.default === "string") return parsed.default;
    } catch {}
  }
  const legacy = Deno.env.get(fallback);
  if (!legacy) throw new Error(`${name}_MISSING`);
  return legacy;
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function cleanModelText(value: string) {
  return value.replace(/^```(?:json|text|markdown)?\s*/i, "").replace(/```\s*$/, "").trim();
}
function extractModelText(raw: string) {
  if (/^data:/m.test(raw)) {
    const parts: string[] = [];
    for (const line of raw.replace(/\r/g, "").split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trimStart();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload);
        const value = typeof event?.response === "string"
          ? event.response
          : event?.choices?.[0]?.delta?.content;
        if (typeof value === "string") parts.push(value);
      } catch {}
    }
    if (parts.length) return parts.join("").trim();
  }
  try {
    const parsed = JSON.parse(raw);
    const candidates = [parsed?.response, parsed?.reply, parsed?.text, parsed?.content, parsed?.message,
      parsed?.output, parsed?.answer, parsed?.result?.text, parsed?.choices?.[0]?.message?.content];
    for (const candidate of candidates) if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  } catch {}
  return raw.trim();
}
function parseTranslation(value: string) {
  const cleaned = cleanModelText(value);
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed?.translation === "string") return parsed.translation.trim();
  } catch {}
  const match = cleaned.match(/\"translation\"\s*:\s*(\"(?:\\.|[^\"\\])*\")/s);
  if (match) {
    try { return String(JSON.parse(match[1])).trim(); } catch {}
  }
  throw new Error("INVALID_TRANSLATION_JSON");
}
function validate(source: string, translated: string, locale: "en" | "km") {
  if (!translated) throw new Error("EMPTY_TRANSLATION");
  if (HAN.test(translated)) throw new Error("SOURCE_LANGUAGE_REMAINS");
  if (locale === "en" && KHMER.test(translated)) throw new Error("WRONG_TARGET_LANGUAGE");
  if (locale === "km" && (HAN.test(source) || /[A-Za-z]{3}/.test(source)) && !KHMER.test(translated)) {
    throw new Error("KHMER_TEXT_MISSING");
  }
  const multiplier = locale === "km" ? 8 : 5;
  const maxLength = Math.max(120, source.length * multiplier + 120);
  if (translated.length > maxLength) throw new Error("TRANSLATION_TOO_LONG");
  if (!source.includes("\n") && translated.split("\n").length > 3) throw new Error("TRANSLATION_STRUCTURE_CHANGED");
}
async function translateOne(source: string, locale: "en" | "km") {
  const target = locale === "km" ? "standard natural Khmer" : "natural English";
  const system = `You are a literal UI localization translator. This is a TRANSLATION task, never a question-answering task. Translate the exact value of the JSON field \"source\" from its current language into ${target}. If the source is a question, translate the question only; NEVER answer it. Preserve numbers, URLs, API, AI, Groq, Gemini, GlobalYouXuan and established technical identifiers. Preserve meaning and approximate length and structure. Do not add examples, advice, explanations, lists, introductions, conclusions, or facts. Output strict JSON only in exactly this shape: {\"translation\":\"...\"}.`;
  let lastError: unknown = new Error("TRANSLATION_FAILED");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify({ source }) },
          ],
        }),
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) throw new Error(`AI_${response.status}`);
      const translated = parseTranslation(extractModelText(raw));
      validate(source, translated, locale);
      return translated;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publishableKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const serviceKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = request.headers.get("apikey") || "";
    const auth = request.headers.get("Authorization") || "";
    if (apiKey !== publishableKey && auth !== `Bearer ${publishableKey}`) {
      return json({ error: "FORBIDDEN" }, 403);
    }
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const localeRaw = text(body.locale).toLowerCase();
    const locale: "en" | "km" | "" = localeRaw.startsWith("en") ? "en" : localeRaw.startsWith("km") ? "km" : "";
    if (!locale) return json({ error: "LOCALE_REQUIRED" }, 400);
    const sources = (Array.isArray(body.texts) ? body.texts : []).map(text).filter(Boolean).slice(0, 8);
    if (!sources.length || sources.some((x) => x.length > 1200) || sources.join("").length > 5000) {
      return json({ error: "INVALID_TEXTS" }, 400);
    }
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const items = await Promise.all(sources.map(async (source) => ({ source, hash: await sha256(`${VERSION}\n${source}`) })));
    const hashes = items.map((x) => x.hash);
    const { data: cachedRows } = await db.from("translation_cache")
      .select("source_hash,translated_text,source_version")
      .eq("target_locale", locale)
      .in("source_hash", hashes);
    const cached = new Map((cachedRows || []).filter((r) => r.source_version === VERSION)
      .map((r) => [String(r.source_hash), text(r.translated_text)]));
    const results = await Promise.all(items.map(async (item) => {
      const hit = cached.get(item.hash);
      if (hit) return hit;
      const translated = await translateOne(item.source, locale);
      const { error: cacheError } = await db.from("translation_cache").upsert({
        source_hash: item.hash,
        target_locale: locale,
        source_text: item.source,
        translated_text: translated,
        source_version: VERSION,
        updated_at: new Date().toISOString(),
      }, { onConflict: "source_hash,target_locale" });
      if (cacheError) throw cacheError;
      return translated;
    }));
    return json({ ok: true, locale, translations: results });
  } catch (error) {
    console.error("search-result-translate", error);
    return json({ error: "TRANSLATION_FAILED", message: text((error as Error)?.message || error) }, 500);
  }
});
