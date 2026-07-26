const CONFIG = {
  walletAddress: "TKfQoN7kZirALGYxMkxU4SoqMWJRqXsh7k",
  network: "TRC20",

  // 付款确认后才会返回此链接
  deliveryUrl: "https://globalyouxuan-order.pages.dev/#delivery",

  adminTelegram: "@qqyousu",

  // 订单有效期：15分钟
  orderExpireMinutes: 15,

  // 付款提交后，订单最多保留7天
  orderRetentionSeconds: 7 * 24 * 60 * 60
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      // API运行检测
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json(
          {
            ok: true,
            service: "GlobalYouXuan API V2",
            network: CONFIG.network,
            walletAddress: CONFIG.walletAddress,
            orderStorage: Boolean(env.ORDERS),
            telegramConfigured: Boolean(
              env.TELEGRAM_BOT_TOKEN &&
              env.TELEGRAM_CHAT_ID
            )
          },
          200,
          corsHeaders
        );
      }

      // 创建订单
      if (
        url.pathname === "/api/create-order" &&
        request.method === "POST"
      ) {
        requireOrderStorage(env);

        const body = await readJson(request);

        const product = cleanText(
          body.product || "GlobalYouXuan 数字资料",
          100
        );

        const baseAmount = Number(body.amount);

        if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
          return json(
            {
              ok: false,
              message: "金额错误"
            },
            400,
            corsHeaders
          );
        }

        if (baseAmount > 100000) {
          return json(
            {
              ok: false,
              message: "金额超过允许范围"
            },
            400,
            corsHeaders
          );
        }

        const orderId = createOrderId();

        // 生成0.01至0.99的随机尾数，减少同金额订单混淆
        const uniqueTail = cryptoRandomInt(1, 99) / 100;
        const payableAmount = Number(
          (baseAmount + uniqueTail).toFixed(2)
        );

        const createdAt = Date.now();
        const expiresAt =
          createdAt +
          CONFIG.orderExpireMinutes * 60 * 1000;

        const order = {
          orderId,
          product,
          baseAmount,
          payableAmount,
          network: CONFIG.network,
          walletAddress: CONFIG.walletAddress,
          createdAt,
          expiresAt,
          status: "pending",
          contact: "",
          transactionHash: "",
          paymentSubmittedAt: null,
          paidAt: null,
          deliveredAt: null
        };

        await saveOrder(env, order);

        await safeNotifyTelegram(
          env,
          [
            "🛒 GlobalYouXuan 新订单",
            `订单号：${orderId}`,
            `商品：${product}`,
            `基础金额：${baseAmount.toFixed(2)} USDT`,
            `应付金额：${payableAmount.toFixed(2)} USDT`,
            `网络：${CONFIG.network}`,
            `收款地址：${CONFIG.walletAddress}`,
            "状态：等待付款"
          ].join("\n")
        );

        return json(
          {
            ok: true,
            orderId,
            product,
            network: CONFIG.network,
            walletAddress: CONFIG.walletAddress,
            amount: payableAmount,
            expiresAt,
            status: "pending"
          },
          201,
          corsHeaders
        );
      }

      // 客户提交付款信息
      if (
        url.pathname === "/api/payment-submitted" &&
        request.method === "POST"
      ) {
        requireOrderStorage(env);

        const body = await readJson(request);
        const orderId = cleanOrderId(body.orderId);

        if (!orderId) {
          return json(
            {
              ok: false,
              message: "缺少或无效的订单号"
            },
            400,
            corsHeaders
          );
        }

        const order = await getOrder(env, orderId);

        if (!order) {
          return json(
            {
              ok: false,
              message: "订单不存在"
            },
            404,
            corsHeaders
          );
        }

        if (order.status === "paid") {
          return json(
            {
              ok: true,
              orderId,
              status: "paid",
              message: "该订单已确认到账"
            },
            200,
            corsHeaders
          );
        }

        if (
          Date.now() > order.expiresAt &&
          order.status === "pending"
        ) {
          order.status = "expired";
          await saveOrder(env, order);

          return json(
            {
              ok: false,
              orderId,
              status: "expired",
              message: "订单已过期，请重新创建订单"
            },
            410,
            corsHeaders
          );
        }

        const contact = cleanText(body.contact || "", 100);
        const transactionHash = cleanText(
          body.transactionHash ||
            body.txid ||
            body.hash ||
            "",
          150
        );

        order.contact = contact;
        order.transactionHash = transactionHash;
        order.paymentSubmittedAt = Date.now();
        order.status = "checking";

        await saveOrder(env, order);

        await safeNotifyTelegram(
          env,
          [
            "💰 客户提交付款",
            `订单号：${order.orderId}`,
            `商品：${order.product}`,
            `应付金额：${order.payableAmount.toFixed(2)} USDT`,
            `客户填写金额：${
              body.amount
                ? cleanText(String(body.amount), 30)
                : "未填写"
            } USDT`,
            `客户联系方式：${contact || "未填写"}`,
            `交易哈希：${transactionHash || "未填写"}`,
            `网络：${order.network}`,
            "状态：等待管理员核对到账"
          ].join("\n")
        );

        return json(
          {
            ok: true,
            orderId: order.orderId,
            status: "checking",
            message: "付款信息已提交，正在核对到账"
          },
          200,
          corsHeaders
        );
      }

      // 查询订单状态
      if (
        url.pathname === "/api/order-status" &&
        request.method === "GET"
      ) {
        requireOrderStorage(env);

        const orderId = cleanOrderId(
          url.searchParams.get("orderId")
        );

        if (!orderId) {
          return json(
            {
              ok: false,
              message: "缺少订单号"
            },
            400,
            corsHeaders
          );
        }

        const order = await getOrder(env, orderId);

        if (!order) {
          return json(
            {
              ok: false,
              message: "订单不存在"
            },
            404,
            corsHeaders
          );
        }

        if (
          Date.now() > order.expiresAt &&
          order.status === "pending"
        ) {
          order.status = "expired";
          await saveOrder(env, order);
        }

        return json(
          {
            ok: true,
            orderId: order.orderId,
            product: order.product,
            amount: order.payableAmount,
            network: order.network,
            status: order.status,
            expiresAt: order.expiresAt,
            paidAt: order.paidAt
          },
          200,
          corsHeaders
        );
      }

      // 管理员确认到账
      if (
        url.pathname === "/api/admin/confirm-payment" &&
        request.method === "POST"
      ) {
        requireOrderStorage(env);
        requireAdmin(request, env);

        const body = await readJson(request);
        const orderId = cleanOrderId(body.orderId);

        if (!orderId) {
          return json(
            {
              ok: false,
              message: "缺少订单号"
            },
            400,
            corsHeaders
          );
        }

        const order = await getOrder(env, orderId);

        if (!order) {
          return json(
            {
              ok: false,
              message: "订单不存在"
            },
            404,
            corsHeaders
          );
        }

        order.status = "paid";
        order.paidAt = Date.now();

        if (body.transactionHash || body.txid) {
          order.transactionHash = cleanText(
            body.transactionHash || body.txid,
            150
          );
        }

        await saveOrder(env, order);

        await safeNotifyTelegram(
          env,
          [
            "✅ 管理员已确认到账",
            `订单号：${order.orderId}`,
            `商品：${order.product}`,
            `金额：${order.payableAmount.toFixed(2)} USDT`,
            "状态：已付款，可以交付"
          ].join("\n")
        );

        return json(
          {
            ok: true,
            orderId: order.orderId,
            status: "paid",
            message: "付款已确认"
          },
          200,
          corsHeaders
        );
      }

      // 获取交付链接
      if (
        url.pathname === "/api/delivery" &&
        request.method === "GET"
      ) {
        requireOrderStorage(env);

        const orderId = cleanOrderId(
          url.searchParams.get("orderId")
        );

        if (!orderId) {
          return json(
            {
              ok: false,
              message: "缺少订单号"
            },
            400,
            corsHeaders
          );
        }

        const order = await getOrder(env, orderId);

        if (!order) {
          return json(
            {
              ok: false,
              message: "订单不存在"
            },
            404,
            corsHeaders
          );
        }

        if (order.status !== "paid") {
          return json(
            {
              ok: false,
              orderId,
              status: order.status,
              message:
                order.status === "checking"
                  ? "付款正在核对，请稍后刷新"
                  : "订单尚未确认付款"
            },
            403,
            corsHeaders
          );
        }

        if (!order.deliveredAt) {
          order.deliveredAt = Date.now();
          await saveOrder(env, order);

          await safeNotifyTelegram(
            env,
            [
              "📦 客户已获取交付链接",
              `订单号：${order.orderId}`,
              `商品：${order.product}`,
              `交付时间：${new Date(
                order.deliveredAt
              ).toISOString()}`
            ].join("\n")
          );
        }

        return json(
          {
            ok: true,
            orderId: order.orderId,
            status: "paid",
            deliveryUrl: CONFIG.deliveryUrl,
            message: "付款已确认，交付链接已开放"
          },
          200,
          corsHeaders
        );
      }

      if (url.pathname.startsWith("/api/")) {
        return json(
          {
            ok: false,
            message: "接口不存在"
          },
          404,
          corsHeaders
        );
      }

      if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
        return env.ASSETS.fetch(request);
      }

      return new Response("GlobalYouXuan API V2", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      });
    } catch (error) {
      const message = String(
        error?.message || error || "未知错误"
      );

      const status =
        message === "UNAUTHORIZED"
          ? 401
          : message === "ORDER_STORAGE_NOT_CONFIGURED"
          ? 503
          : 500;

      const publicMessage =
        status === 401
          ? "管理员验证失败"
          : status === 503
          ? "订单存储尚未配置"
          : "服务器错误";

      return json(
        {
          ok: false,
          message: publicMessage
        },
        status,
        corsHeaders
      );
    }
  }
};

function getCorsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin");
  const allowedOrigin =
    env.ALLOWED_ORIGIN ||
    "https://globalyouxuan-order.pages.dev";

  const origin =
    requestOrigin === allowedOrigin
      ? requestOrigin
      : allowedOrigin;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,Authorization,X-Admin-Secret",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

async function readJson(request) {
  const contentType =
    request.headers.get("Content-Type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("INVALID_CONTENT_TYPE");
  }

  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function requireOrderStorage(env) {
  if (!env.ORDERS) {
    throw new Error("ORDER_STORAGE_NOT_CONFIGURED");
  }
}

function requireAdmin(request, env) {
  if (!env.ADMIN_SECRET) {
    throw new Error("UNAUTHORIZED");
  }

  const suppliedSecret =
    request.headers.get("X-Admin-Secret") ||
    request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");

  if (!suppliedSecret || suppliedSecret !== env.ADMIN_SECRET) {
    throw new Error("UNAUTHORIZED");
  }
}

async function saveOrder(env, order) {
  await env.ORDERS.put(
    `order:${order.orderId}`,
    JSON.stringify(order),
    {
      expirationTtl: CONFIG.orderRetentionSeconds
    }
  );
}

async function getOrder(env, orderId) {
  const value = await env.ORDERS.get(
    `order:${orderId}`,
    "json"
  );

  return value || null;
}

function createOrderId() {
  const now = new Date();

  const date =
    now.getUTCFullYear().toString().slice(-2) +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0");

  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);

  const random = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return `GYX-${date}-${random}`;
}

function cryptoRandomInt(min, max) {
  const range = max - min + 1;
  const maxUint = 0xffffffff;
  const limit = maxUint - (maxUint % range);

  const array = new Uint32Array(1);
  let value;

  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);

  return min + (value % range);
}

function cleanOrderId(value) {
  const orderId = String(value || "")
    .trim()
    .toUpperCase();

  if (!/^GYX-\d{6}-[A-F0-9]{10}$/.test(orderId)) {
    return "";
  }

  return orderId;
}

function cleanText(value, maxLength = 100) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

async function safeNotifyTelegram(env, text) {
  try {
    return await notifyTelegram(env, text);
  } catch (error) {
    console.error(
      "Telegram通知失败：",
      String(error?.message || error)
    );

    return {
      ok: false,
      error: "Telegram通知失败"
    };
  }
}

async function notifyTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return {
      ok: false,
      skipped: true,
      reason: "Telegram变量尚未配置"
    };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true
      })
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description || "Telegram API请求失败"
    );
  }

  return result;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type":
        "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}