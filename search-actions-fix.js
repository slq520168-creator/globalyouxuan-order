(()=>{
'use strict';
const $=id=>document.getElementById(id);
const input=$('problemInput'),quiz=$('quizPanel'),result=$('resultPanel'),confidence=$('resultConfidence');
const favorite=$('favoriteButton'),another=$('newQuestionButton'),order=$('orderAnswerButton');
function toast(text){const el=$('toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(window.__gyxToastTimer);window.__gyxToastTimer=setTimeout(()=>el.classList.remove('show'),1800)}
function home(){try{input.value='';input.blur()}catch{};quiz?.classList.add('hidden');result?.classList.add('hidden');const m=$('problemMessage');if(m){m.textContent='';m.className='form-message'}window.GYX_CURRENT_AI_MATCH=null;try{history.replaceState(null,'',location.pathname)}catch{};window.scrollTo({top:0,left:0,behavior:'auto'})}
function norm(s){return String(s||'').toLowerCase().replace(/[\s，。！？、；：,.!?;:()（）【】\[\]"'“”‘’_-]+/g,'')}
function grams(s,n=2){s=norm(s);const out=new Set();if(!s)return out;if(s.length<n){out.add(s);return out}for(let i=0;i<=s.length-n;i++)out.add(s.slice(i,i+n));return out}
function sim(source,target){const a=norm(source),b=norm(target);if(!a||!b)return 0;if(b.includes(a))return 1;const ga=grams(a),gb=grams(b);if(!ga.size||!gb.size)return 0;let hit=0;ga.forEach(x=>{if(gb.has(x))hit++});const recall=hit/ga.size;const precision=hit/gb.size;return Math.min(1,recall*.75+precision*.25)}
function computeConfidence(match){
  if(!match)return 0;
  if(match.answer?.id==='dynamic-fallback')return 48;
  const ans=[match.answer?.title,match.answer?.answer_summary,Array.isArray(match.answer?.keywords)?match.answer.keywords.join(' '):match.answer?.keywords].filter(Boolean).join(' ');
  const q=match.question||'';
  const sels=Array.isArray(match.selections)?match.selections:[];
  const last=sels.at(-1)||'';
  const prior=sels.slice(0,-1);
  const qScore=sim(q,ans);
  const lastScore=last?sim(last,ans):qScore;
  const histScore=prior.length?prior.reduce((s,x)=>s+sim(x,ans),0)/prior.length:lastScore;
  const weighted=qScore*.5+lastScore*.3+histScore*.2;
  let pct=Math.round(35+weighted*60);
  if(norm(match.answer?.title).includes(norm(q))||norm(ans).includes(norm(q)))pct=Math.max(pct,86);
  return Math.max(35,Math.min(96,pct));
}
function realConfidence(){
  if(!confidence||result?.classList.contains('hidden'))return;
  const match=window.GYX_CURRENT_AI_MATCH;if(!match)return;
  const pct=computeConfidence(match);
  match.confidence=pct;
  match.needs_cloud_assist=pct<80;
  match.delivery_review_required=pct<80;
  confidence.textContent=pct+'%';
  if(order){
    order.disabled=false;
    order.removeAttribute('aria-disabled');
    order.textContent='直接下单';
  }
}
const obs=result?new MutationObserver(()=>requestAnimationFrame(realConfidence)):null;obs?.observe(result,{attributes:true,childList:true,subtree:true});
another?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();home()},true);
document.addEventListener('click',e=>{const h=e.target.closest?.('.nav-home');if(!h)return;const p=(location.pathname||'').toLowerCase();if(!(p.includes('shop')||p.endsWith('/')))return;e.preventDefault();e.stopImmediatePropagation();home()},true);
favorite?.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();const m=window.GYX_CURRENT_AI_MATCH;if(!m){toast('请先完成一次匹配');return}const db=window.gyxSupabase;if(!db){toast('暂时无法收藏');return}const u=await window.gyxGetVerifiedUser?.();if(!u){location.href='login.html?next='+encodeURIComponent('shop.html');return}favorite.disabled=true;favorite.textContent='保存中…';const rawId=m.answer?.id;const answerId=Number.isFinite(Number(rawId))?Number(rawId):null;const payload={user_id:u.id,answer_id:answerId,question:m.question,selections:m.selections||[],tier:m.tier||'standard',product_id:m.product?.id||null,quoted_price:Number(m.product?.product_price||0),matched_title:m.answer?.title||m.question,matched_summary:m.answer?.answer_summary||'',updated_at:new Date().toISOString()};let r;if(answerId){r=await db.from('answer_favorites').upsert(payload,{onConflict:'user_id,answer_id'}).select('id').single()}else{r=await db.from('answer_favorites').insert(payload).select('id').single()}if(r.error){favorite.disabled=false;favorite.textContent='收藏答案';toast('收藏未完成，请稍后再试');return}favorite.textContent='已收藏';toast('已收藏到会员中心')},true);
window.GYX_HOME_RESET=home;
window.GYX_COMPUTE_MATCH_CONFIDENCE=computeConfidence;
if(!document.querySelector('script[data-gyx-checkout-fix]')){const s=document.createElement('script');s.src='checkout-actions-fix.js?v=20260808-2';s.dataset.gyxCheckoutFix='1';document.body.appendChild(s)}
})();