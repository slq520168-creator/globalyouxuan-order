(()=>{
  'use strict';
  if(window.__GYX_DOWNLOAD_ACTION__) return;
  window.__GYX_DOWNLOAD_ACTION__=1;

  const I=window.GYXI18N;
  const db=window.gyxSupabase;
  const L=(zh,en,km)=>I?.locale==='en'?en:I?.locale==='km'?km:zh;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let rows=[];
  let busy=false;

  function safeName(v){return String(v||'GlobalYouXuan').replace(/[\\/:*?"<>|]+/g,'_').slice(0,80)}
  function fmt(v){if(!v)return '';try{return new Intl.DateTimeFormat(I?.locale==='en'?'en-US':I?.locale==='km'?'km-KH':'zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return String(v)}}
  function title(o){
    if(o.delivery_locale==='en') return o.delivery_title||'Delivery';
    if(o.delivery_locale==='km') return o.delivery_title||'ការប្រគល់';
    return o.matched_answer_title||o.product_name||o.product_id||'交付内容';
  }
  function toast(text,error=false){const t=document.getElementById('toast');if(!t)return;t.textContent=text;t.className=`toast show${error?' error':''}`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.className='toast',3200)}
  function preparingText(){return L('正在按订单语言生成完整交付…','Preparing the complete delivery in your order language…','កំពុងរៀបចំការប្រគល់ពេញលេញតាមភាសានៃការបញ្ជាទិញ…')}
  function setCount(n){const sec=document.getElementById('downloads'),badge=sec?.querySelector(':scope>.member-fold-head .member-count-badge'),brief=sec?.querySelector(':scope>.member-fold-head .member-fold-brief');if(badge)badge.textContent=String(n);if(brief)brief.textContent=I?.locale==='en'?`${n} records`:I?.locale==='km'?`${n} កំណត់ត្រា`:`共 ${n} 条`}
  function sortNewestFirst(list){return [...list].sort((a,b)=>(Date.parse(b.created_at||'')||0)-(Date.parse(a.created_at||'')||0)||Number(b.id||0)-Number(a.id||0))}

  async function invokeUntilReady(fn,o,btn,max=45){
    for(let i=0;i<max;i++){
      const r=await window.gyxInvokeFunction(fn,{order_id:o.id});
      if(r?.error==='TRANSLATION_PREPARING'||r?.status==='pending'||r?.status==='processing'){
        btn.textContent=preparingText();
        if(i===0) toast(preparingText());
        await sleep(2500);
        continue;
      }
      return r;
    }
    return {error:'TRANSLATION_TIMEOUT'};
  }

  async function downloadAnswer(o,btn){
    const old=btn.textContent;btn.disabled=true;btn.textContent=L('正在准备…','Preparing…','កំពុងរៀបចំ…');
    try{
      const r=await invokeUntilReady('claim-answer-download',o,btn);
      if(!r?.content) throw new Error(r?.error||'NO_CONTENT');
      const bom=new Uint8Array([0xEF,0xBB,0xBF]),body=new TextEncoder().encode(String(r.content).replace(/\r?\n/g,'\r\n')),blob=new Blob([bom,body],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=safeName(r.title||title(o))+'-'+o.order_no+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast(L('已下载，请到手机“文件/下载”中查看；也可在这里点击“查看内容”','Downloaded. Check Files/Downloads, or tap View content here.','បានទាញយក។ សូមពិនិត្យ Files/Downloads ឬមើលមាតិកានៅទីនេះ'));
      await refresh();
    }catch(e){console.error('download answer',e);btn.disabled=false;btn.textContent=old;toast(L('交付准备失败，请重试','Delivery preparation failed. Retry.','ការរៀបចំការប្រគល់បរាជ័យ សូមព្យាយាមម្តងទៀត'),true)}
  }

  async function toggleContent(o,btn,box,pre){
    if(btn.dataset.loaded==='1'){const isOpen=box.style.display!=='none';box.style.display=isOpen?'none':'block';btn.textContent=isOpen?L('查看内容','View content','មើលមាតិកា'):L('收起内容','Hide content','លាក់មាតិកា');btn.setAttribute('aria-expanded',String(!isOpen));return}
    const old=btn.textContent;btn.disabled=true;btn.textContent=L('正在读取…','Loading…','កំពុងផ្ទុក…');
    try{
      const r=await invokeUntilReady('get-purchased-answer',o,btn);
      if(!r?.answer?.content) throw new Error(r?.error||'NO_CONTENT');
      pre.textContent=r.answer.content;btn.dataset.loaded='1';box.style.display='block';btn.textContent=L('收起内容','Hide content','លាក់មាតិកា');btn.setAttribute('aria-expanded','true');
    }catch(e){console.error('view purchased answer',e);btn.textContent=old;toast(L('内容准备失败，请重试','Could not prepare the delivery. Retry.','មិនអាចរៀបចំមាតិកាបាន សូមព្យាយាមម្តងទៀត'),true)}finally{btn.disabled=false}
  }

  function shell(o){const c=document.createElement('article');c.className='order-card';const top=document.createElement('div');top.className='order-top';const w=document.createElement('div'),h=document.createElement('h3'),m=document.createElement('p');h.className='order-title';h.textContent=title(o);m.className='order-number';m.textContent=[o.order_no,fmt(o.created_at)].filter(Boolean).join(' · ');w.append(h,m);const b=document.createElement('span');b.className='status-badge delivered';b.textContent=o.delivery_downloaded_at?L('已下载','Downloaded','បានទាញយក'):L('已完成','Completed','បានបញ្ចប់');top.append(w,b);c.append(top);return c}
  function card(o){const c=shell(o),actions=document.createElement('div');actions.className='order-actions';if(o.delivery_downloaded_at){const b=document.createElement('button'),box=document.createElement('div'),pre=document.createElement('pre');b.className='btn';b.type='button';b.textContent=L('查看内容','View content','មើលមាតិកា');b.setAttribute('aria-expanded','false');box.className='purchased-answer';box.style.display='none';pre.style.whiteSpace='pre-wrap';pre.style.wordBreak='break-word';box.append(pre);b.onclick=()=>toggleContent(o,b,box,pre);actions.append(b);c.append(actions,box);return c}if(String(o.status)==='delivered'&&(Number.isFinite(Number(o.answer_id))||o.source_module==='home_fixed')){const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=L('点击下载','Download','ចុចទាញយក');b.onclick=()=>downloadAnswer(o,b);actions.append(b)}else if(String(o.status)==='paid'){const p=document.createElement('p');p.className='muted';p.textContent=L('付款已确认，等待交付完成','Payment confirmed, awaiting delivery','បានបង់ប្រាក់ រង់ចាំការប្រគល់');c.append(p)}if(actions.childNodes.length)c.append(actions);return c}
  function render(){const list=document.getElementById('downloadList');if(!list)return;rows=sortNewestFirst(rows);list.replaceChildren();setCount(rows.length);if(!rows.length){const e=document.createElement('div');e.className='empty-state';e.textContent=L('暂无可下载内容','No downloads available','មិនទាន់មានឯកសារទាញយក');list.append(e);return}rows.forEach(o=>list.append(card(o)))}
  async function refresh(){if(busy||!db)return;busy=true;try{const u=await window.gyxGetVerifiedUser?.();if(!u)return;const r=await db.from('orders').select('id,order_no,product_id,product_name,matched_answer_title,status,answer_id,source_module,source_type,delivery_locale,delivery_downloaded_at,created_at,updated_at,hidden_by_user').eq('user_id',u.id).eq('hidden_by_user',false).in('status',['paid','delivered']).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100);if(r.error){console.error('load downloads',r.error);return}rows=sortNewestFirst(r.data||[]);render()}finally{busy=false}}
  function init(){refresh();document.addEventListener('member:opened',e=>{if(e.target?.id==='downloads')refresh()});window.addEventListener('gyx:orders-changed',refresh);window.addEventListener('gyx:languagechange',render)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();