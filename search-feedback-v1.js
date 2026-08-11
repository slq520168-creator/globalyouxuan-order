(()=>{'use strict';
const $=id=>document.getElementById(id);let locked=false;
const css=document.createElement('style');css.textContent=`
#quizOptions .quiz-option{transition:background .12s ease,border-color .12s ease,transform .08s ease,box-shadow .12s ease,color .12s ease}
#quizOptions .quiz-option.gyx-selected,#quizOptions .quiz-option:has(input:checked){background:linear-gradient(135deg,#d7ebff,#e7e2ff)!important;border:2px solid #147df5!important;box-shadow:0 0 0 3px rgba(20,125,245,.16),0 8px 18px rgba(35,93,170,.10)!important;transform:translateY(-1px)}
#quizOptions .quiz-option.gyx-selected strong,#quizOptions .quiz-option:has(input:checked) strong{color:#0c5fbd!important}
#quizOptions .quiz-option.gyx-selected span,#quizOptions .quiz-option:has(input:checked) span{color:#fff!important;background:#147df5!important;border-radius:999px;min-width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center}
#quizOptions .kd-action{transition:background .12s ease,color .12s ease,border-color .12s ease,transform .08s ease,box-shadow .12s ease}
#quizOptions .kd-action.gyx-pressed{background:#1767e8!important;color:#fff!important;border-color:#1767e8!important;transform:scale(.96);box-shadow:0 0 0 3px rgba(23,103,232,.14)!important}
#quizOptions .kd-action.gyx-processing{background:linear-gradient(90deg,#1767e8,#7448ef)!important;color:#fff!important;border-color:transparent!important;opacity:1;pointer-events:none;box-shadow:0 8px 18px rgba(71,82,220,.20)!important}
`;document.head.appendChild(css);
function syncSelected(){document.querySelectorAll('#quizOptions .quiz-option').forEach(l=>{const i=l.querySelector('input[type="checkbox"]');l.classList.toggle('gyx-selected',!!i?.checked)})}
function press(btn){btn.classList.add('gyx-pressed');setTimeout(()=>btn.classList.remove('gyx-pressed'),220)}
function install(){const root=$('quizOptions');if(!root)return;root.addEventListener('change',e=>{if(e.target.matches('input[type="checkbox"]'))requestAnimationFrame(syncSelected)},true);root.addEventListener('click',e=>{const label=e.target.closest('.quiz-option');if(label)setTimeout(syncSelected,0);const btn=e.target.closest('.kd-action');if(!btn)return;press(btn);if(btn.dataset.kd==='next'&&!locked){locked=true;btn.classList.add('gyx-processing');btn.textContent='已确认，正在进入下一轮…';setTimeout(()=>{locked=false;btn.classList.remove('gyx-processing')},1500)}},true);new MutationObserver(()=>requestAnimationFrame(syncSelected)).observe(root,{subtree:true,childList:true});syncSelected();
window.addEventListener('gyx:final-generating',()=>{locked=false},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();