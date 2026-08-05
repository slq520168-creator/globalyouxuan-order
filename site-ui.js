(() => {
  'use strict';

  const root = document.documentElement;
  const i18n = window.GYXI18N;
  const t = (key) => i18n?.t(key) || key;

  function storedTheme() {
    try { return localStorage.getItem('gyx_theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  }

  function applyTheme(theme, persist = true) {
    const next = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = next;
    root.style.colorScheme = next;
    if (persist) {
      try { localStorage.setItem('gyx_theme', next); } catch { /* storage may be unavailable */ }
    }
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', next === 'dark' ? '#071321' : '#f4f8ff');
    });
    const button = document.getElementById('themeToggle');
    if (button) {
      const darkNext = next === 'light';
      button.textContent = darkNext ? '☾' : '☀';
      button.title = t(darkNext ? 'themeDark' : 'themeLight');
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', String(next === 'dark'));
    }
  }

  function setSupport(open) {
    const panel = document.getElementById('supportPanel');
    if (!panel) return;
    panel.classList.toggle('show', open);
    panel.setAttribute('aria-hidden', String(!open));
    document.querySelectorAll('[data-support-open]').forEach((button) => {
      button.setAttribute('aria-expanded', String(open));
    });
    if (open) panel.querySelector('[data-support-close]')?.focus();
  }

  function applyRuntimeFixes() {
    const style = document.createElement('style');
    style.id = 'gyx-runtime-fixes';
    style.textContent = `
      .mobile-bottom-nav{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;z-index:9999!important;margin:0!important;transform:none!important;padding-bottom:env(safe-area-inset-bottom)!important;background:color-mix(in srgb,var(--surface,#fff) 94%,transparent)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      html[data-theme="dark"] .mobile-bottom-nav{background:rgba(7,19,33,.94)!important}
      html[data-theme="light"] .mobile-bottom-nav{background:rgba(244,248,255,.96)!important}
      @media(max-width:760px){body{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}.search-popover{max-height:min(62vh,520px)!important;overflow:auto!important;overscroll-behavior:contain}.quiz-options{max-height:38vh!important;overflow:auto!important}}
    `;
    document.head.appendChild(style);

    const phone = document.getElementById('orderPhone');
    if (phone) {
      phone.required = false;
      phone.placeholder = i18n?.locale === 'zh-CN' ? '联系电话（选填）' : phone.placeholder;
      const label = document.querySelector('label[for="orderPhone"]');
      if (label && i18n?.locale === 'zh-CN') label.textContent = '电话（选填）';
    }

    const payNote = document.querySelector('.payment-note');
    if (payNote && i18n?.locale === 'zh-CN') {
      payNote.textContent = '请按显示的精确金额转账，完成后粘贴 TXID。系统将自动核验链上交易，预计 3～15 分钟完成确认；确认成功后自动处理订单，请勿重复提交。';
      payNote.removeAttribute('data-i18n');
    }
  }

  function init() {
    applyTheme(storedTheme(), false);
    applyRuntimeFixes();
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
    document.querySelectorAll('[data-support-open]').forEach((button) => {
      button.addEventListener('click', () => setSupport(true));
    });
    document.querySelectorAll('[data-support-close]').forEach((button) => {
      button.addEventListener('click', () => setSupport(false));
    });
    document.addEventListener('click', (event) => {
      const panel = document.getElementById('supportPanel');
      if (!panel?.classList.contains('show')) return;
      if (panel.contains(event.target) || event.target.closest?.('[data-support-open]')) return;
      setSupport(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setSupport(false);
    });
    window.addEventListener('gyx:languagechange', () => {
      applyTheme(root.dataset.theme, false);
      const phone = document.getElementById('orderPhone');
      if (phone && i18n?.locale === 'zh-CN') phone.placeholder = '联系电话（选填）';
    });
    // 密码重置：令牌可能落在首页，强制转到重置页
    const goResetIfNeeded = (event) => {
      const path = location.pathname || '';
      if (path.endsWith('/reset-password.html') || path.endsWith('reset-password.html')) return;
      const hash = location.hash || '';
      const search = location.search || '';
      const hasRecovery =
        event === 'PASSWORD_RECOVERY' ||
        hash.includes('type=recovery') ||
        hash.includes('access_token') ||
        search.includes('type=recovery');
      if (hasRecovery) {
        location.replace('reset-password.html' + hash + search);
      }
    };
    window.gyxSupabase?.auth.onAuthStateChange((event) => {
      goResetIfNeeded(event);
    });
    // 页面加载时也检查一次（避免事件已错过）
    goResetIfNeeded(null);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.GYXUI = { applyTheme, setSupport };
})();
