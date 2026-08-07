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
  let aiBusy = false;
  let tierRound = false;
  let pendingFinalButton = null;
  let allAnswers = [];
  let finalAnswer = null;
  let runToken = 0;

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function currentRound() {
    const m = String(stepEl.textContent || '').match(/(\d+)/);
    return m ? Number(m[1]) : 1;
  }

  async function loadAnswers() {
    if (allAnswers.length) return allAnswers;
    const { data, error } = await db.from('product_answer_options')
      .select('id,title,answer_summary,keywords,module_code,product_id,priority')
      .eq('is_active', true);
    if (!error) allAnswers = data || [];
    return allAnswers;
  }

  function parseJsonLoose(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
  }

  async function callAI(prompt, token) {
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
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
            text += obj.response || obj.content || obj.delta || obj.choices?.[0]?.delta?.content || '';
          } catch {}
        }
      }
    } else {
      const obj = await res.json().catch(() => null);
      text = obj?.response || obj?.content || obj?.result || obj?.choices?.[0]?.message?.content || '';
    }
    return parseJsonLoose(text);
  }

  function fallbackRound(round) {
    const base = clean(originalQuestion) || '这个问题';
    const last = history[history.length - 1]?.label || base;
    const maps = {
      2: {
        question: `围绕“${last}”，下一步最需要确认哪一点？`,
        help: '只继续细分你刚才选中的方向。',
        options: ['具体对象或类型', '当前已有条件/资料', '最想达到的结果', '现在遇到的主要困难', '直接要完整落地方案']
      },
      3: {
        question: `你选择了“${last}”，目前最符合你的实际情况是哪一种？`,
        help: '这一轮用于锁定真实场景，不切换到无关领域。',
        options: ['完全从零开始', '已有部分资料或基础', '已经试过但效果不好', '已经能做但想提升质量', '有特殊条件需要针对处理']
      },
      4: {
        question: `针对“${last}”，你最终最需要哪类结果？`,
        help: '继续收窄最终交付需求。',
        options: ['明确判断和关键要点', '一步一步的操作方法', '可直接复制使用的模板', '完整执行流程和检查表', '针对当前情况的专项方案']
      },
      5: {
        question: `最后确认：关于“${base}”，你希望资料重点解决什么？`,
        help: '这一轮结束后，只从资料库匹配与你全部选择最接近的交付。',
        options: ['最快上手并完成一次', '解决当前最具体的问题', '提高结果质量和稳定性', '形成以后可重复使用的流程', '获得完整系统方案']
      }
    };
    return maps[round] || maps[5];
  }

  function validRound(obj) {
    if (!obj || !clean(obj.question) || !Array.isArray(obj.options) || obj.options.length !== 5) return false;
    const arr = obj.options.map(clean).filter(Boolean);
    return arr.length === 5 && new Set(arr).size === 5;
  }

  async function getDynamicRound(round) {
    const token = ++runToken;
    const historyText = history.map((x, i) => `第${i + 1}轮：${x.label}`).join('\n') || '暂无';
    const prompt = [
      '你是网站的动态需求诊断引擎，不是聊天机器人。',
      '目标：根据原始问题和用户已经选择的路径，只生成“下一轮”最有逻辑的追问。',
      '硬规则：',
      '1. 下一轮必须是上一轮选择的直接子问题，不能跳到无关行业或商业话题。',
      '2. 必须同时参考原始问题和全部历史选择，不能只看最后一个词。',
      '3. 5个选项必须互斥、有实际区分度、普通人能看懂，禁止同义改写凑数。',
      '4. 不要问与当前任务无关的“账号运营、引流、自动化、营销”等，除非用户原问题或历史选择明确涉及。',
      '5. 这一轮只负责继续收窄需求，不直接回答，不报价，不推荐商品。',
      '6. 只输出一行JSON，禁止Markdown和解释。',
      'JSON格式：{"question":"下一轮问题","help":"一句简短说明","options":["选项1","选项2","选项3","选项4","选项5"]}',
      `当前轮次：第${round}轮（总共5轮）`,
      `原始问题：${originalQuestion}`,
      `历史路径：\n${historyText}`
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
    questionEl.textContent = `正在根据前${round - 1}轮选择分析下一步…`;
    if (helpEl) helpEl.textContent = 'AI正在保持上下文继续匹配';
    options.replaceChildren();
    const p = document.createElement('div');
    p.className = 'form-message success';
    p.textContent = '🧠 正在生成与上一轮直接相关的5个选项…';
    options.appendChild(p);
  }

  function renderDynamicRound(round, data) {
    stepEl.textContent = `第 ${round} / 6 轮`;
    if (progressEl) progressEl.style.width = String(Math.min(83.33, round * 100 / 6)) + '%';
    questionEl.textContent = data.question;
    if (helpEl) helpEl.textContent = data.help || '请选择最符合实际情况的一项';
    options.replaceChildren();
    data.options.forEach((label, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option compact';
      const n = document.createElement('span');
      n.className = 'option-number';
      n.textContent = String(index + 1);
      const strong = document.createElement('strong');
      strong.textContent = label;
      btn.append(n, strong);
      options.appendChild(btn);
    });
  }

  async function replaceCurrentRoundWithAI(round) {
    if (round < 2 || round > 5 || tierRound) return;
    aiBusy = true;
    setRoundLoading(round);
    const data = await getDynamicRound(round);
    if (currentRound() !== round || tierRound) { aiBusy = false; return; }
    renderDynamicRound(round, data);
    aiBusy = false;
  }

  function textForAnswer(a) {
    return clean([a.title, a.answer_summary, ...(a.keywords || []), a.module_code].join(' ')).toLowerCase();
  }

  function scoreAnswer(a, profile) {
    const hay = textForAnswer(a);
    const compactHay = hay.replace(/\s/g, '');
    const q = clean(profile).toLowerCase();
    const chunks = q.split(/[\s，。！？、,;；:：/]+/).filter(x => x.length >= 2);
    let score = 0;
    const full = q.replace(/\s/g, '');
    if (full && compactHay.includes(full)) score += 120;
    for (const token of chunks) {
      if (hay.includes(token)) score += token.length >= 4 ? 18 : 8;
    }
    for (let i = 0; i < chunks.length - 1; i++) {
      const pair = chunks[i] + chunks[i + 1];
      if (compactHay.includes(pair.replace(/\s/g, ''))) score += 35;
    }
    return score;
  }

  async function chooseFinalAnswer() {
    const list = await loadAnswers();
    const profile = [originalQuestion, ...history.map(x => x.label)].join('；');
    const shortlist = list.map(a => ({ ...a, _score: scoreAnswer(a, profile) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 12);
    if (!shortlist.length) return null;

    const token = ++runToken;
    const candidates = shortlist.map(a => ({ id: a.id, title: a.title, summary: a.answer_summary, keywords: a.keywords })).slice(0, 10);
    const prompt = [
      '你是资料库最终匹配器。只能从候选资料中选择，不允许自己创造新资料。',
      '判断时必须同时参考原始问题和全部选择路径，组合意图优先，单个泛词不能决定结果。',
      '如果候选都不相关，answer_id返回0。',
      '只输出一行JSON：{"answer_id":数字,"reason":"一句话"}',
      `原始问题：${originalQuestion}`,
      `完整选择路径：${history.map((x, i) => `第${i + 1}轮=${x.label}`).join('；')}`,
      `候选资料：${JSON.stringify(candidates)}`
    ].join('\n');
    try {
      const data = await callAI(prompt, token);
      const id = Number(data?.answer_id || 0);
      return shortlist.find(a => Number(a.id) === id) || shortlist[0];
    } catch {
      return shortlist[0];
    }
  }

  async function prepareFinal(button) {
    pendingFinalButton = button;
    const lastLabel = clean(button.querySelector('strong')?.textContent || button.textContent);
    history[4] = { label: lastLabel };
    questionEl.textContent = '正在根据全部5轮选择匹配资料库…';
    if (helpEl) helpEl.textContent = '最终交付只从现有资料库选择，不让AI随意编造交付。';
    options.replaceChildren();
    const info = document.createElement('div');
    info.className = 'form-message success';
    info.textContent = '📚 正在进行最终资料匹配…';
    options.appendChild(info);
    finalAnswer = await chooseFinalAnswer();
    window.__gyxDynamicMatch = {
      answer: finalAnswer,
      question: originalQuestion,
      selections: history.map(x => x.label)
    };
    showTierRound();
  }

  function showTierRound() {
    tierRound = true;
    stepEl.textContent = '第 6 / 6 轮';
    if (progressEl) progressEl.style.width = '100%';
    questionEl.textContent = '最后选择你需要的资料级别';
    if (helpEl) helpEl.textContent = finalAnswer ? `已匹配资料：${finalAnswer.title}` : '资料库没有精确条目，将保留本次需求作为待补资料。';
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
        const original = pendingFinalButton;
        pendingFinalButton = null;
        if (original) original.click();
        setTimeout(applyFinalResultUI, 160);
        setTimeout(applyFinalResultUI, 500);
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
    if (title) title.textContent = finalAnswer.title || title.textContent;
    if (summary) summary.textContent = finalAnswer.answer_summary || summary.textContent;
    if (q) q.textContent = originalQuestion;
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
    tierRound = false;
    pendingFinalButton = null;
    runToken += 1;
    window.__gyxDynamicMatch = null;
    window.__gyxSelectedTier = null;
  }

  form.addEventListener('submit', () => {
    reset();
    originalQuestion = clean(input.value);
  }, true);

  options.addEventListener('click', async (event) => {
    const btn = event.target.closest?.('button.quiz-option');
    if (!btn || aiBusy || tierRound) return;
    const round = currentRound();
    if (round < 1 || round > 5) return;
    const label = clean(btn.querySelector('strong')?.textContent || btn.textContent);
    history[round - 1] = { label };

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
      if (next === round + 1 && next >= 2 && next <= 5) replaceCurrentRoundWithAI(next);
    }, 40);
  }, true);

  document.getElementById('restartMatchButton')?.addEventListener('click', reset, true);
  document.getElementById('newQuestionButton')?.addEventListener('click', reset, true);

  const originalInvoke = window.gyxInvokeFunction;
  if (typeof originalInvoke === 'function' && !window.__gyxDynamicInvokeWrapped) {
    window.__gyxDynamicInvokeWrapped = true;
    window.gyxInvokeFunction = async (name, body = {}) => {
      if (name === 'create-order' && window.__gyxDynamicMatch && String(body.product_id || '').startsWith('answer-')) {
        const m = window.__gyxDynamicMatch;
        const next = { ...body };
        if (m.answer?.id) next.answer_id = Number(m.answer.id);
        next.customer_question = m.question;
        next.selection_path = m.selections;
        if (window.__gyxSelectedTier) {
          next.product_id = window.__gyxSelectedTier.product_id;
          next.answer_tier = window.__gyxSelectedTier.tier;
        }
        return originalInvoke(name, next);
      }
      return originalInvoke(name, body);
    };
  }

  const observer = new MutationObserver(() => {
    applyFinalResultUI();
  });
  observer.observe(resultPanel || document.body, { attributes: true, childList: true, subtree: true });
})();