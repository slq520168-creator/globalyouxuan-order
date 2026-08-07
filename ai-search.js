(() => {
  'use strict';

  // GlobalYouXuan 搜索控制器：只接管搜索与五轮决策。
  // 不修改收藏、订单、付款、主题、导航等其它功能。
  const db = window.gyxSupabase;
  const i18n = window.GYXI18N;
  if (!db || !i18n) return;

  const form = document.getElementById('problemForm');
  const input = document.getElementById('problemInput');
  const searchBtn = document.getElementById('startMatchButton');
  const problemMessage = document.getElementById('problemMessage');
  const quizPanel = document.getElementById('quizPanel');
  const resultPanel = document.getElementById('resultPanel');
  const stepEl = document.getElementById('quizStepLabel');
  const progressEl = document.getElementById('quizProgressBar');
  const originalEl = document.getElementById('originalQuestion');
  const questionEl = document.getElementById('quizQuestion');
  const helpEl = document.getElementById('quizHelp');
  const optionsEl = document.getElementById('quizOptions');
  const backBtn = document.getElementById('quizBackButton');
  const restartBtn = document.getElementById('restartMatchButton');
  if (!form || !input || !searchBtn || !quizPanel || !stepEl || !questionEl || !optionsEl) return;

  const MATCH_STORAGE_KEY = 'gyx_pending_answer_match';
  const TIER_PRODUCTS = {
    essential: 'answer-essential',
    standard: 'answer-standard',
    detailed: 'answer-detailed',
    professional: 'answer-professional',
    custom: 'answer-custom'
  };

  let answers = [];
  let products = [];
  let dataReady = false;
  let originalQuestion = '';
  let history = [];
  let round = 0;
  let firstCandidates = [];
  let firstSelectedId = null;
  let busy = false;
  let runId = 0;
  let idleTimer = null;
  let composing = false;

  const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const locale = () => i18n.locale || 'zh-CN';

  function showMessage(text, kind = 'success') {
    if (!problemMessage) return;
    problemMessage.textContent = text || '';
    problemMessage.className = text ? ('form-message show ' + kind) : 'form-message';
  }

  function localizedTitle(a) {
    if (!a) return '';
    if (locale() === 'en') return a.title_en || a.title || '';
    if (locale() === 'km') return a.title_km || a.title || '';
    return a.title || '';
  }

  function localizedSummary(a) {
    if (!a) return '';
    if (locale() === 'en') return a.answer_summary_en || a.answer_summary || '';
    if (locale() === 'km') return a.answer_summary_km || a.answer_summary || '';
    return a.answer_summary || '';
  }

  async function loadData() {
    if (dataReady) return true;
    const [ar, pr] = await Promise.all([
      db.from('product_answer_options')
        .select('id,answer_code,module_code,title,title_en,title_km,answer_summary,answer_summary_en,answer_summary_km,keywords,priority')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(500),
      db.from('products')
        .select('id,product_name,product_price,currency,description')
        .eq('is_active', true)
    ]);
    if (ar.error || pr.error) return false;
    answers = ar.data || [];
    products = pr.data || [];
    dataReady = answers.length > 0;
    return dataReady;
  }

  function tokenize(v) {
    const s = clean(v).toLowerCase().normalize('NFKC');
    const out = new Set();
    (s.match(/[a-z0-9]{2,}/g) || []).forEach((x) => out.add(x));
    (s.match(/[\u3400-\u9fff]{2,}/g) || []).forEach((seg) => {
      for (let n = 2; n <= Math.min(4, seg.length); n += 1) {
        for (let i = 0; i <= seg.length - n; i += 1) out.add(seg.slice(i, i + n));
      }
    });
    return [...out].slice(0, 120);
  }

  function scoreAnswer(answer, query, ai) {
    const title = [answer.title, answer.title_en, answer.title_km].filter(Boolean).join(' ');
    const summary = [answer.answer_summary, answer.answer_summary_en, answer.answer_summary_km].filter(Boolean).join(' ');
    const kws = Array.isArray(answer.keywords) ? answer.keywords.join(' ') : '';
    const text = (title + ' ' + summary + ' ' + kws).toLowerCase();
    let score = 0;

    const phrases = [
      query,
      ai && ai.rewrite,
      ...(Array.isArray(ai && ai.keywords) ? ai.keywords : []),
      ...(Array.isArray(ai && ai.goals) ? ai.goals : [])
    ].map(clean).filter(Boolean);

    phrases.forEach((p, idx) => {
      const low = p.toLowerCase();
      if (low.length >= 2 && text.includes(low)) score += idx === 0 ? 35 : 18;
      if (low.length >= 2 && title.toLowerCase().includes(low)) score += 14;
    });

    tokenize(phrases.join(' ')).forEach((tok) => {
      if (title.toLowerCase().includes(tok)) score += 6;
      if (kws.toLowerCase().includes(tok)) score += 5;
      if (summary.toLowerCase().includes(tok)) score += 2;
    });

    score += Math.min(5, Number(answer.priority || 0) / 20);
    return score;
  }

  async function callAI(question, purpose, timeoutMs = 6500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, locale: locale(), purpose }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error('AI_' + res.status);
      const data = await res.json();
      if (!data || !data.ok) throw new Error('AI_BAD');
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function uniqueFive(values) {
    const out = [];
    for (const item of values || []) {
      const v = clean(item);
      if (!v || out.includes(v)) continue;
      out.push(v);
      if (out.length === 5) break;
    }
    return out;
  }

  function obviousDrift(options) {
    const source = (originalQuestion + ' ' + history.map((x) => x.label).join(' ')).toLowerCase();
    const joined = options.join(' ').toLowerCase();
    const groups = [
      { words: ['账号', '涨粉', '引流', '私域', '带货', '营销'], allow: /账号|涨粉|引流|私域|带货|营销|赚钱|副业|电商|销售/.test(source) },
      { words: ['自动化', '工作流', '机器人'], allow: /自动|工作流|机器人|bot|效率/.test(source) },
      { words: ['宠物', '猫', '狗'], allow: /宠物|猫|狗/.test(source) },
      { words: ['装修', '效果图', '平面图'], allow: /装修|效果图|平面图|设计|酒店|门店/.test(source) }
    ];
    return groups.some((g) => !g.allow && g.words.some((w) => joined.includes(w)));
  }

  function contextualFallback(nextRound) {
    const q = originalQuestion;
    const last = history[history.length - 1]?.label || q;
    const t = (q + ' ' + history.map((x) => x.label).join(' ')).toLowerCase();

    if (/赚钱|副业|兼职|收入|变现/.test(t)) {
      const sets = {
        2: ['利用现有技能接单', '用AI做内容或设计服务', '做电商或商品推广', '做本地服务或信息差', '从零寻找适合自己的副业'],
        3: ['每天只有1小时以内', '每天可投入2到3小时', '有稳定空闲时间', '已有客户或账号基础', '完全没有资源需要从零开始'],
        4: ['先赚到第一笔收入', '找到稳定可复制的项目', '提高已有副业收入', '减少时间投入提高效率', '建立长期可持续收入'],
        5: ['最快能执行的步骤', '适合手机操作的方法', '低成本启动方案', '完整获客与成交路径', '长期可复制的执行方案']
      };
      return { question: `基于“${last}”，下一步最符合哪种情况？`, help: '继续沿着当前副业目标收窄。', options: sets[nextRound] };
    }

    if (/宠物|猫|狗|养护|喂养/.test(t)) {
      const sets = {
        2: ['猫咪日常养护', '狗狗日常养护', '幼宠喂养护理', '成年宠物健康管理', '老年宠物专项护理'],
        3: ['饮食和营养', '清洁与毛发护理', '行为训练', '日常健康观察', '当前已有具体异常'],
        4: ['完全从零开始', '已有基础想做规范', '遇到具体问题需要解决', '想降低长期养护成本', '想做每日/每周养护计划'],
        5: ['日常养护清单', '喂养护理步骤', '问题排查方案', '长期健康管理计划', '针对当前宠物的完整方案']
      };
      return { question: `你选择了“${last}”，接下来最符合哪种情况？`, help: '只继续细分宠物养护本身。', options: sets[nextRound] };
    }

    if (/装修|酒店|店铺|门店|效果图|做图|空间设计/.test(t)) {
      const sets = {
        2: ['室内装修效果图', '平面布局图', '门头或外立面图', '单个空间设计图', '完整装修视觉方案'],
        3: ['什么资料都没有', '有现场照片', '有户型或平面图', '有参考风格图片', '已有设计草图想优化'],
        4: ['现代简约方向', '轻奢高级方向', '自然温馨方向', '商务品质方向', '按现有品牌风格定制'],
        5: ['直接可用的出图提示词', '从照片生成效果图步骤', '完整空间设计流程', '多角度效果图方案', '从资料到最终出图全流程']
      };
      return { question: `围绕“${last}”，下一步需要确定什么？`, help: '继续沿着装修出图需求收窄。', options: sets[nextRound] };
    }

    return {
      question: `基于你刚才选择的“${last}”，下一步最接近哪一种？`,
      help: '继续沿着原问题和前面选择收窄，不切换话题。',
      options: [
        `进一步明确“${last}”的具体对象`,
        `确定“${last}”实际使用场景`,
        `说明做“${last}”现有条件`,
        `说明“${last}”目前具体卡点`,
        `确定“${last}”最终想达到的结果`
      ]
    };
  }

  function decisionPrompt(nextRound) {
    const path = history.map((x, i) => `第${i + 1}轮：${x.label}`).join('\n');
    const purpose = {
      2: '在用户已选方向下继续细分具体对象、场景或子需求。',
      3: '基于前两轮确认用户当前条件、已有资料、阶段或关键限制。',
      4: '基于前三轮确认真正要解决的核心问题、优先目标或执行深度。',
      5: '基于前四轮确认最终想拿到的具体交付结果，五个选项从轻量到完整逐步加深。'
    }[nextRound] || '继续收窄需求。';

    return [
      '你现在是网站动态决策引擎，不是聊天机器人。',
      `原始问题：${originalQuestion}`,
      `已经选择的路径：\n${path}`,
      `现在生成第${nextRound}轮。任务：${purpose}`,
      '要求：必须直接承接原始问题和全部历史选择；不得切换行业；不得复用通用固定问卷；不得出现与主题无关的账号运营、引流、自动化、营销等词，除非用户原问题或历史选择本来就在这个领域。',
      'goals字段必须恰好给5个互不重复、能直接点击的具体选项。每个选项必须有实际含义，不能写“确认资料”“确认结果”“进一步了解”这类空话。',
      'intent字段用一句自然中文写这一轮真正要确认的问题。rewrite字段概括当前已经收窄后的需求。'
    ].join('\n');
  }

  async function getDecision(nextRound) {
    try {
      const ai = await callAI(decisionPrompt(nextRound), 'dynamic_decision');
      const opts = uniqueFive(ai.goals);
      if (opts.length !== 5 || obviousDrift(opts)) throw new Error('AI_DRIFT');
      return {
        question: clean(ai.intent) || `基于“${history[history.length - 1]?.label || originalQuestion}”，下一步最接近哪一种？`,
        help: clean(ai.rewrite) || 'AI正在根据前面全部选择继续收窄需求。',
        options: opts
      };
    } catch (e) {
      return contextualFallback(nextRound);
    }
  }

  function setRoundUI(n, q, help) {
    round = n;
    stepEl.textContent = `第 ${n} / 5 轮`;
    if (progressEl) progressEl.style.width = `${n * 20}%`;
    if (originalEl) originalEl.textContent = `“${originalQuestion}”`;
    questionEl.textContent = q || '';
    if (helpEl) helpEl.textContent = help || '';
    if (backBtn) backBtn.classList.toggle('hidden', n === 1);
  }

  function clearOptions() {
    optionsEl.replaceChildren();
  }

  function optionLabel(btn) {
    return clean(btn?.dataset?.aiLabel || btn?.querySelector('strong')?.textContent || btn?.textContent || '');
  }

  function renderDecisionRound(n, data) {
    setRoundUI(n, data.question, data.help);
    clearOptions();
    data.options.forEach((label, index) => {
      const button = document.createElement('button');
      button.className = 'quiz-option compact';
      button.type = 'button';
      button.dataset.aiRound = String(n);
      button.dataset.aiLabel = label;
      const number = document.createElement('span');
      number.className = 'option-number';
      number.textContent = String(index + 1);
      const heading = document.createElement('strong');
      heading.textContent = label;
      button.append(number, heading);
      optionsEl.appendChild(button);
    });
    busy = false;
  }

  function typeFirstTitle(el, text, done) {
    el.textContent = '';
    let i = 0;
    const tick = () => {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i < text.length) setTimeout(tick, 18);
      else done?.();
    };
    tick();
  }

  function renderFirstRound(candidates) {
    setRoundUI(1, '下面哪一个最接近你的问题？', 'AI已理解你的问题，并从资料库中筛出5个最相关方向。');
    clearOptions();
    candidates.forEach((answer, index) => {
      const button = document.createElement('button');
      button.className = 'quiz-option quiz-option-enter';
      button.type = 'button';
      button.disabled = true;
      button.dataset.aiRound = '1';
      button.dataset.answerId = String(answer.id);
      button.dataset.aiLabel = localizedTitle(answer);
      const number = document.createElement('span');
      number.className = 'option-number';
      number.textContent = String(index + 1);
      const body = document.createElement('span');
      const heading = document.createElement('strong');
      const summary = document.createElement('small');
      body.append(heading, summary);
      button.append(number, body);
      optionsEl.appendChild(button);
      setTimeout(() => {
        button.classList.add('is-visible');
        typeFirstTitle(heading, localizedTitle(answer), () => {
          summary.textContent = localizedSummary(answer);
          button.disabled = false;
        });
      }, 120 + index * 380);
    });
    busy = false;
  }

  async function startSearch() {
    const token = ++runId;
    const q = clean(input.value);
    if (q.length < 2 || busy) return;
    originalQuestion = q;
    history = [];
    firstCandidates = [];
    firstSelectedId = null;
    busy = true;
    if (resultPanel) resultPanel.classList.add('hidden');
    quizPanel.classList.add('hidden');
    showMessage('🔍 正在理解你的问题…');

    const ok = await loadData();
    if (!ok || token !== runId) {
      busy = false;
      showMessage('暂时无法读取资料库，请稍后重试。', 'error');
      return;
    }

    let ai = null;
    try {
      ai = await callAI(q, 'initial_intent', 5500);
    } catch (e) {}
    if (token !== runId) return;

    showMessage('📚 正在把AI理解结果与资料库交叉匹配…');
    const ranked = answers
      .map((a) => ({ ...a, _score: scoreAnswer(a, q, ai) }))
      .sort((a, b) => b._score - a._score || Number(b.priority || 0) - Number(a.priority || 0));

    firstCandidates = ranked.slice(0, 5);
    if (!firstCandidates.length) {
      busy = false;
      showMessage('没有找到可用资料，请换个说法。', 'error');
      return;
    }

    await sleep(350);
    if (token !== runId) return;
    showMessage('');
    quizPanel.classList.remove('hidden');
    renderFirstRound(firstCandidates);
    setTimeout(() => quizPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  async function goNext() {
    const next = round + 1;
    if (next > 5) return;
    busy = true;
    setRoundUI(next, '正在根据刚才的选择继续匹配…', 'AI只沿着当前路径继续分析，不切换话题。');
    clearOptions();
    const token = runId;
    const data = await getDecision(next);
    if (token !== runId) return;
    renderDecisionRound(next, data);
  }

  function inferTier() {
    const text = history.map((x) => x.label).join(' ');
    if (/定制|专属|深度|一对一/.test(text)) return 'custom';
    if (/专业|完整|全流程|执行方案|长期/.test(text)) return 'professional';
    if (/详细|模板|提示词|多角度/.test(text)) return 'detailed';
    if (/标准|步骤|操作方法|流程/.test(text)) return 'standard';
    return 'essential';
  }

  async function finishSearch() {
    busy = true;
    setRoundUI(5, '正在根据全部5轮选择匹配最终资料…', '最终交付只从资料库中选择，不用无关内容硬凑。');
    clearOptions();
    const token = runId;
    const path = history.map((x, i) => `第${i + 1}轮：${x.label}`).join('\n');
    const finalPrompt = [
      '请把下面已经完成的五轮需求，重写成一条用于资料库检索的精准需求。',
      `原始问题：${originalQuestion}`,
      `选择路径：\n${path}`,
      'rewrite必须保留具体行业/对象/动作/目标；keywords给最多8个高价值检索词；goals给最终实际目标，不要引入新领域。'
    ].join('\n');

    let ai = null;
    try { ai = await callAI(finalPrompt, 'final_retrieval', 6000); } catch (e) {}
    if (token !== runId) return;

    const finalQuery = [originalQuestion, ...history.map((x) => x.label), ai && ai.rewrite].filter(Boolean).join(' ');
    const ranked = answers
      .map((a) => {
        let s = scoreAnswer(a, finalQuery, ai);
        if (firstSelectedId && Number(a.id) === Number(firstSelectedId)) s += 12;
        return { ...a, _score: s };
      })
      .sort((a, b) => b._score - a._score || Number(b.priority || 0) - Number(a.priority || 0));

    const answer = ranked[0];
    if (!answer) {
      busy = false;
      showMessage('资料库暂时没有可交付内容，请换个问题。', 'error');
      return;
    }

    const tier = inferTier();
    const productId = TIER_PRODUCTS[tier];
    const product = products.find((p) => p.id === productId) || products.find((p) => p.id === TIER_PRODUCTS.custom);
    if (!product) {
      busy = false;
      showMessage('价格方案读取失败，请稍后重试。', 'error');
      return;
    }

    const rawScore = Number(answer._score || 0);
    const composite = Math.max(35, Math.min(98, Math.round(45 + rawScore * 0.7)));
    const weak = rawScore < 14;
    const finalTier = weak ? 'custom' : tier;
    const finalProduct = weak
      ? (products.find((p) => p.id === TIER_PRODUCTS.custom) || product)
      : product;

    const match = {
      answer_id: Number(answer.id),
      title: answer.title || '',
      title_en: answer.title_en || '',
      title_km: answer.title_km || '',
      answer_summary: answer.answer_summary || '',
      answer_summary_en: answer.answer_summary_en || '',
      answer_summary_km: answer.answer_summary_km || '',
      question: originalQuestion,
      selections: history.map((x) => x.label),
      tier: finalTier,
      product_id: finalProduct.id,
      price: Number(finalProduct.product_price),
      fallback: weak,
      score: rawScore,
      composite,
      analysis: [
        'AI连续需求分析：',
        '原问题：' + originalQuestion,
        ...history.map((x, i) => `第${i + 1}轮：${x.label}`),
        '最终资料匹配：' + localizedTitle(answer),
        '综合评分：' + composite + ' / 100'
      ].join('\n'),
      created_at: Date.now()
    };

    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(match));
    location.href = 'shop.html?resume=ai-result';
  }

  function resetSearch(clearInput = true) {
    runId += 1;
    busy = false;
    round = 0;
    history = [];
    firstCandidates = [];
    firstSelectedId = null;
    quizPanel.classList.add('hidden');
    if (resultPanel) resultPanel.classList.add('hidden');
    clearOptions();
    showMessage('');
    if (clearInput) input.value = '';
  }

  // 捕获阶段接管输入，阻止 order.js 旧的1秒自动搜索与固定五轮逻辑。
  input.addEventListener('input', (event) => {
    event.stopImmediatePropagation();
    clearTimeout(idleTimer);
    runId += 1;
    if (composing) return;
    const q = clean(input.value);
    if (q.length < 2) return;
    idleTimer = setTimeout(() => startSearch(), 3500);
  }, true);

  input.addEventListener('compositionstart', (event) => {
    event.stopImmediatePropagation();
    composing = true;
    clearTimeout(idleTimer);
  }, true);

  input.addEventListener('compositionend', (event) => {
    event.stopImmediatePropagation();
    composing = false;
    clearTimeout(idleTimer);
    if (clean(input.value).length >= 2) idleTimer = setTimeout(() => startSearch(), 3500);
  }, true);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearTimeout(idleTimer);
      startSearch();
    }
  }, true);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    clearTimeout(idleTimer);
    startSearch();
  }, true);

  optionsEl.addEventListener('click', (event) => {
    const btn = event.target.closest?.('button.quiz-option');
    if (!btn || btn.disabled || busy) {
      if (btn) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const r = Number(btn.dataset.aiRound || round || 1);
    const label = optionLabel(btn);
    if (!label) return;
    history = history.slice(0, r - 1);
    history[r - 1] = { label };
    if (r === 1) firstSelectedId = Number(btn.dataset.answerId || 0) || null;
    if (r >= 5) finishSearch();
    else goNext();
  }, true);

  backBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) return;
    if (round <= 1) {
      resetSearch(false);
      return;
    }
    history = history.slice(0, round - 2);
    const target = round - 1;
    if (target === 1) renderFirstRound(firstCandidates);
    else getDecision(target).then((data) => renderDecisionRound(target, data));
  }, true);

  restartBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    resetSearch(true);
    input.focus();
  }, true);

  // 提前加载资料，用户真正搜索时更快。
  loadData().catch(() => {});
})();