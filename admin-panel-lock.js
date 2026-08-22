(() => {
  "use strict";

  if (window.__GYX_ADMIN_BOOTSTRAP__) return;
  window.__GYX_ADMIN_BOOTSTRAP__ = 1;

  const CORE_SCRIPTS = [
    "admin.js?v=20260818-admin-direct-1",
    "admin-priority.js?v=20260819-payment-admin-repair-1",
  ];

  const SECONDARY_SCRIPTS = [
    "admin-freezone-upload.js?v=20260813-freezone-upload-2",
    "admin-member-security.js?v=20260817-members-unified-1",
    "admin-profile-requests.js?v=20260817-review-touch-2",
    "admin-data.js?v=20260816-growth-human-3",
    "admin-business-growth.js?v=20260816-growth-records-1",
    "admin-fixed-card-answers.js?v=20260816-fixed-card-schemes-2",
    "admin-reporting.js?v=20260822-daily-views-1",
    "admin-security-center.js?v=20260817-security-1",
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-gyx-admin-src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.dataset.gyxAdminSrc = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`LOAD_FAILED:${src}`));
      document.body.appendChild(s);
    });
  }

  const yieldToUI = () => new Promise((resolve) => setTimeout(resolve, 70));

  async function loadGroup(list) {
    for (const src of list) {
      await loadScript(src);
      await yieldToUI();
    }
  }

  async function boot() {
    try {
      const user = await window.gyxGetVerifiedUser?.();
      if (!user) {
        location.replace("admin-login.html");
        return;
      }

      document.documentElement.classList.add("gyx-admin-unlocked");

      await loadGroup(CORE_SCRIPTS);

      const loadSecondary = async () => {
        try {
          await loadGroup(SECONDARY_SCRIPTS);
        } catch (e) {
          console.error("ADMIN_SECONDARY_LOAD_FAILED", e);
        }
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => loadSecondary(), { timeout: 1200 });
      } else {
        setTimeout(loadSecondary, 300);
      }
    } catch (e) {
      console.error("ADMIN_BOOT_FAILED", e);
      location.replace("admin-login.html");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
