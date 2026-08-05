(() => {
  'use strict';

  const config = Object.freeze({
    url: 'https://afzcohtnljnmucrkgcaz.supabase.co',
    publishableKey: 'sb_publishable_EqF-kTNRsSZWhUE8LWB8DQ_UNkTjImv',
    wallet: 'TKfQoN7kZirALGYxMkxU4SoqMWJRqXsh7k',
    network: 'USDT-TRC20',
    support: '@qqyousubot'
  });

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase client library failed to load.');
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit'
    }
  });

  async function getVerifiedUser() {
    // 先读本地会话，避免网络抖动把已登录用户踢出
    try {
      const { data: sessionData } = await client.auth.getSession();
      const sessionUser = sessionData?.session?.user || null;
      if (!sessionUser) return null;

      // 再尝试服务端校验；失败时仍保留本地会话用户
      try {
        const { data, error } = await client.auth.getUser();
        if (!error && data?.user) return data.user;
      } catch (e) {}
      return sessionUser;
    } catch (e) {
      return null;
    }
  }

  function safeNext(value, fallback = 'member.html') {
    if (!value) return fallback;
    try {
      const decoded = decodeURIComponent(String(value));
      const target = new URL(decoded, window.location.href);
      if (target.origin !== window.location.origin) return fallback;
      const filename = target.pathname.split('/').pop() || '';
      const allowed = new Set(['shop.html', 'member.html', 'knowledge.html', 'index.html']);
      if (!allowed.has(filename)) return fallback;
      return filename + target.search + target.hash;
    } catch {
      return fallback;
    }
  }

  async function invokeFunction(name, body) {
    const { data, error } = await client.functions.invoke(name, { body });
    if (!error) return data;

    let code = '';
    try {
      const payload = await error.context?.clone?.().json();
      code = payload?.error || payload?.message || '';
    } catch {
      code = '';
    }
    const wrapped = new Error(code || error.message || 'FUNCTION_REQUEST_FAILED');
    wrapped.code = code || 'FUNCTION_REQUEST_FAILED';
    throw wrapped;
  }

  window.GYX_CONFIG = config;
  window.gyxSupabase = client;
  window.gyxGetVerifiedUser = getVerifiedUser;
  window.gyxSafeNext = safeNext;
  window.gyxInvokeFunction = invokeFunction;
})();
