(() => {
  'use strict';

  const form = document.getElementById('problemForm');
  const input = document.getElementById('problemInput');
  const button = document.getElementById('startMatchButton');
  const result = document.getElementById('resultPanel');
  const actions = document.querySelector('#resultPanel .result-actions');

  if (!document.getElementById('gyx-support-ai-style')) {
    const s=document.createElement('style');s.id='gyx-support-ai-style';s.textContent=`
      #supportPanel .support-ai-list{display:flex;flex-direction:column;gap:12px;max-height:52vh;overflow:auto;padding:8px 0 12px}
      #supportPanel .support-ai-msg{padding:10px 12px;border-radius:14px;background:rgba(30,120,255,.08);line-height:1.55}
      #supportPanel .support-ai-msg.user{margin-left:34px;background:rgba(30,120,255,.15)}
      #supportPanel .support-ai-msg.assistant{margin-right:20px}
      #supportPanel .support-ai-msg b{display:block;font-size:12px;margin-bottom:4px;opacity:.65}
      #supportPanel .support-ai-form{display:flex;gap:8px;align-items:flex-end;margin-top:10px}
      #supportPanel .support-ai-input{flex:1;min-height:72px;max-height:140px;resize:vertical;border:1px solid rgba(110,150,210,.32);border-radius:14px;padding:12px;background:transparent;color:inherit;font:inherit}
      #supportPanel .support-ai-send{min-width:72px;height:44px;border:0;border-radius:12px;background:#2878f0;color:#fff;font-weight:700}
    `;document.head.appendChild(s);
  }

  const supportPanel=document.getElementById('supportPanel');
  if(supportPanel&&!supportPanel.dataset.aiReady){
    supportPanel.dataset.aiReady='1';
    supportPanel.innerHTML='<button class="support-close" type="button" data-support-close>×</button><p class="eyebrow">在线客服</p><h2>有什么问题直接告诉我</h2><div id="supportAiList" class="support-ai-list"><div class="support-ai-msg assistant"><b>在线客服</b><div>你好，请描述你遇到的问题。</div></div></div><form id="supportAiForm" class="support-ai-form"><textarea id="supportAiInput" class="support-ai-input" rows="2" placeholder="例如：付款后找不到资料、链接打不开、不会操作…"></textarea><button id="supportAiSend" class="support-ai-send" type="submit">发送</button></form>';
    const script=document.createElement('script');script.src='support-ai.js?v=20260809-1';script.defer=true;document.body.appendChild(script);
    supportPanel.querySelector('[data-support-close]')?.addEventListener('click',()=>{supportPanel.classList.remove('open');supportPanel.setAttribute('aria-hidden','true')});
  }

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