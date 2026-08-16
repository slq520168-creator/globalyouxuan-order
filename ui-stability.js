(()=>{'use strict';
let growthSubmitLock=false;
const growthLang=(zh,en,km)=>{const I=window.GYXI18N;return I?.locale==='en'?en:I?.locale==='km'?km:zh};
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('.gyx-profile-submit');
  if(!btn||growthSubmitLock)return;
  const host=btn.closest('.gyx-gate')||document.querySelector('.gyx-gate');
  if(!host)return;
  const checks=[...host.querySelectorAll('[data-confirm]')];
  if(checks.length&&checks.some(x=>!x.checked)){
    e.preventDefault();e.stopImmediatePropagation();
    alert(growthLang('请完成最后确认','Please complete the final confirmation','សូមបំពេញការបញ្ជាក់ចុងក្រោយ'));
    return;
  }
  e.preventDefault();e.stopImmediatePropagation();
  let profile={};
  try{const raw=localStorage.getItem('gyx_growth_profile_draft');if(raw)profile=JSON.parse(raw)||{}}catch{}
  const multi={};
  host.querySelectorAll('.gyx-choice.is-selected').forEach(x=>{
    const k=x.dataset.key,v=x.dataset.value;if(!k)return;
    if(x.dataset.multi==='1'){(multi[k]||(multi[k]=[])).push(v)}else profile[k]=v;
  });
  Object.keys(multi).forEach(k=>profile[k]=multi[k]);
  host.querySelectorAll('.gyx-input,.gyx-textarea').forEach(el=>{
    const k=el.dataset.key;if(!k)return;
    if(el.dataset.index!==undefined){const a=Array.isArray(profile[k])?profile[k]:[];a[Number(el.dataset.index)]=el.value;profile[k]=a}else profile[k]=el.value;
  });
  profile.confirmed=true;
  profile.submitted_at=new Date().toISOString();
  try{localStorage.setItem('gyx_growth_profile_submitted',JSON.stringify(profile))}catch{}
  growthSubmitLock=true;
  btn.disabled=true;
  btn.textContent=growthLang('正在提交…','Submitting…','កំពុងបញ្ជូន…');
  window.dispatchEvent(new CustomEvent('gyx:growth-profile-submit',{detail:{profile,gate_answers:profile?.gate?.answers||[]}}));
  try{localStorage.removeItem('gyx_growth_profile_submitted')}catch{}
  setTimeout(()=>{growthSubmitLock=false},4000);
},true);
function css(){let s=document.getElementById('gyx-page-stability');if(!s){s=document.createElement('style');s.id='gyx-page-stability'}s.textContent=`.site-footer-icons{display:none!important}.home-page #accountLink{display:none!important}.gyx-fullscreen .gyx-profile-card:not(.gyx-save-result)>.gyx-profile-title{display:none!important}.gyx-fullscreen .gyx-profile-card:not(.gyx-save-result)>.gyx-profile-step{margin-top:2px!important}@media(max-width:960px){.support-fab{position:fixed!important;right:16px!important;bottom:calc(84px + env(safe-area-inset-bottom,0px))!important;z-index:98000!important}.home-page #quizPanel.search-popover,.home-page #resultPanel.search-popover{max-height:none!important;height:auto!important;overflow:visible!important;overscroll-behavior:auto!important}.home-page #quizOptions,.home-page .quiz-options{max-height:none!important;height:auto!important;overflow:visible!important}.home-page .search-stage{overflow:visible!important}.home-page .fixed-module-section{position:relative!important;z-index:1!important;padding-bottom:0!important;margin-bottom:0!important}.home-page .fixed-plans-panel.is-open{max-height:none!important;min-height:0!important;height:auto!important;overflow:visible!important;padding:14px!important;margin-bottom:12px!important}.home-page .fixed-plan-list{grid-template-columns:1fr 1fr!important;gap:10px!important;margin-bottom:0!important}.home-page .fixed-plan{min-height:154px!important;margin:0!important}.fixed-detail-modal{z-index:7000!important}.site-footer{display:none!important}}`;document.head.appendChild(s)}
function instantHome(){const p=document.getElementById('fixedPlansPanel');p?.classList.remove('is-open');p?.classList.add('hidden');document.getElementById('fixedDetailModal')?.classList.remove('show');document.body.classList.remove('fixed-plans-active','fixed-detail-active');document.body.style.overflow='';document.querySelectorAll('[data-fixed-module]').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-expanded','false')});try{const h=document.documentElement,old=h.style.scrollBehavior;h.style.scrollBehavior='auto';window.scrollTo(0,0);requestAnimationFrame(()=>{window.scrollTo(0,0);h.style.scrollBehavior=old})}catch{window.scrollTo(0,0)}}
function fastReturn(){document.addEventListener('click',e=>{const b=e.target.closest?.('.fixed-detail-back,.fixed-detail-close');if(b){e.preventDefault();e.stopImmediatePropagation();instantHome();return}const h=e.target.closest?.('.nav-home');const p=(location.pathname||'').toLowerCase();if(h&&(p.includes('shop')||p.endsWith('/'))){e.preventDefault();e.stopImmediatePropagation();instantHome()}},true)}
function loadQuestionShell(){if(document.querySelector('script[data-gyx-question-shell]'))return;const s=document.createElement('script');s.src='question-flow-shell.js?v=20260816-question-shell-1';s.defer=true;s.dataset.gyxQuestionShell='1';document.body.appendChild(s)}
function init(){css();fastReturn();loadQuestionShell()}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()})();