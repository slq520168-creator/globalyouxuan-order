(() => {
  'use strict';

  // 密码恢复链接必须先进入重置页，再让 Supabase SDK 解析。
  // 否则 detectSessionInUrl 可能先在首页消费恢复参数，导致用户直接停留首页，无法设置新密码。
  const currentPath = (window.location.pathname || '').toLowerCase();
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const recoveryLink =
    /(?:[?&#])(type=recovery|token_hash=|access_token=|refresh_token=|code=)/i.test(search + hash);

  if (!currentPath.includes('reset-password') && recoveryLink) {
    const target = new URL('reset-password.html', window.location.href);
    target.search = search;
    target.hash = hash;
    window.location.replace(target.toString());
    return;
  }

  const config = Object.freeze({
    url: 'https://afzcohtnljnmucrkgcaz.supabase.co',
    publishableKey: 'sb_publishable_EqF-kTNRsSZWhUE8LWB8DQ_UNkTjImv',
    wallet: 'TKfQoN7kZirALGYxMkxU4SoqMWJRqXsh7k',
    network: 'USDT-TRC20',
    support: '@qqyousubot'
  });

  // 搜索只需要公开配置，不能因为 Supabase SDK/CDN 加载失败而失效。
  window.GYX_CONFIG = config;

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase client library failed to load. Search configuration remains available.');
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
    try {
      const { data: sessionData } = await client.auth.getSession();
      const sessionUser = sessionData?.session?.user || null;
      if (!sessionUser) return null;
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

  window.gyxSupabase = client;
  window.gyxGetVerifiedUser = getVerifiedUser;
  window.gyxSafeNext = safeNext;
  window.gyxInvokeFunction = invokeFunction;
})();
