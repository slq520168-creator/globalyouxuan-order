(()=>{
'use strict';
const $=id=>document.getElementById(id);
function init(){
 const F=$('problemForm'),N=$('problemInput'),Q=$('quizPanel'),R=$('resultPanel'),X=$('quizOptions'),S=$('quizStepLabel'),B=$('quizProgressBar'),O=$('originalQuestion'),H=$('quizQuestion'),P=$('quizHelp'),BK=$('quizBackButton'),RS=$('restartMatchButton'),RT=$('resultTitle'),RU=$('resultSummary'),RC=$('resultConfidence'),RR=$('resultTier'),RP=$('resultPrice'),DL=$('deliveryList'),RQ=$('resultQuestion'),RL=$('resultSelections');
 if(!F||!N||!Q||!X||F.dataset.gyxLiveSearch==='1')return;
 F.dataset.gyxLiveSearch='1';
 let rows=[],products=[],question='',history=[],busy=false;
 const norm=s=>String(s||'').toLowerCase().replace(/[\s，。！？、；：,.!?;:()（）【】\[\]"'“”‘’_\-\/\\]+/g,'');
 const grams=s=>{s=norm(s);const a=new Set();if(s.length<2){if(s)a.add(s);return a}for(let i=0;i<s.length-1;i++)a.add(s.slice(i,i+2));return a};
 const sim=(a,b)=>{a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return .95;const x=grams(a),y=grams(b);let hit=0;x.forEach(v=>{if(y.has(v))hit++});return x.size&&y.size?Math.min(1,(hit/x.size)*.72+(hit/y.size)*.28):0};
 const text=r=>[r.title,Array.isArray(r.keywords)?r.keywords.join(' '):r.keywords,r.answer_summary,r.answer_detail_zh].filter(Boolean).join(' ');
 const score=(r,s)=>Math.max(sim(s,r.title),sim(s,Array.isArray(r.keywords)?r.keywords.join(' '):r.keywords)*.98,sim(s,r.answer_summary)*.82,sim(s,r.answer_detail_zh)*.58);
 async function rest(path){const c=window.GYX_CONFIG;if(!c)return null;const res=await fetch(c.url+'/rest/v1/'+path,{headers:{apikey:c.publishableKey,Authorization:'Bearer '+c.publishableKey,Accept:'application/json'},cache:'no-store'});if(!res.ok)throw new Error('DB_'+res.status);return res.json()}
 async function db(){
  if(rows.length)return true;
  try{
   rows=await rest('product_answer_options?select=*&is_active=eq.true&limit=5000');
   if(!Array.isArray(rows)||!rows.length)return false;
   try{products=await rest('products?select=id,product_name,product_price,description&is_active=eq.true&limit=100')||[]}catch{products=[]}
   return true;
  }catch{return false}
 }
 function rank(){
  const used=new Set(history.map(v=>String(v.id))),last=history.at(-1)?.label||'',path=[question,...history.map(v=>v.label)].join(' ');
  return rows.map(r=>{let s;if(!history.length)s=score(r,question);else s=score(r,last)*.55+score(r,question)*.2+score(r,path)*.25;return{r,s}}).filter(v=>v.s>.025&&!used.has(String(v.r.id))).sort((a,b)=>b.s-a.s||(+b.r.priority||0)-(+a.r.priority||0));
 }
 function options(){const ranked=rank(),out=[],seen=new Set();for(const v of ranked){const label=String(v.r.title||'').trim();if(!label||seen.has(label))continue;seen.add(label);out.push({id:v.r.id,label});if(out.length===5)break}if(out.length<5){for(const r of rows){const label=String(r.title||'').trim();if(!label||seen.has(label))continue;const relevance=score(r,[question,...history.map(v=>v.label)].join(' '));if(relevance<=0)continue;seen.add(label);out.push({id:r.id,label});if(out.length===5)break}}return out}
 function paint(round){
  const opts=options();S.textContent=`第 ${round} / 5 轮`;if(B)B.style.width=round*20+'%';O.textContent=`“${question}”`;H.textContent=round===1?'请选择与你当前问题最接近的方向':`围绕“${history.at(-1)?.label||question}”，请选择下一步最接近的方向`;if(P)P.textContent='';if(BK)BK.classList.toggle('hidden',round===1);X.replaceChildren();
  opts.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.className='quiz-option compact';b.dataset.id=o.id;b.dataset.label=o.label;b.innerHTML=`<span class="option-number">${i+1}</span><strong>${o.label}</strong>`;X.appendChild(b)});
  if(!opts.length){busy=false;return}
  Q.classList.remove('hidden');busy=false;setTimeout(()=>Q.scrollIntoView({behavior:'smooth',block:'start'}),20);
 }
 function final(){
  const last=history.at(-1)?.label||'',path=[question,...history.map(v=>v.label)].join(' ');
  const best=rows.map(r=>({r,s:score(r,question)*.3+score(r,last)*.42+score(r,path)*.28})).sort((a,b)=>b.s-a.s)[0];if(!best){busy=false;return}
  const r=best.r,conf=Math.max(1,Math.min(99,Math.round(best.s*100))),tier=/完整|全流程|系统|长期/.test(text(r))?'professional':/详细|模板|案例|清单/.test(text(r))?'detailed':/步骤|教程|操作|方法|流程/.test(text(r))?'standard':'essential';
  const p=products.find(x=>x.id===r.product_id)||products[0]||null;Q.classList.add('hidden');R?.classList.remove('hidden');if(RT)RT.textContent=`“${r.title}”匹配方案`;if(RU)RU.textContent=r.answer_summary||'已根据你的问题和五轮选择，从资料库选出相关度最高的方案。';if(RC)RC.textContent=conf+'%';if(RR)RR.textContent={professional:'专业方案',detailed:'详细方案',standard:'标准教程',essential:'基础实用'}[tier];if(RP&&p)RP.textContent=Number(p.product_price||0).toFixed(2);if(DL){DL.innerHTML='<li>针对当前问题的完整执行步骤</li><li>可直接使用的工具、方法与模板</li><li>结果检查与优化建议</li>'}if(RQ)RQ.textContent=question;if(RL){RL.replaceChildren();history.forEach(v=>{const li=document.createElement('li');li.textContent=v.label;RL.appendChild(li)})}window.GYX_CURRENT_AI_MATCH={answer:r,product:p,tier,question,selections:history.map(v=>v.label),confidence:conf,local_score:best.s,needs_cloud_assist:conf<85};busy=false;
 }
 F.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const v=String(N.value||'').trim();if(v.length<2)return;busy=true;question=v;history=[];R?.classList.add('hidden');Q.classList.add('hidden');try{N.blur()}catch{}if(!(await db())){busy=false;return}paint(1)});
 X.addEventListener('click',e=>{const b=e.target.closest('.quiz-option');if(!b||busy)return;busy=true;history.push({id:b.dataset.id,label:b.dataset.label});history.length>=5?final():paint(history.length+1)});
 BK?.addEventListener('click',()=>{if(busy||!history.length)return;history.pop();paint(history.length+1)});
 RS?.addEventListener('click',()=>{history=[];question='';Q.classList.add('hidden');R?.classList.add('hidden');N.value='';N.focus()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();