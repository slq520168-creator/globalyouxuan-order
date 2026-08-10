(() => {
  "use strict";

  const db = window.gyxSupabase;
  const I = window.GYXI18N;
  if (!db || !I) return;

  const t = (key, values) => I.t(key, values);
  const $ = (id) => document.getElementById(id);
  const operations = new Set();
  const themeColors = Object.freeze({
    blue: "#1478ff",
    purple: "#7c4dff",
    green: "#12a36d",
    orange: "#f28c28",
    red: "#e44747",
    cyan: "#00a6b8",
  });
  let currentUser = null;
  let memberProfile = null;

  function toast(text, error = false) {
    const element = $("toast");
    if (!element) return;
    element.textContent = text;
    element.className = `toast show${error ? " error" : ""}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (element.className = "toast"), 2400);
  }

  async function user() {
    if (!currentUser) currentUser = await window.gyxGetVerifiedUser?.();
    return currentUser;
  }

  function makeMemberId(raw) {
    const clean = String(raw || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (!clean) return "—";
    let hash = 2166136261;
    for (let index = 0; index < clean.length; index += 1) {
      hash ^= clean.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const base = (
      clean +
      Math.abs(hash >>> 0)
        .toString(36)
        .toUpperCase()
    ).replace(/[^A-Z0-9]/g, "");
    return `GY${base}`.slice(0, 15).padEnd(15, "0");
  }

  function formatDate(value) {
    if (!value) return "—";
    try {
      const locale =
        I.locale === "zh" ? "zh-CN" : I.locale === "km" ? "km-KH" : "en";
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  function shortValue(value) {
    return String(value ?? "").trim() || "—";
  }

  function escapeHtml(value) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return String(value).replace(
      /[&<>"']/g,
      (character) => entities[character],
    );
  }

  function addAction(sectionId, buttonId, labelKey, handler) {
    const head = document.querySelector(`#${sectionId} .panel-head`);
    if (!head || $(buttonId)) return;
    const button = document.createElement("button");
    button.id = buttonId;
    button.type = "button";
    button.className = "btn btn-danger btn-small member-bulk-action";
    button.dataset.labelKey = labelKey;
    button.textContent = t(labelKey);
    button.addEventListener("click", () => handler(button));
    head.appendChild(button);
  }

  async function runOperation(name, button, confirmKey, operation) {
    if (operations.has(name) || !window.confirm(t(confirmKey))) return;
    const member = await user();
    if (!member) {
      toast(t("memberSessionExpired"), true);
      return;
    }

    operations.add(name);
    const labelKey = button.dataset.labelKey;
    button.disabled = true;
    button.textContent = t("memberDeleting");
    try {
      const count = await operation(member);
      toast(t("memberBulkDoneCount", { count: Number(count || 0) }));
      window.setTimeout(() => window.location.reload(), 220);
    } catch (error) {
      console.error(`${name} failed`, error);
      toast(t("memberBulkFailed"), true);
      button.disabled = false;
      button.textContent = t(labelKey);
    } finally {
      operations.delete(name);
    }
  }

  function clearFavorites(button) {
    return runOperation(
      "favorites",
      button,
      "memberClearFavoritesConfirm",
      async (member) => {
        const { data, error } = await db
          .from("answer_favorites")
          .delete()
          .eq("user_id", member.id)
          .select("id");
        if (error) throw error;
        return data?.length || 0;
      },
    );
  }

  function clearSearches(button) {
    return runOperation(
      "searches",
      button,
      "memberClearSearchesConfirm",
      async (member) => {
        const { data, error } = await db
          .from("search_history")
          .delete()
          .eq("user_id", member.id)
          .select("id");
        if (error) throw error;
        return data?.length || 0;
      },
    );
  }

  function clearInvalidOrders(button) {
    return runOperation(
      "orders",
      button,
      "memberClearExpiredConfirm",
      async () => {
        const { data, error } = await db.rpc("hide_own_invalid_orders");
        if (error) throw error;
        return Number(data || 0);
      },
    );
  }

  function applyTheme(theme) {
    const key = themeColors[theme] ? theme : "blue";
    document.documentElement.style.setProperty(
      "--member-accent",
      themeColors[key],
    );
    document.body.dataset.memberTheme = key;
    let style = $("memberThemeStyle");
    if (!style) {
      style = document.createElement("style");
      style.id = "memberThemeStyle";
      style.textContent =
        ".member-page .btn:not(.btn-danger),.member-page .member-stat.active{border-color:var(--member-accent)!important}" +
        ".member-page .btn:not(.btn-secondary):not(.btn-danger){background:var(--member-accent)!important}" +
        ".member-page .profile-card{border-top:3px solid var(--member-accent)}" +
        ".member-level-sun.on{opacity:1;filter:saturate(1.2)}.member-level-sun.off{opacity:.22;filter:grayscale(1)}" +
        ".member-avatar-tools{display:grid;gap:7px;margin:10px 0 14px}" +
        ".member-level-box{margin:8px 0 14px;text-align:center}" +
        ".member-level-suns{font-size:23px;letter-spacing:3px}" +
        ".member-level-meta{font-size:12px;opacity:.72;margin-top:4px}" +
        ".member-theme-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}" +
        ".member-theme-dot{width:32px;height:32px;border-radius:50%;border:2px solid transparent;padding:0}" +
        ".member-theme-dot.active{outline:3px solid color-mix(in srgb,var(--member-accent) 28%,transparent)}";
      document.head.appendChild(style);
    }
  }

  function paintAvatar(url) {
    const avatar = $("profileAvatar");
    if (!avatar) return;
    const safeUrl = String(url || "").replace(/["\\\r\n]/g, "");
    avatar.style.backgroundImage = safeUrl
      ? `url(${JSON.stringify(safeUrl)})`
      : "";
    avatar.style.backgroundSize = safeUrl ? "cover" : "";
    avatar.style.backgroundPosition = safeUrl ? "center" : "";
    if (safeUrl) avatar.textContent = "";
  }

  function renderLevel() {
    const card = $("profile");
    if (!card || !memberProfile) return;
    let box = $("memberLevelBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "memberLevelBox";
      box.className = "member-level-box";
      $("profileHeading")?.insertAdjacentElement("afterend", box);
    }
    const level = Math.max(
      1,
      Math.min(4, Number(memberProfile.member_level) || 1),
    );
    box.innerHTML =
      `<div class="member-level-title">${t("memberLevel")}</div>` +
      `<div class="member-level-suns">${[1, 2, 3, 4]
        .map(
          (number) =>
            `<span class="member-level-sun ${number <= level ? "on" : "off"}">☀️</span>`,
        )
        .join("")}</div>`;
  }

  function renderSummary() {
    const card = $("profile");
    const form = $("profileForm");
    if (!card || !form || !memberProfile) return;

    let box = $("memberProfileSummary");
    if (!box) {
      box = document.createElement("div");
      box.id = "memberProfileSummary";
      box.className = "member-profile-summary";
      const host = form.parentNode || card;
      if (form.parentNode === host) host.insertBefore(box, form);
      else host.appendChild(box);
    }

    const facts = [
      [t("memberNameShort"), shortValue(memberProfile.display_name)],
      [t("memberPhoneShort"), shortValue(memberProfile.phone)],
      [t("memberWechatShort"), shortValue(memberProfile.wechat)],
      [t("memberTelegramShort"), shortValue(memberProfile.telegram)],
      [t("memberWhatsappShort"), shortValue(memberProfile.whatsapp)],
      [
        t("memberStatusShort"),
        memberProfile.profile_locked_at
          ? t("memberLockedShort")
          : t("memberOpenShort"),
      ],
      [t("memberLanguageShort"), shortValue(memberProfile.locale)],
      [
        t("memberOrdersCount"),
        String(Number(memberProfile.valid_order_count || 0)),
      ],
      [
        t("memberSpent"),
        `${Number(memberProfile.total_spent || 0).toFixed(2)} USDT`,
      ],
      [t("memberJoinedShort"), formatDate(memberProfile.created_at)],
      [t("memberNoShort"), makeMemberId(currentUser?.id)],
      [t("memberAccountShort"), shortValue(currentUser?.email)],
    ];
    facts.sort(
      (left, right) => String(left[1]).length - String(right[1]).length,
    );
    box.innerHTML = facts
      .map(([label, value]) => {
        const length = String(value).length;
        const size = length <= 10 ? "short" : length <= 20 ? "medium" : "long";
        return `<div class="member-fact ${size}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
      })
      .join("");
  }

  function buildAvatarControls() {
    const avatar = $("profileAvatar");
    if (!avatar || $("memberAvatarFile")) return;
    const wrap = document.createElement("div");
    wrap.className = "member-avatar-tools";
    wrap.innerHTML =
      '<input id="memberAvatarFile" type="file" accept="image/jpeg,image/png,image/webp" hidden>' +
      '<button id="memberAvatarButton" class="btn btn-secondary btn-small" type="button"></button>' +
      '<small id="memberAvatarHint"></small>';
    avatar.insertAdjacentElement("afterend", wrap);
    $("memberAvatarButton")?.addEventListener("click", () =>
      $("memberAvatarFile")?.click(),
    );
    $("memberAvatarFile")?.addEventListener("change", uploadAvatar);
  }

  async function uploadAvatar(event) {
    const input = event.currentTarget;
    const file = input?.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast(t("memberAvatarTooLarge"), true);
      input.value = "";
      return;
    }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      toast(t("memberAvatarType"), true);
      input.value = "";
      return;
    }

    const member = await user();
    if (!member) {
      toast(t("memberSessionExpired"), true);
      input.value = "";
      return;
    }

    const button = $("memberAvatarButton");
    if (button) button.disabled = true;
    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${member.id}/avatar-${Date.now()}.${extension}`;
    try {
      const uploaded = await db.storage
        .from("member-avatars")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploaded.error) throw uploaded.error;
      const url = db.storage.from("member-avatars").getPublicUrl(path)
        .data.publicUrl;
      const { data, error } = await db
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", member.id)
        .select("avatar_url")
        .maybeSingle();
      if (error) throw error;
      if (!data?.avatar_url) throw new Error("AVATAR_NOT_UPDATED");
      memberProfile.avatar_url = data.avatar_url;
      paintAvatar(data.avatar_url);
      toast(t("memberAvatarSaved"));
    } catch (error) {
      console.error("avatar update failed", error);
      toast(t("memberAvatarSaveFailed"), true);
    } finally {
      if (button) button.disabled = false;
      input.value = "";
    }
  }

  async function updateTheme(theme, button) {
    const member = await user();
    if (!member || !themeColors[theme]) return;
    button.disabled = true;
    try {
      const { data, error } = await db
        .from("profiles")
        .update({ theme_color: theme })
        .eq("user_id", member.id)
        .select("theme_color")
        .maybeSingle();
      if (error) throw error;
      if (data?.theme_color !== theme) throw new Error("THEME_NOT_UPDATED");
      memberProfile.theme_color = theme;
      applyTheme(theme);
      document
        .querySelectorAll(".member-theme-dot")
        .forEach((dot) => dot.classList.toggle("active", dot === button));
      toast(t("memberThemeSaved"));
    } catch (error) {
      console.error("theme update failed", error);
      toast(t("memberBulkFailed"), true);
    } finally {
      button.disabled = false;
    }
  }

  function buildThemeControls() {
    const form = $("profileForm");
    if (!form || $("memberThemeChooser")) return;
    const box = document.createElement("div");
    box.id = "memberThemeChooser";
    box.className = "member-theme-chooser";
    const label = document.createElement("label");
    label.id = "memberThemeLabel";
    const row = document.createElement("div");
    row.className = "member-theme-row";
    for (const [key, color] of Object.entries(themeColors)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "member-theme-dot";
      button.dataset.theme = key;
      button.dataset.colorKey =
        "memberColor" + key.charAt(0).toUpperCase() + key.slice(1);
      button.style.setProperty("--swatch", color);
      button.addEventListener("click", () => updateTheme(key, button));
      row.appendChild(button);
    }
    box.append(label, row);
    form.insertAdjacentElement("afterend", box);
  }

  function syncExtraLabels() {
    renderLevel();
    renderSummary();
    const avatarButton = $("memberAvatarButton");
    const avatarHint = $("memberAvatarHint");
    const themeLabel = $("memberThemeLabel");
    if (avatarButton) avatarButton.textContent = t("memberChangeAvatar");
    if (avatarHint) avatarHint.textContent = t("memberAvatarHint");
    if (themeLabel) themeLabel.textContent = t("memberTheme");
    document
      .querySelectorAll(".member-theme-dot[data-color-key]")
      .forEach((button) => {
        const color = t(button.dataset.colorKey);
        const label = `${t("memberTheme")}: ${color}`;
        button.title = label;
        button.setAttribute("aria-label", label);
      });
  }

  async function loadMemberExtras() {
    const member = await user();
    if (!member) return;
    const { data, error } = await db
      .from("profiles")
      .select(
        "display_name,phone,wechat,whatsapp,telegram,locale,created_at,profile_locked_at,member_level,valid_order_count,total_spent,avatar_url,theme_color",
      )
      .eq("user_id", member.id)
      .maybeSingle();
    if (error) throw error;
    memberProfile = data || {
      member_level: 1,
      valid_order_count: 0,
      total_spent: 0,
      avatar_url: null,
      theme_color: "blue",
    };
    applyTheme(memberProfile.theme_color || "blue");
    paintAvatar(memberProfile.avatar_url);
    renderLevel();
    buildAvatarControls();
    buildThemeControls();
    document
      .querySelectorAll(".member-theme-dot")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.theme === (memberProfile.theme_color || "blue"),
        ),
      );
    syncExtraLabels();
  }

  function syncLabels() {
    document
      .querySelectorAll(".member-bulk-action[data-label-key]")
      .forEach((button) => {
        if (!button.disabled) button.textContent = t(button.dataset.labelKey);
      });
    syncExtraLabels();
  }

  async function init() {
    await user();
    addAction(
      "favorites",
      "clearAllFavorites",
      "memberClearFavorites",
      clearFavorites,
    );
    addAction(
      "searches",
      "clearAllSearches",
      "memberClearSearches",
      clearSearches,
    );
    addAction(
      "orders",
      "clearExpiredOrders",
      "memberClearExpired",
      clearInvalidOrders,
    );
    loadMemberExtras().catch((error) =>
      console.error("load member extras failed", error),
    );
    window.addEventListener("gyx:languagechange", syncLabels);
    window.addEventListener("gyx:profile-updated", () =>
      loadMemberExtras().catch((error) =>
        console.error("refresh member extras failed", error),
      ),
    );
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
