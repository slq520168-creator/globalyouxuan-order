(()=>{'use strict';
const I=window.GYXI18N;
const L=()=>I?.locale==='en'?'Back to website':I?.locale==='km'?'ត្រឡប់ទៅគេហទំព័រ':'返回网站';
const nav=()=>document.querySelector('.mobile-bottom-nav');
const questionnaireScreens=()=>[...document.querySelectorAll('.gyx-fullscreen')].filter(s=>s.querySelector('.gyx-gate,.gyx-profile'));
function label(){questionnaireScreens().forEach(s=>{const b=s.querySelector('.gyx-full-close');if(!b)return;b.textContent=L();b.setAttribute('aria-label',L());Object.assign(b.style,{width:'auto',minWidth:'88px',padding:'0 14px',borderRadius:'14px',fontSize:'14px',fontWeight:'850'})})}
function sync(){const open=questionnaireScreens().some(s=>s.classList.contains('is-open'));const n=nav();if(n){if(open){n.dataset.gyxQuestionHidden='1';n.style.setProperty('display','none','important')}else if(n.dataset.gyxQuestionHidden==='1'){delete n.dataset.gyxQuestionHidden;n.style.removeProperty('display')}}label()}
function init(){sync();new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});window.addEventListener('gyx:languagechange',sync);window.addEventListener('gyx:localechange',sync)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
