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

  function typeInto(el, text, speed, token, done) {
    if (!el) { done?.(); return; }
    el.textContent = '';
    let i = 0;
    const tick = () => {
      if (token !== runId) { el.textContent = text; done?.(); return; }
      i = Math.min(text.length, i + 2); // 每次2个字，保留打字感但不拖慢
      el.textContent = text.slice(0, i);
      if (i < text.length) setTimeout(tick, speed);
      else done?.();
    };
    tick();
  }

  function animateIfReady() {
    if (animating) return;
    const r = roundNo();
    if (r < 2 || r > 5) return;

    const btns = buttons();
    if (btns.length !== 5) return;
    const labels = btns.map((b) => String(b.querySelector('strong')?.textContent || '').trim());
    const qText = String(question.textContent || '').trim();

    // AI还在分析时不启动动画，避免出现空白选项。
    if (!qText || labels.some((x) => !x || x === '分析中…')) return;
    if (qText.includes('正在根据前') || qText.includes('正在分析')) return;

    const sig = r + '|' + qText + '|' + labels.join('|');
    if (sig === signature) return;
    signature = sig;
    animating = true;
    const token = ++runId;

    btns.forEach((btn) => { btn.disabled = true; });

    // 问题与5个答案快速打字，总体控制在约1秒内，不再逐项长时间等待。
    typeInto(question, qText, 7, token);
    labels.forEach((label, index) => {
      const strong = btns[index].querySelector('strong');
      setTimeout(() => {
        typeInto(strong, label, 5, token, () => {
          btns[index].disabled = false;
          if (index === labels.length - 1) animating = false;
        });
      }, index * 45);
    });

    // 保险：任何异常最多1.2秒后直接显示完整内容，绝不留空。
    setTimeout(() => {
      if (token !== runId) return;
      finishNow(qText, labels, btns);
      animating = false;
    }, 1200);
  }

  function schedule() {
    if (animating) return;
    clearTimeout(timer);
    timer = setTimeout(animateIfReady, 60);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(question, { childList: true, characterData: true, subtree: true });
  observer.observe(options, { childList: true, characterData: true, subtree: true });
  observer.observe(step, { childList: true, characterData: true, subtree: true });
})();