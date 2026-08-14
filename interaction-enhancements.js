(() => {
  'use strict';
  try{localStorage.removeItem('gyx_kd_active')}catch{}
  const form=document.getElementById('problemForm'),input=document.getElementById('problemInput'),button=document.getElementById('startMatchButton'),result=document.getElementById('resultPanel'),actions=document.querySelector('#resultPanel .result-actions');
  if(!form||!input||!button)return;
  let autoTimer=null;
  const cancelAuto=()=>{if(autoTimer)clearTimeout(autoTimer);autoTimer=null};
  const closeKeyboard=()=>{try{input.blur()}catch{}try{document.activeElement?.blur?.()}catch{}};
  const autoSubmit=()=>{if(String(input.value||'').trim().length<2)return;form.requestSubmit(button)};
  input.addEventListener('input',()=>{cancelAuto();if(String(input.value||'').trim().length<2)return;autoTimer=setTimeout(autoSubmit,4000)});
  button.addEventListener('click',cancelAuto,true);
  form.addEventListener('submit',()=>{cancelAuto();closeKeyboard()},true);
  if(result){
    let cleared=false;
    const clearOnce=()=>{if(result.classList.contains('hidden')){cleared=false;return}if(cleared||!(actions&&actions.offsetParent!==null))return;input.value='';cleared=true};
    const observer=new MutationObserver(()=>requestAnimationFrame(clearOnce));
    observer.observe(result,{attributes:true,attributeFilter:['class']});
    clearOnce();
  }
})();