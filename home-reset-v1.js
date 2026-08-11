(()=>{'use strict';
const $=id=>document.getElementById(id);
const HOME='shop.html';
let idleTimer=0;
function resetHome(){
  try{sessionStorage.removeItem('gyx_search_state');sessionStorage.removeItem('gyx_current_search');sessionStorage.removeItem('gyx_match_state');}catch(e){}
  location.replace(HOME);
}
function armIdle(){
  clearTimeout(idleTimer);
  idleTimer=setTimeout(()=>{
    const input=$('problemInput');
    const quiz=$('quizPanel');
    const result=$('resultPanel');
    const hasSearch=(input&&input.value.trim())||(quiz&&!quiz.classList.contains('hidden'))||(result&&!result.classList.contains('hidden'));
    if(hasSearch) resetHome();
  },30000);
}
['pointerdown','touchstart','keydown','input','scroll'].forEach(type=>window.addEventListener(type,armIdle,{passive:true}));
document.addEventListener('DOMContentLoaded',()=>{
  const input=$('problemInput');
  if(input) input.value='';
  document.querySelectorAll('a.nav-home').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();resetHome();},true));
  armIdle();
});
})();
