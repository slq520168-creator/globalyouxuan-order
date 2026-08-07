(() => {
  'use strict';

  function loadDynamicDecisionEngine() {
    if (window.__gyxDynamicDecisionLoader) return;
    window.__gyxDynamicDecisionLoader = true;
    const script = document.createElement('script');
    script.src = 'ai-decision.js?v=20260807-3';
    script.async = false;
    script.onerror = () => console.error('AI decision engine failed to load');
    document.body.appendChild(script);
  }

  function setupTypingEffect() {
    const options = document.getElementById('quizOptions');
    const question = document.getElementById('quizQuestion');
    const step = document.getElementById('quizStepLabel');
    if (!options || !question || !step || window.__gyxTypingRestored) return;
    window.__gyxTypingRestored = true;

    let timer = null;
    let animationId = 0;
    let internalChange = false;

    const currentRound = () => {
      const match = String(step.textContent || '').match(/(\d+)/);
      return match ? Number(match[1]) : 1;
    };

    const typeOne = (element, text, speed, id) => new Promise((resolve) => {
      if (!element) { resolve(); return; }
      let index = 0;
      internalChange = true;
      element.textContent = '';
      internalChange = false;
      const tick = () => {
        if (id !== animationId) { resolve(); return; }
        index += 1;
        internalChange = true;
        element.textContent = text.slice(0, index);
        internalChange = false;
        if (index < text.length) setTimeout(tick, speed);
        else resolve();
      };
      tick();
    });

    async function animateCurrentRound() {
      const round = currentRound();
      if (round < 2 || round > 5) return;
      const buttons = Array.from(options.querySelectorAll('button.quiz-option'));
      if (buttons.length !== 5) return;
      const headings = buttons.map((button) => button.querySelector('strong'));
      const questionText = String(question.textContent || '').trim();
      const labels = headings.map((heading) => String(heading?.textContent || '').trim());
      if (!questionText || labels.some((label) => !label || label === '分析中…')) return;

      const id = ++animationId;
      buttons.forEach((button) => { button.disabled = true; });

      await typeOne(question, questionText, 20, id);
      for (let i = 0; i < headings.length; i += 1) {
        if (id !== animationId) return;
        await new Promise((resolve) => setTimeout(resolve, i === 0 ? 90 : 110));
        await typeOne(headings[i], labels[i], 17, id);
      }

      if (id === animationId) buttons.forEach((button) => { button.disabled = false; });
    }

    const schedule = () => {
      if (internalChange) return;
      clearTimeout(timer);
      timer = setTimeout(animateCurrentRound, 45);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(question, { childList: true, characterData: true, subtree: true });
    observer.observe(options, { childList: true, characterData: true, subtree: true });
    observer.observe(step, { childList: true, characterData: true, subtree: true });
  }

  function init() {
    setupTypingEffect();
    loadDynamicDecisionEngine();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();