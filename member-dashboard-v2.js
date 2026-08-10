(() => {
  "use strict";
  const db = window.gyxSupabase,
    I = window.GYXI18N,
    $ = (id) => document.getElementById(id),
    esc = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (m) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[m],
      );
  if (!db || !I) return;
  const tx = (key, values) => I.t(key, values);
  let user = null,
    profile = null,
    orders = [],
    stats = {
      favorites: 0,
      searches: 0,
      orders: 0,
      downloads: 0,
      materials: 0,
    },
    refreshTimer = 0,
    decorating = false,
    mergedDraft = window.GYX_MERGED_ORDER_DRAFT || null;
  function effective(o) {
    return String(o?.status || "");
  }
  function fmtDate(v) {
    if (!v) return "—";
    try {
      return new Intl.DateTimeFormat(
        I.locale === "zh" ? "zh-CN" : I.locale === "km" ? "km-KH" : "en-US",
        { year: "numeric", month: "2-digit", day: "2-digit" },
      ).format(new Date(v));
    } catch {
      return String(v);
    }
  }
  function memberId(raw) {
    const clean = String(raw || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (!clean) return "—";
    let hash = 2166136261;
    for (let i = 0; i < clean.length; i++) {
      hash ^= clean.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const base = (
      clean +
      Math.abs(hash >>> 0)
        .toString(36)
        .toUpperCase()
    ).replace(/[^A-Z0-9]/g, "");
    return ("GY" + base).slice(0, 15).padEnd(15, "0");
  }
  function valueLen(v) {
    return [...String(v ?? "")].length;
  }
  function fact(label, value) {
    return `<div class="member-v2-fact"><span>${esc(label)}</span><strong>${esc(value || "—")}</strong></div>`;
  }
  function openSupport() {
    try {
      sessionStorage.setItem("gyx_support_intent", "profile-edit");
    } catch {}
    location.href = "shop.html?support=profile-edit";
  }

  function toggleProfileForm(host, button) {
    const form = $("profileForm");
    if (!form) return;
    const open = !host.classList.contains("member-v2-edit-open");
    form.hidden = !open;
    host.classList.toggle("member-v2-edit-open", open);
    button.textContent = tx(open ? "memberCollapseEdit" : "memberEditProfile");
    if (open) {
      form.scrollIntoView({ behavior: "smooth", block: "nearest" });
      window.setTimeout(() => $("profileName")?.focus(), 80);
    }
  }

  function toast(text, error = false) {
    const element = $("toast");
    if (!element) return;
    element.textContent = text;
    element.className = `toast show${error ? " error" : ""}`;
    clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => (element.className = "toast"), 2400);
  }

  async function updateTheme(key, color, button, row) {
    button.disabled = true;
    try {
      const { data, error } = await db
        .from("profiles")
        .update({ theme_color: key })
        .eq("user_id", user.id)
        .select("theme_color")
        .maybeSingle();
      if (error) throw error;
      if (data?.theme_color !== key) throw new Error("THEME_NOT_UPDATED");
      profile.theme_color = key;
      document.documentElement.style.setProperty("--member-accent", color);
      row
        .querySelectorAll("button")
        .forEach((item) => item.classList.toggle("active", item === button));
      toast(tx("memberThemeSaved"));
    } catch (error) {
      console.error("member dashboard theme update failed", error);
      toast(tx("memberBulkFailed"), true);
    } finally {
      button.disabled = false;
    }
  }

  function renderProfile() {
    const host = document.querySelector(".profile-fold-body") || $("profile");
    if (!host || !profile || !user) return;
    document
      .querySelectorAll(".member-v2-card")
      .forEach((e, i) => i && e.remove());
    let card = host.querySelector(".member-v2-card");
    if (!card) {
      card = document.createElement("div");
      card.className = "member-v2-card";
      host.insertBefore(card, host.firstChild);
    }
    const locked = Boolean(profile.profile_locked_at);
    const form = $("profileForm");
    if (locked) {
      host.classList.remove("member-v2-edit-open");
      if (form) form.hidden = true;
    }
    const facts = [
      [tx("memberTelegramShort"), profile.telegram || "—"],
      [tx("memberWechatShort"), profile.wechat || "—"],
      [tx("memberOrdersCount"), String(Number(profile.valid_order_count || 0))],
      [tx("memberWhatsappShort"), profile.whatsapp || "—"],
      [tx("memberJoinedShort"), fmtDate(profile.created_at || user.created_at)],
      [
        tx("memberSpent"),
        `${Number(profile.total_spent || 0).toFixed(2)} USDT`,
      ],
      [tx("memberPhoneShort"), profile.phone || "—"],
      [tx("memberLanguageShort"), profile.locale || "—"],
      [tx("memberNoShort"), memberId(user.id)],
      [tx("memberAccountShort"), user.email || "—"],
      [
        tx("memberStatusShort"),
        tx(locked ? "memberLockedShort" : "memberOpenShort"),
      ],
    ].sort((a, b) => valueLen(a[1]) - valueLen(b[1]));
    const quick = facts.slice(0, 4),
      rest = facts.slice(4);
    const editKey = locked
      ? "memberContactSupportModify"
      : host.classList.contains("member-v2-edit-open")
        ? "memberCollapseEdit"
        : "memberEditProfile";
    const avatar = $("profileAvatar");
    const level = $("memberLevelBox");
    avatar?.remove();
    level?.remove();
    card.innerHTML = `<div class="member-v2-top"><div class="member-v2-identity"><div class="member-v2-avatar-slot"></div><div class="member-v2-name-row"><strong>${esc(profile.display_name || user.email?.split("@")[0] || "GY")}</strong><button type="button" class="member-v2-avatar-change">${esc(tx("memberChangeAvatar"))}</button></div><div class="member-v2-level-slot"></div></div><div class="member-v2-quick">${quick.map((x) => fact(x[0], x[1])).join("")}</div></div><div class="member-v2-facts">${rest.map((x) => fact(x[0], x[1])).join("")}</div><div class="member-v2-profile-note">${esc(tx(locked ? "memberProfileLocked" : "memberProfileFirstSave"))}</div><div class="member-v2-actions"><button type="button" class="btn btn-secondary btn-small member-v2-edit">${esc(tx(editKey))}</button><div class="member-v2-colors"><b>${esc(tx("memberMyColors"))}</b><div class="member-v2-color-row"></div></div></div>`;
    if (avatar)
      card.querySelector(".member-v2-avatar-slot")?.appendChild(avatar);
    if (level) card.querySelector(".member-v2-level-slot")?.appendChild(level);
    card
      .querySelector(".member-v2-avatar-change")
      ?.addEventListener("click", () => {
        const b = $("memberAvatarButton");
        if (b) b.click();
        else $("memberAvatarFile")?.click();
      });
    const editButton = card.querySelector(".member-v2-edit");
    editButton?.addEventListener("click", () => {
      if (locked) openSupport();
      else toggleProfileForm(host, editButton);
    });
    const colors = {
        blue: "#1478ff",
        purple: "#7c4dff",
        green: "#12a36d",
        orange: "#f28c28",
        red: "#e44747",
        cyan: "#00a6b8",
      },
      row = card.querySelector(".member-v2-color-row");
    for (const [key, color] of Object.entries(colors)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "member-v2-color" + (profile.theme_color === key ? " active" : "");
      b.style.setProperty("--swatch", color);
      const colorKey =
        "memberColor" + key.charAt(0).toUpperCase() + key.slice(1);
      b.setAttribute("aria-label", `${tx("memberTheme")}: ${tx(colorKey)}`);
      b.onclick = () => updateTheme(key, color, b, row);
      row.appendChild(b);
    }
  }
  function foldCount(id, n) {
    const section = $(id);
    if (!section) return;
    const head = section.querySelector(":scope > .member-fold-head"),
      title = head?.querySelector(".member-fold-title");
    if (!title) return;
    let badge = title.querySelector(".member-count-badge");
    if (!badge) {
      badge = document.createElement("em");
      badge.className = "member-count-badge";
      title.appendChild(badge);
    }
    badge.textContent = String(n);
    const brief = head.querySelector(".member-fold-brief");
    if (brief) brief.textContent = tx("memberRecordsCount", { count: n });
  }
  function renderCounts() {
    foldCount("favorites", stats.favorites);
    foldCount("searches", stats.searches);
    foldCount("orders", stats.orders);
    foldCount("downloads", stats.downloads);
    foldCount("materials", stats.materials);
  }
  async function count(table) {
    const r = await db
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    return r.error ? 0 : Number(r.count || 0);
  }
  async function refresh() {
    if (!user) return;
    const [pr, or, fc, sc, mc] = await Promise.all([
      db
        .from("profiles")
        .select(
          "display_name,phone,wechat,whatsapp,telegram,locale,created_at,profile_locked_at,member_level,valid_order_count,total_spent,avatar_url,theme_color",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      db
        .from("orders")
        .select(
          "id,order_no,status,payable_amount,currency,hidden_by_user,created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500),
      count("answer_favorites"),
      count("search_history"),
      count("member_materials"),
    ]);
    if (!pr.error) profile = pr.data || {};
    if (!or.error) orders = or.data || [];
    stats = {
      favorites: fc,
      searches: sc,
      orders: orders.filter((o) => !o.hidden_by_user).length,
      downloads: orders.filter(
        (o) =>
          !o.hidden_by_user && ["paid", "delivered"].includes(effective(o)),
      ).length,
      materials: mc,
    };
    renderProfile();
    renderCounts();
    setupMerge();
    decorateOrders();
  }
  function scheduleRefresh(delay = 500) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, delay);
  }
  function setupMerge() {
    const section = $("orders"),
      filters = $("orderFilters");
    if (!section || !filters) return;
    let bar = $("memberMergeBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "memberMergeBar";
      bar.className = "member-merge-bar";
      bar.innerHTML = `<label><input id="memberMergeAll" type="checkbox"> <span>${esc(tx("memberMergeSelectAll"))}</span></label><span id="memberMergeSelected">${esc(tx("memberMergeSelected", { count: 0, sum: "0.00" }))}</span><button id="memberMergeButton" class="btn btn-small" type="button" disabled>${esc(tx("memberMergeOrders"))}</button>`;
      filters.insertAdjacentElement("afterend", bar);
      const panel = document.createElement("div");
      panel.id = "memberMergeSummary";
      panel.className = "member-merge-summary";
      panel.hidden = true;
      bar.insertAdjacentElement("afterend", panel);
      $("memberMergeAll").addEventListener("change", (e) => {
        document
          .querySelectorAll("#orderList .member-merge-check:not(:disabled)")
          .forEach((x) => (x.checked = e.target.checked));
        updateMerge();
      });
      $("memberMergeButton").addEventListener("click", mergeSelected);
    }
    const label = bar.querySelector("label span");
    const button = $("memberMergeButton");
    if (label) label.textContent = tx("memberMergeSelectAll");
    if (button) button.textContent = tx("memberMergeOrders");
    updateMerge();
    renderMergeSummary();
  }
  function decorateOrders() {
    if (decorating) return;
    decorating = true;
    try {
      const map = new Map(orders.map((o) => [String(o.order_no || ""), o]));
      document.querySelectorAll("#orderList>.order-card").forEach((card) => {
        const no = String(
          card.querySelector(".order-number")?.textContent || "",
        )
          .trim()
          .split(" ")[0];
        const o = map.get(no);
        if (!o) return;
        let wrap = card.querySelector(".member-merge-pick");
        const eligible =
          !o.hidden_by_user && ["pending", "checking"].includes(effective(o));
        if (!wrap) {
          wrap = document.createElement("label");
          wrap.className = "member-merge-pick";
          wrap.innerHTML = `<input type="checkbox" class="member-merge-check"><span>${esc(tx("memberMergeOrders"))}</span>`;
          card.insertBefore(wrap, card.firstChild);
          wrap.querySelector("input").addEventListener("change", updateMerge);
        }
        const chk = wrap.querySelector("input");
        const label = wrap.querySelector("span");
        if (label) label.textContent = tx("memberMergeOrders");
        chk.dataset.orderId = o.id;
        chk.dataset.orderNo = o.order_no || "";
        chk.dataset.amount = String(Number(o.payable_amount) || 0);
        chk.disabled = !eligible;
        wrap.hidden = !eligible;
      });
    } finally {
      decorating = false;
    }
    updateMerge();
  }
  function selected() {
    return [
      ...document.querySelectorAll(
        "#orderList .member-merge-check:checked:not(:disabled)",
      ),
    ].map((x) => ({
      id: x.dataset.orderId,
      no: x.dataset.orderNo,
      amount: Number(x.dataset.amount) || 0,
    }));
  }
  function updateMerge() {
    const a = selected(),
      sum = a.reduce((x, o) => x + o.amount, 0),
      text = $("memberMergeSelected"),
      btn = $("memberMergeButton");
    if (text)
      text.textContent = tx("memberMergeSelected", {
        count: a.length,
        sum: sum.toFixed(2),
      });
    if (btn) btn.disabled = a.length < 2;
  }
  function mergeSelected() {
    const a = selected();
    if (a.length < 2) {
      alert(tx("memberMergeNeedTwo"));
      return;
    }
    const sum = a.reduce((x, o) => x + o.amount, 0),
      draft = {
        created_at: new Date().toISOString(),
        order_ids: a.map((x) => x.id),
        order_nos: a.map((x) => x.no),
        total_amount: Number(sum.toFixed(2)),
        currency: "USDT",
      };
    try {
      localStorage.setItem("gyx_merged_order_draft", JSON.stringify(draft));
    } catch {}
    window.GYX_MERGED_ORDER_DRAFT = draft;
    mergedDraft = draft;
    renderMergeSummary();
  }
  function renderMergeSummary() {
    const p = $("memberMergeSummary");
    if (!p || !mergedDraft) return;
    p.hidden = false;
    const orderNumbers = Array.isArray(mergedDraft.order_nos)
      ? mergedDraft.order_nos
      : [];
    p.innerHTML = `<strong>${esc(tx("memberMergeDone", { count: orderNumbers.length }))} · ${Number(mergedDraft.total_amount || 0).toFixed(2)} USDT</strong><span>${esc(tx("memberMergeIncluded"))}: ${orderNumbers.map((number) => esc(number)).join(", ")}</span>`;
  }
  function observe() {
    [
      "favoriteList",
      "searchHistoryList",
      "orderList",
      "downloadList",
      "materialList",
    ].forEach((id) => {
      const el = $(id);
      if (!el) return;
      new MutationObserver(() => {
        if (id === "orderList") decorateOrders();
        scheduleRefresh(900);
      }).observe(el, { childList: true, subtree: true });
    });
    document.addEventListener("member:opened", () => scheduleRefresh(150));
    window.addEventListener("gyx:profile-updated", () => scheduleRefresh(0));
    window.addEventListener("gyx:languagechange", () => scheduleRefresh(0));
    setInterval(() => scheduleRefresh(0), 30000);
  }
  async function init() {
    try {
      user = await window.gyxGetVerifiedUser?.();
    } catch {}
    if (!user) return;
    await refresh();
    observe();
    setTimeout(() => {
      renderProfile();
      decorateOrders();
    }, 800);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
