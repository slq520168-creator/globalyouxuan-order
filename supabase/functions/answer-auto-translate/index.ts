import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const AI_ENDPOINT = "https://globalyouxuan-ai.slq520168.workers.dev/api/chat";
const CHUNK_LIMIT = 440;
const WORKER_COUNT = 4;
const MAX_ATTEMPTS = 5;
const NEXT_DELAY_MS = 600;
const HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
const KHMER = /[\u1780-\u17ff]/;
const FORBIDDEN_KHMER_ENGLISH = /\b(?:agents?|agentic|prompts?|portfolios?|workflows?|clouds?|cloud-based)\b/i;
const HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
  "vary": "Origin",
};
// #16 CORS 只允许本站（正式域名 + Cloudflare Pages 预览子域 + 本地调试）；服务端内部调用不带 Origin，不受影响
const ALLOWED_ORIGIN = /^(https:\/\/([a-z0-9-]+\.)?globalyouxuan-order\.pages\.dev|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
function withCors(request: Request, response: Response) {
  const origin = request.headers.get("Origin") || "";
  const headers = new Headers(response.headers);
  if (ALLOWED_ORIGIN.test(origin)) headers.set("access-control-allow-origin", origin);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// #8 内部自调用 / claim-answer-download 调用使用 Vault 专用密钥 gyx_translate_internal_secret（不再传 service_role 密钥），常量时间比较
let cachedInternalSecret = "";
// deno-lint-ignore no-explicit-any
async function internalSecret(db: any) {
  if (cachedInternalSecret) return cachedInternalSecret;
  const { data, error } = await db.rpc("gyx_internal_secret", { p_name: "gyx_translate_internal_secret" });
  if (error || typeof data !== "string" || data.length < 32) throw new Error("INTERNAL_SECRET_UNAVAILABLE");
  cachedInternalSecret = data;
  return cachedInternalSecret;
}
async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

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
    } catch {
      // Fall through to the legacy environment variable.
    }
  }
  const legacy = Deno.env.get(fallback);
  if (!legacy) throw new Error(`${name}_MISSING`);
  return legacy;
}

function localeOf(value: unknown): "en" | "km" | "" {
  const normalized = text(value).toLowerCase().replaceAll("_", "-");
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "km" || normalized.startsWith("km-")) return "km";
  return "";
}

type SiteLocale = "zh-CN" | "en" | "km";

function siteLocaleOf(value: unknown): SiteLocale {
  const normalized = text(value).toLowerCase().replaceAll("_", "-");
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "km" || normalized.startsWith("km-")) return "km";
  return "zh-CN";
}

function cleanModelText(value: string) {
  return value
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
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
      } catch {
        // Ignore malformed keep-alive events without corrupting translated text.
      }
    }
    if (parts.length) return parts.join("").trim();
  }
  try {
    const parsed = JSON.parse(raw);
    const candidates = [
      parsed?.response,
      parsed?.reply,
      parsed?.text,
      parsed?.content,
      parsed?.message,
      parsed?.output,
      parsed?.answer,
      parsed?.result?.text,
      parsed?.choices?.[0]?.message?.content,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  } catch {
    // The upstream service can also return plain text.
  }
  return raw.trim();
}

function proseOnly(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/`[^`]*`/g, " ");
}

function validateTranslation(source: string, translated: string, locale: SiteLocale) {
  if (!translated) throw new Error("EMPTY_TRANSLATION");
  if (locale === "zh-CN") {
    if (!HAN.test(proseOnly(translated))) throw new Error("CHINESE_TEXT_MISSING");
    return;
  }
  if (HAN.test(translated) || (locale === "en" && KHMER.test(translated))) {
    throw new Error("SOURCE_LANGUAGE_REMAINS");
  }
  if (locale === "km") {
    const prose = proseOnly(translated);
    if (FORBIDDEN_KHMER_ENGLISH.test(prose)) throw new Error("KHMER_MIXED_ENGLISH");
    if ((HAN.test(source) || /[A-Za-z]{3}/.test(proseOnly(source))) && !KHMER.test(prose)) {
      throw new Error("KHMER_TEXT_MISSING");
    }
  }
}

function preferredBreak(value: string, start: number, hardEnd: number) {
  const softStart = Math.min(hardEnd, start + Math.floor(CHUNK_LIMIT * 0.58));
  const candidates = ["\n\n", "\n", "。", "！", "？", ". ", "; ", "；", " "];
  for (const delimiter of candidates) {
    const index = value.lastIndexOf(delimiter, hardEnd);
    if (index >= softStart) return index + delimiter.length;
  }
  return hardEnd;
}

function chunkSource(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let offset = 0;
  while (offset < normalized.length) {
    const hardEnd = Math.min(normalized.length, offset + CHUNK_LIMIT);
    let end = hardEnd < normalized.length
      ? preferredBreak(normalized, offset, hardEnd)
      : hardEnd;
    if (
      end < normalized.length &&
      /[\ud800-\udbff]/.test(normalized[end - 1] || "") &&
      /[\udc00-\udfff]/.test(normalized[end] || "")
    ) end -= 1;
    const chunk = normalized.slice(offset, end).trim();
    if (chunk) chunks.push(chunk);
    offset = end;
    while (/\s/.test(normalized[offset] || "")) offset += 1;
  }
  return chunks;
}

async function translateChunk(
  source: string,
  locale: SiteLocale,
  sourceLanguage = "Simplified Chinese",
) {
  const target = locale === "km"
    ? "natural Khmer"
    : locale === "en"
    ? "natural English"
    : "natural Simplified Chinese";
  const khmerRule = locale === "km"
    ? " Translate generic terms such as agent, prompt, portfolio, workflow and cloud into natural Khmer; do not leave those English words standing alone."
    : "";
  const system = `Translate this complete customer-facing delivery section from ${sourceLanguage} into ${target}. Translate every user-visible sentence and heading. Preserve structure, numbering, bullets, URLs, email addresses, prices, code identifiers, established product names and the brand name GlobalYouXuan.${khmerRule} Do not summarize, shorten, omit, add commentary, or expose internal processing details. Output only the translated section.`;
  const translated = cleanModelText(await modelCompletion(system, source));
  validateTranslation(source, translated, locale);
  return translated;
}

async function modelCompletion(system: string, user: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`AI_${response.status}`);
    return extractModelText(raw);
  } finally {
    clearTimeout(timeout);
  }
}

async function translateWithRetry(
  source: string,
  locale: SiteLocale,
  sourceLanguage: string,
) {
  let lastError: unknown = new Error("TRANSLATION_FAILED");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await translateChunk(source, locale, sourceLanguage);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 450));
      }
    }
  }
  throw lastError;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized in named) return named[normalized];
    if (!normalized.startsWith("#")) return match;
    const hexadecimal = normalized.startsWith("#x");
    const codePoint = Number.parseInt(normalized.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    try {
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    } catch {
      return match;
    }
  });
}

function plainText(value: unknown) {
  return decodeHtmlEntities(String(value ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/<\s*(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, "\n")
    .replace(/<\s*(?:script|style|noscript|svg)\b[^>]*>[\s\S]*?<\s*\/\s*(?:script|style|noscript|svg)\s*>/gi, " ")
    .replace(/<[^>]*>/g, " "))
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseCommunitySnapshot(value: unknown) {
  const normalized = plainText(value);
  const sourceMatch = normalized.match(
    /(?:^|\n)(?:原始地址\s*\/\s*)?Source\s*:\s*(https?:\/\/\S+)\s*$/i,
  );
  const sourceUrl = sourceMatch?.[1] || "";
  const withoutSource = sourceMatch
    ? normalized.slice(0, sourceMatch.index).trim()
    : normalized;
  const firstBreak = withoutSource.indexOf("\n");
  return {
    body: (firstBreak >= 0 ? withoutSource.slice(firstBreak + 1) : withoutSource).trim(),
    sourceUrl,
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function communityDelivery(
  request: Request,
  body: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "AUTH_REQUIRED" }, 401);
  const token = authorization.slice(7);
  const publishableKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "INVALID_SESSION" }, 401);

  const redemptionId = Number(body.redemption_id);
  const requestedLocale = siteLocaleOf(body.locale);
  if (!Number.isSafeInteger(redemptionId) || redemptionId <= 0) {
    return json({ error: "VALID_REDEMPTION_ID_REQUIRED" }, 400);
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: redemption, error: redemptionError } = await db
    .from("member_point_redemptions")
    .select("id,user_id,opportunity_id,delivery_text_snapshot,delivery_i18n")
    .eq("id", redemptionId)
    .eq("user_id", userData.user.id)
    .not("opportunity_id", "is", null)
    .maybeSingle();
  if (redemptionError || !redemption) return json({ error: "DELIVERY_NOT_FOUND" }, 404);

  const parsed = parseCommunitySnapshot(redemption.delivery_text_snapshot);
  if (!parsed.body) return json({ error: "EMPTY_DELIVERY" }, 404);
  const sourceHash = await sha256(parsed.body);
  let translations = objectValue(redemption.delivery_i18n);

  const cachedBody = (locale: SiteLocale) => {
    const cached = objectValue(translations[locale]);
    return text(cached.source_hash) === sourceHash ? text(cached.body) : "";
  };

  const ensureLocale = async (locale: SiteLocale) => {
    if (locale === "en") return parsed.body;
    const cached = cachedBody(locale);
    if (cached) return cached;
    const chunks = chunkSource(parsed.body);
    const translatedParts = await Promise.all(
      chunks.map((chunk) => translateWithRetry(chunk, locale, "English")),
    );
    const translated = translatedParts.map(text).filter(Boolean).join("\n\n");
    validateTranslation(parsed.body, translated, locale);
    translations = {
      ...translations,
      [locale]: {
        source_hash: sourceHash,
        body: translated,
        updated_at: new Date().toISOString(),
      },
    };
    const { error: updateError } = await db
      .from("member_point_redemptions")
      .update({ delivery_i18n: translations })
      .eq("id", redemption.id)
      .eq("user_id", userData.user.id);
    if (updateError) throw updateError;
    return translated;
  };

  try {
    const content = await ensureLocale(requestedLocale);
    return json({
      ok: true,
      status: "ready",
      content,
      source_url: parsed.sourceUrl,
      requested_locale: requestedLocale,
      delivery_locale: requestedLocale,
      fallback: false,
    });
  } catch (error) {
    console.warn("[GYX community delivery] translation failed", {
      redemption_id: redemption.id,
      requested_locale: requestedLocale,
      error: text((error as Error)?.message || error),
    });
    if (requestedLocale === "km") {
      try {
        const content = await ensureLocale("zh-CN");
        console.warn("[GYX community delivery] fallback=zh", {
          redemption_id: redemption.id,
          requested_locale: requestedLocale,
        });
        return json({
          ok: true,
          status: "ready",
          content,
          source_url: parsed.sourceUrl,
          requested_locale: requestedLocale,
          delivery_locale: "zh-CN",
          fallback: true,
        });
      } catch (fallbackError) {
        console.error("[GYX community delivery] Chinese fallback failed", {
          redemption_id: redemption.id,
          error: text((fallbackError as Error)?.message || fallbackError),
        });
      }
    }
    return json({ error: "DELIVERY_PREPARATION_FAILED", status: "failed" });
  }
}

type AnswerCatalogRow = {
  id: number;
  title: string | null;
  title_en: string | null;
  title_km: string | null;
  answer_summary: string | null;
  answer_summary_en: string | null;
  answer_summary_km: string | null;
  content_version: number | null;
};

function translationFromJson(value: string) {
  const cleaned = cleanModelText(value);
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed?.translation === "string") return parsed.translation.trim();
  } catch {
    const match = cleaned.match(/"translation"\s*:\s*("(?:\\.|[^"\\])*")/s);
    if (match) {
      try {
        return String(JSON.parse(match[1])).trim();
      } catch {
        // A retry will handle malformed model output.
      }
    }
  }
  throw new Error("INVALID_TRANSLATION_JSON");
}

async function translateAnswerTitle(source: string, locale: "en" | "km") {
  const target = locale === "km" ? "standard natural Khmer" : "natural English";
  const glossary = locale === "km"
    ? " Use របៀប for 'how to', ជ្រើសរើស for 'choose', ឥតគិតថ្លៃ for 'free', មាតិកា for 'content', វេទិកា for 'platform', ដោយស្វ័យប្រវត្តិ for 'automatically', លំហូរការងារ for 'workflow', ពាក្យបញ្ជា for 'prompt', សំណុំស្នាដៃ for 'portfolio', ភ្នាក់ងារឆ្លាតវៃ for 'AI agent', and សេវាពពក for 'cloud service'."
    : "";
  const system = `You are a professional UI localization translator. Translate the Simplified Chinese title faithfully and concisely into ${target}. Do not answer the title as a question. Preserve established brand names and technical identifiers such as API, AI, Groq and Gemini.${glossary} Output strict JSON only: {"translation":"..."}.`;
  let lastError: unknown = new Error("TITLE_TRANSLATION_FAILED");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const translated = translationFromJson(await modelCompletion(
        system,
        JSON.stringify({ source }),
      ));
      validateTranslation(source, translated, locale);
      return translated;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 350));
    }
  }
  throw lastError;
}

async function translateAnswerBody(source: string, locale: "en" | "km") {
  if (!source.trim()) return "";
  const chunks = chunkSource(source);
  const translated = await Promise.all(
    chunks.map((chunk) => translateWithRetry(chunk, locale, "Simplified Chinese")),
  );
  const value = translated.map(text).filter(Boolean).join("\n\n");
  validateTranslation(source, value, locale);
  return value;
}

function usableTranslation(source: string, candidate: unknown, locale: "en" | "km") {
  const value = text(candidate);
  if (!value) return false;
  try {
    validateTranslation(source, value, locale);
    return true;
  } catch {
    return false;
  }
}

// 公开的目录翻译：只处理标题和摘要（免费可见字段）。
// 安全修复：付费正文 answer_detail_* 一律不读取、不翻译、不返回（此前 include_detail=true 可匿名拿到付费正文）。
async function catalogContent(
  request: Request,
  body: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
) {
  const publishableKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization") || "";
  const apiKey = request.headers.get("apikey") || "";
  if (apiKey !== publishableKey && authorization !== `Bearer ${publishableKey}`) {
    return json({ error: "FORBIDDEN" }, 403);
  }
  const locale = localeOf(body.locale);
  if (!locale) return json({ error: "LOCALE_REQUIRED" }, 400);
  const ids = [...new Set((Array.isArray(body.answer_ids) ? body.answer_ids : [])
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 8);
  if (!ids.length) return json({ error: "ANSWER_IDS_REQUIRED" }, 400);
  const includeSummary = body.include_detail === true || body.include_summary === true;
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db
    .from("product_answer_options")
    .select("id,title,title_en,title_km,answer_summary,answer_summary_en,answer_summary_km,content_version")
    .in("id", ids)
    .eq("is_active", true);
  if (error) throw error;

  const rows = await Promise.all(((data || []) as AnswerCatalogRow[]).map(async (row) => {
    const titleColumn = locale === "en" ? "title_en" : "title_km";
    const summaryColumn = locale === "en" ? "answer_summary_en" : "answer_summary_km";
    const update: Record<string, string> = {};
    let fallback = false;
    try {
      if (!usableTranslation(text(row.title), row[titleColumn], locale)) {
        update[titleColumn] = await translateAnswerTitle(text(row.title), locale);
      }
      if (includeSummary && text(row.answer_summary) && !usableTranslation(text(row.answer_summary), row[summaryColumn], locale)) {
        update[summaryColumn] = await translateAnswerBody(text(row.answer_summary), locale);
      }
      if (Object.keys(update).length) {
        const write = await db
          .from("product_answer_options")
          .update({ ...update, updated_at: new Date().toISOString() })
          .eq("id", row.id)
          .eq("content_version", Number(row.content_version || 1));
        if (write.error) throw write.error;
        Object.assign(row, update);
      }
    } catch (translationError) {
      fallback = true;
      console.warn("[GYXI18N catalog] translation failed; fallback=zh", {
        answer_id: row.id,
        locale,
        error: text((translationError as Error)?.message || translationError),
      });
    }
    return { ...row, fallback };
  }));
  return json({ ok: true, locale, rows });
}

async function selfCall(
  supabaseUrl: string,
  internal: string,
  body: Record<string, unknown>,
) {
  await fetch(`${supabaseUrl}/functions/v1/answer-auto-translate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-service": internal,
    },
    body: JSON.stringify(body),
  }).catch((error) => console.error("[GYX delivery translation] worker call failed", error));
}

async function delayedSelfCall(
  supabaseUrl: string,
  internal: string,
  body: Record<string, unknown>,
) {
  await new Promise((resolve) => setTimeout(resolve, NEXT_DELAY_MS));
  await selfCall(supabaseUrl, internal, body);
}

function launchWorkers(
  supabaseUrl: string,
  internal: string,
  body: Record<string, unknown>,
  count = WORKER_COUNT,
) {
  for (let index = 0; index < count; index += 1) {
    EdgeRuntime.waitUntil(selfCall(supabaseUrl, internal, body));
  }
}

Deno.serve(async (request: Request) => withCors(request, await handle(request)));

async function handle(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = text(body.action) || "ensure";
    if (action === "community") {
      return await communityDelivery(request, body, supabaseUrl, serviceKey);
    }
    if (action === "catalog") {
      return await catalogContent(request, body, supabaseUrl, serviceKey);
    }

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const internal = await internalSecret(db);
    if (!(await safeEqual(request.headers.get("x-internal-service") || "", internal))) {
      return json({ error: "FORBIDDEN" }, 403);
    }
    const orderId = Number(body.order_id);
    const locale = localeOf(body.locale);
    const sourceHash = text(body.source_hash);
    const sourceContent = String(body.source_content ?? "");
    if (!Number.isSafeInteger(orderId) || orderId <= 0 || !locale || !sourceHash) {
      return json({ error: "BAD_INPUT" }, 400);
    }
    if (sourceContent.length > 50_000) return json({ error: "SOURCE_TOO_LARGE" }, 400);

    const cacheQuery = () => db
      .from("order_delivery_translation_cache")
      .select("status,translated_content,chunk_count,completed_chunks,error_text,updated_at")
      .eq("order_id", orderId)
      .eq("locale", locale)
      .eq("source_hash", sourceHash)
      .maybeSingle();

    let { data: cache } = await cacheQuery();
    if (cache?.status === "ready" && text(cache.translated_content)) {
      return json({
        ok: true,
        status: "ready",
        locale,
        content: cache.translated_content,
        completed_chunks: cache.completed_chunks,
        chunk_count: cache.chunk_count,
      });
    }

    const workerBody = { action: "process", order_id: orderId, locale, source_hash: sourceHash };

    if (action === "ensure") {
      if (!cache) {
        if (!sourceContent.trim()) return json({ error: "SOURCE_REQUIRED" }, 400);
        const chunks = chunkSource(sourceContent);
        if (!chunks.length) return json({ error: "SOURCE_REQUIRED" }, 400);
        const now = new Date().toISOString();
        const { error: cacheInsertError } = await db
          .from("order_delivery_translation_cache")
          .upsert({
            order_id: orderId,
            locale,
            source_hash: sourceHash,
            status: "pending",
            translated_content: null,
            chunk_count: chunks.length,
            completed_chunks: 0,
            error_text: null,
            updated_at: now,
          }, {
            onConflict: "order_id,locale,source_hash",
            ignoreDuplicates: true,
          });
        if (cacheInsertError) throw cacheInsertError;
        const { error: partsInsertError } = await db
          .from("order_delivery_translation_parts")
          .upsert(chunks.map((chunk, chunkIndex) => ({
            order_id: orderId,
            locale,
            source_hash: sourceHash,
            chunk_index: chunkIndex,
            source_text: chunk,
            translated_text: null,
            status: "pending",
            attempt_count: 0,
            error_text: null,
            updated_at: now,
          })), {
            onConflict: "order_id,locale,source_hash,chunk_index",
            ignoreDuplicates: true,
          });
        if (partsInsertError) throw partsInsertError;
        ({ data: cache } = await cacheQuery());
      }

      if (cache?.status === "failed") {
        return json({
          ok: false,
          status: "failed",
          locale,
          error: cache.error_text || "TRANSLATION_FAILED",
        });
      }

      if (cache?.status === "pending") {
        const { data: started, error: startError } = await db
          .from("order_delivery_translation_cache")
          .update({ status: "processing", error_text: null, updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .eq("locale", locale)
          .eq("source_hash", sourceHash)
          .eq("status", "pending")
          .select("order_id");
        if (startError) throw startError;
        if ((started || []).length) launchWorkers(supabaseUrl, internal, workerBody);
      } else if (cache?.status === "processing") {
        EdgeRuntime.waitUntil(selfCall(supabaseUrl, internal, workerBody));
      }

      return json({
        ok: true,
        status: "processing",
        locale,
        completed_chunks: cache?.completed_chunks || 0,
        chunk_count: cache?.chunk_count || 0,
      });
    }

    if (action === "status") {
      ({ data: cache } = await cacheQuery());
      if (cache?.status === "ready" && text(cache.translated_content)) {
        return json({
          ok: true,
          status: "ready",
          locale,
          content: cache.translated_content,
          completed_chunks: cache.completed_chunks,
          chunk_count: cache.chunk_count,
        });
      }
      return json({
        ok: true,
        status: cache?.status || "missing",
        locale,
        completed_chunks: cache?.completed_chunks || 0,
        chunk_count: cache?.chunk_count || 0,
        error: cache?.error_text || null,
      });
    }

    if (action === "process") {
      const { data: claimed, error: claimError } = await db.rpc(
        "claim_order_delivery_translation_part",
        { p_order_id: orderId, p_locale: locale, p_source_hash: sourceHash },
      );
      if (claimError) throw claimError;
      const part = Array.isArray(claimed) && claimed.length ? claimed[0] : null;

      if (!part) {
        const { data: parts, error: partsError } = await db
          .from("order_delivery_translation_parts")
          .select("chunk_index,status,translated_text,attempt_count,error_text")
          .eq("order_id", orderId)
          .eq("locale", locale)
          .eq("source_hash", sourceHash)
          .order("chunk_index");
        if (partsError) throw partsError;
        const rows = parts || [];
        const readyRows = rows.filter((row) => row.status === "ready" && text(row.translated_text));
        if (rows.length && readyRows.length === rows.length) {
          const content = readyRows
            .sort((left, right) => left.chunk_index - right.chunk_index)
            .map((row) => text(row.translated_text))
            .join("\n\n");
          await db
            .from("order_delivery_translation_cache")
            .update({
              status: "ready",
              translated_content: content,
              completed_chunks: rows.length,
              error_text: null,
              updated_at: new Date().toISOString(),
            })
            .eq("order_id", orderId)
            .eq("locale", locale)
            .eq("source_hash", sourceHash);
          return json({
            ok: true,
            status: "ready",
            locale,
            content,
            completed_chunks: rows.length,
            chunk_count: rows.length,
          });
        }

        const activeCount = rows.filter((row) => row.status === "processing").length;
        const retryable = rows.some((row) =>
          (row.status === "pending" || row.status === "failed") &&
          Number(row.attempt_count || 0) < MAX_ATTEMPTS
        );
        if (retryable) {
          const availableWorkers = Math.max(0, WORKER_COUNT - activeCount);
          if (availableWorkers) {
            launchWorkers(supabaseUrl, internal, workerBody, availableWorkers);
          }
          return json({ ok: true, status: "processing", locale });
        }
        if (activeCount) return json({ ok: true, status: "processing", locale });

        const errors = rows
          .filter((row) => row.status !== "ready")
          .map((row) => `#${row.chunk_index}:${text(row.error_text) || "translation failed"}`)
          .join(" | ")
          .slice(0, 1500);
        await db
          .from("order_delivery_translation_cache")
          .update({
            status: "failed",
            error_text: errors || "TRANSLATION_FAILED",
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", orderId)
          .eq("locale", locale)
          .eq("source_hash", sourceHash);
        console.error("[GYX delivery translation] exhausted", {
          order_id: orderId,
          locale,
          error: errors,
        });
        return json({ ok: false, status: "failed", error: errors || "TRANSLATION_FAILED" });
      }

      try {
        const translated = await translateChunk(text(part.source_text), locale);
        const now = new Date().toISOString();
        const { error: updateError } = await db
          .from("order_delivery_translation_parts")
          .update({ translated_text: translated, status: "ready", error_text: null, updated_at: now })
          .eq("order_id", orderId)
          .eq("locale", locale)
          .eq("source_hash", sourceHash)
          .eq("chunk_index", part.chunk_index);
        if (updateError) throw updateError;
        const { count } = await db
          .from("order_delivery_translation_parts")
          .select("*", { count: "exact", head: true })
          .eq("order_id", orderId)
          .eq("locale", locale)
          .eq("source_hash", sourceHash)
          .eq("status", "ready");
        await db
          .from("order_delivery_translation_cache")
          .update({
            completed_chunks: count || 0,
            status: "processing",
            updated_at: now,
          })
          .eq("order_id", orderId)
          .eq("locale", locale)
          .eq("source_hash", sourceHash);
        EdgeRuntime.waitUntil(delayedSelfCall(supabaseUrl, internal, workerBody));
        return json({ ok: true, status: "processing", completed_chunks: count || 0 });
      } catch (error) {
        const message = text(
          (error as Error)?.name === "AbortError"
            ? "AI_TIMEOUT"
            : (error as Error)?.message || error,
        );
        await db
          .from("order_delivery_translation_parts")
          .update({ status: "failed", error_text: message, updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .eq("locale", locale)
          .eq("source_hash", sourceHash)
          .eq("chunk_index", part.chunk_index);
        console.warn("[GYX delivery translation] chunk retry", {
          order_id: orderId,
          locale,
          chunk_index: part.chunk_index,
          attempt_count: part.attempt_count,
          error: message,
        });
        EdgeRuntime.waitUntil(delayedSelfCall(supabaseUrl, internal, workerBody));
        return json({ ok: false, status: "processing", error: message });
      }
    }

    return json({ error: "BAD_ACTION" }, 400);
  } catch (error) {
    console.error("[GYX delivery translation] failed", error);
    return json({ error: "FAILED" }, 500);
  }
}
