(() => {
  'use strict';

  function loadDynamicDecisionEngine() {
    if (window.__gyxDynamicDecisionLoader) return;
    window.__gyxDynamicDecisionLoader = true;

    const script = document.createElement('script');
    script.src = 'ai-decision.js?v=20260807-2';
    script.async = false;
    script.onerror = () => console.error('AI decision engine failed to load');
    script.onload = () => {
      const typing = document.createElement('script');
      typing.src = 'typing-effect.js?v=20260807-1';
      typing.async = false;
      typing.onerror = () => console.error('Typing effect failed to load');
      document.body.appendChild(typing);
    };
    document.body.appendChild(script);
  }

  if (document.readyState === 'complete') loadDynamicDecisionEngine();
  else window.addEventListener('load', loadDynamicDecisionEngine, { once: true });
})();