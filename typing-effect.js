(() => {
  'use strict';

  const form = document.getElementById('problemForm');
  const message = document.getElementById('problemMessage');
  const options = document.getElementById('quizOptions');
  const question = document.getElementById('quizQuestion');
  const step = document.getElementById('quizStepLabel');
  if (!options || !question || !step) return;

  let roundAnimating = false;
  let roundSignature = '';
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

  form?.addEventListener('submit', () => {
    if (!message) return;
    const token = ++runId;
    typeInto(message, '正在为您智能分析并匹配最合适的解决方案，请稍候…', 26, token);
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

  let scheduleTimer = null;
  function schedule() {
    clearTimeout(scheduleTimer);
    scheduleTimer = setTimeout(animateRoundIfReady, 45);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(question, { childList: true, characterData: true, subtree: true });
  observer.observe(options, { childList: true, characterData: true, subtree: true });
  observer.observe(step, { childList: true, characterData: true, subtree: true });
})();