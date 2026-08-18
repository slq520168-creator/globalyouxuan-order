(()=>{
  'use strict';
  if(window.__GYX_DOWNLOAD_ACTION__) return;
  window.__GYX_DOWNLOAD_ACTION__=1;

  const I=window.GYXI18N;
  const db=window.gyxSupabase;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let rows=[];
  let opportunityRows=[];
  let busy=false;
  let syncTimer=0;


  function safeName(v){return String(v||'GlobalYouXuan').replace(/[\\/:*?"<>|]+/g,'_').slice(0,80)}
  function fmt(v){if(!v)return '';try{return new Intl.DateTimeFormat(I?.locale==='en'?'en-US':I?.locale==='km'?'km-KH':'zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return String(v)}}
  function title(o){const key='product.'+String(o?.product_id||'')+'.name';if(Object.prototype.hasOwnProperty.call(I.resources.zh,key))return I.t(key);return o.delivery_title||o.matched_answer_title||o.product_name||o.product_id||I.t('memberPayDelivery')}
  function syncTranslatedTitle(o,translatedTitle,source){const t=String(translatedTitle||'').trim();if(!t)return;o.delivery_title=t;const card=source?.closest?.('.order-card'),h=card?.querySelector?.('.order-title');if(h)h.textContent=t}
  function toast(text,error=false){const t=document.getElementById('toast');if(!t)return;t.textContent=text;t.className=`toast show${error?' error':''}`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.className='toast',3200)}
  function fileLocationText(){return window.GYXI18N.t("memberDownloadActionCopy001")}
  function ensureLoaderStyle(){if(document.getElementById('gyx-five-loader-style'))return;const s=document.createElement('style');s.id='gyx-five-loader-style';s.textContent='@keyframes gyxFivePulse{0%,100%{opacity:.22;transform:scaleY(.72)}50%{opacity:1;transform:scaleY(1.25)}}.gyx-five-loader{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:74px;height:20px}.gyx-five-loader i{display:block;width:10px;height:5px;border-radius:999px;background:currentColor;opacity:.22;animation:gyxFivePulse 1s ease-in-out infinite}.gyx-five-loader i:nth-child(2){animation-delay:.12s}.gyx-five-loader i:nth-child(3){animation-delay:.24s}.gyx-five-loader i:nth-child(4){animation-delay:.36s}.gyx-five-loader i:nth-child(5){animation-delay:.48s}';document.head.appendChild(s)}
  function showLoader(btn){ensureLoaderStyle();btn.replaceChildren();const w=document.createElement('span');w.className='gyx-five-loader';w.setAttribute('aria-hidden','true');for(let i=0;i<5;i++)w.appendChild(document.createElement('i'));btn.appendChild(w)}
  function setCount(n){const sec=document.getElementById('downloads'),badge=sec?.querySelector(':scope>.member-fold-head .member-count-badge'),brief=sec?.querySelector(':scope>.member-fold-head .member-fold-brief');if(badge)badge.textContent=String(n);if(brief)brief.textContent=I.t('memberRecordCount',{count:n})}
  function sortNewestFirst(list){return [...list].sort((a,b)=>(Date.parse(b.created_at||'')||0)-(Date.parse(a.created_at||'')||0)||Number(b.id||0)-Number(a.id||0))}
  function focusRequested(){let ref='';try{ref=sessionStorage.getItem('gyx_download_order')||''}catch{}if(!ref)return;const card=[...document.querySelectorAll('#downloadList .order-card')].find(x=>x.dataset.gyxDownloadOrderNo===ref);if(!card)return;try{sessionStorage.removeItem('gyx_download_order')}catch{}setTimeout(()=>card.scrollIntoView({behavior:'auto',block:'center'}),60)}

  async function invokeUntilReady(fn,o,btn,max=90){
    showLoader(btn);
    for(let i=0;i<max;i++){
      const r=await window.gyxInvokeFunction(fn,{order_id:o.id});
      const waiting=r?.error==='DELIVERY_PREPARING'||r?.error==='TRANSLATION_PREPARING'||r?.status==='pending'||r?.status==='processing';
      if(waiting){await sleep(4000);continue}
      return r;
    }
    return {error:'DELIVERY_STILL_PREPARING'};
  }

  async function downloadAnswer(o,btn){
    const old=btn.textContent;btn.disabled=true;showLoader(btn);
    try{
      const r=await invokeUntilReady('claim-answer-download',o,btn);
      if(r?.error==='DELIVERY_STILL_PREPARING'){btn.disabled=false;btn.textContent=old;return}
      if(!r?.content)throw new Error(r?.error||'NO_CONTENT');
      syncTranslatedTitle(o,r.title,btn);
      const bom=new Uint8Array([0xEF,0xBB,0xBF]),body=new TextEncoder().encode(String(r.content).replace(/\r?\n/g,'\r\n')),blob=new Blob([bom,body],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=safeName(r.title||title(o))+'-'+o.order_no+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast(fileLocationText());
      btn.disabled=true;
      btn.textContent=window.GYXI18N.t("memberDownloadActionCopy002");
      await refresh();
      window.dispatchEvent(new CustomEvent('gyx:orders-changed',{detail:{source:'download-complete',order_id:o.id}}));
    }catch(e){console.error('download answer',e);btn.disabled=false;btn.textContent=old;toast(window.GYXI18N.t("memberDownloadActionCopy003"),true)}
  }

  function shell(o){const c=document.createElement('article');c.className='order-card';c.dataset.gyxDownloadOrderNo=String(o.order_no||o.id||'');const top=document.createElement('div');top.className='order-top';const w=document.createElement('div'),h=document.createElement('h3'),m=document.createElement('p');h.className='order-title';h.textContent=title(o);m.className='order-number';m.textContent=[o.order_no,fmt(o.created_at)].filter(Boolean).join(' · ');w.append(h,m);const b=document.createElement('span');b.className='status-badge delivered';b.textContent=o.delivery_downloaded_at?window.GYXI18N.t("memberDownloadActionCopy004"):window.GYXI18N.t("delivered");top.append(w,b);c.append(top);return c}
  function card(o){const c=shell(o),actions=document.createElement('div');actions.className='order-actions';if(o.delivery_downloaded_at){const b=document.createElement('button'),p=document.createElement('p');b.className='btn';b.type='button';b.disabled=true;b.textContent=window.GYXI18N.t("memberDownloadActionCopy002");p.className='muted';p.textContent=fileLocationText();actions.append(b);c.append(actions,p);return c}if(String(o.status)==='delivered'&&(Number.isFinite(Number(o.answer_id))||o.source_module==='home_fixed'||String(o.product_id||'').startsWith('spare-time-'))){const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=window.GYXI18N.t("memberDownloadActionCopy005");b.onclick=()=>downloadAnswer(o,b);actions.append(b)}else if(String(o.status)==='paid'){const p=document.createElement('p');p.className='muted';p.textContent=window.GYXI18N.t("memberDownloadActionCopy006");c.append(p)}if(actions.childNodes.length)c.append(actions);return c}

  function downloadOpportunity(r,btn){const text=String(r.delivery_text_snapshot||''),bom=new Uint8Array([0xEF,0xBB,0xBF]),body=new TextEncoder().encode(text.replace(/\r?\n/g,'\r\n')),blob=new Blob([bom,body],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=safeName(r.reward_title||window.GYXI18N.t("memberDownloadActionCopy007"))+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);if(btn){btn.disabled=true;btn.textContent=window.GYXI18N.t("memberDownloadActionCopy002");const p=document.createElement('p');p.className='muted';p.textContent=fileLocationText();btn.closest('.order-card')?.append(p)}toast(fileLocationText())}
  function opportunityCard(r){const c=document.createElement('article');c.className='order-card';c.dataset.gyxOpportunityRedemption=String(r.id||'');const top=document.createElement('div'),w=document.createElement('div'),h=document.createElement('h3'),m=document.createElement('p'),badge=document.createElement('span');top.className='order-top';h.className='order-title';h.textContent=r.reward_title||window.GYXI18N.t("memberDownloadActionCopy007");m.className='order-number';m.textContent=[window.GYXI18N.t("memberDownloadActionCopy008"),`${Number(r.points_spent||2000)} ${window.GYXI18N.t("memberDownloadActionCopy009")}`,fmt(r.created_at)].join(' · ');badge.className='status-badge delivered';badge.textContent=window.GYXI18N.t("memberDownloadActionCopy010");w.append(h,m);top.append(w,badge);c.append(top);const actions=document.createElement('div'),down=document.createElement('button');actions.className='order-actions';down.className='btn';down.type='button';down.textContent=window.GYXI18N.t("memberDownloadActionCopy005");down.onclick=()=>downloadOpportunity(r,down);actions.append(down);c.append(actions);return c}

  function render(){const list=document.getElementById('downloadList');if(!list)return;rows=sortNewestFirst(rows);opportunityRows=sortNewestFirst(opportunityRows);list.replaceChildren();setCount(rows.length+opportunityRows.length);const merged=[...rows.map(x=>({kind:'order',created_at:x.created_at,data:x})),...opportunityRows.map(x=>({kind:'opportunity',created_at:x.created_at,data:x}))].sort((a,b)=>(Date.parse(b.created_at||'')||0)-(Date.parse(a.created_at||'')||0));if(!merged.length){const e=document.createElement('div');e.className='empty-state';e.textContent=window.GYXI18N.t("memberDownloadActionCopy011");list.append(e);return}for(const x of merged)list.append(x.kind==='opportunity'?opportunityCard(x.data):card(x.data));focusRequested()}
  async function refresh(){if(busy||!db)return;busy=true;try{const u=await window.gyxGetVerifiedUser?.();if(!u)return;const [or,rr]=await Promise.all([db.from('orders').select('id,order_no,product_id,product_name,matched_answer_title,status,answer_id,source_module,source_type,delivery_locale,delivery_downloaded_at,created_at,updated_at,hidden_by_user').eq('user_id',u.id).eq('hidden_by_user',false).in('status',['paid','delivered']).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100),db.from('member_point_redemptions').select('id,reward_title,delivery_text_snapshot,points_spent,status,created_at,opportunity_id').eq('user_id',u.id).not('opportunity_id','is',null).order('created_at',{ascending:false}).limit(100)]);if(or.error)console.error('load downloads',or.error);else rows=sortNewestFirst(or.data||[]);if(rr.error)console.error('load opportunity redemptions',rr.error);else opportunityRows=sortNewestFirst(rr.data||[]);render()}finally{busy=false}}
  function scheduleRefresh(ms=40){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{if(busy){scheduleRefresh(120);return}refresh()},ms)}
  function open(orderNo){const ref=String(orderNo||'').trim();if(!ref)return false;try{sessionStorage.setItem('gyx_download_order',ref)}catch{}const target='member.html#downloads',onTarget=/\/member\.html$/.test(location.pathname)&&!location.search&&location.hash==='#downloads';if(onTarget){scheduleRefresh(0);document.getElementById('downloads')?.scrollIntoView({block:'start'});setTimeout(focusRequested,60);return true}location.replace(target);return true}
  function init(){refresh();document.addEventListener('member:opened',e=>{if(e.target?.id==='downloads')scheduleRefresh(0)});window.addEventListener('gyx:orders-changed',()=>scheduleRefresh(40));window.addEventListener('gyx:orders-snapshot',()=>scheduleRefresh(40));window.addEventListener('gyx:languagechange',render)}
  window.GYX_DOWNLOAD=Object.freeze({open});window.dispatchEvent(new Event('gyx:download-ready'));const pendingDownload=String(window.__GYX_PENDING_DOWNLOAD__||'').trim();if(pendingDownload){delete window.__GYX_PENDING_DOWNLOAD__;queueMicrotask(()=>open(pendingDownload))}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();