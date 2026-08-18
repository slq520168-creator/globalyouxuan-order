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
let cleanupTimer=null,closeTimer=null,pricingSeq=0;
const TIER_BY_PRODUCT={'answer-essential':'essential','answer-standard':'standard','answer-detailed':'detailed','answer-professional':'professional','answer-custom':'custom'};
const toast=t=>{const e=$('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(window.__gyxToastTimer);window.__gyxToastTimer=setTimeout(()=>e.classList.remove('show'),1800)};
const clearCleanup=()=>{if(cleanupTimer)clearTimeout(cleanupTimer);cleanupTimer=null};
const clearSearch=()=>{clearCleanup();window.GYX_KNOWLEDGE_DECISION?.clear?.()};
const armCleanup=()=>{clearCleanup();cleanupTimer=setTimeout(()=>{cleanupTimer=null;window.GYX_KNOWLEDGE_DECISION?.clear?.()},12000)};
function setPlaceholder(){const n=$('problemInput');if(!n)return;n.placeholder=L('你的最佳方案从这里开始','Your best plan starts here','ផែនការល្អបំផុតរបស់អ្នកចាប់ផ្តើមពីទីនេះ')}
function labels(){if(favorite&&!favorite.disabled){favorite.removeAttribute('data-i18n');favorite.textContent=L('收藏','Favorite','ចំណូលចិត្ត')}if(close)close.textContent=L('关闭','Close','បិទ')}
async function resolveMatchedProduct(m){
  if(!m||m.__matchedProductResolved)return;
  const answerId=Number(m.answer?.id),db=window.gyxSupabase;
  if(!db||!Number.isSafeInteger(answerId)||answerId<=0)return;
  const ar=await db.from('product_answer_options').select('product_id').eq('id',answerId).eq('is_active',true).maybeSingle();
  const productId=String(ar.data?.product_id||'').trim();
  if(!productId.startsWith('answer-')||!TIER_BY_PRODUCT[productId])return;
  const pr=await db.from('products').select('id,product_name,product_price,description,is_active').eq('id',productId).eq('is_active',true).maybeSingle();
  if(!pr.data)return;
  m.product=pr.data;
  m.tier=TIER_BY_PRODUCT[productId];
  m.tier_label=pr.data.product_name||m.tier_label;
  m.__matchedProductResolved=true;
}
async function renderFinal(){
  const m=window.GYX_CURRENT_AI_MATCH;if(!m)return;
  const seq=++pricingSeq;
  try{await resolveMatchedProduct(m)}catch(e){console.error('resolve search tier',e)}
  if(seq!==pricingSeq||m!==window.GYX_CURRENT_AI_MATCH)return;
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
  try{await resolveMatchedProduct(m)}catch(err){console.error('resolve favorite tier',err)}
  const db=window.gyxSupabase,u=await needUser();if(!u||!db){armCleanup();return}
  const productId=String(m.product?.id||'').trim();if(!productId){armCleanup();return toast(L('方案ID无效，无法收藏','Invalid plan ID. Cannot save.','លេខសម្គាល់ផែនការមិនត្រឹមត្រូវ មិនអាចរក្សាទុកបាន'))}
  const rawAnswerId=Number(m.answer?.id),answerId=Number.isSafeInteger(rawAnswerId)&&rawAnswerId>0?rawAnswerId:null;
  if(productId.startsWith('answer-')&&!answerId){armCleanup();return toast(L('答案ID无效，无法收藏','Invalid answer ID. Cannot save.','លេខសម្គាល់ចម្លើយមិនត្រឹមត្រូវ មិនអាចរក្សាទុកបាន'))}
  favorite.disabled=true;favorite.textContent=L('收藏中…','Saving…','កំពុងរក្សាទុក…');
  const payload={answer_id:answerId,question:m.question||'',selections:Array.isArray(m.selections)?m.selections:[],tier:m.tier||'standard',product_id:productId,quoted_price:Number(m.product?.product_price||0),matched_title:m.delivery_package?.title||m.answer?.title||m.question||'',matched_summary:m.delivery_package?.summary||m.answer?.answer_summary||m.question||'',updated_at:new Date().toISOString()};
  let timer;
  try{
    const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve({error:{message:'timeout'}}),5000)});
    let write;
    const existing=await db.from('answer_favorites').select('id').eq('user_id',u.id).eq('product_id',productId).maybeSingle();
    if(existing.error)throw existing.error;
    if(existing.data?.id){
      write=await Promise.race([db.from('answer_favorites').update(payload).eq('id',existing.data.id).eq('user_id',u.id).select('id,user_id,product_id,answer_id').single(),timeout]);
    }else{
      write=await Promise.race([db.from('answer_favorites').insert({...payload,user_id:u.id}).select('id,user_id,product_id,answer_id').single(),timeout]);
    }
    clearTimeout(timer);
    if(write?.error||!write?.data?.id||String(write.data.user_id)!==String(u.id)||String(write.data.product_id)!==productId)throw write?.error||new Error('FAVORITE_WRITE_NOT_CONFIRMED');
    if(productId.startsWith('answer-')&&Number(write.data.answer_id)!==answerId)throw new Error('FAVORITE_ANSWER_ID_MISMATCH');
    favorite.textContent=L('已收藏','Saved','បានរក្សាទុក');
    toast(L('已加入我的收藏','Added to Favorites','បានបន្ថែមទៅចំណូលចិត្ត'));
    clearCleanup();
  }catch(err){
    clearTimeout(timer);favorite.disabled=false;favorite.textContent=L('收藏','Favorite','ចំណូលចិត្ត');toast(L('收藏失败，结果已保留','Save failed. Result kept.','រក្សាទុកបរាជ័យ លទ្ធផលត្រូវបានរក្សាទុក'));armCleanup();
  }
},true);
order?.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();clearCleanup();const m=window.GYX_CURRENT_AI_MATCH;if(!m){armCleanup();return toast(L('当前方案暂不可下单','This plan cannot be ordered yet','ផែនការនេះមិនទាន់អាចបញ្ជាទិញបាន'))}try{await resolveMatchedProduct(m)}catch(err){console.error('resolve order tier',err)}if(!m?.product?.id){armCleanup();return toast(L('当前方案暂不可下单','This plan cannot be ordered yet','ផែនការនេះមិនទាន់អាចបញ្ជាទិញបាន'))}const u=await needUser();if(!u){armCleanup();return}if(!window.GYX_ORDER?.create){armCleanup();return toast(L('下单系统正在加载，请稍后再试','Order system is loading. Try again shortly.','ប្រព័ន្ធបញ្ជាទិញកំពុងផ្ទុក សូមសាកល្បងបន្តិចទៀត'))}window.GYX_ORDER.create(m.product.id,m);clearSearch()},true);
close?.addEventListener('pointerdown',e=>{e.stopImmediatePropagation()},true);
close?.addEventListener('pointerup',e=>{e.stopImmediatePropagation()},true);
close?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();clearCleanup();clearTimeout(closeTimer);close.disabled=true;closeTimer=setTimeout(()=>{clearSearch();close.disabled=false},420)},true);
document.querySelector('#resultPanel')?.addEventListener('pointerdown',()=>{if(window.GYX_CURRENT_AI_MATCH)armCleanup()},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setPlaceholder,{once:true});else setPlaceholder();
labels();syncOrder();
})();