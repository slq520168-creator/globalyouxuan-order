(()=>{
'use strict';
const VALID=new Set(['zh-CN','en','km']);
const ui={
'zh-CN':{manual:'自主选择',auto:'智能生成',online:'联网',offline:'离线',round:(n)=>`第 ${n} / 5 轮`,choose:'请选择1个或多个关联问题',autoChoose:'AI正在自动筛选本轮关联问题',all:'全选',none:'取消全选',retry:'本轮重生成',next:'下一轮',back:'返回',count:n=>`本轮已选 ${n}`,working:'AI分析中…',history:'历史路径',start:'重新开始'},
en:{manual:'Self Select',auto:'Smart Generate',online:'Online',offline:'Offline',round:(n)=>`Round ${n} / 5`,choose:'Choose one or more related questions',autoChoose:'AI is selecting the best related options',all:'Select All',none:'Clear All',retry:'Regenerate Round',next:'Next Round',back:'Back',count:n=>`${n} selected`,working:'AI analyzing…',history:'Previous choices',start:'Start Over'},
km:{manual:'ជ្រើសដោយខ្លួនឯង',auto:'បង្កើតឆ្លាតវៃ',online:'អនឡាញ',offline:'ក្រៅបណ្តាញ',round:(n)=>`ជុំទី ${n} / 5`,choose:'ជ្រើសរើសសំណួរពាក់ព័ន្ធមួយ ឬច្រើន',autoChoose:'AI កំពុងជ្រើសជម្រើសដែលសមបំផុត',all:'ជ្រើសទាំងអស់',none:'លុបការជ្រើស',retry:'បង្កើតជុំនេះឡើងវិញ',next:'ជុំបន្ទាប់',back:'ត្រឡប់',count:n=>`បានជ្រើស ${n}`,working:'AI កំពុងវិភាគ…',history:'ជម្រើសមុន',start:'ចាប់ផ្តើមឡើងវិញ'}
};
let seq=0,timer=0,lastSig='';
const locale=()=>{try{const x=localStorage.getItem('gyx_locale');return VALID.has(x)?x:'zh-CN'}catch{return'zh-CN'}};
const langCode=l=>l==='zh-CN'?'zh':l;
const txt=(sel,v)=>{const e=document.querySelector(sel);if(e&&v!=null)e.textContent=v};
function applyChrome(){const l=locale(),c=ui[l],s=window.GYX_KNOWLEDGE_DECISION?.getState?.();
 const m=document.querySelector('#kdModeBar [data-mode="manual"]'),a=document.querySelector('#kdModeBar [data-mode="auto"]');if(m)m.textContent=c.manual;if(a)a.textContent=c.auto;
 const net=document.getElementById('kdNet');if(net)net.textContent=navigator.onLine?c.online:c.offline;
 if(s?.currentRound&&s.currentRound<=5)txt('#quizStepLabel',c.round(s.currentRound));
 if(document.getElementById('quizQuestion'))txt('#quizQuestion',s?.mode==='auto'?c.autoChoose:c.choose);
 txt('#restartMatchButton',c.start);txt('#quizBackButton',c.back);
 const all=document.querySelector('[data-kd="all"]'),none=document.querySelector('[data-kd="none"]'),retry=document.querySelector('[data-kd="retry"]'),next=document.querySelector('[data-kd="next"]');
 if(all)all.textContent=c.all;if(none)none.textContent=c.none;if(retry)retry.textContent=c.retry;if(next)next.textContent=c.next;
 const count=document.getElementById('kdCount');if(count)count.textContent=c.count(document.querySelectorAll('#quizOptions input:checked').length);
 const auto=document.getElementById('kdAutoStatus');if(auto&&/AI分析中|AI analyzing|AI កំពុងវិភាគ/.test(auto.textContent||''))auto.textContent=c.working;
 const hist=document.querySelector('.kd-history > b');if(hist)hist.textContent=c.history;
}
function sigFor(s,l){const r=s?.currentRound||0,qs=s?.questionsPerRound?.[r]||[];return l+'|'+r+'|'+qs.map(q=>q.id+':'+q.text).join('|')+'|'+(s?.finalPackage?.detailed_plan||'').slice(0,120)}
async function requestTranslation(s,l,mySeq){const target=langCode(l);if(!s||target===s.originalLanguage)return null;const r=s.currentRound||1,qs=s.questionsPerRound?.[r]||[];if(!qs.length&&r<=5)return null;
 try{const db=window.gyxSupabase,cfg=window.GYX_CONFIG;if(!db||!cfg)return null;const {data:{session}}=await db.auth.getSession();if(!session?.access_token)return null;
 const payload={round:r,questions:qs,history:s.selectedHistory||[],finalPackage:s.finalPackage||null};
 const resp=await fetch(cfg.url+'/functions/v1/knowledge-decision-ai',{method:'POST',headers:{'content-type':'application/json',apikey:cfg.publishableKey,Authorization:'Bearer '+session.access_token},body:JSON.stringify({action:'translate',target,content:payload})});
 if(!resp.ok)return null;const j=await resp.json();if(mySeq!==seq)return null;return j.translation||null;
 }catch{return null}}
function applyTranslation(tr){if(!tr)return;const qs=Array.isArray(tr.questions)?tr.questions:[];if(qs.length){document.querySelectorAll('#quizOptions .kd-option').forEach((el,i)=>{const q=qs.find(x=>String(x.id)===String(el.dataset.id))||qs[i];const strong=el.querySelector('strong');if(q&&strong)strong.textContent=String(q.text||'')})}
 if(tr.finalPackage&&document.getElementById('resultPanel')&&!document.getElementById('resultPanel').classList.contains('hidden')){const p=tr.finalPackage;txt('#resultTitle',p.title||'');txt('#resultSummary',p.summary||'');const list=document.getElementById('deliveryList');if(list&&Array.isArray(p.deliverables)){list.innerHTML='';p.deliverables.forEach(x=>{const li=document.createElement('li');li.textContent=String(x);list.appendChild(li)})}}
}
async function refresh(){applyChrome();const s=window.GYX_KNOWLEDGE_DECISION?.getState?.();if(!s)return;const l=locale(),sig=sigFor(s,l);if(sig===lastSig)return;lastSig=sig;const my=++seq;const tr=await requestTranslation(s,l,my);if(tr)applyTranslation(tr);applyChrome()}
function schedule(){clearTimeout(timer);timer=setTimeout(refresh,80)}
window.addEventListener('gyx:languagechange',schedule);window.addEventListener('gyx:global-languagechange',schedule);window.addEventListener('gyx:raw-result-ready',schedule);window.addEventListener('online',schedule);window.addEventListener('offline',schedule);window.addEventListener('storage',e=>{if(e.key==='gyx_locale')schedule()});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-language-select],[data-set-lang],[data-lang],[data-kd],#quizBackButton,#restartMatchButton'))schedule()},true);
const mo=new MutationObserver(schedule);function init(){const root=document.getElementById('matchAssistant')||document.body;if(root)mo.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();