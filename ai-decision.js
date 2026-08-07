(() => {
  'use strict';

  const AI_URL = 'https://globalyouxuan-ai.slq520168.workers.dev/api/chat';
  const db = window.gyxSupabase;
  const input = document.getElementById('problemInput');
  const form = document.getElementById('problemForm');
  const options = document.getElementById('quizOptions');
  const questionEl = document.getElementById('quizQuestion');
  const helpEl = document.getElementById('quizHelp');
  const stepEl = document.getElementById('quizStepLabel');
  const progressEl = document.getElementById('quizProgressBar');
  const resultPanel = document.getElementById('resultPanel');
  if (!db || !input || !form || !options || !questionEl || !stepEl) return;

  const TIER_CHOICES = [
    { tier: 'essential', product_id: 'answer-essential', label: '新手｜关键结论', price: '6.90' },
    { tier: 'standard', product_id: 'answer-standard', label: '小白｜标准步骤', price: '9.90' },
    { tier: 'detailed', product_id: 'answer-detailed', label: '技术｜详细实操', price: '16.90' },
    { tier: 'professional', product_id: 'answer-professional', label: '加强｜专业执行', price: '19.99' },
    { tier: 'custom', product_id: 'answer-custom', label: '高手｜深度方案', price: '39.99' }
  ];

  let originalQuestion = '';
  let history = [];
  let allAnswers = [];
  let aiBusy = false;
  let tierRound = false;
  let pendingFinalButton = null;
  let finalAnswer = null;
  let finalReason = '';
  let runToken = 0;

  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const norm = (s) => clean(s).normalize('NFKC').toLowerCase().replace(/[，。！？、,.!?;；:：()（）【】\[\]"'“”‘’]/g, '');

  function currentRound() {
    const m = String(stepEl.textContent || '').match(/(\d+)/);
    return m ? Number(m[1]) : 1;
  }

  function realOriginalQuestion() {
    const q = clean(document.getElementById('originalQuestion')?.textContent || '').replace(/^“|”$/g, '');
    return q || clean(input.value) || originalQuestion;
  }

  async function loadAnswers() {
    if (allAnswers.length) return allAnswers;
    const { data, error } = await db.from('product_answer_options')
      .select('id,title,title_en,title_km,answer_summary,answer_summary_en,answer_summary_km,keywords,module_code,product_id,priority')
      .eq('is_active', true);
    if (!error) allAnswers = data || [];
    return allAnswers;
  }

  function parseJsonLoose(text) {
    let raw = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
  }

  async function callAI(prompt, token) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const res = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error('AI_HTTP_' + res.status);
      const type = res.headers.get('content-type') || '';
      let text = '';
      if (type.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (token !== runToken) return null;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const s = line.trim();
            if (!s.startsWith('data:')) continue;
            const payload = s.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const obj = JSON.parse(payload);
              text += obj.response || obj.content || obj.delta || obj.text || obj.choices?.[0]?.delta?.content || obj.choices?.[0]?.message?.content || '';
            } catch {
              text += payload;
            }
          }
        }
      } else {
        const raw = await res.text();
        const obj = parseJsonLoose(raw);
        text = obj?.response || obj?.content || obj?.result || obj?.choices?.[0]?.message?.content || raw;
      }
      return parseJsonLoose(text);
    } finally {
      clearTimeout(timer);
    }
  }

  function validRound(obj) {
    if (!obj || !clean(obj.question) || !Array.isArray(obj.options)) return false;
    const arr = obj.options.map(clean).filter(Boolean);
    return arr.length === 5 && new Set(arr).size === 5 && arr.every(x => x.length >= 2 && x.length <= 90);
  }

  function fallbackRound(round) {
    const base = originalQuestion || realOriginalQuestion() || '这个问题';
    const last = history[history.length - 1]?.label || base;
    if (round === 2) return {
      question: `围绕“${last}”，你具体想先解决哪一类情况？`,
      help: '只继续细分你刚才选择的方向。',
      options: [`明确“${last}”的具体对象或类型`, '确认当前已有资料或条件', '确认最想达到的具体结果', '确认现在遇到的主要困难', '按当前需求直接做完整方案']
    };
    if (round === 3) return {
      question: `你选择了“${last}”，现在最符合你的实际情况是哪一种？`,
      help: '这一轮只确认真实场景，不切换到无关领域。',
      options: ['完全从零开始', '已有部分资料或基础', '已经试过但效果不好', '已经能做但想提升质量', '有特殊条件需要针对处理']
    };
    if (round === 4) return {
      question: `针对“${last}”，最终最需要哪一种结果？`,
      help: '继续收窄最终交付需求。',
      options: ['明确判断和关键要点', '一步一步的操作方法', '可直接复制使用的模板', '完整执行流程和检查表', '针对当前情况的专项方案']
    };
    return {
      question: `最后确认：关于“${base}”，这份资料最需要解决什么？`,
      help: '完成后只从现有资料库匹配与你全部选择最接近的交付。',
      options: ['最快上手并完成一次', '解决当前最具体的问题', '提高结果质量和稳定性', '形成以后可重复使用的流程', '获得完整系统方案']
    };
  }

  async function getDynamicRound(round) {
    const token = ++runToken;
    const path = history.slice(0, round - 1).map((x, i) => `第${i + 1}轮：${x.label}`).join('\n') || '暂无';
    const prompt = [
      '你是GlobalYouXuan网站的动态需求诊断引擎，不是聊天机器人。',
      '目标：根据原始问题和用户已经选择的全部路径，只生成下一轮最有逻辑的追问。',
      '硬规则：',
      '1. 下一轮必须是上一轮选择的直接子问题，不能跳到无关行业或话题。',
      '2. 必须同时参考原始问题和全部历史选择，不能只看最后一个词。',
      '3. 每一轮只确认一个新的关键维度，不能重复上一轮已经确认的信息。',
      '4. 5个选项必须互斥、具体、有实际区分度，普通人一眼能懂；禁止同义改写凑数。',
      '5. 不得突然出现账号运营、引流、营销、自动化等无关内容，除非原问题或历史选择明确涉及。',
      '6. 例如宠物养护应顺着宠物类型/年龄阶段/具体问题继续；酒店装修做图应顺着图种/空间/现有素材/风格/出图目标继续。',
      '7. 不回答问题、不报价、不推荐商品，只负责下一步诊断。',
      '8. 只输出一行JSON，禁止Markdown和解释。',
      'JSON格式：{"question":"下一轮问题","help":"一句简短说明","options":["选项1","选项2","选项3","选项4","选项5"]}',
      `当前轮次：第${round}/5轮`,
      `原始问题：${originalQuestion}`,
      `历史路径：\n${path}`
    ].join('\n');
    try {
      const data = await callAI(prompt, token);
      if (token !== runToken || !validRound(data)) return fallbackRound(round);
      return { question: clean(data.question), help: clean(data.help), options: data.options.map(clean) };
    } catch {
      return fallbackRound(round);
    }
  }

  function setRoundLoading(round) {
    questionEl.textContent = `🧠 正在根据前${round - 1}轮选择继续匹配…`;
    if (helpEl) helpEl.textContent = '本轮会读取原问题和前面全部选择，不使用固定问卷。';
    Array.from(options.querySelectorAll('button.quiz-option')).forEach(btn => {
      btn.disabled = true;
      const strong = btn.querySelector('strong');
      if (strong) strong.textContent = '分析中…';
    });
  }

  // 关键：只改order.js已经创建好的5个按钮文字，绝不替换按钮。
  // 这样原按钮内部的点击事件仍然存在，点击后order.js才能正常推进轮次。
  function applyDynamicRound(round, data, token) {
    if (token !== runToken || currentRound() !== round || tierRound) return false;
    const buttons = Array.from(options.querySelectorAll('button.quiz-option'));
    if (buttons.length !== 5) return false;
    questionEl.textContent = data.question;
    if (helpEl) helpEl.textContent = data.help || '请选择最符合实际情况的一项';
    data.options.forEach((label, index) => {
      const btn = buttons[index];
      const strong = btn.querySelector('strong');
      btn.dataset.aiLabel = label;
      if (strong) strong.textContent = label;
      const small = btn.querySelector('small');
      if (small) small.textContent = '';
      btn.disabled = false;
    });
    return true;
  }

  async function enhanceRound(round) {
    if (round < 2 || round > 5 || tierRound || aiBusy) return;
    const buttons = Array.from(options.querySelectorAll('button.quiz-option'));
    if (buttons.length !== 5) return;
    originalQuestion = realOriginalQuestion();
    aiBusy = true;
    setRoundLoading(round);
    const data = await getDynamicRound(round);
    const token = runToken;
    applyDynamicRound(round, data, token);
    aiBusy = false;
  }

  function answerText(a) {
    return norm([a.title, a.answer_summary, ...(a.keywords || []), a.module_code].join(' '));
  }

  function localScore(a, profile) {
    const hay = answerText(a);
    const title = norm(a.title);
    const keywords = norm((a.keywords || []).join(' '));
    const q = norm(profile);
    let score = 0;
    const chunks = q.split(/[\s，。！？、,;；:：/→]+/).filter(x => x.length >= 2);
    for (const token of chunks) {
      if (title.includes(token)) score += token.length >= 4 ? 30 : 16;
      if (keywords.includes(token)) score += token.length >= 4 ? 20 : 10;
      if (hay.includes(token)) score += 5;
    }
    const compact = q.replace(/\s/g, '');
    for (let i = 0; i < compact.length - 1; i++) {
      const pair = compact.slice(i, i + 2);
      if (pair && hay.includes(pair)) score += 0.7;
    }
    return score;
  }

  async function chooseFinalAnswer() {
    const list = await loadAnswers();
    if (!list.length) return null;
    const profile = [originalQuestion, ...history.map(x => x.label)].join('；');
    const shortlist = list.map(a => ({ ...a, _score: localScore(a, profile) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 12);
    if (!shortlist.length || Number(shortlist[0]._score) < 5) return null;

    const token = ++runToken;
    const candidates = shortlist.slice(0, 10).map(a => ({ id: a.id, title: a.title, summary: a.answer_summary, keywords: a.keywords }));
    const prompt = [
      '你是资料库最终匹配审核器。最终交付只能来自候选资料库，绝对不能自己创造交付资料。',
      '必须同时参考原始问题和全部5轮选择。组合意图优先，单个泛词相同不能算相关。',
      '如果候选都不够相关，answer_id必须返回0，不能硬选一个接近词。',
      'confidence为0到100，只有真正适合交付才能超过55。',
      '只输出一行JSON：{"answer_id":数字,"confidence":数字,"reason":"一句话"}',
      `原始问题：${originalQuestion}`,
      `完整路径：${history.map((x, i) => `第${i + 1}轮=${x.label}`).join('；')}`,
      `候选资料：${JSON.stringify(candidates)}`
    ].join('\n');
    try {
      const data = await callAI(prompt, token);
      const id = Number(data?.answer_id || 0);
      const confidence = Number(data?.confidence || 0);
      if (!id || confidence < 55) return null;
      const answer = shortlist.find(a => Number(a.id) === id) || null;
      if (!answer) return null;
      finalReason = clean(data?.reason || '根据完整5轮路径匹配');
      answer._confidence = Math.max(55, Math.min(98, Math.round(confidence)));
      return answer;
    } catch {
      // AI不可用时也不允许拿无关资料硬凑。只有本地重合度足够高才使用第一名。
      if (Number(shortlist[0]._score) < 24) return null;
      shortlist[0]._confidence = 58;
      finalReason = 'AI暂时不可用，使用高重合度本地资料匹配';
      return shortlist[0];
    }
  }

  function recordGap() {
    try {
      const key = 'gyx_knowledge_gaps_v1';
      const old = JSON.parse(localStorage.getItem(key) || '[]');
      old.unshift({ question: originalQuestion, selections: history.map(x => x.label), time: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(old.slice(0, 100)));
    } catch {}
  }

  async function prepareFinal(button) {
    pendingFinalButton = button;
    const label = clean(button.dataset.aiLabel || button.querySelector('strong')?.textContent || button.textContent);
    history[4] = { label };
    questionEl.textContent = '📚 正在根据全部5轮选择匹配资料库…';
    if (helpEl) helpEl.textContent = '最终交付只从现有资料库选择，不让AI随意编造交付。';
    Array.from(options.querySelectorAll('button.quiz-option')).forEach(b => { b.disabled = true; });
    finalAnswer = await chooseFinalAnswer();
    if (!finalAnswer) recordGap();
    window.__gyxDynamicMatch = {
      answer: finalAnswer,
      question: originalQuestion,
      selections: history.map(x => x.label),
      reason: finalReason
    };
    showTierRound();
  }

  function showTierRound() {
    tierRound = true;
    stepEl.textContent = '第 6 / 6 轮';
    if (progressEl) progressEl.style.width = '100%';
    if (!finalAnswer) {
      questionEl.textContent = '当前资料库没有足够精确的交付内容';
      if (helpEl) helpEl.textContent = '本次需求已记录为资料缺口，不会拿八杆子打不着的资料硬凑。请换一个问题，或等待资料库补充。';
      options.replaceChildren();
      const p = document.createElement('div');
      p.className = 'form-message';
      p.textContent = '没有精确资料，本次不进入下单。';
      options.appendChild(p);
      return;
    }

    questionEl.textContent = '最后选择你需要的资料级别';
    if (helpEl) helpEl.textContent = `已匹配资料：${finalAnswer.title}`;
    options.replaceChildren();
    TIER_CHOICES.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option compact';
      const n = document.createElement('span');
      n.className = 'option-number';
      n.textContent = String(index + 1);
      const body = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = item.label;
      const small = document.createElement('small');
      small.textContent = `${item.price} USDT`;
      body.append(strong, small);
      btn.append(n, body);
      btn.addEventListener('click', () => {
        window.__gyxSelectedTier = item;
        tierRound = false;
        const originalButton = pendingFinalButton;
        pendingFinalButton = null;
        // originalButton虽然已经被移出DOM，但它仍保留order.js原始click监听，调用click可正常完成第五轮。
        if (originalButton) originalButton.click();
        setTimeout(applyFinalResultUI, 100);
        setTimeout(applyFinalResultUI, 350);
        setTimeout(applyFinalResultUI, 800);
      });
      options.appendChild(btn);
    });
  }

  function applyFinalResultUI() {
    if (!finalAnswer || !resultPanel || resultPanel.classList.contains('hidden')) return;
    const title = document.getElementById('resultTitle');
    const summary = document.getElementById('resultSummary');
    const q = document.getElementById('resultQuestion');
    const list = document.getElementById('resultSelections');
    const confidence = document.getElementById('resultConfidence');
    if (title) title.textContent = finalAnswer.title || title.textContent;
    if (summary) summary.textContent = [finalAnswer.answer_summary || '', `AI完整路径匹配：${finalReason}`].filter(Boolean).join('\n\n');
    if (q) q.textContent = originalQuestion;
    if (confidence) confidence.textContent = `AI综合匹配 ${Number(finalAnswer._confidence || 58)}%`;
    if (list) {
      list.replaceChildren();
      history.forEach(x => {
        const li = document.createElement('li');
        li.textContent = x.label;
        list.appendChild(li);
      });
    }
    const selected = window.__gyxSelectedTier;
    if (selected) {
      const tier = document.getElementById('resultTier');
      const price = document.getElementById('resultPrice');
      if (tier) tier.textContent = selected.label;
      if (price) price.textContent = selected.price;
    }
  }

  function reset() {
    originalQuestion = clean(input.value);
    history = [];
    finalAnswer = null;
    finalReason = '';
    tierRound = false;
    pendingFinalButton = null;
    aiBusy = false;
    runToken += 1;
    window.__gyxDynamicMatch = null;
    window.__gyxSelectedTier = null;
  }

  form.addEventListener('submit', () => {
    reset();
    originalQuestion = clean(input.value);
  }, true);

  // 捕获阶段先记录用户实际看到并点击的AI选项；随后让order.js原按钮监听继续推进轮次。
  options.addEventListener('click', async (event) => {
    const btn = event.target.closest?.('button.quiz-option');
    if (!btn || btn.disabled || aiBusy || tierRound) return;
    const round = currentRound();
    if (round < 1 || round > 5) return;
    const label = clean(btn.dataset.aiLabel || btn.querySelector('strong')?.textContent || btn.textContent);
    history = history.slice(0, round - 1);
    history[round - 1] = { label };
    if (round === 1) originalQuestion = realOriginalQuestion();

    if (round === 5) {
      event.preventDefault();
      event.stopImmediatePropagation();
      aiBusy = true;
      await prepareFinal(btn);
      aiBusy = false;
      return;
    }

    setTimeout(() => {
      const next = currentRound();
      if (next === round + 1 && next >= 2 && next <= 5) enhanceRound(next);
    }, 35);
  }, true);

  document.getElementById('restartMatchButton')?.addEventListener('click', reset, true);
  document.getElementById('newQuestionButton')?.addEventListener('click', reset, true);

  // 下单时把order.js内部旧的通用选择路径替换为真正的AI五轮路径，并使用最终资料库answer_id。
  const originalInvoke = window.gyxInvokeFunction;
  if (typeof originalInvoke === 'function' && !window.__gyxDynamicInvokeWrapped) {
    window.__gyxDynamicInvokeWrapped = true;
    window.gyxInvokeFunction = async (name, body = {}) => {
      if (name === 'create-order' && window.__gyxDynamicMatch && String(body.product_id || '').startsWith('answer-')) {
        const m = window.__gyxDynamicMatch;
        if (!m.answer?.id) throw new Error('NO_EXACT_LIBRARY_MATCH');
        const next = { ...body,
          answer_id: Number(m.answer.id),
          customer_question: m.question,
          selection_path: m.selections
        };
        if (window.__gyxSelectedTier) {
          next.product_id = window.__gyxSelectedTier.product_id;
          next.answer_tier = window.__gyxSelectedTier.tier;
        }
        return originalInvoke(name, next);
      }
      return originalInvoke(name, body);
    };
  }

  const observer = new MutationObserver(() => applyFinalResultUI());
  observer.observe(resultPanel || document.body, { attributes: true, childList: true, subtree: true });
})();