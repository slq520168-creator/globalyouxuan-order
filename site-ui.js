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

  function init() {
    applyTheme(storedTheme(), false);
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
    window.addEventListener('gyx:languagechange', () => applyTheme(root.dataset.theme, false));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.GYXUI = { applyTheme, setSupport };
})();
