(() => {
  'use strict';

  const root = document.documentElement;
  const i18n = window.GYXI18N;
  const t = (key) => i18n?.t(key) || key;

  function storedTheme() {
    try { return localStorage.getItem('gyx_theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  }

  function setupLangCompact() {
    const rootEl = document.querySelector('[data-lang-compact]');
    if (!rootEl) return;
    const btn = rootEl.querySelector('[data-lang-toggle]');
    const menu = rootEl.querySelector('[data-lang-menu]');
    const select = document.querySelector('[data-language-select]');
    const labels = { 'zh-CN': '中', en: 'EN', km: 'ខ្មែរ' };
    const sync = () => {
      const loc = window.GYXI18N?.locale || 'zh-CN';
      if (btn) btn.textContent = labels[loc] || '中';
      if (select) select.value = loc;
    };
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !open);
      btn.setAttribute('aria-expanded', String(open));
    });
    menu?.querySelectorAll('[data-set-lang]').forEach((item) => {
      item.addEventListener('click', () => {
        const loc = item.getAttribute('data-set-lang');
        window.GYXI18N?.setLanguage(loc);
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        sync();
      });
    });
    document.addEventListener('click', () => {
      menu?.classList.add('hidden');
      btn?.setAttribute('aria-expanded', 'false');
    });
    window.addEventListener('gyx:languagechange', sync);
    sync();
  }

  function applyTheme(theme, persist = true) {
    const next = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = next;
    root.style.colorScheme = next;
    if (persist) {
      try { localStorage.setItem('gyx_theme', next); } catch {}
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
    document.querySelectorAll('[data-support-open]').forEach((button) => button.setAttribute('aria-expanded', String(open)));
    if (open) panel.querySelector('[data-support-close]')?.focus();
  }

  function applyRuntimeFixes() {
    let style = document.getElementById('gyx-runtime-fixes');
    if (!style) {
      style = document.createElement('style');
      style.id = 'gyx-runtime-fixes';
      document.head.appendChild(style);
    }
    style.textContent = `
      html{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}
      @media(max-width:960px){
        input,textarea,select,.field,.select,.textarea,.problem-input{font-size:16px!important}
        body{padding-bottom:calc(82px + env(safe-area-inset-bottom))!important}
        .mobile-bottom-nav{
          position:fixed!important;left:8px!important;right:8px!important;bottom:calc(8px + env(safe-area-inset-bottom))!important;top:auto!important;
          z-index:99999!important;width:auto!important;min-height:58px!important;margin:0!important;transform:translate3d(0,0,0)!important;
          will-change:transform!important;isolation:isolate!important;-webkit-backface-visibility:hidden!important;backface-visibility:hidden!important;
          padding:4px!important;border-radius:18px!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important
        }
        html[data-theme="dark"] .mobile-bottom-nav{background:rgba(7,19,33,.96)!important}
        html[data-theme="light"] .mobile-bottom-nav{background:rgba(244,248,255,.97)!important}
        .search-popover{max-height:min(62vh,520px)!important;overflow:auto!important;overscroll-behavior:contain}
        .quiz-options{max-height:42vh!important;overflow:auto!important;-webkit-overflow-scrolling:touch}
        .txid-row,.form-group{min-width:0!important}
        .txid-row .field,#paymentTxid,[data-order-txid]{width:100%!important;max-width:100%!important;min-width:0!important;font-size:16px!important;letter-spacing:0!important;transform:none!important}
      }
    `;

    const phone = document.getElementById('orderPhone');
    if (phone) {
      phone.required = false;
      phone.placeholder = i18n?.locale === 'zh-CN' ? '联系电话（选填）' : phone.placeholder;
      const label = document.querySelector('label[for="orderPhone"]');
      if (label && i18n?.locale === 'zh-CN') label.textContent = '电话（选填）';
    }

    const payNote = document.querySelector('.payment-note');
    if (payNote && i18n?.locale === 'zh-CN') {
      payNote.textContent = '请按显示的精确金额转账，完成后粘贴 TXID。系统会自动核对链上到账金额、收款地址和 USDT 合约；确认成功后自动处理订单，请勿重复提交。';
      payNote.removeAttribute('data-i18n');
    }
  }

  function init() {
    applyTheme(storedTheme(), false);
    applyRuntimeFixes();
    document.getElementById('themeToggle')?.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
    document.querySelectorAll('[data-support-open]').forEach((button) => button.addEventListener('click', () => setSupport(true)));
    document.querySelectorAll('[data-support-close]').forEach((button) => button.addEventListener('click', () => setSupport(false)));
    document.addEventListener('click', (event) => {
      const panel = document.getElementById('supportPanel');
      if (!panel?.classList.contains('show')) return;
      if (panel.contains(event.target) || event.target.closest?.('[data-support-open]')) return;
      setSupport(false);
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setSupport(false); });
    window.addEventListener('gyx:languagechange', () => {
      applyTheme(root.dataset.theme, false);
      applyRuntimeFixes();
    });

    const path = (location.pathname || '').toLowerCase();
    const onResetPage = path.includes('reset-password');
    if (!onResetPage) {
      const hash = location.hash || '';
      const search = location.search || '';
      const hasRecoveryParams = hash.includes('type=recovery') || hash.includes('access_token') || search.includes('type=recovery') || search.includes('code=') || search.includes('token_hash=');
      if (hasRecoveryParams && sessionStorage.getItem('gyx_reset_jump') !== '1') {
        sessionStorage.setItem('gyx_reset_jump', '1');
        location.replace('reset-password.html' + search + hash);
        return;
      }
      window.gyxSupabase?.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' && sessionStorage.getItem('gyx_reset_jump') !== '1') {
          sessionStorage.setItem('gyx_reset_jump', '1');
          location.replace('reset-password.html');
        }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { init(); setupLangCompact(); });
  else { init(); setupLangCompact(); }
  window.GYXUI = { applyTheme, setSupport };
})();