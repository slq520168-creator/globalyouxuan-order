(() => {
  'use strict';

  // 搜索逻辑由 ai-search.js 单独接管；其它页面功能仍由原 order.js 负责。
  // 这里仅按顺序加载：AI搜索控制器 → 原顺序打字效果。
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
    loadScriptOnce('__gyxAiSearchLoader', 'ai-search.js?v=20260807-ai-search-1', () => {
      loadScriptOnce('__gyxTypingEffectLoader', 'typing-effect.js?v=20260807-sequential-lock-4');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();