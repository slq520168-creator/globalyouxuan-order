import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
const KHMER = /[\u1780-\u17ff]/;
const FORBIDDEN_KHMER_ENGLISH = /\b(?:agents?|agentic|prompts?|portfolios?|workflows?|clouds?|cloud-based)\b/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
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

function localeOf(value: unknown): "zh-CN" | "en" | "km" {
  const valueNormalized = text(value).toLowerCase().replaceAll("_", "-");
  if (valueNormalized === "en" || valueNormalized.startsWith("en-")) return "en";
  if (valueNormalized === "km" || valueNormalized.startsWith("km-")) return "km";
  return "zh-CN";
}

function jwtSubject(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(base64));
    return typeof parsed?.sub === "string" ? parsed.sub : "";
  } catch {
    return "";
  }
}

function buildDelivery(
  title: string,
  summary: string,
  detail: string,
  question: string,
  selections: string[],
) {
  const sections = [title];
  if (summary) sections.push("", summary);
  if (question) sections.push("", question);
  if (detail) sections.push("", detail);
  if (selections.length) {
    sections.push("", ...selections.map((item, index) => `${index + 1}. ${item}`));
  }
  return sections.join("\n").slice(0, 50_000).trim();
}

function proseOnly(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/`[^`]*`/g, " ");
}

function validLocalizedParts(
  locale: "en" | "km",
  title: string,
  summary: string,
  detail: string,
) {
  if (!title || !summary || !detail) return false;
  const joined = `${title}\n${summary}\n${detail}`;
  if (HAN.test(joined)) return false;
  if (locale === "en") return true;
  const prose = proseOnly(joined);
  return KHMER.test(prose) && !FORBIDDEN_KHMER_ENGLISH.test(prose);
}

function validLocalizedContent(locale: "en" | "km", content: string) {
  if (!content || HAN.test(content)) return false;
  if (locale === "en") return !KHMER.test(content);
  const prose = proseOnly(content);
  return KHMER.test(prose) && !FORBIDDEN_KHMER_ENGLISH.test(prose);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getTranslation(
  db: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  orderId: number,
  locale: "en" | "km",
  sourceContent: string,
) {
  const sourceHash = await sha256(sourceContent);
  const { data: cached } = await db
    .from("order_delivery_translation_cache")
    .select("status,translated_content,completed_chunks,chunk_count,error_text")
    .eq("order_id", orderId)
    .eq("locale", locale)
    .eq("source_hash", sourceHash)
    .maybeSingle();

  if (cached?.status === "ready" && text(cached.translated_content)) {
    return {
      status: "ready",
      content: text(cached.translated_content),
      completed_chunks: cached.completed_chunks,
      chunk_count: cached.chunk_count,
    };
  }
  if (cached?.status === "pending" || cached?.status === "processing") {
    return {
      status: cached.status,
      completed_chunks: cached.completed_chunks || 0,
      chunk_count: cached.chunk_count || 0,
    };
  }
  if (cached?.status === "failed") {
    return { status: "failed", error: cached.error_text || "TRANSLATION_FAILED" };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/answer-auto-translate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-service": serviceKey,
    },
    body: JSON.stringify({
      action: "ensure",
      order_id: orderId,
      locale,
      source_hash: sourceHash,
      source_content: sourceContent,
    }),
  });
  return await response.json().catch(() => ({ error: "TRANSLATOR_BAD_RESPONSE" }));
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authorization = request.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "AUTH_REQUIRED" }, 401);
    const userId = jwtSubject(authorization.slice(7));
    if (!userId) return json({ error: "INVALID_SESSION" }, 401);

    const bodyPromise = request.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = await bodyPromise as Record<string, unknown>;
    const orderId = Number(body.order_id);
    const allowChineseFallback = body.fallback_to_zh === true;
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return json({ error: "VALID_ORDER_ID_REQUIRED" }, 400);
    }

    const { data: order, error: orderError } = await db
      .from("orders")
      .select(
        "id,order_no,user_id,status,answer_id,answer_tier,matched_answer_title,product_name,product_id,source_module,source_type,customer_question,selection_path,generated_delivery,delivery_downloaded_at,delivery_locale",
      )
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (orderError || !order || order.status !== "delivered") {
      return json({ error: "DELIVERY_NOT_READY" }, 404);
    }
    if (order.delivery_downloaded_at) {
      return json({
        ok: false,
        error: "DOWNLOAD_ALREADY_COMPLETED",
        completed_at: order.delivery_downloaded_at,
      }, 409);
    }

    const requestedLocale = localeOf(order.delivery_locale);
    const selections = Array.isArray(order.selection_path)
      ? order.selection_path.map(text).filter(Boolean).slice(0, 20)
      : [];
    let titleZh = text(order.matched_answer_title) || text(order.product_name);
    let summaryZh = "";
    let detailZh = "";
    let localized: { title: string; summary: string; detail: string } | null = null;

    let answerId = Number(order.answer_id) || null;
    if (order.source_module === "home_fixed") {
      const { data: scheme } = await db
        .from("fixed_order_schemes")
        .select("scheme_id,answer_id,product_id,source_type,is_active")
        .eq("product_id", order.product_id)
        .eq("source_type", order.source_type)
        .eq("is_active", true)
        .maybeSingle();
      if (!scheme) return json({ error: "FIXED_SCHEME_NOT_FOUND" }, 404);
      answerId = Number(scheme.answer_id);
    }

    if (order.generated_delivery && typeof order.generated_delivery === "object") {
      const generated = order.generated_delivery as Record<string, unknown>;
      titleZh = text(generated.title) || titleZh;
      summaryZh = text(generated.summary);
      detailZh = text(generated.detailed_plan);
      if (Array.isArray(generated.deliverables) && generated.deliverables.length) {
        const deliverables = generated.deliverables.map(text).filter(Boolean);
        detailZh += `${detailZh ? "\n\n" : ""}${deliverables
          .map((item, index) => `${index + 1}. ${item}`)
          .join("\n")}`;
      }
    } else if (answerId) {
      let answerQuery = db
        .from("product_answer_options")
        .select(
          "id,title,title_en,title_km,answer_summary,answer_summary_en,answer_summary_km,answer_detail_zh,answer_detail_en,answer_detail_km,delivery_scheme_id,is_active",
        )
        .eq("id", answerId)
        .eq("is_active", true);
      if (order.source_module === "home_fixed") {
        const { data: scheme } = await db
          .from("fixed_order_schemes")
          .select("scheme_id")
          .eq("product_id", order.product_id)
          .eq("source_type", order.source_type)
          .eq("is_active", true)
          .maybeSingle();
        if (!scheme) return json({ error: "FIXED_SCHEME_NOT_FOUND" }, 404);
        answerQuery = answerQuery.eq("delivery_scheme_id", scheme.scheme_id);
      }
      const { data: answer } = await answerQuery.maybeSingle();
      if (!answer) {
        return json({
          error: order.source_module === "home_fixed"
            ? "FIXED_DELIVERY_MISMATCH"
            : "ANSWER_NOT_FOUND",
        }, 404);
      }
      titleZh = text(answer.title) || titleZh;
      summaryZh = text(answer.answer_summary);
      detailZh = text(answer.answer_detail_zh);
      if (requestedLocale === "en") {
        const candidate = {
          title: text(answer.title_en),
          summary: text(answer.answer_summary_en),
          detail: text(answer.answer_detail_en),
        };
        if (validLocalizedParts("en", candidate.title, candidate.summary, candidate.detail)) {
          localized = candidate;
        }
      } else if (requestedLocale === "km") {
        const candidate = {
          title: text(answer.title_km),
          summary: text(answer.answer_summary_km),
          detail: text(answer.answer_detail_km),
        };
        if (validLocalizedParts("km", candidate.title, candidate.summary, candidate.detail)) {
          localized = candidate;
        }
      }
    } else {
      return json({ error: "ANSWER_NOT_FOUND" }, 404);
    }

    const sourceContent = buildDelivery(
      titleZh,
      summaryZh,
      detailZh,
      text(order.customer_question),
      selections,
    );
    if (!sourceContent) return json({ error: "EMPTY_DELIVERY" }, 404);

    let finalTitle = titleZh;
    let finalContent = sourceContent;
    let deliveryLocale: "zh-CN" | "en" | "km" = "zh-CN";
    let translationSource = "chinese";
    let fallback = false;

    if (requestedLocale !== "zh-CN") {
      const localizedContent = localized
        ? buildDelivery(
          localized.title,
          localized.summary,
          localized.detail,
          text(order.customer_question),
          selections,
        )
        : "";
      if (localized && validLocalizedContent(requestedLocale, localizedContent)) {
        finalTitle = localized.title;
        finalContent = localizedContent;
        deliveryLocale = requestedLocale;
        translationSource = "answer_fields";
      } else if (!allowChineseFallback) {
        const translated = await getTranslation(
          db,
          supabaseUrl,
          serviceKey,
          order.id,
          requestedLocale,
          sourceContent,
        );
        if (translated?.status === "failed") {
          console.warn("[GYX delivery] translation failed", {
            order_id: order.id,
            locale: requestedLocale,
            error: translated.error,
          });
          return json({
            ok: false,
            error: "DELIVERY_PREPARATION_FAILED",
            status: "failed",
            delivery_locale: requestedLocale,
          });
        }
        if (translated?.status !== "ready" || !translated?.content) {
          return json({
            ok: false,
            error: "DELIVERY_PREPARING",
            status: translated?.status || "processing",
            completed_chunks: translated?.completed_chunks || 0,
            chunk_count: translated?.chunk_count || 0,
            delivery_locale: requestedLocale,
          }, 202);
        }
        finalContent = text(translated.content);
        finalTitle = text(finalContent.split("\n").find((line: string) => line.trim())) || titleZh;
        deliveryLocale = requestedLocale;
        translationSource = "order_cache";
      } else {
        fallback = true;
        console.warn("[GYX delivery] missing translation; fallback=zh", {
          order_id: order.id,
          requested_locale: requestedLocale,
        });
      }
    }

    const completedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await db
      .from("orders")
      .update({ delivery_downloaded_at: completedAt, updated_at: completedAt })
      .eq("id", order.id)
      .eq("user_id", userId)
      .is("delivery_downloaded_at", null)
      .select("id,delivery_downloaded_at")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return json({ ok: false, error: "DOWNLOAD_ALREADY_COMPLETED" }, 409);

    return json({
      ok: true,
      order_no: order.order_no,
      title: finalTitle,
      content: finalContent,
      requested_locale: requestedLocale,
      delivery_locale: deliveryLocale,
      translation_source: translationSource,
      fallback,
      completed_at: claimed.delivery_downloaded_at,
    });
  } catch (error) {
    console.error("[GYX delivery] claim failed", error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});
