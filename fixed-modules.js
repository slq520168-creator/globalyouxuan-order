(()=>{'use strict';
const db=window.gyxSupabase,I=window.GYXI18N;
if(!db||!I)return;
const t=(k,v)=>I.t(k,v),L=(zh,en,km)=>I.locale==='en'?en:I.locale==='km'?km:zh;
const panel=document.getElementById('fixedPlansPanel'),title=document.getElementById('fixedPlansTitle'),list=document.getElementById('fixedPlanList'),close=document.getElementById('closeFixedPlans'),section=document.querySelector('.fixed-module-section'),grid=section?.querySelector('.module-grid');
if(!panel||!title||!list||!section||!grid)return;

const style=document.createElement('style');
style.textContent=`
.fixed-module-section{position:relative}
.fixed-module-section.module-options-open>.module-grid{visibility:hidden!important;pointer-events:none!important}
.fixed-module-section.module-options-open>.fixed-plans-panel{position:absolute!important;inset:0!important;z-index:12!important;margin:0!important;display:flex!important;flex-direction:column!important;height:100%!important;min-height:0!important;max-height:none!important;padding:12px!important;box-sizing:border-box!important;border-radius:20px!important;overflow:hidden!important}
.fixed-module-section .fixed-plans-head{flex:0 0 auto;margin:0 0 8px!important;min-height:34px!important}
.fixed-module-section .fixed-plans-head>div>span{display:none!important}
.fixed-module-section .fixed-plans-head h2{margin:0!important;font-size:17px!important;line-height:34px!important}
.fixed-module-section .fixed-plans-head button{width:34px!important;height:34px!important;min-height:34px!important}
.fixed-module-section .fixed-plan-list{flex:1;min-height:0!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-rows:repeat(2,minmax(0,1fr))!important;gap:10px!important;align-content:stretch!important}
.fixed-module-section .fixed-plan{min-height:0!important;height:100%!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
.fixed-module-section .fixed-plan-option{width:100%;height:100%;min-height:0!important;padding:10px 8px;border:1px solid rgba(20,120,255,.18);border-radius:16px;background:rgba(255,255,255,.9);color:var(--text,#172033);font:inherit;font-size:15px;font-weight:850;line-height:1.35;text-align:center;display:flex;align-items:center;justify-content:center;box-sizing:border-box;box-shadow:0 8px 20px rgba(44,75,120,.06)}
.fixed-module-section .fixed-plan-option:active{transform:scale(.98)}
html[data-theme="dark"] .fixed-module-section .fixed-plan-option{background:rgba(10,24,43,.94);border-color:rgba(100,160,255,.24);color:#f4f8ff}
@media(max-width:640px){
.fixed-module-section.module-options-open>.fixed-plans-panel{padding:10px!important}
.fixed-module-section .fixed-plans-head{margin-bottom:7px!important;min-height:30px!important}
.fixed-module-section .fixed-plans-head h2{font-size:16px!important;line-height:30px!important}
.fixed-module-section .fixed-plans-head button{width:30px!important;height:30px!important;min-height:30px!important}
.fixed-module-section .fixed-plan-list{gap:8px!important}
.fixed-module-section .fixed-plan-option{font-size:13px!important;padding:7px 6px!important}
}
@media(orientation:landscape) and (max-height:520px){
.fixed-module-section .module-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
.fixed-module-section .module-card{height:72px!important;min-height:72px!important;padding:7px 6px!important;border-radius:14px!important}
.fixed-module-section .module-card strong{font-size:11px!important;line-height:1.08!important}
.fixed-module-section .module-card .module-subtitle{max-width:72px!important;margin-top:5px!important;font-size:8.5px!important;line-height:1.22!important}
.fixed-module-section.module-options-open>.fixed-plans-panel{padding:6px!important}
.fixed-module-section .fixed-plans-head{display:none!important}
.fixed-module-section .fixed-plan-list{grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:1fr!important;gap:8px!important}
.fixed-module-section .fixed-plan-option{font-size:11px!important;border-radius:12px!important}
}
.fixed-detail-modal{position:fixed;inset:0;z-index:100500;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(5,15,30,.56);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.fixed-detail-modal.show{display:flex!important}
.fixed-detail-card{position:relative;width:min(100%,560px);max-height:min(82vh,720px);overflow:auto;padding:20px;border:1px solid rgba(20,120,255,.2);border-radius:22px;background:rgba(255,255,255,.98);box-shadow:0 28px 80px rgba(20,55,95,.28);color:#15334e;-webkit-overflow-scrolling:touch}
.fixed-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-right:0}
.fixed-detail-head h2{margin:0;padding-right:52px;font-size:24px}
.fixed-detail-close{position:absolute;right:18px;top:18px;width:38px;height:38px;border:0;border-radius:12px;background:rgba(20,120,255,.08);color:inherit;font-size:25px}
.fixed-detail-lead,.fixed-detail-audience{line-height:1.65}
.fixed-detail-list{padding-left:20px;line-height:1.7}
.fixed-detail-price{position:static;margin:14px 0 0;font-size:25px;font-weight:900;color:#1478ff;white-space:nowrap}
.fixed-detail-price small{font-size:11px;color:#70859b}
.fixed-detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
.fixed-detail-actions .btn{width:100%}
html[data-theme="dark"] .fixed-detail-card{color:#f4f8ff;background:rgba(7,19,33,.98);border-color:rgba(100,160,255,.25)}
`;
document.head.appendChild(style);

const defs={
 web:{title:'moduleWeb',ids:['web-photo','web-merchant','web-brand','web-enterprise']},
 automation:{title:'moduleAutomation',ids:['automation-trial','automation-small','automation-team','automation-enterprise']},
 ai:{title:'moduleAI',ids:['ai-trial','ai-content','ai-office','ai-enterprise']},
 digital:{title:'moduleDigital',ids:['digital-trial','digital-study','digital-expert','digital-private']}
};
const data=id=>({name:t(`fixed.${id}.name`),lead:t(`fixed.${id}.lead`),bullets:t(`fixed.${id}.bullets`),audience:t(`fixed.${id}.audience`)});
let cache=null,loading=null,opened='';
async function load(){if(cache)return cache;if(loading)return loading;loading=(async()=>{const r=await db.from('products').select('id,product_name,product_price,description').eq('is_active',true);if(r.error)throw r.error;cache=new Map((r.data||[]).map(x=>[x.id,x]));return cache})();try{return await loading}finally{loading=null}}
function esc(v){return String(v??'').replace(/[&<>'\"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[s]))}
async function user(){const u=await window.gyxGetVerifiedUser?.();if(!u){location.href='login.html?next='+encodeURIComponent('shop.html');return null}return u}
function optionCard(id){return `<article class="fixed-plan"><button type="button" class="fixed-plan-option" data-product-id="${esc(id)}">${esc(data(id).name)}</button></article>`}
function resetModule(){panel.classList.remove('is-open');panel.classList.add('hidden');section.classList.remove('module-options-open');opened='';document.body.classList.remove('fixed-plans-active','fixed-detail-active');document.querySelectorAll('[data-fixed-module]').forEach(x=>{x.setAttribute('aria-expanded','false');x.classList.remove('active')});document.getElementById('fixedDetailModal')?.classList.remove('show');document.body.style.overflow=''}
function ensureDetail(){let m=document.getElementById('fixedDetailModal');if(m)return m;m=document.createElement('div');m.id='fixedDetailModal';m.className='fixed-detail-modal';m.innerHTML='<section class="fixed-detail-card" role="dialog" aria-modal="true"><div class="fixed-detail-head"><h2 id="fixedDetailTitle"></h2><button type="button" class="fixed-detail-close">×</button></div><p id="fixedDetailLead" class="fixed-detail-lead"></p><ul id="fixedDetailList" class="fixed-detail-list"></ul><p id="fixedDetailAudience" class="fixed-detail-audience"></p><div id="fixedDetailPrice" class="fixed-detail-price"></div><div class="fixed-detail-actions"><button type="button" id="fixedDetailFavorite" class="btn btn-secondary"></button><button type="button" id="fixedDetailOrder" class="btn"></button></div></section>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.fixed-detail-close')){m.classList.remove('show');document.body.classList.remove('fixed-detail-active');document.body.style.overflow=''}});document.getElementById('fixedDetailFavorite').addEventListener('click',favoriteCurrent);document.getElementById('fixedDetailOrder').addEventListener('click',openCheckout);return m}
function showDetail(p){const d=data(p.id),m=ensureDetail();m.dataset.productId=p.id;document.getElementById('fixedDetailTitle').textContent=d.name;document.getElementById('fixedDetailLead').textContent=d.lead;const ul=document.getElementById('fixedDetailList');ul.replaceChildren();(Array.isArray(d.bullets)?d.bullets:[]).forEach(x=>{const li=document.createElement('li');li.textContent=x;ul.appendChild(li)});document.getElementById('fixedDetailAudience').textContent=d.audience||'';document.getElementById('fixedDetailPrice').innerHTML=`${Number(p.product_price).toFixed(Number(p.product_price)%1?2:0)} <small>USDT</small>`;const fav=document.getElementById('fixedDetailFavorite');fav.disabled=false;fav.textContent=L('收藏方案','Save plan','រក្សាទុកផែនការ');const order=document.getElementById('fixedDetailOrder');order.disabled=false;order.textContent=L('创建订单','Create order','បង្កើតការបញ្ជាទិញ');document.body.classList.add('fixed-detail-active');document.body.style.overflow='hidden';m.classList.add('show')}
async function favoriteCurrent(){const m=document.getElementById('fixedDetailModal'),p=cache?.get(m?.dataset.productId);if(!p)return;const u=await user();if(!u)return;const btn=document.getElementById('fixedDetailFavorite'),d=data(p.id);if(btn.disabled)return;btn.disabled=true;btn.textContent=L('收藏中…','Saving…','កំពុងរក្សាទុក…');const payload={user_id:u.id,answer_id:null,question:d.name,selections:[],tier:'fixed',product_id:p.id,quoted_price:Number(p.product_price||0),matched_title:d.name,matched_summary:d.lead,updated_at:new Date().toISOString()};let timer;try{const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve({error:{message:'timeout'}}),3500)});const r=await Promise.race([db.from('answer_favorites').insert(payload),timeout]);clearTimeout(timer);if(r?.error){const msg=String(r.error.message||'');if(/duplicate|unique|already exists/i.test(msg)){btn.textContent=L('已收藏','Saved','បានរក្សាទុក');btn.disabled=true;return}btn.disabled=false;btn.textContent=L('收藏方案','Save plan','រក្សាទុកផែនការ');if(msg!=='timeout')alert(L('收藏失败，请稍后再试。','Save failed. Try again later.','រក្សាទុកបរាជ័យ សូមសាកល្បងម្តងទៀត។'));return}btn.textContent=L('已收藏','Saved','បានរក្សាទុក');btn.disabled=true}catch(e){clearTimeout(timer);btn.disabled=false;btn.textContent=L('收藏方案','Save plan','រក្សាទុកផែនការ')}}
async function openCheckout(){const m=document.getElementById('fixedDetailModal'),p=cache?.get(m?.dataset.productId);if(!p)return;const u=await user();if(!u)return;if(!window.GYX_MEMBER_CHECKOUT?.open){alert(L('下单系统正在加载，请稍后再试。','Order system is loading. Try again shortly.','ប្រព័ន្ធបញ្ជាទិញកំពុងផ្ទុក សូមសាកល្បងបន្តិចទៀត។'));return}const d=data(p.id);m.classList.remove('show');document.body.classList.remove('fixed-detail-active');document.body.style.overflow='';window.GYX_MEMBER_CHECKOUT.open(p.id,{question:d.name,selections:[],tier:'fixed',answer:{title:d.name,answer_summary:d.lead}})}
function openModule(key,btn){if(!defs[key])return;if(opened===key&&!panel.classList.contains('hidden')){resetModule();return}opened=key;document.body.classList.add('fixed-plans-active');document.querySelectorAll('[data-fixed-module]').forEach(x=>{x.setAttribute('aria-expanded','false');x.classList.remove('active')});btn?.setAttribute('aria-expanded','true');btn?.classList.add('active');title.textContent=t(defs[key].title);list.innerHTML=defs[key].ids.map(optionCard).join('');panel.classList.remove('hidden');panel.classList.add('is-open');section.classList.add('module-options-open');load().catch(()=>{})}
async function openOption(id){let p=cache?.get(id);if(!p){try{const mm=await load();p=mm.get(id)}catch{return}}if(p)showDetail(p)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-fixed-module]');if(b){e.preventDefault();openModule(b.dataset.fixedModule,b);return}const view=e.target.closest('.fixed-plan-option');if(view){e.preventDefault();e.stopPropagation();openOption(view.dataset.productId)}},true);
close?.addEventListener('click',e=>{e.preventDefault();resetModule()});
})();