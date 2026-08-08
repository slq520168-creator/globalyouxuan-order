(() => {
  'use strict';

  const form = document.getElementById('problemForm');
  const input = document.getElementById('problemInput');
  const button = document.getElementById('startMatchButton');
  const result = document.getElementById('resultPanel');
  const actions = document.querySelector('#resultPanel .result-actions');
  if (!form || !input || !button) return;

  if (!document.getElementById('gyx-search-full-visibility')) {
    const style = document.createElement('style');
    style.id = 'gyx-search-full-visibility';
    style.textContent = `
      .home-page #quizPanel.search-popover,
      .home-page #resultPanel.search-popover {max-height:none!important;height:auto!important;overflow:visible!important;overscroll-behavior:auto!important}
      .home-page #quizOptions,.home-page .quiz-options {max-height:none!important;height:auto!important;overflow:visible!important}
    `;
    document.head.appendChild(style);
  }

  let autoTimer = null;
  let autoSubmitting = false;
  function cancelAuto(){if(autoTimer)clearTimeout(autoTimer);autoTimer=null}
  function submitNow(){const value=String(input.value||'').trim();if(value.length<2)return;cancelAuto();autoSubmitting=true;try{form.requestSubmit(button)}finally{setTimeout(()=>{autoSubmitting=false},0)}}

  // 搜索模块只负责“停止输入4秒后开始搜索”；全站键盘收起由 core-foundation.js 唯一负责。
  input.addEventListener('input',()=>{cancelAuto();const value=String(input.value||'').trim();if(value.length<2)return;autoTimer=setTimeout(submitNow,4000)});
  button.addEventListener('click',()=>cancelAuto(),true);
  form.addEventListener('submit',()=>cancelAuto(),true);

  if (!window.__gyxTypingEffectLoader) {
    window.__gyxTypingEffectLoader = true;
    const script = document.createElement('script');
    script.src = 'typing-effect.js?v=20260808-human-typing-2';
    script.async = false;
    script.onerror = () => console.error('Typing effect failed to load');
    document.body.appendChild(script);
  }

  if (result) {
    let cleared = false;
    const clearOnce = () => {
      if (result.classList.contains('hidden')) {cleared=false;return}
      if (cleared) return;
      const ready = actions && actions.offsetParent !== null;
      if (!ready) return;
      input.value='';
      cleared=true;
    };
    const observer=new MutationObserver(()=>requestAnimationFrame(clearOnce));
    observer.observe(result,{attributes:true,attributeFilter:['class'],subtree:true,childList:true});
    if(actions)observer.observe(actions,{attributes:true,subtree:true,childList:true});
    clearOnce();
  }
})();