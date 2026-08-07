(() => {
  'use strict';
  // 搜索、五轮候选与最终方案的逐条打字，统一只由 ai-search.js 控制。
  // 本文件不修改候选区高度、结果区高度、导航位置、滚动位置或打字速度。
  // 只做一个独立动作：最终方案完整显示后，清空首页搜索框。
  const input = document.getElementById('problemInput');
  const result = document.getElementById('resultPanel');
  const actions = document.querySelector('#resultPanel .result-actions');
  if (!input || !result) return;

  let cleared = false;
  const clearOnce = () => {
    if (result.classList.contains('hidden')) {
      cleared = false;
      return;
    }
    if (cleared) return;
    // 等结果操作区真正可见，代表最终方案主体已经生成完成。
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
})();