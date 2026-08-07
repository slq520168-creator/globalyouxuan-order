(() => {
  'use strict';

  const input = document.getElementById('problemInput');
  const form = document.getElementById('problemForm');
  const options = document.getElementById('quizOptions');
  const question = document.getElementById('quizQuestion');
  const step = document.getElementById('quizStepLabel');
  if (!input || !form || !options || !question || !step) return;

  const style = document.createElement('style');
  style.textContent = `
    .gyx-type-wait{opacity:0;transform:translateY(6px)}
    .gyx-type-show{opacity:1;transform:none;transition:opacity .18s ease,transform .18s ease}
  `;
  document.head.appendChild(style);

  let searchTimer = null;
  let animationToken = 0;

  input.addEventListener('input', (event) => {
    event.stopImmediatePropagation();
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

  function animateRound() {
    const match = String(step.textContent || '').match(/(\d+)/);
    const round = match ? Number(match[1]) : 1;
    if (round <= 1) return;

    const buttons = Array.from(options.querySelectorAll('button.quiz-option'));
    if (!buttons.length) return;

    animationToken += 1;
    const token = animationToken;
    const questionText = question.textContent || '';
    const rows = buttons.map((button) => {
      const heading = button.querySelector('strong');
      const text = heading ? heading.textContent : '';
      button.disabled = true;
      button.classList.add('gyx-type-wait');
      if (heading) heading.textContent = '';
      return { button, heading, text };
    });

    typeText(question, questionText, 24, token, () => {
      rows.forEach((row, index) => {
        setTimeout(() => {
          if (token !== animationToken) return;
          row.button.classList.remove('gyx-type-wait');
          row.button.classList.add('gyx-type-show');
          typeText(row.heading, row.text, 20, token, () => {
            row.button.disabled = false;
          });
        }, 120 + index * 420);
      });
    });
  }

  let scheduled = null;
  const observer = new MutationObserver(() => {
    clearTimeout(scheduled);
    scheduled = setTimeout(animateRound, 0);
  });
  observer.observe(options, { childList: true });
})();
