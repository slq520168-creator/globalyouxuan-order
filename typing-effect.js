(() => {
  'use strict';

  const options = document.getElementById('quizOptions');
  const question = document.getElementById('quizQuestion');
  const step = document.getElementById('quizStepLabel');
  if (!options || !question || !step) return;

  let animating = false;
  let timer = null;
  let signature = '';
  let runId = 0;

  function roundNo() {
    const m = String(step.textContent || '').match(/(\d+)/);
    return m ? Number(m[1]) : 1;
  }

  function buttons() {
    return Array.from(options.querySelectorAll('button.quiz-option'));
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
    if (sig === signature) return;
    signature = sig;
    animating = true;
    const token = ++runId;

    btns.forEach((btn) => { btn.disabled = true; });
    btns.forEach((btn) => {
      const strong = btn.querySelector('strong');
      if (strong) strong.textContent = '';
    });

    try {
      // 保留原来的感觉：先把问题逐字打完，再按1→2→3→4→5逐条完整打出。
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

  function schedule() {
    if (animating) return;
    clearTimeout(timer);
    timer = setTimeout(animateIfReady, 80);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(question, { childList: true, characterData: true, subtree: true });
  observer.observe(options, { childList: true, characterData: true, subtree: true });
  observer.observe(step, { childList: true, characterData: true, subtree: true });
})();