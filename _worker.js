const CONFIG = {
  walletAddress: "TKfQoN7kZirALGYxMkxU4SoqMWJRqXsh7k",
  network: "TRC20",
  deliveryUrl: "https://globalyouxuan-order.pages.dev/#delivery",
  adminTelegram: "@qqyousu"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === "/api/health") {
        return json({
          ok: true,
          service: "GlobalYouXuan API",
          wallet: CONFIG.walletAddress,
          network: CONFIG.network
        }, 200, corsHeaders);
      }

      if (url.pathname === "/api/create-order" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));

        const product = body.product || "GlobalYouXuan 测试资料";
        const baseAmount = Number(body.amount || 5);

        if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
          return json({ ok: false, message: "金额错误" }, 400, corsHeaders);
        }

        const orderId = createOrderId();
        const uniqueTail = Math.floor(Math.random() * 89 + 10) / 100;
        const payableAmount = Number((baseAmount + uniqueTail).toFixed(2));
        const expiresAt = Date.now() + 15 * 60 * 1000;

        const order = {
          ok: true,
          orderId,
          product,
          network: CONFIG.network,
          walletAddress: CONFIG.walletAddress,
          amount: payableAmount,
          expiresAt,
          status: "pending"
        };

        await notifyTelegram(env, [
          "🛒 GlobalYouXuan 新订单",
          `订单号：${orderId}`,
          `商品：${product}`,
          `应付：${payableAmount} USDT`,
          `网络：${CONFIG.network}`,
          "状态：等待付款"
        ].join("\n"));

        return json(order, 200, corsHeaders);
      }

      if (url.pathname === "/api/payment-submitted" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));

        if (!body.orderId) {
          return json({
            ok: false,
            message: "缺少订单号"
          }, 400, corsHeaders);
        }

        await notifyTelegram(env, [
          "💰 客户提交付款",
          `订单号：${body.orderId}`,
          `金额：${body.amount || "未填写"} USDT`,
          `客户联系方式：${body.contact || "未填写"}`,
          "请核对 TRC20 钱包到账记录。"
        ].join("\n"));

        return json({
          ok: true,
          status: "checking",
          message: "付款信息已提交，正在核对到账。"
        }, 200, corsHeaders);
      }

      if (url.pathname === "/api/delivery") {
        return json({
          ok: true,
          status: "paid",
          deliveryUrl: CONFIG.deliveryUrl,
          message: "付款确认后发送交付链接。"
        }, 200, corsHeaders);
      }

      if (url.pathname.startsWith("/api/")) {
        return json({
          ok: false,
          message: "接口不存在"
        }, 404, corsHeaders);
      }

      return env.ASSETS.fetch(request);

    } catch (error) {
      return json({
        ok: false,
        message: "服务器错误",
        error: String(error.message || error)
      }, 500, corsHeaders);
    }
  }
};

function createOrderId() {
  const now = new Date();
  const date =
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `GYX-${date}-${random}`;
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
        text
      })
    }
  );

  return response.json();
}

function json(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}