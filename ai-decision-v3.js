(() => {
  'use strict';

  const input = document.getElementById('problemInput');
  const form = document.getElementById('problemForm');
  const options = document.getElementById('quizOptions');
  const questionEl = document.getElementById('quizQuestion');
  const helpEl = document.getElementById('quizHelp');
  const stepEl = document.getElementById('quizStepLabel');
  if (!input || !form || !options || !questionEl || !stepEl) return;

  let originalQuestion = '';
  let history = [];
  let busy = false;
  let runId = 0;

  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const currentRound = () => {
    const m = String(stepEl.textContent || '').match(/(\d+)/);
    return m ? Number(m[1]) : 1;
  };
  const realQuestion = () => clean(document.getElementById('originalQuestion')?.textContent || '').replace(/^“|”$/g, '') || clean(input.value) || originalQuestion;

  function uniqueFive(items, fallback) {
    const out = [];
    for (const x of items || []) {
      const v = clean(x);
      if (!v || out.includes(v)) continue;
      out.push(v);
      if (out.length === 5) break;
    }
    for (const x of fallback || []) {
      if (out.length === 5) break;
      const v = clean(x);
      if (v && !out.includes(v)) out.push(v);
    }
    return out.slice(0, 5);
  }

  function smartFallback(round) {
    const q = originalQuestion || realQuestion();
    const last = history[history.length - 1]?.label || q;
    const t = (q + ' ' + history.map(x => x.label).join(' ')).toLowerCase();

    if (/赚钱|副业|兼职|收入|变现/.test(t)) {
      const sets = {
        2:['利用现有技能接单','用AI做内容或设计服务','做电商或商品推广','做本地服务或信息差','从零寻找适合自己的副业'],
        3:['每天只有1小时以内','每天可投入2到3小时','有稳定空闲时间','已有客户或账号基础','完全没有资源需要从零开始'],
        4:['先赚到第一笔收入','找到稳定可复制的项目','提高已有副业收入','减少时间投入提高效率','建立长期可持续收入'],
        5:['给我最快能执行的步骤','给我适合手机操作的方法','给我低成本启动方案','给我完整获客与成交路径','给我可长期复制的执行方案']
      };
      return {question:`围绕“${last}”，下一步最需要确定哪一项？`, help:'继续沿着赚钱/副业目标收窄，不切换话题。', options:sets[round] || sets[5]};
    }
    if (/宠物|猫|狗|养护|喂养/.test(t)) {
      const sets = {2:['猫咪日常养护','狗狗日常养护','幼宠喂养护理','成年宠物健康管理','老年宠物专项护理'],3:['饮食和营养','清洁与毛发护理','行为训练','日常健康观察','当前已有具体异常'],4:['完全从零开始','已有基础想做规范','遇到具体问题需要解决','想降低长期养护成本','想做一套每日/每周计划'],5:['日常养护清单','喂养护理步骤','问题排查方案','长期健康管理计划','针对当前宠物的完整方案']};
      return {question:`你选择了“${last}”，接下来最符合哪种情况？`, help:'只继续细分宠物养护本身。', options:sets[round] || sets[5]};
    }
    if (/装修|酒店|店铺|门店|效果图|做图/.test(t)) {
      const sets = {2:['室内装修效果图','平面布局图','门头或外立面图','单个空间设计图','完整装修视觉方案'],3:['什么资料都没有','有现场照片','有户型或平面图','有参考风格图片','已有设计草图想优化'],4:['现代简约风','轻奢高级风','自然温馨风','商务品质风','按现有品牌风格定制'],5:['直接可用的出图提示词','从照片生成效果图步骤','完整空间设计流程','多角度效果图方案','从资料整理到最终出图全流程']};
      return {question:`围绕“${last}”，下一步需要确定什么？`, help:'继续沿着装修出图需求收窄。', options:sets[round] || sets[5]};
    }

    return {question:`围绕“${last}”，下一步你更接近哪一种？`, help:'继续沿着上一轮选择收窄需求。', options:uniqueFive([
      `明确“${last}”的具体类型`,
      `确定“${last}”的使用场景`,
      `说明当前已有的条件或资料`,
      `说明现在遇到的具体困难`,
      `确定最终想得到的实际结果`
    ],[])};
  }

  async function callSameOriginAI(round) {
    const path = history.slice(0, round - 1).map((x,i)=>`第${i+1}轮=${x.label}`).join('；');
    const query = [
      `原始需求：${originalQuestion}`,
      `已选路径：${path || '暂无'}`,
      `现在要生成第${round}轮。请分析用户下一步最应该细分的5个互斥方向。`,
      'goals字段必须给5个具体可点击选项，必须直接承接上一轮，不能出现无关行业，不能用“确认资料/确认结果”这类空泛套话。'
    ].join('\n');

    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 7000);
    try {
      const res = await fetch('/api/ai-match', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question:query, locale:'zh-CN'}),
        signal:controller.signal
      });
      if (!res.ok) throw new Error('AI_'+res.status);
      const data = await res.json();
      if (!data?.ok) throw new Error('AI_BAD');
      const fallback = smartFallback(round);
      const aiOptions = uniqueFive(data.goals, []);
      if (aiOptions.length < 5) return fallback;
      return {
        question:`基于你刚才选择的“${history[history.length-1]?.label || originalQuestion}”，下一步最接近哪一种？`,
        help: clean(data.intent) || 'AI正在根据前面全部选择继续收窄需求。',
        options: aiOptions
      };
    } finally {
      clearTimeout(timer);
    }
  }

  function typeText(el, text, token, done) {
    if (!el) { done?.(); return; }
    el.textContent='';
    let i=0;
    const tick=()=>{
      if (token !== runId) return;
      i=Math.min(text.length,i+3);
      el.textContent=text.slice(0,i);
      if(i<text.length) setTimeout(tick,10); else done?.();
    };
    tick();
  }

  function renderRound(round, data) {
    const btns = Array.from(options.querySelectorAll('button.quiz-option'));
    if (btns.length !== 5 || currentRound() !== round) return;
    const token = ++runId;
    if (helpEl) helpEl.textContent = data.help || '';
    btns.forEach((b,i)=>{
      b.disabled=true;
      b.dataset.aiLabel=data.options[i];
      const s=b.querySelector('strong');
      if(s) s.textContent='';
    });
    typeText(questionEl,data.question,token);
    btns.forEach((b,i)=>{
      const s=b.querySelector('strong');
      setTimeout(()=>typeText(s,data.options[i],token,()=>{b.disabled=false;}),70+i*55);
    });
    setTimeout(()=>{
      if(token!==runId) return;
      questionEl.textContent=data.question;
      btns.forEach((b,i)=>{ const s=b.querySelector('strong'); if(s) s.textContent=data.options[i]; b.disabled=false; });
    },900);
  }

  async function enhance(round) {
    if (busy || round < 2 || round > 5) return;
    busy=true;
    const btns=Array.from(options.querySelectorAll('button.quiz-option'));
    btns.forEach(b=>b.disabled=true);
    questionEl.textContent='🧠 正在结合前面选择继续匹配…';
    if(helpEl) helpEl.textContent='只匹配当前路径，不使用固定问卷。';
    let data;
    try { data=await callSameOriginAI(round); }
    catch { data=smartFallback(round); }
    renderRound(round,data);
    busy=false;
  }

  form.addEventListener('submit',()=>{
    originalQuestion=clean(input.value);
    history=[];
    busy=false;
    runId+=1;
  },true);

  options.addEventListener('click',(event)=>{
    const btn=event.target.closest?.('button.quiz-option');
    if(!btn || btn.disabled || busy) return;
    const round=currentRound();
    if(round<1 || round>5) return;
    const label=clean(btn.dataset.aiLabel || btn.querySelector('strong')?.textContent || btn.textContent);
    history=history.slice(0,round-1);
    history[round-1]={label};
    if(round===1) originalQuestion=realQuestion();
    if(round>=5) return;
    setTimeout(()=>{
      const next=currentRound();
      if(next===round+1) enhance(next);
    },50);
  },true);

  document.getElementById('restartMatchButton')?.addEventListener('click',()=>{history=[];busy=false;runId+=1;},true);
  document.getElementById('newQuestionButton')?.addEventListener('click',()=>{history=[];busy=false;runId+=1;},true);
})();