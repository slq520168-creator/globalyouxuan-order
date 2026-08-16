(()=>{'use strict';
const I=window.GYXI18N;
const L=(zh,en,km)=>I?.locale==='en'?en:I?.locale==='km'?km:zh;
let locked=false;
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('.gyx-profile-submit');
  if(!btn||locked)return;
  const host=btn.closest('.gyx-gate')||document.querySelector('.gyx-gate');
  if(!host)return;
  const checks=[...host.querySelectorAll('[data-confirm]')];
  if(checks.length&&checks.some(x=>!x.checked)){
    e.preventDefault();e.stopImmediatePropagation();
    alert(L('请完成最后确认','Please complete the final confirmation','សូមបំពេញការបញ្ជាក់ចុងក្រោយ'));
    return;
  }
  e.preventDefault();e.stopImmediatePropagation();
  let profile=null;
  try{
    const raw=localStorage.getItem('gyx_growth_profile_draft');
    if(raw)profile=JSON.parse(raw);
  }catch{}
  if(!profile||typeof profile!=='object')profile={};
  profile.confirmed=true;
  profile.submitted_at=new Date().toISOString();
  try{localStorage.setItem('gyx_growth_profile_submitted',JSON.stringify(profile))}catch{}
  locked=true;
  btn.disabled=true;
  btn.textContent=L('正在提交…','Submitting…','កំពុងបញ្ជូន…');
  window.dispatchEvent(new CustomEvent('gyx:growth-profile-submit',{detail:{profile,gate_answers:profile?.gate?.answers||[]}}));
  setTimeout(()=>{locked=false},4000);
},true);
})();