(()=>{'use strict';
const $=id=>document.getElementById(id);let locked=false;
const css=document.createElement('style');css.textContent=`
#quizOptions .quiz-option{transition:background .12s ease,border-color .12s ease,transform .08s ease,box-shadow .12s ease}
#quizOptions .quiz-option.gyx-selected,#quizOptions .quiz-option:has(input:checked){background:#e8f3ff!important;border-color:#2186ff!important;box-shadow:0 0 0 2px rgba(33,134,255,.12)!important}
#quizOptions .quiz-option.gyx-selected strong,#quizOptions .quiz-option:has(input:checked) strong{color:#1268c9!important}
#quizOptions .kd-action.gyx-pressed{background:#1767e8!important;color:#fff!important;border-color:#1767e8!important;transform:scale(.97)}
#quizOptions .kd-action.gyx-processing{background:#1767e8!important;color:#fff!important;border-color:#1767e8!important;opacity:.88;pointer-events:none}
`;document.head.appendChild(css);
function syncSelected(){document.querySelectorAll('#quizOptions .quiz-option').forEach(l=>{const i=l.querySelector('input[type="checkbox"]');l.classList.toggle('gyx-selected',!!i?.checked)})}
function press(btn){btn.classList.add('gyx-pressed');setTimeout(()=>btn.classList.remove('gyx-pressed'),180)}
function install(){const root=$('quizOptions');if(!root)return;root.addEventListener('change',e=>{if(e.target.matches('input[type="checkbox"]'))syncSelected()},true);root.addEventListener('click',e=>{const btn=e.target.closest('.kd-action');if(!btn)return;press(btn);if(btn.dataset.kd==='next'&&!locked){locked=true;btn.classList.add('gyx-processing');btn.textContent='正在进入下一轮…';setTimeout(()=>{locked=false;btn.classList.remove('gyx-processing')},1400)}},true);new MutationObserver(syncSelected).observe(root,{subtree:true,childList:true});syncSelected();
window.addEventListener('gyx:final-generating',()=>{locked=false},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();