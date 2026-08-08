(()=>{
'use strict';
let rawUserId='';

function makeMemberId(raw){
  const clean=String(raw||'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
  if(!clean)return'—';
  let hash=2166136261;
  for(let i=0;i<clean.length;i++){hash^=clean.charCodeAt(i);hash=Math.imul(hash,16777619)}
  const base=(clean+Math.abs(hash>>>0).toString(36).toUpperCase()).replace(/[^A-Z0-9]/g,'');
  return('GY'+base).slice(0,15).padEnd(15,'0');
}

function paintMemberId(){
  const el=document.getElementById('profileUserId');
  if(!el||!rawUserId)return;
  const id=makeMemberId(rawUserId);
  if(el.textContent!==id)el.textContent=id;
  el.title='会员编号';
}

async function resolveUserId(){
  try{const u=await window.gyxGetVerifiedUser?.();rawUserId=u?.id||'';paintMemberId()}catch{}
}

function requirePhone(){
  const input=document.getElementById('profilePhone');
  const form=document.getElementById('profileForm');
  if(!input||!form)return;
  input.required=true;
  input.minLength=6;
  input.setAttribute('aria-required','true');
  const label=document.querySelector('label[for="profilePhone"]');
  if(label&&!label.querySelector('.required-mark')){
    const mark=document.createElement('span');
    mark.className='required-mark';
    mark.textContent=' *';
    label.appendChild(mark);
  }
  form.addEventListener('submit',e=>{
    const value=String(input.value||'').trim();
    if(value.length>=6)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const message=document.getElementById('profileMessage');
    if(message){message.textContent='手机号为必填项，请输入有效手机号';message.className='form-message show error'}
    input.focus();
  },true);
}

function buildOverview(){
  const grid=document.querySelector('.dashboard-grid');
  const profile=document.querySelector('.profile-card');
  if(!grid||!profile||document.getElementById('memberOverview'))return;
  const overview=document.createElement('section');
  overview.id='memberOverview';
  overview.className='member-overview';
  overview.innerHTML=`
    <button type="button" class="member-stat" data-jump="#orders"><span class="member-stat-icon">▤</span><b id="memberOrderCount">0</b><small>订单</small></button>
    <button type="button" class="member-stat" data-jump="#favorites"><span class="member-stat-icon">☆</span><b id="memberFavoriteCount">0</b><small>收藏</small></button>
    <button type="button" class="member-stat" data-jump="#downloads"><span class="member-stat-icon">↓</span><b id="memberDownloadCount">0</b><small>交付</small></button>
    <button type="button" class="member-stat" data-jump="#materials"><span class="member-stat-icon">▣</span><b id="memberMaterialCount">0</b><small>资料</small></button>`;
  grid.parentNode.insertBefore(overview,grid);
  overview.addEventListener('click',e=>{
    const button=e.target.closest('[data-jump]');
    if(!button)return;
    document.querySelector(button.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'});
  });
}

function updateOverview(){
  const count=(selector)=>document.querySelectorAll(selector).length;
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value)};
  set('memberOrderCount',count('#orderList>.order-card'));
  set('memberFavoriteCount',count('#favoriteList>.favorite-card'));
  set('memberDownloadCount',count('#downloadList>.order-card'));
  set('memberMaterialCount',count('#materialList>.material-card'));
}

function observeCounts(){
  ['orderList','favoriteList','downloadList','materialList'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)new MutationObserver(updateOverview).observe(el,{childList:true,subtree:false});
  });
  updateOverview();
}

function buttonFeedback(){
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.member-page button,.member-page a.btn');
    if(!b||b.disabled)return;
    b.classList.add('member-action-hit');
    setTimeout(()=>b?.classList.remove('member-action-hit'),160);
  },true);
}

function compact(){
  document.querySelectorAll('.dashboard-main>.panel').forEach(p=>{p.style.minHeight='0'});
}

function observeProfile(){
  const el=document.getElementById('profileUserId');
  if(!el)return;
  new MutationObserver(()=>{if(rawUserId)requestAnimationFrame(paintMemberId)}).observe(el,{childList:true,characterData:true,subtree:true});
}

function cleanLegacySpace(){
  const hero=document.querySelector('.page-hero .shell');
  if(hero){
    const lead=hero.querySelector(':scope>p:not(.eyebrow)');
    if(lead)lead.textContent='账号、订单、交付和个人资料，一页管理。';
  }
}

async function init(){
  compact();
  cleanLegacySpace();
  buildOverview();
  requirePhone();
  buttonFeedback();
  observeProfile();
  observeCounts();
  await resolveUserId();
  window.addEventListener('pageshow',()=>{compact();paintMemberId();updateOverview()},{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();