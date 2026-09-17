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
  const esc = (v) => String(v ?? "—").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[m]);

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

  async function getSessionToken() {
    const db = window.gyxSupabase;
    if (!db?.auth) throw new Error("后台连接未就绪");
    const { data } = await db.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("登录已失效");
    return token;
  }

  async function adminApi(body) {
    const token = await getSessionToken();
    const res = await fetch("https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/admin-api", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(json.message || json.error || "请求失败");
    return json;
  }

  async function systemPush(body) {
    const token = await getSessionToken();
    const res = await fetch("https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/system-web-push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(json.message || json.error || "系统通知发送失败");
    return json;
  }

  async function pushSubscriptions(userId = null) {
    const db = window.gyxSupabase;
    const r = await db.rpc("gyx_admin_push_subscriptions", { p_user_id: userId });
    if (r.error) throw r.error;
    return Array.isArray(r.data) ? r.data : [];
  }

  async function pushHistory() {
    const db = window.gyxSupabase;
    const r = await db.rpc("gyx_admin_system_push_history", { p_limit: 100 });
    if (r.error) throw r.error;
    return Array.isArray(r.data) ? r.data : [];
  }

  async function memberOptions() {
    const db = window.gyxSupabase;
    const r = await db.rpc("gyx_admin_members_overview", { p_limit: 300 });
    if (r.error) throw r.error;
    return Array.isArray(r.data) ? r.data : [];
  }

  function ensureAppPanel() {
    let panel = document.getElementById("appPanel");
    if (panel) return panel;
    const main = document.querySelector(".admin-card-v2");
    if (!main) return null;
    panel = document.createElement("section");
    panel.id = "appPanel";
    panel.className = "admin-panel-v2 hidden";
    panel.innerHTML = `
      <div class="admin-section-title"><h2>APP</h2><p>网站 APP 独立入口，与系统通知分开管理。</p></div>
      <div style="display:grid;gap:14px;border:1px solid #dce8fb;background:#fff;border-radius:14px;padding:14px">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="assets/member-logo.webp" alt="GlobalYouXuan" style="width:72px;height:72px;border-radius:16px;object-fit:cover;border:1px solid #e2e8f0;background:#fff">
          <div style="min-width:0"><strong style="display:block;font-size:17px">GlobalYouXuan</strong><small style="display:block;margin-top:5px;color:#667085;line-height:1.45">会员可在会员中心添加到手机桌面并开启平台通知。</small></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px">
          <a class="refresh-btn" href="member.html#gyxPwaPanel" style="text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center">查看会员 APP</a>
          <a class="refresh-btn" href="shop.html" target="_blank" rel="noopener" style="text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center">打开网站</a>
        </div>
      </div>`;
    main.appendChild(panel);
    return panel;
  }

  function ensureSystemNotificationsPanel() {
    let panel = document.getElementById("systemNotificationsPanel");
    if (panel) return panel;
    const main = document.querySelector(".admin-card-v2");
    if (!main) return null;
    panel = document.createElement("section");
    panel.id = "systemNotificationsPanel";
    panel.className = "admin-panel-v2 hidden";
    panel.innerHTML = `
      <div class="admin-section-title"><h2>系统通知</h2><p>向已开启系统通知的会员设备发送平台通知。</p></div>
      <div style="display:grid;gap:9px;border:1px solid #dce8fb;background:#fff;border-radius:12px;padding:10px;margin-bottom:9px">
        <div id="systemPushSubscriptionCount" style="font-size:11px;color:#667085">正在读取已订阅设备…</div>
        <label style="font-size:11px;font-weight:800">发送对象<select id="systemPushTarget" style="display:block;width:100%;min-height:38px;margin-top:4px;border:1px solid #d9e1ec;border-radius:9px;padding:7px;background:#fff"><option value="all">全部已订阅设备</option><option value="user">指定会员</option></select></label>
        <label id="systemPushMemberWrap" style="display:none;font-size:11px;font-weight:800">指定会员<select id="systemPushMember" style="display:block;width:100%;min-height:38px;margin-top:4px;border:1px solid #d9e1ec;border-radius:9px;padding:7px;background:#fff"><option value="">请选择会员</option></select></label>
        <label style="font-size:11px;font-weight:800">通知标题<input id="systemPushTitle" maxlength="120" placeholder="例如：全球优选系统通知" style="display:block;width:100%;min-height:38px;margin-top:4px;border:1px solid #d9e1ec;border-radius:9px;padding:8px"></label>
        <label style="font-size:11px;font-weight:800">通知正文<textarea id="systemPushBody" maxlength="500" rows="4" placeholder="输入要发送给会员的内容" style="display:block;width:100%;margin-top:4px;border:1px solid #d9e1ec;border-radius:9px;padding:8px;resize:vertical"></textarea></label>
        <label style="font-size:11px;font-weight:800">点击通知打开<input id="systemPushUrl" value="member.html" maxlength="500" style="display:block;width:100%;min-height:38px;margin-top:4px;border:1px solid #d9e1ec;border-radius:9px;padding:8px"></label>
        <button id="systemPushSend" type="button" class="primary-btn" style="width:100%">发送系统通知</button>
        <div id="systemPushResult" style="font-size:11px;color:#667085;min-height:16px"></div>
      </div>
      <div class="panel-tools"><button type="button" class="refresh-btn" id="systemNotificationsRefresh">刷新发送记录</button></div>
      <div id="systemNotificationsBody" class="loading">正在读取发送记录…</div>`;
    main.appendChild(panel);

    const target = panel.querySelector("#systemPushTarget");
    target?.addEventListener("change", () => {
      const userMode = target.value === "user";
      const wrap = panel.querySelector("#systemPushMemberWrap");
      if (wrap) wrap.style.display = userMode ? "block" : "none";
      refreshSystemPushCount();
    });
    panel.querySelector("#systemPushMember")?.addEventListener("change", refreshSystemPushCount);
    panel.querySelector("#systemPushSend")?.addEventListener("click", sendSystemPush);
    panel.querySelector("#systemNotificationsRefresh")?.addEventListener("click", () => loadSystemNotifications());
    return panel;
  }

  async function refreshSystemPushCount() {
    const panel = ensureSystemNotificationsPanel();
    if (!panel) return;
    const target = panel.querySelector("#systemPushTarget")?.value || "all";
    const member = panel.querySelector("#systemPushMember")?.value || "";
    const label = panel.querySelector("#systemPushSubscriptionCount");
    try {
      const rows = await pushSubscriptions(target === "user" ? member || null : null);
      if (label) label.textContent = `当前可接收设备：${rows.length}`;
    } catch (e) {
      if (label) label.textContent = "订阅设备读取失败";
    }
  }

  async function loadSystemPushMembers() {
    const panel = ensureSystemNotificationsPanel();
    const select = panel?.querySelector("#systemPushMember");
    if (!select) return;
    try {
      const rows = await memberOptions();
      select.innerHTML = '<option value="">请选择会员</option>' + rows.map((r) => `<option value="${esc(r.user_id)}">${esc(r.display_name || r.email || r.user_id)}${r.email ? ` · ${esc(r.email)}` : ""}</option>`).join("");
    } catch {
      select.innerHTML = '<option value="">会员列表读取失败</option>';
    }
  }

  async function sendSystemPush() {
    const panel = ensureSystemNotificationsPanel();
    if (!panel) return;
    const btn = panel.querySelector("#systemPushSend");
    const result = panel.querySelector("#systemPushResult");
    const targetType = panel.querySelector("#systemPushTarget")?.value === "user" ? "user" : "all";
    const targetUserId = targetType === "user" ? String(panel.querySelector("#systemPushMember")?.value || "").trim() : null;
    const title = String(panel.querySelector("#systemPushTitle")?.value || "").trim();
    const body = String(panel.querySelector("#systemPushBody")?.value || "").trim();
    const clickUrl = String(panel.querySelector("#systemPushUrl")?.value || "member.html").trim() || "member.html";
    if (!title) { if (result) result.textContent = "请填写通知标题"; return; }
    if (!body) { if (result) result.textContent = "请填写通知正文"; return; }
    if (targetType === "user" && !targetUserId) { if (result) result.textContent = "请选择会员"; return; }
    if (btn) btn.disabled = true;
    if (result) result.textContent = "正在发送…";
    try {
      const j = await systemPush({
        target_type: targetType,
        target_user_id: targetUserId,
        title,
        body,
        click_url: clickUrl,
        icon_url: "https://globalyouxuan-order.pages.dev/assets/member-logo.webp"
      });
      if (result) result.textContent = `发送完成：订阅 ${Number(j.subscriptions || 0)}，成功 ${Number(j.sent || 0)}，失败 ${Number(j.failed || 0)}`;
      await Promise.all([loadSystemNotifications(), refreshSystemPushCount()]);
    } catch (e) {
      if (result) result.textContent = e?.message || "发送失败";
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function loadSystemNotifications() {
    const panel = ensureSystemNotificationsPanel();
    const box = panel?.querySelector("#systemNotificationsBody");
    if (!box) return;
    box.className = "loading";
    box.textContent = "正在读取发送记录…";
    try {
      const rows = await pushHistory();
      box.className = "";
      if (!rows.length) {
        box.innerHTML = '<div class="empty">暂无系统通知发送记录</div>';
        return;
      }
      box.innerHTML = `<div style="display:grid;gap:7px">${rows.map((r) => `<article style="border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:9px"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:12px">${esc(r.title)}</b><small style="font-size:9px;color:#667085">${esc(r.created_at ? new Date(r.created_at).toLocaleString() : "—")}</small></div><div style="font-size:10px;color:#475467;margin-top:5px;white-space:pre-wrap;word-break:break-word">${esc(r.body)}</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:7px;font-size:9px;color:#667085"><span>订阅 ${esc(r.subscription_count)}</span><span>成功 ${esc(r.sent_count)}</span><span>失败 ${esc(r.failed_count)}</span></div></article>`).join("")}</div>`;
    } catch (e) {
      box.className = "empty";
      box.textContent = e?.message || "发送记录读取失败";
    }
  }

  function openSystemNotifications() {
    const panel = ensureSystemNotificationsPanel();
    if (!panel) return;
    document.querySelectorAll(".admin-panel-v2").forEach((p) => p.classList.add("hidden"));
    panel.classList.remove("hidden");
    document.querySelectorAll(".admin-nav-v2 button").forEach((b) => b.classList.remove("active"));
    document.querySelector("[data-admin-system-notify]")?.classList.add("active");
    try { history.replaceState(null, "", "#notifications"); } catch {}
    Promise.all([loadSystemNotifications(), refreshSystemPushCount(), loadSystemPushMembers()]);
  }

  function installSystemNav() {
    const messages = document.querySelector('.admin-nav-v2 button[data-panel="messages"]');
    if (!messages) return;

    let app = document.querySelector('.admin-nav-v2 button[data-panel="app"]');
    if (!app) {
      app = document.createElement("button");
      app.type = "button";
      app.dataset.panel = "app";
      app.textContent = "APP";
      messages.insertAdjacentElement("afterend", app);
    }

    let notifyBtn = document.querySelector('[data-admin-system-notify]');
    if (!notifyBtn) {
      notifyBtn = document.createElement("button");
      notifyBtn.type = "button";
      notifyBtn.dataset.adminSystemNotify = "1";
      notifyBtn.textContent = "系统通知";
      app.insertAdjacentElement("afterend", notifyBtn);
    } else {
      notifyBtn.textContent = "系统通知";
    }
    notifyBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSystemNotifications();
    };
    ensureAppPanel();
    ensureSystemNotificationsPanel();
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
    account.addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener("click", () => { menu.hidden = true; });
    menu.addEventListener("click", (e) => e.stopPropagation());
    accountWrap.append(account, menu);
    head.append(notify, accountWrap);

    const logout = menu.querySelector("#adminLogout");
    logout.addEventListener("click", async () => {
      try { if (email) localStorage.setItem("gyx_admin_saved_email", email); } catch {}
      try { await window.gyxSupabase?.auth?.signOut(); } catch {}
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
    setInterval(() => { if (!document.hidden) refreshBadge(); }, 30000);
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
    if (name === "notifications") { openSystemNotifications(); return; }
    if (name === "members") { document.querySelector("[data-admin-members-nav]")?.click(); return; }
    if (name === "app") { showPanel("app"); return; }
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
      if (!user) { location.replace("admin-login.html"); return; }
      document.documentElement.classList.add("gyx-admin-unlocked");
      await setupAdminChrome(user);
      normalizeNavigation();
      await loadGroup(CORE_SCRIPTS);
      await loadGroup(SECONDARY_SCRIPTS);
      normalizeNavigation();
      restoreRequestedPanel();
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