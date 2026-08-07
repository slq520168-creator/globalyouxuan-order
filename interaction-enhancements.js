(() => {
  'use strict';

  // 只恢复原来的逐字打字视觉效果。
  // 不加载任何 AI 动态决策脚本，不改 order.js 的五轮、结果页、下单和付款链路。
  function loadTypingEffectOnly() {
    if (window.__gyxTypingEffectLoader) return;
    window.__gyxTypingEffectLoader = true;

    const script = document.createElement('script');
    script.src = 'typing-effect.js?v=20260807-sequential';
    script.async = false;
    script.onerror = () => console.error('Typing effect failed to load');
    document.body.appendChild(script);
  }

  if (document.readyState === 'complete') loadTypingEffectOnly();
  else window.addEventListener('load', loadTypingEffectOnly, { once: true });
})();