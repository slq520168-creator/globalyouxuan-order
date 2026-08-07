(() => {
  'use strict';

  function loadDynamicDecisionEngine() {
    if (window.__gyxDynamicDecisionLoader) return;
    window.__gyxDynamicDecisionLoader = true;

    const script = document.createElement('script');
    script.src = 'ai-decision-v3.js?v=20260807-3';
    script.async = false;
    script.onerror = () => console.error('AI decision engine failed to load');
    document.body.appendChild(script);
  }

  if (document.readyState === 'complete') loadDynamicDecisionEngine();
  else window.addEventListener('load', loadDynamicDecisionEngine, { once: true });
})();