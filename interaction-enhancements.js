(() => {
  'use strict';

  // ai-search.js 已由 shop.html 唯一加载。
  // 本文件只加载打字效果，禁止再次加载搜索控制器，避免五轮流程重复执行。
  function loadScriptOnce(key, src, done) {
    if (window[key]) {
      done?.();
      return;
    }
    window[key] = true;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => done?.();
    script.onerror = () => console.error('Script failed to load:', src);
    document.body.appendChild(script);
  }

  function init() {
    loadScriptOnce('__gyxTypingEffectLoader', 'typing-effect.js?v=20260808-sequential-lock-5');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();