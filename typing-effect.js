(() => {
  'use strict';

  const form = document.getElementById('problemForm');
  const message = document.getElementById('problemMessage');
  const options = document.getElementById('quizOptions');
  const question = document.getElementById('quizQuestion');
  const step = document.getElementById('quizStepLabel');
  const resultPanel = document.getElementById('resultPanel');
  if (!options || !question || !step) return;

  let roundAnimating = false;
  let roundSignature = '';
  let resultSignature = '';
  let runId = 0;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function roundNo() {
    const m = String(step.textContent || '').match(/(\d+)/);
    return m ? Number(m[1]) : 1;
  }

  function buttons() {
    return Array.from(options.querySelectorAll('button.quiz-option'));
  }

  function typeInto(el, text, speed, token) {
    return new Promise((resolve) => {
      if (!el) { resolve(); return; }
      const full = String(text || '');
      el.textContent = '';
      let i = 0;
      const tick = () => {
        if (token !== runId) {
          el.textContent = full;
          resolve();
          return;
        }
        i += 1;
        el.textContent = full.slice(0, i);
        if (i < full.length) setTimeout(tick, speed);
        else resolve();
      };
      tick();
    });
  }

  // 搜索开始语：模拟真人输入，不阻塞真实搜索请求。
  form?.addEventListener('submit', () => {
    if (!message) return;
    const token = ++runId;
    const text = '正在理解你的问题，并从资料库筛选最相关的方向…';
    typeInto(message, text, 26, token);
  }, true);

  async function animateRoundIfReady() {
    if (roundAnimating) return;
    const r = roundNo();
    if (r < 1 || r > 5) return;
    const btns = buttons();
    if (btns.length !== 5) return;

    const qText = String(question.textContent || '').trim();
    const labels = btns.map((b) => String(b.querySelector('strong')?.textContent || '').trim());
    if (!qText || labels.some((x) => !x)) return;

    const sig = `${r}|${qText}|${labels.join('|')}`;
    if (sig === roundSignature) return;
    roundSignature = sig;
    roundAnimating = true;
    const token = ++runId;

    btns.forEach((btn) => { btn.disabled = true; });
    btns.forEach((btn) => {
      const strong = btn.querySelector('strong');
      if (strong) strong.textContent = '';
    });

    try {
      if (message) message.textContent = '';
      await typeInto(question, qText, 24, token);
      await sleep(100);
      for (let i = 0; i < btns.length; i += 1) {
        if (token !== runId) break;
        const strong = btns[i].querySelector('strong');
        await typeInto(strong, labels[i], 24, token);
        btns[i].disabled = false;
        await sleep(110);
      }
    } finally {
      if (token === runId) {
        question.textContent = qText;
        btns.forEach((btn, i) => {
          const strong = btn.querySelector('strong');
          if (strong) strong.textContent = labels[i] || '';
          btn.disabled = false;
        });
        roundAnimating = false;
      }
    }
  }

  options.addEventListener('click', (event) => {
    if (!roundAnimating) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  async function animateResultIfReady() {
    if (!resultPanel || resultPanel.classList.contains('hidden')) return;
    const title = document.getElementById('resultTitle');
    const summary = document.getElementById('resultSummary');
    const confidence = document.getElementById('resultConfidence');
    const tier = document.getElementById('resultTier');
    const price = document.getElementById('resultPrice');
    const deliveries = Array.from(document.querySelectorAll('#deliveryList li'));

    const titleText = String(title?.textContent || '').trim();
    const summaryText = String(summary?.textContent || '').trim();
    const confidenceText = String(confidence?.textContent || '').trim();
    const tierText = String(tier?.textContent || '').trim();
    const priceText = String(price?.textContent || '').trim();
    const deliveryTexts = deliveries.map((x) => String(x.textContent || '').trim());

    if (!titleText || titleText === '—' || !summaryText) return;
    const sig = [titleText, summaryText, confidenceText, tierText, priceText, ...deliveryTexts].join('|');
    if (sig === resultSignature) return;
    resultSignature = sig;
    const token = ++runId;

    const orderBtn = document.getElementById('orderAnswerButton');
    const favoriteBtn = document.getElementById('favoriteButton');
    if (orderBtn) orderBtn.disabled = true;
    if (favoriteBtn) favoriteBtn.disabled = true;
    deliveries.forEach((li) => { li.textContent = ''; });

    try {
      await typeInto(title, titleText, 24, token);
      await sleep(100);
      await typeInto(summary, summaryText, 18, token);
      await sleep(100);
      await typeInto(confidence, confidenceText, 24, token);
      await typeInto(tier, tierText, 24, token);
      await typeInto(price, priceText, 24, token);
      for (let i = 0; i < deliveries.length; i += 1) {
        await typeInto(deliveries[i], deliveryTexts[i], 22, token);
        await sleep(100);
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
      }
    }
  }

  let scheduleTimer = null;
  function schedule() {
    clearTimeout(scheduleTimer);
    scheduleTimer = setTimeout(() => {
      animateRoundIfReady();
      animateResultIfReady();
    }, 45);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(question, { childList: true, characterData: true, subtree: true });
  observer.observe(options, { childList: true, characterData: true, subtree: true });
  observer.observe(step, { childList: true, characterData: true, subtree: true });
  if (resultPanel) observer.observe(resultPanel, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();