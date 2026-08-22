(()=>{'use strict';

const I=window.GYXI18N,lang=I.locale,db=()=>window.gyxSupabase,esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&','<':'<','>':'>','"':'&quot',"'":'&#39;'}[m])),bjDate=()=>new Intl.DateTimeFormat(lang==='zh'?'zh-CN':lang==='km'?'km-KH':'en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric'}).format(new Date());let me=null,rows=[],titles={},active='A',redeemItem=null,tickerOn=false;
document.documentElement.lang=lang==='zh'?'zh-CN':lang;document.title=I.t('communityTitle')+' · GlobalYouXuan';I.render(document);document.getElementById('todayDate').textContent=bjDate();
function cleanTitle(v){return String(v||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function hasHan(v){return /[\u3400-\u9fff]/.test(v||'')}
function hasKm(v){return /[\u1780-\u17ff]/.test(v||'')}
function localeReady(v){return lang==='km'?hasKm(v):hasHan(v)}
function opportunityTitle(x){
  const fallback=I.t('communityOpportunityFallback');
  const raw=cleanTitle(x?.title);
  if(lang==='en') return raw||fallback;
  const key='communityOpportunity.'+String(x?.id||'')+'.title';
  const value=I.t(key);
  if(value&&value!==key&&value!==fallback) return value;
  const cached=cleanTitle(titles[x?.id]);
  if(cached) return cached;
  if(localeReady(raw)) return raw;
  return fallback;
}
function row(x){const code=(x.batch_code||'A')+String(x.opportunity_no||0),closed=x.opportunity_status==='closed',title=opportunityTitle(x);return `<article class="row${closed?' closed':''}"><span class="num">${esc(code)}</span><div class="title" title="${esc(title)}">${esc(title)}</div><button class="take" data-take="${x.id}"${closed?' disabled':''}>${esc(I.t('communityTake'))}</button></article>`}
function render(){const list=rows.filter(x=>x.batch_code===active).sort((a,b)=>(a.opportunity_no||0)-(b.opportunity_no||0));document.getElementById('feedList').innerHTML=list.length?list.map(row).join(''):`<div class="empty">${esc(I.t('communityBatchLoading').replace('{{batch}}',active))}</div>`;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.batch===active))}
function ticker(){const box=document.getElementById('tickerTrack');if(!rows.length){box.innerHTML=`<div class="empty">${esc(I.t('communityLoading'))}</div>`;return}const list=[...rows,...rows.slice(0,5)];box.innerHTML=list.map(x=>`<div class="tick"><i></i><b>${esc((x.batch_code||'A')+String(x.opportunity_no||0))} · ${esc(opportunityTitle(x))}</b></div>`).join('');if(tickerOn)return;tickerOn=true;let i=0;setInterval(()=>{i++;box.style.transition='transform .4s ease';box.style.transform=`translateY(${-i*25}px)`;if(i>=rows.length)setTimeout(()=>{i=0;box.style.transition='none';box.style.transform='translateY(0)'},420)},2600)}
function applyStats(s){s=s||{};document.getElementById('publishedCount').textContent=s.today_published||0;document.getElementById('takenCount').textContent=s.today_taken||0;document.getElementById('remainingCount').textContent=s.remaining||0;document.getElementById('cumulativeCount').textContent=s.cumulative_taken||0}
async function stats(){const {data}=await db().rpc('community_opportunity_public_stats_v3');const s=data?.[0]||{};applyStats(s);return s}
async function loadTranslations(ids){if(lang==='en'||!ids.length)return;const cacheLang=lang==='km'?'km':'zh';try{const {data}=await db().from('community_opportunity_translation_cache').select('opportunity_id,title').eq('lang',cacheLang).in('opportunity_id',ids);(data||[]).forEach(x=>{if(x?.opportunity_id&&x.title)titles[x.opportunity_id]=x.title})}catch{}}
async function ensureCache(){
  if(lang==='en')return;
  const missing=rows.some(x=>x.id&&!titles[x.id]&&!localeReady(cleanTitle(x.title)));
  if(!missing)return;
  try{await window.gyxInvokeFunction('community-opportunity-translate',{})}catch{}
  await loadTranslations(rows.map(x=>x.id).filter(Boolean));
}
async function load(){
  const authP=window.gyxGetVerifiedUser?.()||Promise.resolve(null);
  const feedP=db().from('community_external_feed').select('id,title,body,source_url,batch_code,opportunity_no,batch_key,opportunity_status').order('batch_code',{ascending:true}).order('opportunity_no',{ascending:true}).limit(40);
  const statsP=db().rpc('community_opportunity_public_stats_v3').then(r=>r?.data?.[0]||{}).catch(()=>({}));
  try{me=await authP}catch{me=null}
  if(!me){location.replace('login.html?next=community.html');return}
  try{
    const [{data,error},s]=await Promise.all([feedP,statsP]);
    if(error){document.getElementById('feedList').innerHTML=`<div class="empty">${esc(I.t('communityFailed'))}</div>`;return}
    rows=data||[];
    if(!rows.some(x=>x.batch_code==='A')&&rows.some(x=>x.batch_code==='B'))active='B';
    applyStats(s);
    render();
    ticker();
    const ids=rows.map(x=>x.id).filter(Boolean);
    loadTranslations(ids).catch(()=>{});
    ensureCache().catch(()=>{});
  }catch(e){}
}
function closeRedeem(){document.getElementById('redeemMask').hidden=true;redeemItem=null}
function successRedeem(text){document.getElementById('redeemBody').innerHTML=`<p class="redeem-success">${esc(text)}</p>`;document.getElementById('redeemActions').innerHTML=`<button class="redeem-cancel" type="button" data-close-redeem>${esc(I.t('communityCancel'))}</button><a class="redeem-downloads" href="member.html#downloads">${esc(I.t('communityDownloads'))}</a>`}
async function openRedeem(x){redeemItem=x;const mask=document.getElementById('redeemMask'),body=document.getElementById('redeemBody'),actions=document.getElementById('redeemActions');mask.hidden=false;body.innerHTML='<p class="redeem-note">…</p>';actions.innerHTML='';const {data:a}=await db().from('member_point_accounts').select('balance').eq('user_id',me.id).maybeSingle();const balance=Number(a?.balance||0),short=Math.max(0,2000-balance);body.innerHTML=`<div class="redeem-cost">2000</div><p>${esc(opportunityTitle(x))}</p><p class="redeem-note">${esc(I.t('communityCurrentBalance',{balance}))}</p>${short?`<p class="redeem-short">${esc(I.t('communityShort',{n:String(short)}))}</p>`:''}`;actions.innerHTML=`<button class="redeem-cancel" type="button" data-close-redeem>${esc(I.t('communityCancel'))}</button><button class="redeem-confirm" type="button" data-confirm-redeem${short?' disabled':''}>${esc(I.t('communityConfirm'))}</button>`}
async function redeem(){if(!redeemItem)return;const btn=document.querySelector('[data-confirm-redeem]');if(btn){btn.disabled=true;btn.textContent=I.t('communityWorking')}const {data,error}=await db().rpc('gyx_redeem_community_opportunity',{p_opportunity_id:redeemItem.id});if(error){const m=String(error.message||'');if(m.includes('INSUFFICIENT_POINTS:')){const n=m.split('INSUFFICIENT_POINTS:')[1]?.match(/\d+/)?.[0]||'';document.getElementById('redeemBody').innerHTML=`<p class="redeem-short">${esc(I.t('communityShort',{n}))}</p>`;return}if(m.includes('ALREADY_REDEEMED')){successRedeem(I.t('communityAlready'));return}successRedeem(I.t('communityUnavailable'));return}successRedeem(I.t('communitySuccess'));await stats();window.dispatchEvent(new CustomEvent('gyx:orders-changed',{detail:{source:'community-opportunity-redemption',redemption:data?.[0]||null}}))}
document.addEventListener('click',e=>{const tab=e.target.closest?.('[data-batch]');if(tab){active=tab.dataset.batch;render();return}const take=e.target.closest?.('[data-take]');if(take){const x=rows.find(v=>v.id===take.dataset.take);if(x)openRedeem(x);return}if(e.target.closest?.('[data-close-redeem]')){closeRedeem();return}if(e.target.closest?.('[data-confirm-redeem]')){redeem();return}},true);document.getElementById('redeemMask').addEventListener('click',e=>{if(e.target.id==='redeemMask')closeRedeem()});load();
})();
