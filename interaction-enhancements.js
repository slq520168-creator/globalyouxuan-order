(() => {
  'use strict';

  // 恢复原来的搜索节奏：用户停止输入约3.5秒后，自动开始搜索。
  // 每继续输入一个字都会重新计时；手动点搜索按钮仍可立即搜索。
  function restoreSearchIdleAutoSubmit() {
    const form = document.getElementById('problemForm');
    const input = document.getElementById('problemInput');
    const button = document.getElementById('startMatchButton');
    if (!form || !input || !button || input.dataset.gyxIdleSearchBound === '1') return;
    input.dataset.gyxIdleSearchBound = '1';

    let idleTimer = null;
    let composing = false;

    const clearIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
    };

    const scheduleAutoSearch = () => {
      clearIdle();
      if (composing) return;
      const value = String(input.value || '').trim();
      if (value.length < 2) return;

      idleTimer = setTimeout(() => {
        idleTimer = null;
        const latest = String(input.value || '').trim();
        if (latest.length < 2 || composing) return;
        form.requestSubmit(button);
      }, 3500);
    };

    input.addEventListener('compositionstart', () => {
      composing = true;
      clearIdle();
    });

    input.addEventListener('compositionend', () => {
      composing = false;
      scheduleAutoSearch();
    });

    input.addEventListener('input', scheduleAutoSearch);

    // 手动提交时取消自动计时，避免3.5秒后重复搜索。
    form.addEventListener('submit', () => {
      clearIdle();
    }, true);
  }

  function loadTypingEffectOnly() {
    if (window.__gyxTypingEffectLoader) return;
    window.__gyxTypingEffectLoader = true;
    const script = document.createElement('script');
    script.src = 'typing-effect.js?v=20260807-sequential-lock-3';
    script.async = false;
    script.onerror = () => console.error('Typing effect failed to load');
    document.body.appendChild(script);
  }

  function init() {
    restoreSearchIdleAutoSubmit();
    loadTypingEffectOnly();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();