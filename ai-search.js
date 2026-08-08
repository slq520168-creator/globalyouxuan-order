(()=>{
'use strict';
const $=id=>document.getElementById(id);
function init(){
 const F=$('problemForm'),N=$('problemInput'),Q=$('quizPanel'),R=$('resultPanel'),X=$('quizOptions'),S=$('quizStepLabel'),B=$('quizProgressBar'),O=$('originalQuestion'),H=$('quizQuestion'),P=$('quizHelp'),BK=$('quizBackButton'),RS=$('restartMatchButton'),RT=$('resultTitle'),RU=$('resultSummary'),RC=$('resultConfidence'),RR=$('resultTier'),RP=$('resultPrice'),DL=$('deliveryList'),RQ=$('resultQuestion'),RL=$('resultSelections'),M=$('problemMessage');
 if(!F||!N||!Q||!X||F.dataset.gyxLiveSearch==='1')return;
 F.dataset.gyxLiveSearch='1';
 let rows=[],products=[],question='',history=[],busy=false;
 const answerProduct={essential:'answer-essential',standard:'answer-standard',detailed:'answer-detailed',professional:'answer-professional',custom:'answer-custom'};
 const norm=s=>String(s||'').toLowerCase().replace(/[\s，。！？、；：,.!?;:()（）【】\[\]"'“”‘’_\-\/\\]+/g,'');
 const grams=s=>{s=norm(s);const a=new Set();if(s.length<2){if(s)a.add(s);return a}for(let i=0;i<s.length-1;i++)a.add(s.slice(i,i+2));return a};
 const sim=(a,b)=>{a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;const short=a.length<=6?a:b.length<=6?b:'';const long=short===a?b:a;if(short&&long.includes(short)){const ratio=short.length/Math.max(short.length,long.length);return Math.min(.94,.50+ratio*.38)}const x=grams(a),y=grams(b);let hit=0;x.forEach(v=>{if(y.has(v))hit++});return x.size&&y.size?Math.min(1,(hit/x.size)*.68+(hit/y.size)*.32):0};
 const kws=r=>Array.isArray(r.keywords)?r.keywords:[];
 const text=r=>[r.title,...kws(r),r.answer_summary,r.answer_detail_zh].filter(Boolean).join(' ');
 function score(r,s){
  const q=norm(s);if(!q)return 0;
  const titleText=norm(r.title),title=sim(s,r.title);
  if(titleText===q)return .99;
  let exactKw=0,bestKw=0;
  for(const k of kws(r)){
   const nk=norm(k);if(!nk)continue;
   if(nk===q)exactKw=Math.max(exactKw,.96);
   else if(q.length>=4&&nk.includes(q))exactKw=Math.max(exactKw,.84);
   else if(nk.length>=4&&q.includes(nk)){const coverage=nk.length/Math.max(nk.length,q.length);exactKw=Math.max(exactKw,.50+.32*coverage)}
   bestKw=Math.max(bestKw,sim(s,k));
  }
  const summary=sim(s,r.answer_summary),detail=sim(s,r.answer_detail_zh);
  let weighted=title*.54+bestKw*.28+summary*.12+detail*.06;
  if(q.length>=4&&titleText.includes(q)){const coverage=q.length/Math.max(q.length,titleText.length);weighted=Math.max(weighted,.72+.22*coverage)}
  return Math.max(0,Math.min(.99,Math.max(weighted,exactKw)));
 }
 async function rest(path){const c=window.GYX_CONFIG;if(!c)throw new Error('CONFIG_MISSING');const res=await fetch(c.url+'/rest/v1/'+path,{headers:{apikey:c.publishableKey,Authorization:'Bearer '+c.publishableKey,Accept:'application/json'},cache:'no-store'});if(!res.ok)throw new Error('DB_'+res.status);return res.json()}
 async function db(){if(rows.length)return true;try{rows=await rest('product_answer_options?select=*&is_active=eq.true&limit=5000');if(!Array.isArray(rows)||!rows.length)throw new Error('NO_ROWS');products=await rest('products?select=id,product_name,product_price,description&is_active=eq.true&limit=100').catch(()=>[])||[];return true}catch(e){if(M){M.textContent='暂时无法连接资料库，请稍后重试';M.className='form-message show error'}return false}}
 function rank(){const used=new Set(history.map(v=>String(v.id))),last=history.at(-1)?.label||'',path=[question,...history.map(v=>v.label)].join(' ');return rows.map(r=>{let s=!history.length?score(r,question):score(r,last)*.52+score(r,question)*.30+score(r,path)*.18;return{r,s}}).filter(v=>v.s>.04&&!used.has(String(v.r.id))).sort((a,b)=>b.s-a.s||(+b.r.priority||0)-(+a.r.priority||0))}
 function options(){const ranked=rank(),out=[],seen=new Set();for(const v of ranked){const label=String(v.r.title||'').trim(),key=norm(label);if(!label||seen.has(key))continue;seen.add(key);out.push({id:v.r.id,label,row:v.r,score:v.s});if(out.length===5)break}return out}
 function paint(round){const opts=options();S.textContent=`第 ${round} / 5 轮`;if(B)B.style.width=round*20+'%';O.textContent=`“${question}”`;H.textContent=round===1?'请选择与你当前问题最接近的方向':`围绕“${history.at(-1)?.label||question}”，请选择下一步最接近的方向`;if(P)P.textContent='';if(BK)BK.classList.toggle('hidden',round===1);X.replaceChildren();opts.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.className='quiz-option compact';b.dataset.id=o.id;b.dataset.label=o.label;b.dataset.matchScore=String(o.score);b.innerHTML=`<span class="option-number">${i+1}</span><strong>${o.label}</strong>`;X.appendChild(b)});if(!opts.length){busy=false;if(M){M.textContent='没有找到足够相关的方案，请换一种说法';M.className='form-message show error'}return}Q.classList.remove('hidden');busy=false;setTimeout(()=>Q.scrollIntoView({behavior:'smooth',block:'start'}),20)}
 function confidenceFor(best){
  const original=score(best,question);
  const weights=[.06,.10,.14,.25,.45];
  let pathScore=0,weightTotal=0;
  history.forEach((h,i)=>{const w=weights[i]||.1;const optionScore=Number.isFinite(h.score)?h.score:score(best,h.label);const answerFit=score(best,h.label);pathScore+=(optionScore*.35+answerFit*.65)*w;weightTotal+=w});
  pathScore=weightTotal?pathScore/weightTotal:original;
  const raw=Math.max(0,Math.min(.99,original*.38+pathScore*.62));
  // 这是资料库“匹配度”而不是概率。将文本相似度校准到用户可理解的展示区间，仍保持高低顺序真实变化。
  const calibrated=Math.round(66+raw*32);
  return {raw,percent:Math.max(66,Math.min(98,calibrated))};
 }
 function final(){const selected=history.at(-1);let best=selected?rows.find(r=>String(r.id)===String(selected.id)):null;if(!best){const path=[question,...history.map(v=>v.label)].join(' ');best=rows.map(r=>({r,s:score(r,path)})).sort((a,b)=>b.s-a.s)[0]?.r||null}if(!best){busy=false;return}const metric=confidenceFor(best),raw=metric.raw,conf=metric.percent;let tier=/完整|全流程|系统|长期/.test(text(best))?'professional':/详细|模板|案例|清单/.test(text(best))?'detailed':/步骤|教程|操作|方法|流程/.test(text(best))?'standard':'essential';const pid=answerProduct[tier]||answerProduct.essential;const p=products.find(x=>x.id===pid)||null;Q.classList.add('hidden');R?.classList.remove('hidden');if(RT)RT.textContent=`“${best.title}”匹配方案`;if(RU)RU.textContent=best.answer_summary||'已根据你的问题和五轮选择，从资料库选出最相关方案。';if(RC)RC.textContent=conf+'%';if(RR)RR.textContent={professional:'专业执行方案',detailed:'详细实操方案',standard:'标准操作答案',essential:'要点答案'}[tier];if(RP&&p)RP.textContent=Number(p.product_price||0).toFixed(2);if(DL)DL.innerHTML='<li>针对当前问题的执行步骤</li><li>可直接使用的工具、方法与模板</li><li>结果检查与优化建议</li>';if(RQ)RQ.textContent=question;if(RL){RL.replaceChildren();history.forEach(v=>{const li=document.createElement('li');li.textContent=v.label;RL.appendChild(li)})}window.GYX_CURRENT_AI_MATCH={answer:best,product:p,tier,question,selections:history.map(v=>v.label),confidence:conf,local_score:raw,needs_cloud_assist:raw<.55};busy=false}
 F.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const v=String(N.value||'').trim();if(v.length<2)return;busy=true;question=v;history=[];R?.classList.add('hidden');Q.classList.add('hidden');if(M){M.textContent='正在为您智能匹配最相关方案，请稍候…';M.className='form-message show'}try{N.blur()}catch{}if(!(await db())){busy=false;return}if(M){M.textContent='';M.className='form-message'}paint(1)});
 X.addEventListener('click',e=>{const b=e.target.closest('.quiz-option');if(!b||busy)return;busy=true;history.push({id:b.dataset.id,label:b.dataset.label,score:Number(b.dataset.matchScore)||0});history.length>=5?final():paint(history.length+1)});
 BK?.addEventListener('click',()=>{if(busy||!history.length)return;history.pop();paint(history.length+1)});
 RS?.addEventListener('click',()=>{history=[];question='';Q.classList.add('hidden');R?.classList.add('hidden');N.value='';N.focus()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();