(() => {
  'use strict';

  function restoreExactSearchDelay() {
    const form = document.getElementById('problemForm');
    const input = document.getElementById('problemInput');
    const button = document.getElementById('startMatchButton');
    if (!form || !input || !button || input.dataset.gyxExactDelay === '1') return;
    input.dataset.gyxExactDelay = '1';

    let timer = null;
    let composing = false;
    let lastValue = '';

    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const schedule = () => {
      cancel();
      if (composing) return;
      const value = String(input.value || '').trim();
      lastValue = value;
      if (value.length < 2) return;

      timer = setTimeout(() => {
        timer = null;
        const latest = String(input.value || '').trim();
        if (composing || latest.length < 2 || latest !== lastValue) return;
        if (typeof form.requestSubmit === 'function') form.requestSubmit(button);
        else button.click();
      }, 3500);
    };

    // 关键修复：旧 order.js 内还有“停止输入1秒就搜索”的监听。
    // 这里在捕获阶段拦截 input，让旧1秒监听收不到事件，只保留本脚本的3.5秒计时。
    input.addEventListener('input', (event) => {
      event.stopImmediatePropagation();
      schedule();
    }, true);

    input.addEventListener('compositionstart', () => {
      composing = true;
      cancel();
    }, true);

    input.addEventListener('compositionend', (event) => {
      composing = false;
      event.stopImmediatePropagation();
      schedule();
    }, true);

    // 手动点搜索仍立即执行，并取消自动倒计时。
    button.addEventListener('click', cancel, true);
    form.addEventListener('submit', cancel, true);
  }

  function loadTypingEffectOnly() {
    if (window.__gyxTypingEffectLoader) return;
    window.__gyxTypingEffectLoader = true;
    const script = document.createElement('script');
    script.src = 'typing-effect.js?v=20260807-sequential-lock-4';
    script.async = false;
    script.onerror = () => console.error('Typing effect failed to load');
    document.body.appendChild(script);
  }

  function init() {
    restoreExactSearchDelay();
    loadTypingEffectOnly();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();