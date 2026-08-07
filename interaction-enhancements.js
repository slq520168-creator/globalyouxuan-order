(() => {
  'use strict';

  function loadDynamicDecisionEngine() {
    if (window.__gyxDynamicDecisionLoader) return;
    window.__gyxDynamicDecisionLoader = true;
    const script = document.createElement('script');
    script.src = 'ai-decision.js?v=20260807-1';
    script.async = false;
    script.onerror = () => console.error('AI decision engine failed to load');
    document.body.appendChild(script);
  }

  if (document.readyState === 'complete') loadDynamicDecisionEngine();
  else window.addEventListener('load', loadDynamicDecisionEngine, { once: true });
})();