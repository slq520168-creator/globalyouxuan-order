(() => {
  'use strict';

  // 搜索提交恢复为约3.5秒后自动开始。
  // 只控制启动节奏，不改 order.js 的匹配、五轮、下单与付款逻辑。
  function restoreSearchDelay() {
    const form = document.getElementById('problemForm');
    const input = document.getElementById('problemInput');
    const button = document.getElementById('startMatchButton');
    if (!form || !input || !button || form.dataset.gyxDelayBound === '1') return;
    form.dataset.gyxDelayBound = '1';

    let releasing = false;
    let timer = null;

    form.addEventListener('submit', (event) => {
      if (releasing) {
        releasing = false;
        return;
      }
      const value = String(input.value || '').trim();
      if (value.length < 2) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      clearTimeout(timer);
      button.disabled = true;

      timer = setTimeout(() => {
        releasing = true;
        button.disabled = false;
        form.requestSubmit(button);
      }, 3500);
    }, true);
  }

  function loadTypingEffectOnly() {
    if (window.__gyxTypingEffectLoader) return;
    window.__gyxTypingEffectLoader = true;
    const script = document.createElement('script');
    script.src = 'typing-effect.js?v=20260807-sequential-result';
    script.async = false;
    script.onerror = () => console.error('Typing effect failed to load');
    document.body.appendChild(script);
  }

  function init() {
    restoreSearchDelay();
    loadTypingEffectOnly();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();