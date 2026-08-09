(()=>{
'use strict';
let rawUserId='';
let currentUser=null;
const db=window.gyxSupabase;

const countries=[
['CN','中国','+86'],['KH','柬埔寨','+855'],['US','美国/加拿大','+1'],['GB','英国','+44'],['AU','澳大利亚','+61'],['SG','新加坡','+65'],['MY','马来西亚','+60'],['TH','泰国','+66'],['VN','越南','+84'],['PH','菲律宾','+63'],['ID','印度尼西亚','+62'],['JP','日本','+81'],['KR','韩国','+82'],['IN','印度','+91'],['AE','阿联酋','+971'],['FR','法国','+33'],['DE','德国','+49'],['IT','意大利','+39'],['ES','西班牙','+34'],['BR','巴西','+55'],['MX','墨西哥','+52'],['ZA','南非','+27'],['NG','尼日利亚','+234'],['OTHER','其他国家/地区','']
];

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

function addAccountRow(){
 const meta=document.querySelector('.profile-meta');
 if(!meta||document.getElementById('profileAccountValue'))return;
 const row=document.createElement('div');
 row.className='meta-row';
 row.innerHTML='<span>会员账号</span><strong id="profileAccountValue">—</strong>';
 const joined=document.getElementById('profileJoinedAt')?.closest('.meta-row');
 if(joined)meta.insertBefore(row,joined);else meta.appendChild(row);
 const oldEmail=document.getElementById('profileEmail');
 if(oldEmail)oldEmail.classList.add('profile-email-compact-hide');
}

function buildContactFields(){
 const phone=document.getElementById('profilePhone');
 if(!phone||document.getElementById('profileCountry'))return;
 phone.required=true;
 phone.maxLength=24;
 phone.placeholder='填写本地手机号；其他地区可输入 +国际区号';
 phone.setAttribute('aria-required','true');
 const phoneGroup=phone.closest('.form-group');
 const label=phoneGroup?.querySelector('label[for="profilePhone"]');
 if(label&&!label.querySelector('.required-mark'))label.insertAdjacentHTML('beforeend','<span class="required-mark"> *</span>');
 const countryGroup=document.createElement('div');
 countryGroup.className='form-group';
 countryGroup.innerHTML='<label for="profileCountry">国家/地区</label><select id="profileCountry" class="select">'+countries.map(([code,name,dial])=>`<option value="${code}" data-dial="${dial}">${name}${dial?' '+dial:''}</option>`).join('')+'</select><span id="profilePhoneHint" class="form-help">按国际格式保存</span>';
 phoneGroup?.parentNode?.insertBefore(countryGroup,phoneGroup);
 const optional=document.createElement('div');
 optional.className='member-contact-grid';
 optional.innerHTML='<div class="form-group"><label for="profileWechat">微信（选填）</label><input id="profileWechat" class="field" type="text" maxlength="80" placeholder="微信号"></div><div class="form-group"><label for="profileWhatsapp">WhatsApp（选填）</label><input id="profileWhatsapp" class="field" type="text" maxlength="80" placeholder="WhatsApp号码/账号"></div>';
 phoneGroup?.insertAdjacentElement('afterend',optional);
 document.getElementById('profileCountry')?.addEventListener('change',updatePhoneHint);
 updatePhoneHint();
}

function updatePhoneHint(){
 const select=document.getElementById('profileCountry');
 const hint=document.getElementById('profilePhoneHint');
 const input=document.getElementById('profilePhone');
 if(!select||!hint||!input)return;
 const dial=select.selectedOptions[0]?.dataset?.dial||'';
 if(dial){hint.textContent=`国际区号 ${dial}，只需填写本地手机号`;input.placeholder='填写本地手机号'}
 else{hint.textContent='请直接输入完整国际号码，例如 +85512345678';input.placeholder='+国际区号 手机号'}
}

function normalizePhone(){
 const raw=String(document.getElementById('profilePhone')?.value||'').trim();
 const select=document.getElementById('profileCountry');
 const dial=select?.selectedOptions?.[0]?.dataset?.dial||'';
 if(!raw)return'';
 const compactRaw=raw.replace(/[\s()\-]/g,'');
 if(/^\+[1-9]\d{6,14}$/.test(compactRaw))return compactRaw;
 if(!dial)return'';
 const local=raw.replace(/\D/g,'').replace(/^0+/,'');
 if(!local)return'';
 const compact=dial+local;
 return /^\+[1-9]\d{6,14}$/.test(compact)?compact:'';
}

function splitStoredPhone(phone,countryCode){
 const input=document.getElementById('profilePhone');
 const select=document.getElementById('profileCountry');
 if(!input||!select)return;
 let selected=[...select.options].find(o=>o.value===countryCode);
 if(!selected&&phone){selected=[...select.options].filter(o=>o.dataset.dial&&String(phone).startsWith(o.dataset.dial)).sort((a,b)=>b.dataset.dial.length-a.dataset.dial.length)[0]}
 if(selected){select.value=selected.value;const dial=selected.dataset.dial||'';input.value=dial&&String(phone).startsWith(dial)?String(phone).slice(dial.length):String(phone||'')}
 else{select.value='OTHER';input.value=String(phone||'')}
 updatePhoneHint();
}

function selectedCountry(){
 const option=document.getElementById('profileCountry')?.selectedOptions?.[0];
 return{code:String(option?.value||''),name:String(option?.textContent||'').replace(/\s\+\d.*$/,'').trim()};
}

function message(text,kind='error'){
 const el=document.getElementById('profileMessage');
 if(!el)return;
 el.textContent=text;
 el.className=`form-message show ${kind}`;
}

async function resolveUser(){
 try{
  currentUser=await window.gyxGetVerifiedUser?.();
  rawUserId=currentUser?.id||'';
  paintMemberId();
  const account=document.getElementById('profileAccountValue');
  if(account)account.textContent=currentUser?.email||'—';
 }catch{currentUser=null}
 return currentUser;
}

async function loadContactProfile(){
 if(!db)return;
 if(!currentUser)await resolveUser();
 if(!currentUser)return;
 const {data,error}=await db.from('profiles').select('phone,phone_country_code,phone_country_name,wechat,whatsapp').eq('user_id',currentUser.id).maybeSingle();
 if(error||!data)return;
 splitStoredPhone(data.phone||'',data.phone_country_code||'');
 const wx=document.getElementById('profileWechat'),wa=document.getElementById('profileWhatsapp');
 if(wx)wx.value=data.wechat||'';
 if(wa)wa.value=data.whatsapp||'';
}

function installProfileSave(){
 const form=document.getElementById('profileForm');
 if(!form||form.dataset.gyxInternationalSave==='1')return;
 form.dataset.gyxInternationalSave='1';
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  e.stopImmediatePropagation();
  message('');
  if(!db){message('数据库连接失败，请刷新页面后再试');return}
  if(!currentUser)await resolveUser();
  if(!currentUser){message('登录状态已失效，请重新登录');return}
  const displayName=String(document.getElementById('profileName')?.value||'').trim();
  const phone=normalizePhone();
  const locale=String(document.getElementById('profileLocale')?.value||'zh-CN');
  const wechat=String(document.getElementById('profileWechat')?.value||'').trim();
  const whatsapp=String(document.getElementById('profileWhatsapp')?.value||'').trim();
  const country=selectedCountry();
  if(!displayName){message('会员名称不能为空');return}
  if(!phone){message('请输入有效的国际手机号，例如选择柬埔寨后填写本地号码，或直接输入 +85512345678');document.getElementById('profilePhone')?.focus();return}
  const button=document.getElementById('saveProfileButton');
  if(button){button.disabled=true;button.textContent='正在保存…'}
  try{
   const payload={display_name:displayName,phone,phone_country_code:country.code||null,phone_country_name:country.name||null,wechat:wechat||null,whatsapp:whatsapp||null,locale,updated_at:new Date().toISOString()};
   const {data,error}=await db.from('profiles').update(payload).eq('user_id',currentUser.id).select('user_id').maybeSingle();
   if(error)throw error;
   if(!data?.user_id)throw new Error('PROFILE_NOT_UPDATED');
   try{await db.auth.updateUser({data:{display_name:displayName,phone,phone_country_code:country.code,phone_country_name:country.name,wechat,whatsapp}})}catch{}
   message('会员资料已保存','success');
   const heading=document.getElementById('profileHeading');if(heading)heading.textContent=displayName;
   splitStoredPhone(phone,country.code);
  }catch(err){
   console.error('profile save failed',err);
   const text=String(err?.message||'');
   if(/JWT|session|auth/i.test(text))message('登录状态已失效，请重新登录');
   else message('保存失败，请刷新页面后再试');
  }finally{if(button){button.disabled=false;button.textContent='保存会员资料'}}
 },true);
}

function buildOverview(){
 const grid=document.querySelector('.dashboard-grid');
 if(!grid||document.getElementById('memberOverview'))return;
 const overview=document.createElement('section');
 overview.id='memberOverview';overview.className='member-overview';
 overview.innerHTML='<button type="button" class="member-stat" data-jump="#orders"><span class="member-stat-icon">▤</span><b id="memberOrderCount">0</b><small>订单</small></button><button type="button" class="member-stat" data-jump="#favorites"><span class="member-stat-icon">☆</span><b id="memberFavoriteCount">0</b><small>收藏</small></button><button type="button" class="member-stat" data-jump="#downloads"><span class="member-stat-icon">↓</span><b id="memberDownloadCount">0</b><small>交付</small></button><button type="button" class="member-stat" data-jump="#materials"><span class="member-stat-icon">▣</span><b id="memberMaterialCount">0</b><small>资料</small></button>';
 grid.parentNode.insertBefore(overview,grid);
 overview.addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(b)document.querySelector(b.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'})});
}

function updateOverview(){
 const count=s=>document.querySelectorAll(s).length;
 const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
 set('memberOrderCount',count('#orderList>.order-card'));set('memberFavoriteCount',count('#favoriteList>.favorite-card'));set('memberDownloadCount',count('#downloadList>.order-card'));set('memberMaterialCount',count('#materialList>.material-card'));
}
function observeCounts(){['orderList','favoriteList','downloadList','materialList'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(updateOverview).observe(el,{childList:true,subtree:false})});updateOverview()}
function buttonFeedback(){document.addEventListener('click',e=>{const b=e.target.closest?.('.member-page button,.member-page a.btn');if(!b||b.disabled)return;b.classList.add('member-action-hit');setTimeout(()=>b?.classList.remove('member-action-hit'),160)},true)}
function compact(){document.querySelectorAll('.dashboard-main>.panel').forEach(p=>p.style.minHeight='0')}
function observeProfile(){const el=document.getElementById('profileUserId');if(el)new MutationObserver(()=>{if(rawUserId)requestAnimationFrame(paintMemberId)}).observe(el,{childList:true,characterData:true,subtree:true})}
function cleanLegacySpace(){const hero=document.querySelector('.page-hero .shell');if(hero){const lead=hero.querySelector(':scope>p:not(.eyebrow)');if(lead)lead.textContent='账号、订单、交付和个人资料，一页管理。'}}

async function init(){
 compact();cleanLegacySpace();buildOverview();addAccountRow();buildContactFields();installProfileSave();buttonFeedback();observeProfile();observeCounts();
 await resolveUser();await loadContactProfile();
 window.addEventListener('pageshow',async()=>{compact();paintMemberId();updateOverview();await resolveUser();await loadContactProfile()},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();