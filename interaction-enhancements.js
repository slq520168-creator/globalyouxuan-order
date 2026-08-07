(() => {
  'use strict';

  const input = document.getElementById('problemInput');
  const form = document.getElementById('problemForm');
  const options = document.getElementById('quizOptions');
  const question = document.getElementById('quizQuestion');
  const help = document.getElementById('quizHelp');
  const step = document.getElementById('quizStepLabel');
  const progress = document.getElementById('quizProgressBar');
  if (!input || !form || !options || !question || !step) return;

  const TIER_CHOICES = [
    { tier: 'essential', product_id: 'answer-essential', label: '新手｜关键结论', price: '6.90' },
    { tier: 'standard', product_id: 'answer-standard', label: '小白｜标准步骤', price: '9.90' },
    { tier: 'detailed', product_id: 'answer-detailed', label: '技术｜详细实操', price: '16.90' },
    { tier: 'professional', product_id: 'answer-professional', label: '加强｜专业执行', price: '19.99' },
    { tier: 'custom', product_id: 'answer-custom', label: '高手｜深度方案', price: '39.99' }
  ];

  const FIXED_INTENTS = [
    { module: 'web', words: ['网站','官网','网页','建站','商城','独立站','落地页','web','website','shop'] },
    { module: 'automation', words: ['自动化','工作流','机器人','bot','自动通知','自动发货','自动回复','流程自动','workflow','automation'] },
    { module: 'digital', words: ['学ai','ai教程','ai课程','学习ai','绘画教程','视频教程','数字人教程','提示词教程','本地模型','系统学习'] },
    { module: 'ai', words: ['ai办公','ai文案','ai内容','内容营销','会议纪要','周报','ppt','翻译润色','企业ai','ai助手'] }
  ];

  const style = document.createElement('style');
  style.textContent = `
    .gyx-type-wait{opacity:0;transform:translateY(6px)}
    .gyx-type-show{opacity:1;transform:none;transition:opacity .18s ease,transform .18s ease}
    @media(max-width:960px){#paymentTxid,#problemInput,.field,input,textarea,select{font-size:16px!important}}
  `;
  document.head.appendChild(style);

  let searchTimer = null;
  let animationToken = 0;
  let customTierRound = false;
  let pendingFinalButton = null;

  const originalInvoke = window.gyxInvokeFunction;
  if (typeof originalInvoke === 'function' && !window.__gyxInvokeWrappedV6) {
    window.__gyxInvokeWrappedV6 = true;
    window.gyxInvokeFunction = async (name, body = {}) => {
      if (name === 'create-order' && window.__gyxSelectedTier && String(body.product_id || '').startsWith('answer-')) {
        const selected = window.__gyxSelectedTier;
        const next = { ...body, product_id: selected.product_id, answer_tier: selected.tier };
        if (Array.isArray(body.selection_path)) {
          next.selection_path = body.selection_path.slice(0, 5).concat([`资料级别：${selected.label}（${selected.price} USDT）`]);
        }
        return originalInvoke(name, next);
      }
      return originalInvoke(name, body);
    };
  }

  function syncSelectedTierUI() {
    const selected = window.__gyxSelectedTier;
    if (!selected) return;
    const tierEl = document.getElementById('resultTier');
    const resultPrice = document.getElementById('resultPrice');
    const orderPrice = document.getElementById('orderProductPrice');
    const orderDesc = document.getElementById('orderProductDescription');
    if (tierEl && tierEl.textContent !== selected.label) tierEl.textContent = selected.label;
    if (resultPrice && resultPrice.textContent !== selected.price) resultPrice.textContent = selected.price;
    const modal = document.getElementById('orderModal');
    if (modal?.classList.contains('show')) {
      if (orderPrice && orderPrice.textContent !== selected.price) orderPrice.textContent = selected.price;
      if (orderDesc && orderDesc.textContent !== selected.label) orderDesc.textContent = selected.label;
    }
  }

  function resetTierChoice() {
    customTierRound = false;
    pendingFinalButton = null;
    window.__gyxSelectedTier = null;
  }

  function originalQuestionText() {
    return String(document.getElementById('originalQuestion')?.textContent || input.value || '')
      .toLowerCase().replace(/[“”"']/g, '').trim();
  }

  function detectFixedModule() {
    const q = originalQuestionText();
    if (!q) return '';
    for (const item of FIXED_INTENTS) {
      if (item.words.some((word) => q.includes(word.toLowerCase()))) return item.module;
    }
    return '';
  }

  function openFixedModule(module) {
    const card = document.querySelector(`[data-fixed-module="${module}"]`);
    const quiz = document.getElementById('quizPanel');
    const result = document.getElementById('resultPanel');
    if (!card) return false;
    resetTierChoice();
    if (quiz) quiz.classList.add('hidden');
    if (result) result.classList.add('hidden');
    card.click();
    setTimeout(() => {
      const panel = document.getElementById('fixedPlansPanel');
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return true;
  }

  input.addEventListener('input', (event) => {
    event.stopImmediatePropagation();
    resetTierChoice();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (input.value.trim().length < 2) return;
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, 3000);
  }, true);

  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clearTimeout(searchTimer);
    if (input.value.trim().length < 2) return;
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, true);

  function typeText(element, text, speed, token, done) {
    if (!element) { if (done) done(); return; }
    element.textContent = '';
    let index = 0;
    const tick = () => {
      if (token !== animationToken) return;
      index += 1;
      element.textContent = text.slice(0, index);
      if (index < text.length) setTimeout(tick, speed);
      else if (done) done();
    };
    tick();
  }

  function currentRound() {
    const match = String(step.textContent || '').match(/(\d+)/);
    return match ? Number(match[1]) : 1;
  }

  function normalizeProgressLabel() {
    if (customTierRound) return;
    const current = String(step.textContent || '');
    const next = current.replace(/\/\s*5\s*轮?/, '/ 6 轮');
    if (next !== current) step.textContent = next;
    if (progress) progress.style.width = String(Math.min(83.33, currentRound() * (100 / 6))) + '%';
  }

  function animateRound() {
    normalizeProgressLabel();
    const round = currentRound();
    if (round <= 1 || customTierRound) return;
    const buttons = Array.from(options.querySelectorAll('button.quiz-option'));
    if (!buttons.length) return;
    animationToken += 1;
    const token = animationToken;
    const questionText = question.textContent || '';
    const rows = buttons.map((button) => {
      const heading = button.querySelector('strong');
      const text = heading ? heading.textContent : '';
      button.disabled = true;
      button.classList.remove('gyx-type-show');
      button.classList.add('gyx-type-wait');
      if (heading) heading.textContent = '';
      return { button, heading, text };
    });
    typeText(question, questionText, 22, token, () => {
      rows.forEach((row, index) => {
        setTimeout(() => {
          if (token !== animationToken) return;
          row.button.classList.remove('gyx-type-wait');
          row.button.classList.add('gyx-type-show');
          typeText(row.heading, row.text, 18, token, () => { row.button.disabled = false; });
        }, 100 + index * 360);
      });
    });
  }

  function showTierRound(finalButton) {
    customTierRound = true;
    pendingFinalButton = finalButton;
    animationToken += 1;
    step.textContent = '第 6 / 6 轮';
    if (progress) progress.style.width = '100%';
    question.textContent = '最后选择你需要的资料级别';
    if (help) help.textContent = '价格由你自己选择，系统按对应档位交付资料。';
    options.replaceChildren();
    const token = animationToken;
    TIER_CHOICES.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = 'quiz-option compact gyx-type-wait';
      button.type = 'button';
      button.disabled = true;
      const number = document.createElement('span');
      number.className = 'option-number';
      number.textContent = String(index + 1);
      const body = document.createElement('span');
      const heading = document.createElement('strong');
      const small = document.createElement('small');
      small.textContent = `${item.price} USDT`;
      body.append(heading, small);
      button.append(number, body);
      button.addEventListener('click', () => {
        window.__gyxSelectedTier = item;
        customTierRound = false;
        const original = pendingFinalButton;
        pendingFinalButton = null;
        if (original) original.click();
        [50, 180, 450].forEach((ms) => setTimeout(syncSelectedTierUI, ms));
      });
      options.appendChild(button);
      setTimeout(() => {
        if (token !== animationToken) return;
        button.classList.remove('gyx-type-wait');
        button.classList.add('gyx-type-show');
        typeText(heading, item.label, 18, token, () => { button.disabled = false; });
      }, 120 + index * 380);
    });
  }

  options.addEventListener('click', (event) => {
    if (customTierRound) return;
    const button = event.target.closest?.('button.quiz-option');
    if (!button || currentRound() !== 5) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    // 搜索内容如果明确属于首页四个固定模块，最后直接回到该模块的固定方案，
    // 不再显示 6.9～39.99 的通用资料档位，避免和固定卡片价格/答案冲突。
    const fixedModule = detectFixedModule();
    if (fixedModule && openFixedModule(fixedModule)) return;

    // 只有不属于四个固定模块的知识库搜索，才进入第6轮通用资料档位选择。
    showTierRound(button);
  }, true);

  document.getElementById('orderAnswerButton')?.addEventListener('click', () => {
    if (!window.__gyxSelectedTier) return;
    [60, 220, 600, 1000].forEach((ms) => setTimeout(syncSelectedTierUI, ms));
  }, true);

  document.getElementById('restartMatchButton')?.addEventListener('click', resetTierChoice, true);
  document.getElementById('newQuestionButton')?.addEventListener('click', resetTierChoice, true);

  const observer = new MutationObserver(() => animateRound());
  observer.observe(options, { childList: true });
  const stepObserver = new MutationObserver(normalizeProgressLabel);
  stepObserver.observe(step, { childList: true, characterData: true, subtree: true });
  const modal = document.getElementById('orderModal');
  const resultPanel = document.getElementById('resultPanel');
  if (modal) new MutationObserver(syncSelectedTierUI).observe(modal, { attributes: true, childList: true, subtree: true, characterData: true });
  if (resultPanel) new MutationObserver(syncSelectedTierUI).observe(resultPanel, { attributes: true, childList: true, subtree: true, characterData: true });
})();