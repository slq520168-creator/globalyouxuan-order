(()=>{'use strict';
if(!Array.isArray(window.__GYX_MATERIALS))window.__GYX_MATERIALS=[];
const $=id=>document.getElementById(id),I=window.GYXI18N;
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
const GENERATED_PRODUCT_ID='knowledge-decision-standard';
function setPlaceholder(){const n=$('problemInput');if(!n)return;n.placeholder=window.GYXI18N.t("searchActionsV2Copy001")}
function labels(){if(favorite&&!favorite.disabled){favorite.removeAttribute('data-i18n');favorite.textContent=window.GYXI18N.t("searchActionsV2Copy002")}if(close)close.textContent=window.GYXI18N.t("close")}
async function resolveMatchedProduct(m){
  if(!m||m.__matchedProductResolved)return;
  if(m.product?.id){m.__matchedProductResolved=true;return}
  const answerId=Number(m.answer?.id),db=window.gyxSupabase;
  if(db&&Number.isSafeInteger(answerId)&&answerId>0)try{
    const ar=await db.from('product_answer_options').select('product_id').eq('id',answerId).eq('is_active',true).maybeSingle();
    const productId=String(ar.data?.product_id||'').trim();
    if(productId.startsWith('answer-')&&TIER_BY_PRODUCT[productId]){
      const pr=await db.from('products').select('id,product_name,product_price,description,is_active').eq('id',productId).eq('is_active',true).maybeSingle();
      if(pr.data){m.product=pr.data;m.tier=TIER_BY_PRODUCT[productId];m.tier_label=pr.data.product_name||m.tier_label;m.__matchedProductResolved=true;return}
    }
  }catch(err){console.error('resolve matched product',err)}
  m.product={id:GENERATED_PRODUCT_ID};
  m.tier='standard';
  m.tier_label=m.tier_label||I.t('searchActionsV2Copy004');
  m.__matchedProductResolved=true;
}
async function renderFinal(){
  const m=window.GYX_CURRENT_AI_MATCH;if(!m)return;
  const seq=++pricingSeq;
  await resolveMatchedProduct(m);
  if(seq!==pricingSeq||m!==window.GYX_CURRENT_AI_MATCH)return;
  const p=m.delivery_package||{},a=m.answer||{},product=m.product||{};
  const raw=Number(m.confidence??p.quality?.score),confidence=Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):null;
  if($('resultConfidence'))$('resultConfidence').textContent=confidence===null?'—':`${Math.round(confidence)}%`;
  if($('resultTitle'))$('resultTitle').textContent=a.title||p.title||m.question||window.GYXI18N.t("searchActionsV2Copy003");
  if($('resultSummary'))$('resultSummary').textContent=a.answer_summary||p.summary||'';
  if($('resultTier'))$('resultTier').textContent=m.tier_label||window.GYXI18N.t("searchActionsV2Copy004");
  if($('resultPrice'))$('resultPrice').textContent=product.product_price!=null&&product.product_price!==''?String(product.product_price):'—';
  const delivery=$('deliveryList');if(delivery){delivery.replaceChildren();const items=Array.isArray(p.deliverables)?p.deliverables:[];items.forEach(x=>{const li=document.createElement('li');li.textContent=String(x||'');delivery.appendChild(li)})}
  if($('resultQuestion'))$('resultQuestion').textContent=a.answer_detail||p.detailed_plan||'';
  const selections=$('resultSelections');if(selections){selections.replaceChildren();(Array.isArray(m.selections)?m.selections:[]).filter(Boolean).forEach(x=>{const li=document.createElement('li');li.textContent=String(x);selections.appendChild(li)})}
  labels();syncOrder();armCleanup();
}
function syncOrder(){const m=window.GYX_CURRENT_AI_MATCH;if(!order)return;const ready=!!m?.product?.id;order.disabled=!ready;order.setAttribute('aria-disabled',ready?'false':'true');order.textContent=window.GYXI18N.t("fixedModulesCopy003");labels()}
window.addEventListener('gyx:raw-result-ready',renderFinal);
window.addEventListener('gyx:languagechange',()=>{setPlaceholder();labels();syncOrder();if(window.GYX_CURRENT_AI_MATCH)renderFinal()});
window.addEventListener('gyx:localechange',()=>{setPlaceholder();labels();syncOrder()});
async function needUser(){const u=await window.gyxGetVerifiedUser?.();if(!u){if(typeof window.GYX_ENTRY_AUTH?.open==='function'){window.GYX_ENTRY_AUTH.open('register');return null}const url=typeof window.gyxAuthEntryUrl==='function'?window.gyxAuthEntryUrl('shop.html'):'login.html?mode=register&next=shop.html';location.href=url;return null}return u}
favorite?.addEventListener('click',async e=>{
  e.preventDefault();e.stopImmediatePropagation();clearCleanup();
  const m=window.GYX_CURRENT_AI_MATCH;if(!m)return toast(window.GYXI18N.t("searchActionsV2Copy005"));
  await resolveMatchedProduct(m);
  const db=window.gyxSupabase,u=await needUser();if(!u||!db){armCleanup();return}
  const productId=String(m.product?.id||'').trim();if(!productId){armCleanup();return toast(window.GYXI18N.t("searchActionsV2Copy006"))}
  const rawAnswerId=Number(m.answer?.id),answerId=Number.isSafeInteger(rawAnswerId)&&rawAnswerId>0?rawAnswerId:null;
  if(productId.startsWith('answer-')&&!answerId){armCleanup();return toast(window.GYXI18N.t("searchActionsV2Copy007"))}
  favorite.disabled=true;favorite.textContent=window.GYXI18N.t("fixedModulesCopy004");
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
    favorite.textContent=window.GYXI18N.t("fixedModulesCopy005");
    toast(window.GYXI18N.t("searchActionsV2Copy008"));
    clearCleanup();
  }catch(err){
    clearTimeout(timer);favorite.disabled=false;favorite.textContent=window.GYXI18N.t("searchActionsV2Copy002");toast(window.GYXI18N.t("searchActionsV2Copy009"));armCleanup();
  }
},true);
order?.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();clearCleanup();const m=window.GYX_CURRENT_AI_MATCH;if(!m){armCleanup();return toast(window.GYXI18N.t("searchActionsV2Copy010"))}await resolveMatchedProduct(m);if(!m?.product?.id){armCleanup();return toast(window.GYXI18N.t("searchActionsV2Copy010"))}const u=await needUser();if(!u){armCleanup();return}if(!window.GYX_ORDER?.create){armCleanup();return toast(window.GYXI18N.t("searchActionsV2Copy011"))}try{const opened=await window.GYX_ORDER.create(m.product.id,m);if(opened)clearSearch();else armCleanup()}catch(err){console.error('open homepage checkout',err);toast(window.GYXI18N.t("searchActionsV2Copy011"));armCleanup()}},true);
close?.addEventListener('pointerdown',e=>{e.stopImmediatePropagation()},true);
close?.addEventListener('pointerup',e=>{e.stopImmediatePropagation()},true);
close?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();clearCleanup();clearTimeout(closeTimer);close.disabled=true;closeTimer=setTimeout(()=>{clearSearch();close.disabled=false},420)},true);
document.querySelector('#resultPanel')?.addEventListener('pointerdown',()=>{if(window.GYX_CURRENT_AI_MATCH)armCleanup()},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setPlaceholder,{once:true});else setPlaceholder();
labels();syncOrder();
})();

(()=>{'use strict';
const HAN=/[\u3400-\u9fff\uf900-\ufaff]/,KHMER=/[\u1780-\u17ff]/;
const selectors=['#quizQuestion','#quizOptions .kd-option strong','#resultTitle','#resultSummary','#resultQuestion','#deliveryList li','#resultSelections li'];
const cache=new Map();let timer=null,working=false;
const locale=()=>{const v=String(window.GYXI18N?.locale||'zh').toLowerCase();return v.startsWith('km')?'km':v.startsWith('en')?'en':'zh'};
const dynamicNodes=()=>[...document.querySelectorAll(selectors.join(','))];
function shouldTranslate(value,loc){const s=String(value||'').trim();if(!s||loc==='zh'||s==='—')return false;if(HAN.test(s))return true;if(loc==='en')return KHMER.test(s);if(loc==='km'){if(KHMER.test(s))return false;if(/^[-+\d\s.,:%/()]+$/.test(s))return false;if(/^(?:AI|API|USDT|TRC20|Groq|Gemini|GlobalYouXuan)(?:\s|$)/i.test(s)&&!/[A-Za-z]{8,}/.test(s.replace(/GlobalYouXuan/gi,'')))return false;return /[A-Za-z]{3}/.test(s)}return false}
function markPending(){const loc=locale();if(loc==='zh')return;for(const node of dynamicNodes()){const s=String(node.textContent||'').trim();if(shouldTranslate(s,loc)&&node.dataset.gyxLocalizedSource!==s){node.style.visibility='hidden'}}}
async function translateBatch(entries,loc){const unique=[...new Set(entries.map(x=>x.source))],missing=unique.filter(s=>!cache.has(loc+'|'+s));
  if(missing.length){const db=window.gyxSupabase;if(!db?.functions?.invoke)throw new Error('SUPABASE_FUNCTIONS_UNAVAILABLE');for(let i=0;i<missing.length;i+=8){const part=missing.slice(i,i+8);const{data,error}=await db.functions.invoke('search-result-translate',{body:{locale:loc,texts:part}});if(error)throw error;const out=Array.isArray(data?.translations)?data.translations:[];if(out.length!==part.length)throw new Error('TRANSLATION_COUNT_MISMATCH');part.forEach((s,j)=>cache.set(loc+'|'+s,String(out[j]||'').trim()))}}
  for(const item of entries){const translated=cache.get(loc+'|'+item.source);if(!translated)continue;item.node.dataset.gyxLocalizedSource=translated;item.node.dataset.gyxLocalizedLocale=loc;item.node.textContent=translated;item.node.style.visibility='visible'}
}
async function flush(){if(working)return;const loc=locale();if(loc==='zh'){for(const n of dynamicNodes())n.style.visibility='visible';return}const entries=[];for(const node of dynamicNodes()){const s=String(node.textContent||'').trim();if(!shouldTranslate(s,loc)){node.style.visibility='visible';continue}node.style.visibility='hidden';entries.push({node,source:s})}if(!entries.length)return;working=true;try{await translateBatch(entries,loc)}catch(err){console.error('[GYX search i18n]',err);setTimeout(schedule,700)}finally{working=false}}
function schedule(){clearTimeout(timer);markPending();timer=setTimeout(flush,120)}
const observer=new MutationObserver(schedule);
function init(){const root=document.getElementById('matchAssistant')||document.body;observer.observe(root,{subtree:true,childList:true,characterData:true});schedule()}
window.addEventListener('gyx:raw-result-ready',schedule);
window.addEventListener('gyx:languagechange',()=>{cache.clear();schedule()});
window.addEventListener('gyx:localechange',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();