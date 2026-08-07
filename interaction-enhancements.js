(() => {
  'use strict';
  // 搜索与逐条打字统一由 ai-search.js 单一控制器负责。
  // 禁止再加载 typing-effect.js，否则第2-5轮和最终结果会被重复播放一次。

  const style = document.createElement('style');
  style.textContent = `
    @media (max-width:640px){
      #resultPanel.search-popover{
        max-height:min(68vh,620px)!important;
        padding:12px!important;
        scroll-margin-top:118px;
        overflow-y:auto;
        overscroll-behavior:contain;
      }
      #resultPanel h2{margin-top:8px!important;font-size:22px!important;line-height:1.35!important;}
      #resultPanel .result-summary{margin:8px 0 10px!important;line-height:1.5!important;}
      #resultPanel .result-price-row{padding:12px!important;margin:10px 0!important;}
      #resultPanel .delivery-box{padding:12px!important;margin:10px 0!important;}
      #resultPanel .delivery-box ul{margin:7px 0 0!important;}
      #resultPanel .match-details{margin:10px 0!important;}
      #resultPanel .result-actions{
        position:sticky;
        bottom:0;
        z-index:8;
        display:grid!important;
        grid-template-columns:1fr 1fr;
        gap:8px;
        padding:10px 0 4px;
        background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.96) 28%);
      }
      html[data-theme="dark"] #resultPanel .result-actions{
        background:linear-gradient(180deg,rgba(3,12,31,0),rgba(3,12,31,.98) 28%);
      }
      #resultPanel .result-actions .btn{
        min-height:46px!important;
        width:100%!important;
        margin:0!important;
      }
      #orderAnswerButton{
        display:inline-flex!important;
        visibility:visible!important;
        opacity:1!important;
      }
      #resultPanel .result-restart{
        display:block;
        width:100%;
        margin-top:6px;
        padding-bottom:4px;
      }
      .mobile-bottom-nav{
        position:fixed!important;
        left:10px!important;
        right:10px!important;
        bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;
        top:auto!important;
        width:auto!important;
        margin:0!important;
        transform:none!important;
        z-index:9999!important;
      }
      .home-page{
        padding-bottom:calc(86px + env(safe-area-inset-bottom,0px));
      }
    }
  `;
  document.head.appendChild(style);

  const resultPanel = document.getElementById('resultPanel');
  const problemInput = document.getElementById('problemInput');
  if (!resultPanel || !problemInput) return;

  let wasHidden = resultPanel.classList.contains('hidden');
  const observer = new MutationObserver(() => {
    const hidden = resultPanel.classList.contains('hidden');
    if (wasHidden && !hidden) {
      requestAnimationFrame(() => {
        const top = problemInput.getBoundingClientRect().top + window.scrollY - 86;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        resultPanel.scrollTop = 0;
      });
    }
    wasHidden = hidden;
  });
  observer.observe(resultPanel, { attributes: true, attributeFilter: ['class'] });
})();