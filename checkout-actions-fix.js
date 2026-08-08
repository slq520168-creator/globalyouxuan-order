(()=>{
'use strict';
const db=window.gyxSupabase,$=id=>document.getElementById(id);if(!db)return;
let currentUser=null,currentOrder=null,currentProduct=null,currentMatch=null;
const PENDING_KEY='gyx_pending_checkout_v1';
const msg=(id,text,ok=false)=>{const e=$(id);if(!e)return;e.textContent=text||'';e.className=text?`form-message show ${ok?'success':'error'}`:'form-message'};
const toast=text=>{const e=$('toast');if(!e)return;e.textContent=text;e.className='toast show';clearTimeout(window.__checkoutToast);window.__checkoutToast=setTimeout(()=>e.className='toast',1800)};
function step(name){const map={details:'orderStepDetails',payment:'orderStepPayment',success:'orderStepSuccess'};Object.values(map).forEach(id=>$(id)?.classList.remove('active'));$(map[name])?.classList.add('active')}
function close(){const m=$('orderModal');m?.classList.remove('show','open');m?.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');document.body.style.overflow=''}
async function user(){return await window.gyxGetVerifiedUser?.()||null}
function setChineseLabels(){const phoneLabel=$('orderPhone')?.closest('.form-group')?.querySelector('label');if(phoneLabel)phoneLabel.textContent='联系电话';const nameLabel=$('orderName')?.closest('.form-group')?.querySelector('label');if(nameLabel)nameLabel.textContent='姓名';const emailLabel=$('orderEmail')?.closest('.form-group')?.querySelector('label');if(emailLabel)emailLabel.textContent='邮箱';const b=$('createOrderButton');if(b)b.textContent='确认下单'}
function savePending(product,match){try{localStorage.setItem(PENDING_KEY,JSON.stringify({product_id:product?.id||null,match:match?{question:match.question||'',selections:match.selections||[],tier:match.tier||null,confidence:match.confidence||null,answer:match.answer?{id:match.answer.id,title:match.answer.title,answer_summary:match.answer.answer_summary,keywords:match.answer.keywords||[]}:null}:null,ts:Date.now()}))}catch{}}
function clearPending(){try{localStorage.removeItem(PENDING_KEY)}catch{}}
async function loadProduct(id){if(!id)return null;const r=await db.from('products').select('id,product_name,product_price,description,is_active').eq('id',id).eq('is_active',true).maybeSingle();return r.data||null}
async function openUnified(product,match=null){
  if(!product){toast('当前方案暂时无法下单');return}
  currentUser=await user();
  if(!currentUser){savePending(product,match);location.href='login.html?next='+encodeURIComponent('shop.html?resume=checkout');return}
  currentProduct=product;currentMatch=match||null;
  const pr=await db.from('profiles').select('display_name,phone').eq('user_id',currentUser.id).maybeSingle();
  const p=pr.data||{};
  $('orderName').value=p.display_name||currentUser.user_metadata?.display_name||currentUser.email?.split('@')[0]||'';
  $('orderEmail').value=currentUser.email||'';
  $('orderPhone').value=p.phone||'';
  ['orderName','orderEmail','orderPhone'].forEach(id=>{const e=$(id);if(e){e.readOnly=false;e.removeAttribute('aria-readonly');e.removeAttribute('tabindex')}});
  setChineseLabels();
  $('orderProductName').textContent=currentMatch?.answer?.title||currentProduct.product_name||'方案';
  $('orderProductDescription').textContent=currentMatch?.answer?.answer_summary||currentProduct.full_description||currentProduct.description||'';
  $('orderProductPrice').textContent=Number(currentProduct.product_price||0).toFixed(Number(currentProduct.product_price||0)%1?2:0);
  const cancel=$('cancelOrderButton');if(cancel)cancel.textContent='取消';
  msg('orderFormMessage','请核对本次订单联系方式，如有需要可直接修改。',true);
  step('details');
  const modal=$('orderModal');modal?.classList.add('show','open');modal?.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');document.body.style.overflow='hidden';
}
async function openSearch(){const match=window.GYX_CURRENT_AI_MATCH;if(!match?.product||!match?.answer||!Array.isArray(match.selections)||match.selections.length<5){toast('请先完成五轮匹配');return}await openUnified(match.product,match)}
async function openFixed(){const m=$('fixedDetailModal');const id=m?.dataset?.productId||window.GYX_SELECTED_FIXED_PRODUCT?.id;let product=window.GYX_SELECTED_FIXED_PRODUCT?.id===id?window.GYX_SELECTED_FIXED_PRODUCT:null;if(!product)product=await loadProduct(id);if(!product){toast('当前方案暂时无法下单');return}await openUnified(product,null)}
async function create(e){
  e.preventDefault();if(!currentUser||!currentProduct)return;
  const name=$('orderName').value.trim(),email=$('orderEmail').value.trim(),phone=$('orderPhone').value.trim();
  if(!name){msg('orderFormMessage','请填写姓名');return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg('orderFormMessage','请填写正确的邮箱');return}
  if(phone&&phone.length<6){msg('orderFormMessage','请填写正确的联系电话');return}
  const b=$('createOrderButton');b.disabled=true;b.textContent='正在下单…';msg('orderFormMessage','');
  try{
    const input={product_id:currentProduct.id,customer_name:name,customer_email:email};if(phone)input.customer_phone=phone;
    if(currentMatch){Object.assign(input,{answer_id:Number.isFinite(Number(currentMatch.answer?.id))?Number(currentMatch.answer.id):null,customer_question:currentMatch.question,selection_path:currentMatch.selections||[],answer_tier:currentMatch.tier})}
    const r=await window.gyxInvokeFunction('create-order',input);currentOrder=r?.order;if(!currentOrder)throw new Error('ORDER_CREATE_FAILED');clearPending();
    $('paymentOrderNo').textContent=currentOrder.order_no;$('paymentAmount').textContent=Number(currentOrder.payable_amount||currentProduct.product_price||0).toFixed(2);$('paymentNetwork').textContent=currentOrder.network||window.GYX_CONFIG?.network||'USDT-TRC20';$('paymentWallet').textContent=currentOrder.wallet_address||window.GYX_CONFIG?.wallet||'';$('paymentTxid').value=currentOrder.txid||'';step('payment');
  }catch(err){
    const code=String(err?.code||err?.message||'');
    if(code.includes('OPEN_ORDER_ALREADY_EXISTS')){const q=await db.from('orders').select('*').eq('product_id',currentProduct.id).in('status',['pending','checking']).order('created_at',{ascending:false}).limit(1).maybeSingle();if(q.data){currentOrder=q.data;$('paymentOrderNo').textContent=currentOrder.order_no;$('paymentAmount').textContent=Number(currentOrder.payable_amount||0).toFixed(2);$('paymentNetwork').textContent=currentOrder.network||'USDT-TRC20';$('paymentWallet').textContent=currentOrder.wallet_address||'';step('payment');msg('paymentMessage','已打开你尚未完成的订单。',true);return}}
    msg('orderFormMessage','订单创建失败，请稍后再试。');
  }finally{b.disabled=false;b.textContent='确认下单'}
}
async function pay(e){e.preventDefault();if(!currentOrder)return;const tx=$('paymentTxid').value.trim().toUpperCase();if(!/^[0-9A-F]{64}$/.test(tx)){msg('paymentMessage','请输入正确的64位TRON交易哈希');return}const b=$('submitPaymentButton');b.disabled=true;b.textContent='正在核验付款…';try{const r=await window.gyxInvokeFunction('submit-payment',{order_id:currentOrder.id,order_no:currentOrder.order_no,txid:tx});const st=r?.status||'checking';if(['paid','delivered'].includes(st)){step('success');$('successCopy').textContent='订单已确认，可在会员中心查看交付内容。'}else msg('paymentMessage','链上仍在确认，请稍后在会员中心查看。',true)}catch{msg('paymentMessage','付款核验暂时未完成，请稍后再试。')}finally{b.disabled=false;b.textContent='提交并核验付款'}}
async function copy(){const v=$('paymentWallet').textContent.trim();try{await navigator.clipboard.writeText(v);toast('收款地址已复制')}catch{toast(v)}}
async function resume(){const p=new URLSearchParams(location.search);if(p.get('resume')!=='checkout')return;let pending=null;try{pending=JSON.parse(localStorage.getItem(PENDING_KEY)||'null')}catch{};if(!pending?.product_id)return;const product=await loadProduct(pending.product_id);if(!product){clearPending();return}let match=null;if(pending.match){match={...pending.match,product};if(pending.match.answer)match.answer=pending.match.answer}await openUnified(product,match);try{history.replaceState(null,'',location.pathname)}catch{}}
document.addEventListener('click',e=>{if(e.target.closest?.('#orderAnswerButton')){e.preventDefault();e.stopImmediatePropagation();openSearch();return}if(e.target.closest?.('.fixed-detail-buy')){e.preventDefault();e.stopImmediatePropagation();openFixed();return}},true);
$('orderDetailsForm')?.addEventListener('submit',create,true);$('paymentForm')?.addEventListener('submit',pay,true);$('closeOrderButton')?.addEventListener('click',close,true);$('cancelOrderButton')?.addEventListener('click',close,true);$('successCloseButton')?.addEventListener('click',close,true);$('paymentBackButton')?.addEventListener('click',()=>step('details'),true);$('copyWalletButton')?.addEventListener('click',copy,true);$('orderModal')?.addEventListener('click',e=>{if(e.target===$('orderModal'))close()});
window.GYX_OPEN_CHECKOUT=openUnified;
setChineseLabels();
resume();
})();