(() => {
  'use strict';

  const options = document.getElementById('quizOptions');
  const question = document.getElementById('quizQuestion');
  const step = document.getElementById('quizStepLabel');
  const resultPanel = document.getElementById('resultPanel');
  const form = document.getElementById('problemForm');
  if (!options || !question || !step) return;

  let animating = false;
  let timer = null;
  let signature = '';
  let runId = 0;
  let resultSignature = '';
  let resultAnimating = false;
  let delayedSubmitPass = false;
  let submitDelayTimer = null;

  // order.js 本身约 2.2 秒后进入第一轮；这里补 1.3 秒，恢复总计约 3.5 秒的搜索等待感。
  if (form) {
    form.addEventListener('submit', (event) => {
      if (delayedSubmitPass) {
        delayedSubmitPass = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      clearTimeout(submitDelayTimer);
      submitDelayTimer = setTimeout(() => {
        delayedSubmitPass = true;
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }, 1300);
    }, true);
  }

  function roundNo() {
    const m = String(step.textContent || '').match(/(\d+)/);
    return m ? Number(m[1]) : 1;
  }

  function buttons() {
    return Array.from(options.querySelectorAll('button.quiz-option'));
  }

  function lockRoundButtons() {
    const r = roundNo();
    if (r < 2 || r > 5) return;
    buttons().forEach((btn) => { btn.disabled = true; });
  }

  function finishNow(qText, labels, btns) {
    question.textContent = qText;
    btns.forEach((btn, i) => {
      const strong = btn.querySelector('strong');
      if (strong) strong.textContent = labels[i] || '';
      btn.disabled = false;
    });
  }

  function typeInto(el, text, speed, token) {
    return new Promise((resolve) => {
      if (!el) { resolve(); return; }
      el.textContent = '';
      let i = 0;
      const tick = () => {
        if (token !== runId) {
          el.textContent = text;
          resolve();
          return;
        }
        i += 1;
        el.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(tick, speed);
        else resolve();
      };
      tick();
    });
  }

  async function animateIfReady() {
    if (animating) return;
    const r = roundNo();
    if (r < 2 || r > 5) return;
    const btns = buttons();
    if (btns.length !== 5) return;
    const labels = btns.map((b) => String(b.querySelector('strong')?.textContent || '').trim());
    const qText = String(question.textContent || '').trim();
    if (!qText || labels.some((x) => !x || x === '分析中…')) return;
    if (qText.includes('正在根据前') || qText.includes('正在分析')) return;
    const sig = r + '|' + qText + '|' + labels.join('|');
    if (sig === signature) {
      btns.forEach((btn) => { btn.disabled = false; });
      return;
    }
    signature = sig;
    animating = true;
    const token = ++runId;
    btns.forEach((btn) => { btn.disabled = true; });
    btns.forEach((btn) => {
      const strong = btn.querySelector('strong');
      if (strong) strong.textContent = '';
    });
    try {
      await typeInto(question, qText, 18, token);
      for (let i = 0; i < labels.length; i += 1) {
        if (token !== runId) break;
        const strong = btns[i].querySelector('strong');
        await typeInto(strong, labels[i], 18, token);
        btns[i].disabled = false;
        await new Promise((resolve) => setTimeout(resolve, 70));
      }
    } finally {
      if (token === runId) {
        finishNow(qText, labels, btns);
        animating = false;
      }
    }
  }

  // 打字未完成时绝不允许点击进入下一轮。
  options.addEventListener('click', (event) => {
    if (!animating) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  async function animateResultIfReady() {
    if (!resultPanel || resultAnimating || resultPanel.classList.contains('hidden')) return;
    const title = document.getElementById('resultTitle');
    const summary = document.getElementById('resultSummary');
    const tier = document.getElementById('resultTier');
    const price = document.getElementById('resultPrice');
    const confidence = document.getElementById('resultConfidence');
    const deliveries = Array.from(document.querySelectorAll('#deliveryList li'));
    const titleText = String(title?.textContent || '').trim();
    const summaryText = String(summary?.textContent || '').trim();
    const tierText = String(tier?.textContent || '').trim();
    const priceText = String(price?.textContent || '').trim();
    const confidenceText = String(confidence?.textContent || '').trim();
    const deliveryTexts = deliveries.map((x) => String(x.textContent || '').trim());
    if (!titleText || titleText === '—' || !summaryText || !tierText || !priceText) return;
    const sig = [titleText, summaryText, tierText, priceText, confidenceText, ...deliveryTexts].join('|');
    if (sig === resultSignature) return;
    resultSignature = sig;
    resultAnimating = true;
    const token = ++runId;
    const orderBtn = document.getElementById('orderAnswerButton');
    const favoriteBtn = document.getElementById('favoriteButton');
    if (orderBtn) orderBtn.disabled = true;
    if (favoriteBtn) favoriteBtn.disabled = true;
    deliveries.forEach((li) => { li.textContent = ''; });
    try {
      await typeInto(title, titleText, 18, token);
      await typeInto(summary, summaryText, 12, token);
      await typeInto(confidence, confidenceText, 18, token);
      await typeInto(tier, tierText, 18, token);
      await typeInto(price, priceText, 18, token);
      for (let i = 0; i < deliveries.length; i += 1) {
        await typeInto(deliveries[i], deliveryTexts[i], 18, token);
        await new Promise((resolve) => setTimeout(resolve, 70));
      }
    } finally {
      if (token === runId) {
        if (title) title.textContent = titleText;
        if (summary) summary.textContent = summaryText;
        if (confidence) confidence.textContent = confidenceText;
        if (tier) tier.textContent = tierText;
        if (price) price.textContent = priceText;
        deliveries.forEach((li, i) => { li.textContent = deliveryTexts[i] || ''; });
        if (orderBtn) orderBtn.disabled = false;
        if (favoriteBtn) favoriteBtn.disabled = false;
        resultAnimating = false;
      }
    }
  }

  function schedule() {
    lockRoundButtons();
    if (!animating) {
      clearTimeout(timer);
      timer = setTimeout(animateIfReady, 50);
    }
    setTimeout(animateResultIfReady, 50);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(question, { childList: true, characterData: true, subtree: true });
  observer.observe(options, { childList: true, characterData: true, subtree: true });
  observer.observe(step, { childList: true, characterData: true, subtree: true });
  if (resultPanel) observer.observe(resultPanel, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();