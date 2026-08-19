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
const VERSION = "search-ui-v5-batch";

const text = (v: unknown) => String(v ?? "").trim();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

function envKey(name: string, fallback: string) {
  const modern = Deno.env.get(name);
  if (modern) {
    try { const parsed = JSON.parse(modern); if (typeof parsed.default === "string") return parsed.default; } catch {}
  }
  const legacy = Deno.env.get(fallback);
  if (!legacy) throw new Error(`${name}_MISSING`);
  return legacy;
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
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
        const value = typeof event?.response === "string" ? event.response : event?.choices?.[0]?.delta?.content;
        if (typeof value === "string") parts.push(value);
      } catch {}
    }
    if (parts.length) return parts.join("").trim();
  }
  try {
    const parsed = JSON.parse(raw);
    for (const value of [parsed?.response, parsed?.reply, parsed?.text, parsed?.content, parsed?.message, parsed?.output, parsed?.answer, parsed?.result?.text, parsed?.choices?.[0]?.message?.content]) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  } catch {}
  return raw.trim();
}
function parseArray(value: string, count: number) {
  const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let parsed: any;
  try { parsed = JSON.parse(cleaned); } catch {
    const a = cleaned.indexOf("[");
    const b = cleaned.lastIndexOf("]");
    if (a < 0 || b <= a) throw new Error("INVALID_TRANSLATION_JSON");
    parsed = JSON.parse(cleaned.slice(a, b + 1));
  }
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.translations) ? parsed.translations : null;
  if (!arr || arr.length !== count) throw new Error("TRANSLATION_COUNT_MISMATCH");
  return arr.map(text);
}
function validate(source: string, translated: string, locale: "en" | "km") {
  if (!translated) throw new Error("EMPTY_TRANSLATION");
  if (HAN.test(translated)) throw new Error("SOURCE_LANGUAGE_REMAINS");
  if (locale === "en" && KHMER.test(translated)) throw new Error("WRONG_TARGET_LANGUAGE");
  if (locale === "km" && !KHMER.test(translated)) throw new Error("KHMER_TEXT_MISSING");
  const maxLength = Math.max(120, source.length * (locale === "km" ? 8 : 5) + 120);
  if (translated.length > maxLength) throw new Error("TRANSLATION_TOO_LONG");
}
function promptFor(target: "en" | "km") {
  if (target === "km") return `You are a Khmer UI localization translator. Translate EACH English string in the JSON array "sources" into concise natural standard Khmer. Never answer questions; translate them only. Keep the same order and same item count. Preserve API, AI, Groq, Gemini, GlobalYouXuan and technical identifiers. Preferred terminology: how to = របៀប; choose = ជ្រើសរើស; use = ប្រើ; free = ឥតគិតថ្លៃ; reliable = អាចទុកចិត្តបាន; translation = បកប្រែ; content = មាតិកា; platform = វេទិកា; automatically = ដោយស្វ័យប្រវត្តិ. Examples: "How to choose a free translation API" -> "របៀបជ្រើសរើស API បកប្រែឥតគិតថ្លៃ"; "How to use Groq free AI API" -> "របៀបប្រើ Groq AI API ឥតគិតថ្លៃ"; "How to choose a reliable free API" -> "របៀបជ្រើសរើស API ឥតគិតថ្លៃដែលអាចទុកចិត្តបាន"; "How to use Gemini API for free" -> "របៀបប្រើ Gemini API ឥតគិតថ្លៃ"; "How to auto publish content across multiple platforms" -> "របៀបបោះពុម្ពមាតិកាដោយស្វ័យប្រវត្តិនៅលើវេទិកាច្រើន". Output strict JSON only: {"translations":["...","..."]}.`;
  return `You are a literal UI localization translator. Translate EACH source string in the JSON array "sources" into concise natural English. Never answer questions; translate them only. Keep the same order and same item count. Preserve numbers, URLs, API, AI, Groq, Gemini, GlobalYouXuan and technical identifiers. Do not add advice or explanations. Output strict JSON only: {"translations":["...","..."]}.`;
}
async function modelTranslateBatch(sources: string[], target: "en" | "km") {
  let lastError: unknown = new Error("TRANSLATION_FAILED");
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ temperature: 0, messages: [
          { role: "system", content: promptFor(target) },
          { role: "user", content: JSON.stringify({ sources }) },
        ] }),
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) throw new Error(`AI_${response.status}`);
      const translated = parseArray(extractModelText(raw), sources.length);
      translated.forEach((x, i) => validate(sources[i], x, target));
      return translated;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250));
    } finally { clearTimeout(timeout); }
  }
  throw lastError;
}
async function translateBatch(sources: string[], locale: "en" | "km") {
  if (locale === "en") return await modelTranslateBatch(sources, "en");
  const english = await modelTranslateBatch(sources, "en");
  const khmer = await modelTranslateBatch(english, "km");
  khmer.forEach((x, i) => validate(sources[i], x, "km"));
  return khmer;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const started = Date.now();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publishableKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const serviceKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = request.headers.get("apikey") || "";
    const auth = request.headers.get("Authorization") || "";
    if (apiKey !== publishableKey && auth !== `Bearer ${publishableKey}`) return json({ error: "FORBIDDEN" }, 403);

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const localeRaw = text(body.locale).toLowerCase();
    const locale: "en" | "km" | "" = localeRaw.startsWith("en") ? "en" : localeRaw.startsWith("km") ? "km" : "";
    if (!locale) return json({ error: "LOCALE_REQUIRED" }, 400);
    const sources = (Array.isArray(body.texts) ? body.texts : []).map(text).filter(Boolean).slice(0, 8);
    if (!sources.length || sources.some((x) => x.length > 1200) || sources.join("").length > 5000) return json({ error: "INVALID_TEXTS" }, 400);

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const items = await Promise.all(sources.map(async (source) => ({ source, hash: await sha256(`${VERSION}\n${source}`) })));
    const hashes = items.map((x) => x.hash);
    const { data: cachedRows } = await db.from("translation_cache").select("source_hash,translated_text,source_version").eq("target_locale", locale).in("source_hash", hashes);
    const cached = new Map((cachedRows || []).filter((r) => r.source_version === VERSION).map((r) => [String(r.source_hash), text(r.translated_text)]));

    const results = new Array<string>(items.length);
    const missingIndexes: number[] = [];
    items.forEach((item, i) => {
      const hit = cached.get(item.hash);
      if (hit) results[i] = hit; else missingIndexes.push(i);
    });

    if (missingIndexes.length) {
      const missingSources = missingIndexes.map((i) => items[i].source);
      const translated = await translateBatch(missingSources, locale);
      const rows = missingIndexes.map((itemIndex, j) => ({
        source_hash: items[itemIndex].hash,
        target_locale: locale,
        source_text: items[itemIndex].source,
        translated_text: translated[j],
        source_version: VERSION,
        updated_at: new Date().toISOString(),
      }));
      const { error: cacheError } = await db.from("translation_cache").upsert(rows, { onConflict: "source_hash,target_locale" });
      if (cacheError) throw cacheError;
      missingIndexes.forEach((itemIndex, j) => { results[itemIndex] = translated[j]; });
    }

    return json({ ok: true, locale, translations: results, elapsed_ms: Date.now() - started, ai_batches: missingIndexes.length ? (locale === "km" ? 2 : 1) : 0 });
  } catch (error) {
    console.error("search-result-translate", error);
    return json({ error: "TRANSLATION_FAILED", message: text((error as Error)?.message || error), elapsed_ms: Date.now() - started }, 500);
  }
});
