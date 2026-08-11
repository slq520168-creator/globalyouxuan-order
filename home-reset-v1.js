(()=>{'use strict';
const $=id=>document.getElementById(id);
const HOME='shop.html';
let idleTimer=0;
function clearSearchState(){
  try{sessionStorage.removeItem('gyx_search_state');sessionStorage.removeItem('gyx_current_search');sessionStorage.removeItem('gyx_match_state');}catch(e){}
}
function resetHome(){clearSearchState();location.replace(HOME);}
function searchActive(){
  const input=$('problemInput'),quiz=$('quizPanel'),result=$('resultPanel');
  return !!((input&&input.value.trim())||(quiz&&!quiz.classList.contains('hidden'))||(result&&!result.classList.contains('hidden')));
}
function armIdle(){
  clearTimeout(idleTimer);
  if(!searchActive())return;
  idleTimer=setTimeout(()=>{if(searchActive())resetHome();},30000);
}
document.addEventListener('DOMContentLoaded',()=>{
  const input=$('problemInput');
  if(input){input.value='';input.addEventListener('input',armIdle,{passive:true});}
  const form=$('problemForm');if(form)form.addEventListener('submit',()=>setTimeout(armIdle,0),{passive:true});
  const quiz=$('quizPanel');if(quiz)quiz.addEventListener('click',armIdle,{passive:true});
  const result=$('resultPanel');if(result)result.addEventListener('click',armIdle,{passive:true});
  document.querySelectorAll('a.nav-home').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();resetHome();}));
});
})();
