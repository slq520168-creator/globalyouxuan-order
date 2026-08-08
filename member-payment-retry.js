(() => {
  'use strict';
  const seen = new WeakSet();
  function enhanceFailedOrders(){
    document.querySelectorAll('#orderList .order-card').forEach(card=>{
      if(seen.has(card)||!card.querySelector('.status-badge.failed'))return;
      const orderNo=(card.querySelector('.order-number')?.textContent||'').trim();if(!/^GYX[A-Z0-9]{10,40}$/.test(orderNo))return;seen.add(card);
      const tip=document.createElement('p');tip.className='order-number';tip.textContent='付款核验失败，可重新提交新的TXID。';
      const row=document.createElement('div');row.className='txid-row';
      const input=document.createElement('input');input.className='field';input.type='text';input.maxLength=64;input.autocapitalize='characters';input.autocomplete='off';input.placeholder='重新粘贴64位TRON交易哈希';
      const button=document.createElement('button');button.className='btn';button.type='button';button.textContent='重新提交付款';
      button.addEventListener('click',async()=>{const txid=input.value.trim().toUpperCase();if(!/^[0-9A-F]{64}$/.test(txid)){alert('请输入有效的64位TRON TXID');return}button.disabled=true;button.textContent='正在核验…';try{const r=await window.gyxInvokeFunction('submit-payment',{order_no:orderNo,txid});alert(r&&['paid','delivered'].includes(r.status)?'付款已确认。':'新的TXID已提交，正在核验。');document.getElementById('refreshOrdersButton')?.click()}catch(e){alert('重新提交失败：'+String(e?.message||e||'未知错误'));button.disabled=false;button.textContent='重新提交付款'}});
      row.append(input,button);card.append(tip,row);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const list=document.getElementById('orderList');if(!list)return;
    let timer=null;const run=()=>{clearTimeout(timer);timer=setTimeout(enhanceFailedOrders,80)};
    const observer=new MutationObserver(run);observer.observe(list,{childList:true});run();
  });
})();