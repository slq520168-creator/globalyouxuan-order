(() => {
  'use strict';

  const form = document.getElementById('problemForm');
  const input = document.getElementById('problemInput');
  const button = document.getElementById('startMatchButton');
  const result = document.getElementById('resultPanel');
  const actions = document.querySelector('#resultPanel .result-actions');
  if (!form || !input || !button) return;

  let autoTimer = null;
  let autoSubmitting = false;

  function cancelAuto() {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
  }

  function submitNow() {
    const value = String(input.value || '').trim();
    if (value.length < 2) return;
    cancelAuto();
    try { input.blur(); } catch {}
    autoSubmitting = true;
    try {
      form.requestSubmit(button);
    } finally {
      setTimeout(() => { autoSubmitting = false; }, 0);
    }
  }

  // 停止输入4秒：自动关闭键盘并开始搜索。
  input.addEventListener('input', () => {
    cancelAuto();
    const value = String(input.value || '').trim();
    if (value.length < 2) return;
    autoTimer = setTimeout(submitNow, 4000);
  });

  // 点击放大镜：立即搜索，不等待4秒。
  button.addEventListener('click', () => {
    cancelAuto();
  }, true);

  // 手动提交时取消自动计时；不拦截原搜索程序的 submit 事件。
  form.addEventListener('submit', () => {
    cancelAuto();
    if (!autoSubmitting) {
      try { input.blur(); } catch {}
    }
  }, true);

  // 最终方案完整显示后清空搜索框，保留原有行为。
  if (result) {
    let cleared = false;
    const clearOnce = () => {
      if (result.classList.contains('hidden')) {
        cleared = false;
        return;
      }
      if (cleared) return;
      const ready = actions && actions.offsetParent !== null;
      if (!ready) return;
      input.value = '';
      try { input.blur(); } catch {}
      cleared = true;
    };
    const observer = new MutationObserver(() => requestAnimationFrame(clearOnce));
    observer.observe(result, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
    if (actions) observer.observe(actions, { attributes: true, subtree: true, childList: true });
    clearOnce();
  }
})();