(()=>{'use strict';
if(!Array.isArray(window.__GYX_MATERIALS))window.__GYX_MATERIALS=[];
const $=id=>document.getElementById(id),I=window.GYXI18N,L=(zh,en,km)=>I?.locale==='en'?en:I?.locale==='km'?km:zh;
const actions=document.querySelector('#resultPanel .result-actions');
const favorite=$('favoriteButton');
let order=$('orderAnswerButton'),close=$('closeSearchResultButton');
const orphanSave=$('saveSearchButton');
if(orphanSave)orphanSave.remove();
if(actions&&!order){order=document.createElement('button');order.id='orderAnswerButton';order.className='btn btn-secondary';order.type='button';actions.appendChild(order)}
if(actions&&!close){close=document.createElement('button');close.id='closeSearchResultButton';close.className='btn btn-secondary';close.type='button';actions.appendChild(close)}
if(actions){actions.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';actions.style.gap='8px'}
let cleanupTimer=null;
const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(window.__gyxToastTimer);window.__gyxToastTimer=setTimeout(()=>e.classList.remove('show'),1800)};
const clearCleanup=()=>{if(cleanupTimer)clearTimeout(cleanupTimer);cleanupTimer=null};
const clearSearch=()=>{clearCleanup();window.GYX_KNOWLEDGE_DECISION?.clear?.()};
const armCleanup=()=>{clearCleanup();cleanupTimer=setTimeout(()=>{cleanupTimer=null;window.GYX_KNOWLEDGE_DECISION?.clear?.()},12000)};
function setPlaceholder(){const n=$('problemInput');if(!n)return;n.placeholder=L('你的最佳方案从这里开始','Your best plan starts here','ផែនការល្អបំផុតរបស់អ្នកចាប់ផ្តើមពីទីនេះ')}
function labels(){if(favorite&&!favorite.disabled){favorite.removeAttribute('data-i18n');favorite.textContent=L('收藏','Favorite','ចំណូលចិត្ត')}if(close)close.textContent=L('关闭','Close','បិទ')}
function renderFinal(){
  const m=window.GYX_CURRENT_AI_MATCH;if(!m)return;
  const p=m.delivery_package||{},a=m.answer||{},product=m.product||{};
  const raw=Number(m.confidence??p.quality?.score),confidence=Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):null;
  if($('resultConfidence'))$('resultConfidence').textContent=confidence===null?'—':`${Math.round(confidence)}%`;
  if($('resultTitle'))$('resultTitle').textContent=a.title||p.title||m.question||L('匹配方案','Matched plan','ផែនការផ្គូផ្គង');
  if($('resultSummary'))$('resultSummary').textContent=a.answer_summary||p.summary||'';
  if($('resultTier'))$('resultTier').textContent=m.tier_label||L('完整方案','Full plan','ផែនការពេញលេញ');
  if($('resultPrice'))$('resultPrice').textContent=product.product_price!=null&&product.product_price!==''?String(product.product_price):'—';
  const delivery=$('deliveryList');if(delivery){delivery.replaceChildren();const items=Array.isArray(p.deliverables)?p.deliverables:[];items.forEach(x=>{const li=document.createElement('li');li.textContent=String(x||'');delivery.appendChild(li)})}
  if($('resultQuestion'))$('resultQuestion').textContent=a.answer_detail||p.detailed_plan||'';
  const selections=$('resultSelections');if(selections){selections.replaceChildren();(Array.isArray(m.selections)?m.selections:[]).filter(Boolean).forEach(x=>{const li=document.createElement('li');li.textContent=String(x);selections.appendChild(li)})}
  labels();syncOrder();armCleanup();
}
function syncOrder(){const m=window.GYX_CURRENT_AI_MATCH;if(!order)return;const ready=!!m?.product?.id;order.disabled=!ready;order.setAttribute('aria-disabled',ready?'false':'true');order.textContent=L('创建订单','Create order','បង្កើតការបញ្ជាទិញ');labels()}
window.addEventListener('gyx:raw-result-ready',renderFinal);
window.addEventListener('gyx:languagechange',()=>{setPlaceholder();labels();syncOrder();if(window.GYX_CURRENT_AI_MATCH)renderFinal()});
window.addEventListener('gyx:localechange',()=>{setPlaceholder();labels();syncOrder()});
async function needUser(){const u=await window.gyxGetVerifiedUser?.();if(!u){if(typeof window.GYX_ENTRY_AUTH?.open==='function'){window.GYX_ENTRY_AUTH.open('register');return null}const url=typeof window.gyxAuthEntryUrl==='function'?window.gyxAuthEntryUrl('shop.html'):'login.html?mode=register&next=shop.html';location.href=url;return null}return u}
favorite?.addEventListener('click',async e=>{
  e.preventDefault();e.stopImmediatePropagation();clearCleanup();
  const m=window.GYX_CURRENT_AI_MATCH;if(!m)return toast(L('请先完成一次匹配','Complete a match first','សូមបញ្ចប់ការផ្គូផ្គងមួយសិន'));
  const db=window.gyxSupabase,u=await needUser();if(!u||!db){armCleanup();return}
  const productId=String(m.product?.id||'').trim();if(!productId){armCleanup();return toast(L('方案ID无效，无法收藏','Invalid plan ID. Cannot save.','លេខសម្គាល់ផែនការមិនត្រឹមត្រូវ មិនអាចរក្សាទុកបាន'))}
  const rawAnswerId=Number(m.answer?.id),answerId=Number.isSafeInteger(rawAnswerId)&&rawAnswerId>0?rawAnswerId:null;
  if(productId.startsWith('answer-')&&!answerId){armCleanup();return toast(L('答案ID无效，无法收藏','Invalid answer ID. Cannot save.','លេខសម្គាល់ចម្លើយមិនត្រឹមត្រូវ មិនអាចរក្សាទុកបាន'))}
  favorite.disabled=true;favorite.textContent=L('收藏中…','Saving…','កំពុងរក្សាទុក…');
  const payload={user_id:u.id,answer_id:answerId,question:m.question||'',selections:Array.isArray(m.selections)?m.selections:[],tier:m.tier||'standard',product_id:productId,quoted_price:Number(m.product?.product_price||0),matched_title:m.delivery_package?.title||m.answer?.title||m.question||'',matched_summary:m.delivery_package?.summary||m.answer?.answer_summary||m.question||'',updated_at:new Date().toISOString()};
  let timer;
  try{
    const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve({error:{message:'timeout'}}),3500)}),r=await Promise.race([db.from('answer_favorites').insert(payload),timeout]);
    clearTimeout(timer);
    if(r?.error&&!/duplicate|unique|already exists/i.test(String(r.error.message||'')))throw r.error;
    favorite.textContent=L('已收藏','Saved','បានរក្សាទុក');clearSearch();
  }catch{
    clearTimeout(timer);favorite.disabled=false;favorite.textContent=L('收藏','Favorite','ចំណូលចិត្ត');toast(L('收藏失败，请稍后再试','Save failed. Try again later.','រក្សាទុកបរាជ័យ សូមសាកល្បងម្តងទៀត'));armCleanup();
  }
},true);
order?.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();clearCleanup();const m=window.GYX_CURRENT_AI_MATCH;if(!m?.product?.id){armCleanup();return toast(L('当前方案暂不可下单','This plan cannot be ordered yet','ផែនការនេះមិនទាន់អាចបញ្ជាទិញបាន'))}const u=await needUser();if(!u){armCleanup();return}if(!window.GYX_MEMBER_CHECKOUT?.open){armCleanup();return toast(L('下单系统正在加载，请稍后再试','Order system is loading. Try again shortly.','ប្រព័ន្ធបញ្ជាទិញកំពុងផ្ទុក សូមសាកល្បងបន្តិចទៀត'))}window.GYX_MEMBER_CHECKOUT.open(m.product.id,m);clearSearch()},true);
close?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();clearSearch()},true);
document.querySelector('#resultPanel')?.addEventListener('pointerdown',()=>{if(window.GYX_CURRENT_AI_MATCH)armCleanup()},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setPlaceholder,{once:true});else setPlaceholder();
labels();syncOrder();
})();