(() => {
  "use strict";

  if (window.__GYX_ADMIN_BOOTSTRAP__) return;
  window.__GYX_ADMIN_BOOTSTRAP__ = 1;
  document.documentElement.classList.add("gyx-admin-booting");

  const CORE_SCRIPTS = [
    "admin-member-security.js?v=20260917-member-overview-fix-1",
    "admin.js?v=20260917-admin-mobile-shell-1",
    "admin-priority.js?v=20260819-payment-admin-repair-1",
  ];

  const SECONDARY_SCRIPTS = [
    "admin-freezone-upload.js?v=20260813-freezone-upload-2",
    "admin-profile-requests.js?v=20260917-profile-review-fix-1",
    "admin-data.js?v=20260816-growth-human-3",
    "admin-business-growth.js?v=20260816-growth-records-1",
    "admin-fixed-card-answers.js?v=20260816-fixed-card-schemes-2",
    "admin-reporting.js?v=20260822-daily-views-1",
    "admin-security-center.js?v=20260817-security-1",
    "admin-visit-analytics.js?v=20260917-detailed-visits-1",
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-gyx-admin-src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.dataset.gyxAdminSrc = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`LOAD_FAILED:${src}`));
      document.body.appendChild(s);
    });
  }

  async function loadGroup(list) {
    for (const src of list) await loadScript(src);
  }

  const settle = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

  function showPanel(name) {
    const src = document.querySelector(`.admin-nav-v2 button[data-panel="${name}"]`);
    if (src) src.click();
  }

  async function getBadgeCounts() {
    try {
      const db = window.gyxSupabase;
      if (!db?.rpc) return null;
      const r = await db.rpc("gyx_admin_badge_counts");
      if (r.error) return null;
      return (Array.isArray(r.data) ? r.data[0] : r.data) || null;
    } catch {
      return null;
    }
  }

  function installSystemNav() {
    const messages = document.querySelector('.admin-nav-v2 button[data-panel="messages"]');
    if (!messages || document.querySelector('[data-admin-system-notify]')) return;
    const app = document.createElement("button");
    app.type = "button";
    app.dataset.adminSystemNotify = "1";
    app.textContent = "APP / 系统通知";
    app.addEventListener("click", () => showPanel("services"));
    messages.insertAdjacentElement("afterend", app);
  }

  async function setupAdminChrome(user) {
    const head = document.querySelector(".admin-head");
    if (!head || head.dataset.chromeReady === "1") return;
    head.dataset.chromeReady = "1";
    head.innerHTML = "";

    const notify = document.createElement("button");
    notify.type = "button";
    notify.className = "admin-head-notify";
    notify.setAttribute("aria-label", "新通知");
    notify.innerHTML = '<span class="admin-bell">●</span><b>通知</b><i id="adminNotifyBadge" hidden>0</i>';
    notify.addEventListener("click", () => {
      const profileBtn = document.querySelector('[data-panel="profileRequests"]');
      if (profileBtn) profileBtn.click();
      else showPanel("messages");
    });

    const accountWrap = document.createElement("div");
    accountWrap.className = "admin-account-wrap";
    const account = document.createElement("button");
    account.type = "button";
    account.className = "admin-account-logo";
    account.setAttribute("aria-label", "后台账号");
    account.innerHTML = '<img src="assets/member-logo.webp" alt="GlobalYouXuan">';
    const menu = document.createElement("div");
    menu.className = "admin-account-menu";
    menu.hidden = true;
    const email = String(user?.email || "").trim();
    menu.innerHTML = `<div class="admin-account-email">${email.replace(/[&<>"']/g, "")}</div><button type="button" id="adminLogout">退出登录</button>`;
    account.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener("click", () => {
      menu.hidden = true;
    });
    menu.addEventListener("click", (e) => e.stopPropagation());
    accountWrap.append(account, menu);
    head.append(notify, accountWrap);

    const logout = menu.querySelector("#adminLogout");
    logout.addEventListener("click", async () => {
      try {
        if (email) localStorage.setItem("gyx_admin_saved_email", email);
      } catch {}
      try {
        await window.gyxSupabase?.auth?.signOut();
      } catch {}
      location.replace("admin-login.html");
    });

    const refreshBadge = async () => {
      const d = await getBadgeCounts();
      if (!d) return;
      const fallback = Number(d.messages || 0) + Number(d.notifications || 0) + Number(d.profile_requests || 0);
      const n = Number.isFinite(Number(d.total)) ? Number(d.total) : fallback;
      const badge = document.getElementById("adminNotifyBadge");
      if (!badge) return;
      badge.textContent = n > 99 ? "99+" : String(n);
      badge.hidden = n < 1;
    };
    refreshBadge();
    setInterval(() => {
      if (!document.hidden) refreshBadge();
    }, 30000);
  }

  function normalizeNavigation() {
    const nav = document.querySelector(".admin-nav-v2");
    if (!nav) return;
    nav.classList.remove("mobile-more-collapsed");
    document.querySelectorAll(".admin-mobile-primary,.admin-mobile-more-toggle").forEach((x) => x.remove());
    installSystemNav();
  }

  function restoreRequestedPanel() {
    const name = location.hash.slice(1);
    if (name === "members") {
      document.querySelector("[data-admin-members-nav]")?.click();
      return;
    }
    const reporting = document.querySelector(`[data-reporting="${name}"]`);
    if (reporting) reporting.click();
  }

  function reveal() {
    document.documentElement.classList.remove("gyx-admin-booting");
    document.documentElement.classList.add("gyx-admin-ready");
  }

  async function boot() {
    try {
      const user = await window.gyxGetVerifiedUser?.();
      if (!user) {
        location.replace("admin-login.html");
        return;
      }

      document.documentElement.classList.add("gyx-admin-unlocked");
      await setupAdminChrome(user);
      normalizeNavigation();

      await loadGroup(CORE_SCRIPTS);
      await loadGroup(SECONDARY_SCRIPTS);

      normalizeNavigation();
      restoreRequestedPanel();

      // Several legacy owners install their existing DOM blocks with short timers.
      // Keep the shell hidden until those installs have completed so the user sees one stable layout.
      await settle(650);
      normalizeNavigation();
      restoreRequestedPanel();
      reveal();
    } catch (e) {
      console.error("ADMIN_BOOT_FAILED", e);
      reveal();
      location.replace("admin-login.html");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();