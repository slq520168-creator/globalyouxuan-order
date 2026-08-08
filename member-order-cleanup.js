(() => {
  'use strict';
  const db = window.gyxSupabase;
  if (!db) return;

  function lockMemberViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) viewport.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
    if (!document.getElementById('member-ios-zoom-fix')) {
      const style = document.createElement('style');
      style.id = 'member-ios-zoom-fix';
      style.textContent = `html,body{max-width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}#profileForm input,#profileForm select,#profileForm textarea,#materialForm input,#materialForm select,#materialForm textarea,#materialSearch,.txid-row input{font-size:16px!important;max-width:100%!important;min-width:0!important;transform:none!important}.dashboard-grid,.dashboard-main,.profile-card,.panel{min-width:0!important;max-width:100%!important}@media(max-width:960px){.dashboard-grid{padding-bottom:150px!important}.dashboard-main{padding-bottom:40px!important}#orders,#downloads,#materials{scroll-margin-bottom:110px}.order-list{padding-bottom:30px}}`;
      document.head.appendChild(style);
    }
  }
  lockMemberViewport();

  const toast=(text,error=false)=>{const e=document.getElementById('toast');if(!e)return;e.textContent=text;e.className='toast show'+(error?' error':'');clearTimeout(window.__memberQuickToast);window.__memberQuickToast=setTimeout(()=>e.className='toast',1800)};
  let currentUser=null;
  async function user(){if(currentUser)return currentUser;currentUser=await window.gyxGetVerifiedUser?.();return currentUser}
  function cleanQuote(v){return String(v||'').trim().replace(/^[“\"']|[”\"']$/g,'')}

  async function favoriteRow(card){
    const u=await user();if(!u)return null;
    const question=cleanQuote(card.querySelector('.favorite-question')?.textContent||'');
    const title=String(card.querySelector('h3')?.textContent||'').trim();
    let q=db.from('answer_favorites').select('id,answer_id,question,selections,tier,product_id,quoted_price,matched_title,matched_summary').eq('user_id',u.id);
    if(question)q=q.eq('question',question);if(title)q=q.eq('matched_title',title);
    let r=await q.order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(!r.data&&question)r=await db.from('answer_favorites').select('id,answer_id,question,selections,tier,product_id,quoted_price,matched_title,matched_summary').eq('user_id',u.id).eq('question',question).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    return r.data||null;
  }

  async function quickRemoveFavorite(card,button){
    if(!confirm('确定取消收藏吗？'))return;
    const parent=card.parentNode,next=card.nextSibling;
    card.style.opacity='.45';card.style.pointerEvents='none';
    requestAnimationFrame(()=>card.remove());
    try{
      const row=await favoriteRow(card);const u=await user();if(!row||!u)throw new Error('FAVORITE_NOT_FOUND');
      const r=await db.from('answer_favorites').delete().eq('id',row.id).eq('user_id',u.id);if(r.error)throw r.error;
      toast('已取消收藏');
    }catch{
      card.style.opacity='';card.style.pointerEvents='';if(parent){if(next)parent.insertBefore(card,next);else parent.appendChild(card)}toast('取消收藏失败，请稍后再试',true);
    }
  }

  async function quickOrderFavorite(card,button){
    const u=await user();if(!u){location.href='login.html?next='+encodeURIComponent('member.html#favorites');return}
    const old=button.textContent;button.disabled=true;button.textContent='正在创建订单…';
    try{
      const row=await favoriteRow(card);if(!row?.product_id||!row?.answer_id)throw new Error('FAVORITE_NOT_FOUND');
      const profile=await db.from('profiles').select('display_name,phone').eq('user_id',u.id).maybeSingle();
      const name=profile.data?.display_name||u.user_metadata?.display_name||u.email?.split('@')[0]||'会员';
      await window.gyxInvokeFunction('create-order',{product_id:row.product_id,customer_name:name,customer_email:u.email,customer_phone:profile.data?.phone||undefined,answer_id:Number(row.answer_id),customer_question:row.question,selection_path:Array.isArray(row.selections)?row.selections.slice(0,6):[],answer_tier:row.tier||'essential'});
      toast('订单已创建');document.getElementById('refreshOrdersButton')?.click();history.replaceState(null,'','#orders');setTimeout(()=>document.getElementById('orders')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }catch(err){const code=String(err?.code||err?.message||'');if(code.includes('OPEN_ORDER_ALREADY_EXISTS')){toast('已有待付款订单');document.getElementById('refreshOrdersButton')?.click();history.replaceState(null,'','#orders');setTimeout(()=>document.getElementById('orders')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}else toast('下单失败，请稍后再试',true)}finally{button.disabled=false;button.textContent=old}
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('a,button');if(!button)return;
    const card=button.closest?.('.favorite-card');if(!card)return;
    if(button.matches('a[href*="resume=order"],a[href*="favorite="]')){e.preventDefault();e.stopImmediatePropagation();quickOrderFavorite(card,button);return}
    if(button.classList.contains('btn-danger')&&(button.textContent||'').includes('取消')){e.preventDefault();e.stopImmediatePropagation();quickRemoveFavorite(card,button)}
  },true);

  let hiddenOrders = new Map();
  async function loadHiddenOrders(){const u=await user();if(!u)return;const {data}=await db.from('orders').select('id,order_no,hidden_by_user').eq('user_id',u.id).eq('hidden_by_user',true);hiddenOrders=new Map((data||[]).map(r=>[String(r.order_no||''),Number(r.id)]))}
  function orderNoFromCard(card){const m=(card.textContent||'').match(/GYX[A-Z0-9]{10,40}/);return m?m[0]:''}
  async function hideOrder(card,orderNo,button){if(!confirm('确定删除这条订单记录吗？'))return;const parent=card.parentNode,next=card.nextSibling;card.style.opacity='.45';requestAnimationFrame(()=>card.remove());try{const u=await user();const q=await db.from('orders').select('id').eq('user_id',u.id).eq('order_no',orderNo).maybeSingle();if(!q.data?.id)throw 0;const r=await db.rpc('hide_own_order',{p_order_id:q.data.id});if(r.error||r.data!==true)throw 0;hiddenOrders.set(orderNo,q.data.id);toast('已删除')}catch{card.style.opacity='';if(parent){if(next)parent.insertBefore(card,next);else parent.appendChild(card)}toast('删除失败，请稍后再试',true)}}
  function processCards(){document.querySelectorAll('#orderList .order-card').forEach(card=>{const orderNo=orderNoFromCard(card);if(!orderNo)return;if(hiddenOrders.has(orderNo)){card.remove();return}if(card.querySelector('[data-member-delete-order]'))return;const actions=document.createElement('div');actions.className='order-actions';const b=document.createElement('button');b.type='button';b.className='btn btn-danger btn-small';b.dataset.memberDeleteOrder='1';b.textContent='删除';b.addEventListener('click',()=>hideOrder(card,orderNo,b));actions.appendChild(b);card.appendChild(actions)});document.querySelectorAll('#downloadList .order-card').forEach(card=>{const n=orderNoFromCard(card);if(n&&hiddenOrders.has(n))card.remove()})}
  let scheduled=false;function scheduleCards(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;processCards()})}
  document.addEventListener('DOMContentLoaded',async()=>{await loadHiddenOrders();scheduleCards();const o=new MutationObserver(scheduleCards);['orderList','downloadList'].forEach(id=>{const el=document.getElementById(id);if(el)o.observe(el,{childList:true})})});
})();