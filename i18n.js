(() => {
  'use strict';
  // Compatibility shim only. All visible-language rendering is owned by global-locale.js.
  // This file intentionally contains no translation dictionary and no DOM mutation logic.
  const VALID = new Set(['zh-CN', 'en', 'km']);
  const getLocale = () => {
    try {
      const value = localStorage.getItem('gyx_locale');
      return VALID.has(value) ? value : 'zh-CN';
    } catch {
      return 'zh-CN';
    }
  };
  window.GYXI18N = {
    get locale() { return window.GYXLocale?.get?.() || getLocale(); },
    setLanguage(locale) {
      if (VALID.has(locale)) window.GYXLocale?.set?.(locale);
    },
    t(key, fallback = '') { return fallback || key || ''; },
    apply() { window.GYXLocale?.apply?.(); }
  };
})();
