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
  let pendingFinalLabel = '';

  const originalInvoke = window.gyxInvokeFunction;
  if (typeof originalInvoke === 'function' && !window.__gyxInvokeWrappedV6) {
    window.__gyxInvokeWrappedV6 = true;
    window.gyxInvokeFunction = async (name, body = {}) => {
      if (name === 'create-order' && window.__gyxSelectedTier && String(body.product_id || '').startsWith('answer-')) {
        const selected = window.__gyxSelectedTier;
        const next = { ...body, product_id: selected.product_id, answer_tier: selected.tier };
        if (Array.isArray(body.selection_path)) {
          const base = body.selection_path.slice(0, 5);
          next.selection_path = base.concat([`资料级别：${selected.label}（${selected.price} USDT）`]);
        }
        return originalInvoke(name, next);
      }
      return originalInvoke(name, body);
    };
  }

  function resetTierChoice() {
    customTierRound = false;
    pendingFinalButton = null;
    pendingFinalLabel = '';
    window.__gyxSelectedTier = null;
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
    if (!customTierRound) {
      step.textContent = String(step.textContent || '').replace(/\/\s*5\s*轮?/, '/ 6 轮');
      if (progress) progress.style.width = String(Math.min(83.33, currentRound() * (100 / 6))) + '%';
    }
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
    pendingFinalLabel = finalButton.querySelector('strong')?.textContent || '';
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
        setTimeout(() => {
          const tierEl = document.getElementById('resultTier');
          const priceEl = document.getElementById('resultPrice');
          if (tierEl) tierEl.textContent = item.label;
          if (priceEl) priceEl.textContent = item.price;
        }, 60);
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
    if (!button) return;
    if (currentRound() !== 5) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showTierRound(button);
  }, true);

  document.getElementById('orderAnswerButton')?.addEventListener('click', () => {
    const selected = window.__gyxSelectedTier;
    if (!selected) return;
    setTimeout(() => {
      const price = document.getElementById('orderProductPrice');
      const desc = document.getElementById('orderProductDescription');
      if (price) price.textContent = selected.price;
      if (desc) desc.textContent = selected.label;
    }, 80);
  }, true);

  document.getElementById('restartMatchButton')?.addEventListener('click', resetTierChoice, true);
  document.getElementById('newQuestionButton')?.addEventListener('click', resetTierChoice, true);

  const observer = new MutationObserver(() => animateRound());
  observer.observe(options, { childList: true });

  const stepObserver = new MutationObserver(normalizeProgressLabel);
  stepObserver.observe(step, { childList: true, characterData: true, subtree: true });
})();