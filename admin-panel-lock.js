(() => {
  "use strict";

  const BUSINESS_SCRIPTS = [
    "admin-freezone-upload.js?v=20260813-freezone-upload-2",
    "admin.js?v=20260813-freezone-upload-1",
    "admin-member-security.js?v=20260817-members-unified-1",
    "admin-profile-requests.js?v=20260817-review-touch-2",
    "admin-data.js?v=20260816-growth-human-3",
    "admin-priority.js?v=20260816-trace-1",
    "admin-business-growth.js?v=20260816-growth-records-1",
    "admin-fixed-card-answers.js?v=20260816-fixed-card-schemes-2",
    "admin-reporting.js?v=20260817-reporting-v1",
    "admin-security-center.js?v=20260817-security-1",
  ];

  const shell = document.querySelector(".admin-shell");
  const editModal = document.getElementById("editModal");
  const parked = document.createDocumentFragment();
  const anchor = document.createComment("gyx-admin-locked-content");
  let unlocked = false;
  let configured = false;
  let remaining = 6;

  if (shell?.parentNode) {
    shell.parentNode.insertBefore(anchor, shell);
    parked.appendChild(shell);
  }
  if (editModal) parked.appendChild(editModal);

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });

  const cleanPin = (input) => {
    input.value = input.value.replace(/\D/g, "").slice(0, 6);
  };

  async function call(body) {
    const client = window.gyxSupabase;
    if (!client) throw new Error("ADMIN_CLIENT_UNAVAILABLE");
    const { data, error } = await client.functions.invoke("admin-panel-pin", { body });
    if (!error) return data;
    let payload = null;
    try { payload = await error.context?.clone?.().json(); } catch {}
    const e = new Error(payload?.message || payload?.error || error.message || "FUNCTION_REQUEST_FAILED");
    e.code = payload?.error || "FUNCTION_REQUEST_FAILED";
    e.payload = payload || {};
    throw e;
  }

  function field(label, id) {
    return `<div class="gyx-admin-lock-field"><label for="${id}">${label}</label><input id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-label="${label}"></div>`;
  }

  function root() {
    let node = document.getElementById("gyxAdminLockRoot");
    if (node) return node;
    node = document.createElement("div");
    node.id = "gyxAdminLockRoot";
    node.className = "gyx-admin-lock-root";
    node.innerHTML = `<div class="gyx-admin-lock-card"><h1>管理员二次锁</h1><p>管理员身份验证通过后，还需要输入独立的 6 位数字管理密码。</p><div id="gyxAdminLockBody"></div></div>`;
    document.body.appendChild(node);
    return node;
  }

  function setStatus(text, kind = "") {
    const el = document.getElementById("gyxAdminLockStatus");
    if (!el) return;
    el.className = `gyx-admin-lock-status ${kind}`.trim();
    el.textContent = text;
  }

  function lockMessage() {
    const box = root().querySelector("#gyxAdminLockBody");
    box.innerHTML = `<div class="gyx-admin-lock-status error" style="font-size:14px">当前管理员登录会话已因连续 6 次错误被锁定。必须重新完成管理员身份登录后才能重新获得 6 次机会。</div><div class="gyx-admin-lock-actions"><button id="gyxReloginBtn" class="primary" type="button">重新登录管理员账号</button></div><div class="gyx-admin-lock-note">锁定状态由服务端按 Supabase 登录 session_id 判断，不是前端计数。</div>`;
    document.getElementById("gyxReloginBtn").onclick = async () => {
      try { await window.gyxSupabase?.auth?.signOut(); } catch {}
      location.replace("admin-login.html");
    };
  }

  function render() {
    const box = root().querySelector("#gyxAdminLockBody");
    if (!configured) {
      box.innerHTML = `<div class="gyx-admin-lock-fields">${field("设置 6 位管理密码", "gyxPin1")}${field("再次确认", "gyxPin2")}</div><div class="gyx-admin-lock-actions"><button id="gyxPinSubmit" class="primary" type="button">设置并进入后台</button></div><div id="gyxAdminLockStatus" class="gyx-admin-lock-status">首次启用：密码只会以加盐哈希保存到数据库，不保存明文。</div>`;
      ["gyxPin1", "gyxPin2"].forEach((id) => document.getElementById(id).addEventListener("input", (e) => cleanPin(e.target)));
      document.getElementById("gyxPinSubmit").onclick = setup;
      document.getElementById("gyxPin1").focus();
      return;
    }
    box.innerHTML = `<div class="gyx-admin-lock-fields">${field("6 位管理密码", "gyxPin")}</div><div class="gyx-admin-lock-actions"><button id="gyxPinSubmit" class="primary" type="button">解锁后台</button></div><div id="gyxAdminLockStatus" class="gyx-admin-lock-status">本次管理员会话剩余 ${remaining} 次机会。</div><div class="gyx-admin-lock-note">解锁状态只存在当前页面内存。刷新、重新打开或从历史记录恢复页面都会重新上锁。</div>`;
    const pin = document.getElementById("gyxPin");
    pin.addEventListener("input", (e) => cleanPin(e.target));
    pin.addEventListener("keydown", (e) => { if (e.key === "Enter") verify(); });
    document.getElementById("gyxPinSubmit").onclick = verify;
    pin.focus();
  }

  function busy(flag) {
    const btn = document.getElementById("gyxPinSubmit");
    if (btn) btn.disabled = flag;
  }

  async function setup() {
    const pin = document.getElementById("gyxPin1").value;
    const confirm = document.getElementById("gyxPin2").value;
    if (!/^\d{6}$/.test(pin) || pin !== confirm) {
      setStatus("请输入两次完全一致的 6 位数字密码。", "error");
      return;
    }
    busy(true);
    try {
      const res = await call({ action: "setup", pin, confirm });
      if (!res?.data?.verified) throw new Error("PIN_SETUP_FAILED");
      await unlock();
    } catch (e) {
      setStatus(e.message || "设置失败", "error");
    } finally { busy(false); }
  }

  async function verify() {
    const pin = document.getElementById("gyxPin")?.value || "";
    if (!/^\d{6}$/.test(pin)) {
      setStatus("请输入完整的 6 位数字密码。", "error");
      return;
    }
    busy(true);
    try {
      const res = await call({ action: "verify", pin });
      if (!res?.data?.verified) throw new Error("PIN_VERIFY_FAILED");
      await unlock();
    } catch (e) {
      const p = e.payload || {};
      remaining = Number.isFinite(Number(p.remaining_attempts)) ? Number(p.remaining_attempts) : remaining;
      if (e.code === "PIN_LOCKED" || p.requires_relogin) {
        lockMessage();
        return;
      }
      setStatus(`密码错误。本次管理员会话剩余 ${remaining} 次机会。`, "error");
      const input = document.getElementById("gyxPin");
      if (input) { input.value = ""; input.focus(); }
    } finally { busy(false); }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`LOAD_FAILED:${src}`));
      document.body.appendChild(s);
    });
  }

  async function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (anchor.parentNode) anchor.parentNode.insertBefore(parked, anchor.nextSibling);
    document.documentElement.classList.add("gyx-admin-unlocked");
    document.getElementById("gyxAdminLockRoot")?.remove();
    for (const src of BUSINESS_SCRIPTS) await loadScript(src);
    installChangePinEntry();
  }

  function installChangePinEntry() {
    const panel = document.getElementById("securityPanel");
    if (!panel || document.getElementById("gyxChangeAdminPinBtn")) return;
    const strip = document.createElement("div");
    strip.className = "manage-strip";
    strip.innerHTML = `<button id="gyxChangeAdminPinBtn" class="refresh-btn" type="button">修改六位管理密码</button><small>必须先验证旧密码；不提供前端“忘记密码”重置。</small>`;
    const title = panel.querySelector(".admin-section-title");
    title?.insertAdjacentElement("afterend", strip);
    document.getElementById("gyxChangeAdminPinBtn").onclick = openChangePin;
  }

  function openChangePin() {
    if (document.getElementById("gyxPinChangeMask")) return;
    const mask = document.createElement("div");
    mask.id = "gyxPinChangeMask";
    mask.className = "gyx-pin-change-mask";
    mask.innerHTML = `<div class="gyx-pin-change-card"><h3>修改六位管理密码</h3><div class="gyx-admin-lock-fields">${field("旧管理密码", "gyxOldPin")}${field("新 6 位管理密码", "gyxNewPin")}${field("再次确认新密码", "gyxNewPin2")}</div><div id="gyxPinChangeStatus" class="gyx-admin-lock-status"></div><div class="gyx-admin-lock-actions"><button id="gyxPinChangeCancel" type="button">取消</button><button id="gyxPinChangeSave" class="primary" type="button">确认修改</button></div></div>`;
    document.body.appendChild(mask);
    ["gyxOldPin","gyxNewPin","gyxNewPin2"].forEach((id)=>document.getElementById(id).addEventListener("input",(e)=>cleanPin(e.target)));
    document.getElementById("gyxPinChangeCancel").onclick = () => mask.remove();
    document.getElementById("gyxPinChangeSave").onclick = changePin;
    document.getElementById("gyxOldPin").focus();
  }

  async function changePin() {
    const oldPin = document.getElementById("gyxOldPin").value;
    const newPin = document.getElementById("gyxNewPin").value;
    const confirm = document.getElementById("gyxNewPin2").value;
    const status = document.getElementById("gyxPinChangeStatus");
    if (!/^\d{6}$/.test(oldPin) || !/^\d{6}$/.test(newPin) || newPin !== confirm) {
      status.className = "gyx-admin-lock-status error";
      status.textContent = "请填写旧密码，并输入两次一致的新 6 位数字密码。";
      return;
    }
    const btn = document.getElementById("gyxPinChangeSave");
    btn.disabled = true;
    try {
      await call({ action: "change", old_pin: oldPin, new_pin: newPin, confirm });
      status.className = "gyx-admin-lock-status ok";
      status.textContent = "管理密码已修改。";
      setTimeout(() => document.getElementById("gyxPinChangeMask")?.remove(), 700);
    } catch (e) {
      const p = e.payload || {};
      if (e.code === "PIN_LOCKED" || p.requires_relogin) {
        document.getElementById("gyxPinChangeMask")?.remove();
        document.documentElement.classList.remove("gyx-admin-unlocked");
        lockMessage();
        return;
      }
      status.className = "gyx-admin-lock-status error";
      status.textContent = p.remaining_attempts !== undefined ? `旧密码错误，当前会话剩余 ${p.remaining_attempts} 次机会。` : (e.message || "修改失败");
    } finally { btn.disabled = false; }
  }

  async function init() {
    root();
    try {
      const user = await window.gyxGetVerifiedUser?.();
      if (!user) {
        location.replace("admin-login.html");
        return;
      }
      const res = await call({ action: "status" });
      configured = !!res?.data?.configured;
      remaining = Number(res?.data?.remaining_attempts ?? 6);
      if (res?.data?.locked) {
        lockMessage();
        return;
      }
      render();
    } catch (e) {
      if (e.code === "UNAUTHORIZED" || e.code === "ADMIN_REQUIRED") {
        location.replace("admin-login.html");
        return;
      }
      root().querySelector("#gyxAdminLockBody").innerHTML = `<div class="gyx-admin-lock-status error">二次锁服务暂不可用，后台保持锁定。${String(e.message || "")}</div>`;
    }
  }

  init();
})();
