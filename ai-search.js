(()=>{
'use strict';
const $=id=>document.getElementById(id);
function init(){
 const F=$('problemForm'),N=$('problemInput'),M=$('problemMessage'),Q=$('quizPanel'),R=$('resultPanel'),X=$('quizOptions'),S=$('quizStepLabel'),B=$('quizProgressBar'),O=$('originalQuestion'),H=$('quizQuestion'),P=$('quizHelp'),BK=$('quizBackButton'),RS=$('restartMatchButton'),RT=$('resultTitle'),RU=$('resultSummary'),RC=$('resultConfidence'),RR=$('resultTier'),RP=$('resultPrice'),DL=$('deliveryList'),RQ=$('resultQuestion'),RL=$('resultSelections');
 if(!F||!N||!Q||!X||F.dataset.gyxLiveSearch==='1')return;
 F.dataset.gyxLiveSearch='1';
 let rows=[],products=[],question='',history=[],busy=false;
 const norm=s=>String(s||'').toLowerCase().replace(/[\s，。！？、；：,.!?;:()（）【】\[\]"'“”‘’_\-\/\\]+/g,'');
 const grams=s=>{s=norm(s);const a=new Set();if(s.length<2){if(s)a.add(s);return a}for(let i=0;i<s.length-1;i++)a.add(s.slice(i,i+2));return a};
 const sim=(a,b)=>{a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;const x=grams(a),y=grams(b);let hit=0;x.forEach(v=>{if(y.has(v))hit++});return x.size&&y.size?Math.min(1,(hit/x.size)*.72+(hit/y.size)*.28):0};
 const kws=r=>Array.isArray(r.keywords)?r.keywords.map(norm).filter(Boolean):[];
 const text=r=>[r.title,Array.isArray(r.keywords)?r.keywords.join(' '):r.keywords,r.answer_summary,r.answer_detail_zh].filter(Boolean).join(' ');
 function phrase(q,c,base){q=norm(q);c=norm(c);if(!q||!c)return 0;if(q===c)return 1;if(c.includes(q))return Math.min(.96,base+Math.min(.16,(q.length/Math.max(c.length,1))*.18));if(q.includes(c))return Math.min(.9,base*.9+Math.min(.12,(c.length/Math.max(q.length,1))*.12));return sim(q,c)*base;}
 function score(r,s){
  const q=norm(s);if(!q)return 0;
  const titleScore=phrase(q,r.title,.76);
  let keywordScore=0;
  for(const k of kws(r)){
    if(k===q){keywordScore=1;break}
    keywordScore=Math.max(keywordScore,phrase(q,k,.82));
  }
  const summaryScore=phrase(q,r.answer_summary,.62);
  const detailScore=phrase(q,r.answer_detail_zh,.42);
  return Math.max(titleScore,keywordScore,summaryScore,detailScore);
 }
 async function rest(path){const c=window.GYX_CONFIG;if(!c)throw new Error('NO_CONFIG');const res=await fetch(c.url+'/rest/v1/'+path,{headers:{apikey:c.publishableKey,Authorization:'Bearer '+c.publishableKey,Accept:'application/json'},cache:'no-store'});if(!res.ok)throw new Error('DB_'+res.status);return res.json()}
 async function db(){if(rows.length)return true;try{rows=await rest('product_answer_options?select=*&is_active=eq.true&limit=5000');if(!Array.isArray(rows)||!rows.length)throw new Error('EMPTY');try{products=await rest('products?select=id,product_name,product_price,description&is_active=eq.true&limit=100')||[]}catch{products=[]}return true}catch(e){if(M)M.textContent='资料库连接失败，请稍后再试。';return false}}
 function rank(){
  const used=new Set(history.map(v=>String(v.id))),last=history.at(-1)?.label||'',path=[question,...history.map(v=>v.label)].join(' ');
  return rows.map(r=>{let s;if(!history.length)s=score(r,question);else s=score(r,last)*.58+score(r,question)*.22+score(r,path)*.20;return{r,s}}).filter(v=>v.s>.08&&!used.has(String(v.r.id))).sort((a,b)=>b.s-a.s||(+b.r.priority||0)-(+a.r.priority||0));
 }
 function options(){
  const ranked=rank(),out=[],seen=new Set();
  for(const v of ranked){const label=String(v.r.title||'').trim(),key=norm(label);if(!label||seen.has(key))continue;const tooClose=out.some(x=>sim(label,x.label)>.88);if(tooClose)continue;seen.add(key);out.push({id:v.r.id,label,score:v.s});if(out.length===5)break}
  if(out.length<5){for(const v of ranked){const label=String(v.r.title||'').trim(),key=norm(label);if(!label||seen.has(key))continue;seen.add(key);out.push({id:v.r.id,label,score:v.s});if(out.length===5)break}}
  return out;
 }
 function paint(round){
  const opts=options();S.textContent=`第 ${round} / 5 轮`;if(B)B.style.width=round*20+'%';O.textContent=`“${question}”`;H.textContent=round===1?'我先确认你的需求方向，请选择最接近的一项':`根据你刚才选择的“${history.at(-1)?.label||question}”，继续缩小范围`;if(P)P.textContent='';if(BK)BK.classList.toggle('hidden',round===1);X.replaceChildren();
  opts.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.className='quiz-option compact';b.dataset.id=o.id;b.dataset.label=o.label;b.dataset.score=String(o.score||0);b.innerHTML=`<span class="option-number">${i+1}</span><strong>${o.label}</strong>`;X.appendChild(b)});
  if(!opts.length){busy=false;if(M)M.textContent='没有找到足够相关的方案，请换一种更具体的说法。';return}
  Q.classList.remove('hidden');busy=false;setTimeout(()=>Q.scrollIntoView({behavior:'smooth',block:'start'}),20);
 }
 function final(){
  const chosenId=String(history.at(-1)?.id||'');
  const chosen=rows.find(r=>String(r.id)===chosenId);
  const last=history.at(-1)?.label||'',path=[question,...history.map(v=>v.label)].join(' ');
  let best;
  if(chosen){best={r:chosen,s:Math.max(score(chosen,question)*.35+score(chosen,last)*.45+score(chosen,path)*.20,.5)}}
  else{best=rows.map(r=>({r,s:score(r,question)*.35+score(r,last)*.45+score(r,path)*.20})).sort((a,b)=>b.s-a.s)[0]}
  if(!best){busy=false;return}
  const r=best.r,matchPct=Math.max(1,Math.min(99,Math.round(best.s*100))),tier=/完整|全流程|系统|长期/.test(text(r))?'professional':/详细|模板|案例|清单/.test(text(r))?'detailed':/步骤|教程|操作|方法|流程/.test(text(r))?'standard':'essential';
  const p=products.find(x=>x.id===r.product_id)||products[0]||null;Q.classList.add('hidden');R?.classList.remove('hidden');if(RT)RT.textContent=`“${r.title}”匹配方案`;if(RU)RU.textContent=r.answer_summary||'已根据你的原始问题和五轮选择，锁定最相关的资料库方案。';if(RC)RC.textContent=matchPct+'%';if(RR)RR.textContent={professional:'专业方案',detailed:'详细方案',standard:'标准教程',essential:'基础实用'}[tier];if(RP&&p)RP.textContent=Number(p.product_price||0).toFixed(2);if(DL)DL.innerHTML='<li>与你当前问题直接相关的执行步骤</li><li>对应工具、方法与可操作建议</li><li>根据五轮选择收敛后的最终方案</li>';if(RQ)RQ.textContent=question;if(RL){RL.replaceChildren();history.forEach(v=>{const li=document.createElement('li');li.textContent=v.label;RL.appendChild(li)})}window.GYX_CURRENT_AI_MATCH={answer:r,product:p,tier,question,selections:history.map(v=>v.label),confidence:matchPct,local_score:best.s,score_type:'deterministic_match',needs_cloud_assist:false};busy=false;
 }
 F.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const v=String(N.value||'').trim();if(v.length<2)return;busy=true;question=v;history=[];R?.classList.add('hidden');Q.classList.add('hidden');if(M)M.textContent='正在理解你的问题，并从资料库筛选最相关的方向…';try{N.blur()}catch{}if(!(await db())){busy=false;return}paint(1)});
 X.addEventListener('click',e=>{const b=e.target.closest('.quiz-option');if(!b||busy||b.disabled)return;busy=true;history.push({id:b.dataset.id,label:b.dataset.label,score:Number(b.dataset.score||0)});history.length>=5?final():paint(history.length+1)});
 BK?.addEventListener('click',()=>{if(busy||!history.length)return;history.pop();paint(history.length+1)});
 RS?.addEventListener('click',()=>{history=[];question='';Q.classList.add('hidden');R?.classList.add('hidden');if(M)M.textContent='';N.value='';N.focus()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();