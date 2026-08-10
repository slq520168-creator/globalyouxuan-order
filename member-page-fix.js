(() => {
  "use strict";

  const db = window.gyxSupabase;
  const I = window.GYXI18N;
  if (!db || !I) return;

  const t = (key, values) => I.t(key, values);
  const $ = (id) => document.getElementById(id);
  const countries = [
    ["CN", "+86"],
    ["KH", "+855"],
    ["US", "+1", "CA"],
    ["GB", "+44"],
    ["AU", "+61"],
    ["SG", "+65"],
    ["MY", "+60"],
    ["TH", "+66"],
    ["VN", "+84"],
    ["PH", "+63"],
    ["ID", "+62"],
    ["JP", "+81"],
    ["KR", "+82"],
    ["IN", "+91"],
    ["AE", "+971"],
    ["FR", "+33"],
    ["DE", "+49"],
    ["IT", "+39"],
    ["ES", "+34"],
    ["BR", "+55"],
    ["MX", "+52"],
    ["ZA", "+27"],
    ["NG", "+234"],
    ["OTHER", ""],
  ];

  let currentUser = null;
  let rawUserId = "";
  let profileLocked = false;

  function localeTag() {
    return I.locale === "km" ? "km-KH" : I.locale === "en" ? "en" : "zh-CN";
  }

  function regionName(code, secondaryCode) {
    if (code === "OTHER") return t("memberCountryOther");
    try {
      const names = new Intl.DisplayNames([localeTag()], { type: "region" });
      const first = names.of(code) || code;
      return secondaryCode
        ? `${first}/${names.of(secondaryCode) || secondaryCode}`
        : first;
    } catch {
      return secondaryCode ? `${code}/${secondaryCode}` : code;
    }
  }

  function makeMemberId(raw) {
    const clean = String(raw || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (!clean) return "—";
    let hash = 2166136261;
    for (let i = 0; i < clean.length; i += 1) {
      hash ^= clean.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const base = `${clean}${Math.abs(hash >>> 0)
      .toString(36)
      .toUpperCase()}`.replace(/[^A-Z0-9]/g, "");
    return `GY${base}`.slice(0, 15).padEnd(15, "0");
  }

  function paintMemberId() {
    const element = $("profileUserId");
    if (!element || !rawUserId) return;
    element.textContent = makeMemberId(rawUserId);
    element.title = t("memberId");
  }

  function addAccountRow() {
    const meta = document.querySelector(".profile-meta");
    if (!meta || $("profileAccountValue")) return;
    const row = document.createElement("div");
    row.className = "meta-row";
    row.innerHTML =
      '<span data-i18n="memberAccount"></span><strong id="profileAccountValue">—</strong>';
    const joined = $("profileJoinedAt")?.closest(".meta-row");
    if (joined) meta.insertBefore(row, joined);
    else meta.appendChild(row);
    $("profileEmail")?.classList.add("profile-email-compact-hide");
    I.render?.(row);
  }

  function rebuildCountryOptions() {
    const select = $("profileCountry");
    if (!select) return;
    const selected = select.value || "CN";
    select.replaceChildren();
    for (const [code, dial, secondaryCode] of countries) {
      const option = document.createElement("option");
      const name = regionName(code, secondaryCode);
      option.value = code;
      option.dataset.dial = dial;
      option.dataset.countryName = name;
      option.textContent = `${name}${dial ? ` ${dial}` : ""}`;
      select.appendChild(option);
    }
    select.value = [...select.options].some(
      (option) => option.value === selected,
    )
      ? selected
      : "OTHER";
  }

  function buildContactFields() {
    const phone = $("profilePhone");
    if (!phone || $("profileCountry")) return;
    phone.required = true;
    phone.maxLength = 24;
    phone.setAttribute("aria-required", "true");
    phone.dataset.i18nPlaceholder = "memberPhoneLocalPlaceholder";

    const phoneGroup = phone.closest(".form-group");
    const label = phoneGroup?.querySelector('label[for="profilePhone"]');
    if (label && !label.querySelector(".required-mark")) {
      const mark = document.createElement("span");
      mark.className = "required-mark";
      mark.textContent = " *";
      label.appendChild(mark);
    }

    const countryGroup = document.createElement("div");
    countryGroup.className = "form-group";
    countryGroup.innerHTML =
      '<label for="profileCountry" data-i18n="memberCountryRegion"></label>' +
      '<select id="profileCountry" class="select"></select>' +
      '<span id="profilePhoneHint" class="form-help"></span>';
    phoneGroup?.parentNode?.insertBefore(countryGroup, phoneGroup);

    const optional = document.createElement("div");
    optional.className = "member-contact-grid";
    optional.innerHTML =
      '<div class="form-group"><label for="profileWechat" data-i18n="memberWechatOptional"></label><input id="profileWechat" class="field" type="text" maxlength="80" data-i18n-placeholder="memberWechatPlaceholder"></div>' +
      '<div class="form-group"><label for="profileTelegram" data-i18n="memberTelegramOptional"></label><input id="profileTelegram" class="field" type="text" maxlength="80" data-i18n-placeholder="memberTelegramPlaceholder"></div>' +
      '<div class="form-group"><label for="profileWhatsapp" data-i18n="memberWhatsappOptional"></label><input id="profileWhatsapp" class="field" type="text" maxlength="80" data-i18n-placeholder="memberWhatsappPlaceholder"></div>';
    phoneGroup?.insertAdjacentElement("afterend", optional);

    rebuildCountryOptions();
    $("profileCountry")?.addEventListener("change", updatePhoneHint);
    I.render?.(countryGroup);
    I.render?.(optional);
    updatePhoneHint();
  }

  function updatePhoneHint() {
    const select = $("profileCountry");
    const hint = $("profilePhoneHint");
    const input = $("profilePhone");
    if (!select || !hint || !input) return;
    const dial = select.selectedOptions[0]?.dataset?.dial || "";
    if (dial) {
      hint.textContent = t("memberPhoneHintDial", { dial });
      input.placeholder = t("memberPhoneLocalPlaceholder");
    } else {
      hint.textContent = t("memberPhoneHintFull");
      input.placeholder = t("memberPhoneFullPlaceholder");
    }
  }

  function normalizePhone() {
    const raw = String($("profilePhone")?.value || "").trim();
    const dial = $("profileCountry")?.selectedOptions[0]?.dataset?.dial || "";
    if (!raw) return "";
    const compactRaw = raw.replace(/[\s()\-]/g, "");
    if (/^\+[1-9]\d{6,14}$/.test(compactRaw)) return compactRaw;
    if (!dial) return "";
    const local = raw.replace(/\D/g, "").replace(/^0+/, "");
    if (!local) return "";
    const compact = `${dial}${local}`;
    return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : "";
  }

  function splitStoredPhone(phone, countryCode) {
    const input = $("profilePhone");
    const select = $("profileCountry");
    if (!input || !select) return;
    let selected = [...select.options].find(
      (option) => option.value === countryCode,
    );
    if (
      selected?.dataset.dial &&
      phone &&
      !String(phone).startsWith(selected.dataset.dial)
    )
      selected = null;
    if (!selected && phone) {
      selected = [...select.options]
        .filter(
          (option) =>
            option.dataset.dial &&
            String(phone).startsWith(option.dataset.dial),
        )
        .sort((a, b) => b.dataset.dial.length - a.dataset.dial.length)[0];
    }
    if (selected) {
      select.value = selected.value;
      const dial = selected.dataset.dial || "";
      input.value =
        dial && String(phone).startsWith(dial)
          ? String(phone).slice(dial.length)
          : String(phone || "");
    } else {
      select.value = "OTHER";
      input.value = String(phone || "");
    }
    updatePhoneHint();
  }

  function selectedCountry() {
    const option = $("profileCountry")?.selectedOptions[0];
    return {
      code: String(option?.value || ""),
      name: String(option?.dataset?.countryName || ""),
    };
  }

  function message(text, kind = "error") {
    const element = $("profileMessage");
    if (!element) return;
    element.textContent = text;
    element.className = text ? `form-message show ${kind}` : "form-message";
  }

  function applyProfileLock(locked) {
    profileLocked = Boolean(locked);
    const form = $("profileForm");
    if (!form) return;
    form.dataset.profileLocked = profileLocked ? "1" : "0";

    let note = $("profileLockNote");
    if (!note) {
      note = document.createElement("div");
      note.id = "profileLockNote";
      form.insertBefore(note, form.firstChild);
    }
    note.className =
      `form-message show ${profileLocked ? "success" : ""}`.trim();
    note.textContent = t(
      profileLocked ? "memberProfileLocked" : "memberProfileFirstSave",
    );

    form.querySelectorAll("input,select,textarea").forEach((control) => {
      control.disabled = profileLocked;
      control.setAttribute("aria-readonly", String(profileLocked));
    });

    const save = $("saveProfileButton");
    if (save) save.hidden = profileLocked;

    const editToggle = document.querySelector(".member-edit-toggle");
    if (editToggle) editToggle.hidden = profileLocked;

    let support = $("profileSupportLink");
    if (profileLocked && !support) {
      support = document.createElement("a");
      support.id = "profileSupportLink";
      support.className = "btn btn-secondary btn-block";
      support.href = "https://t.me/qqyousubot";
      support.target = "_blank";
      support.rel = "noopener";
      form.insertAdjacentElement("afterend", support);
    } else if (support?.parentNode === form) {
      form.insertAdjacentElement("afterend", support);
    }
    if (support) {
      support.hidden = !profileLocked;
      support.textContent = t("memberContactSupportModify");
    }
  }

  async function resolveUser() {
    try {
      currentUser = await window.gyxGetVerifiedUser?.();
      rawUserId = currentUser?.id || "";
      paintMemberId();
      const account = $("profileAccountValue");
      if (account) account.textContent = currentUser?.email || "—";
    } catch {
      currentUser = null;
    }
    return currentUser;
  }

  async function loadContactProfile() {
    if (!currentUser) await resolveUser();
    if (!currentUser) return;
    const { data, error } = await db
      .from("profiles")
      .select(
        "display_name,phone,locale,phone_country_code,phone_country_name,wechat,telegram,whatsapp,profile_locked_at",
      )
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (error) {
      message(t("memberProfileLoadFailed"));
      return;
    }

    const profile = data || {};
    if ($("profileName")) $("profileName").value = profile.display_name || "";
    if ($("profileLocale"))
      $("profileLocale").value = profile.locale || "zh-CN";
    splitStoredPhone(profile.phone || "", profile.phone_country_code || "");
    if ($("profileWechat")) $("profileWechat").value = profile.wechat || "";
    if ($("profileTelegram"))
      $("profileTelegram").value = profile.telegram || "";
    if ($("profileWhatsapp"))
      $("profileWhatsapp").value = profile.whatsapp || "";
    applyProfileLock(Boolean(profile.profile_locked_at));
  }

  function installProfileSave() {
    const form = $("profileForm");
    if (!form || form.dataset.gyxOneTimeSave === "1") return;
    form.dataset.gyxOneTimeSave = "1";
    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        message("");

        if (profileLocked) {
          message(t("memberProfileLocked"));
          return;
        }
        if (!currentUser) await resolveUser();
        if (!currentUser) {
          message(t("memberSessionExpired"));
          return;
        }

        const displayName = String($("profileName")?.value || "").trim();
        const phone = normalizePhone();
        const locale = String($("profileLocale")?.value || "zh-CN");
        const wechat = String($("profileWechat")?.value || "").trim();
        const telegram = String($("profileTelegram")?.value || "").trim();
        const whatsapp = String($("profileWhatsapp")?.value || "").trim();
        const country = selectedCountry();
        if (!displayName) {
          message(t("errorName"));
          return;
        }
        if (!phone) {
          message(t("memberInvalidInternationalPhone"));
          $("profilePhone")?.focus();
          return;
        }

        const button = $("saveProfileButton");
        if (button) {
          button.disabled = true;
          button.textContent = t("saving");
        }

        try {
          const payload = {
            display_name: displayName,
            phone,
            phone_country_code: country.code || null,
            phone_country_name: country.name || null,
            wechat: wechat || null,
            telegram: telegram || null,
            whatsapp: whatsapp || null,
            locale,
          };
          const { data, error } = await db
            .from("profiles")
            .update(payload)
            .eq("user_id", currentUser.id)
            .is("profile_locked_at", null)
            .select(
              "user_id,display_name,phone,locale,phone_country_code,wechat,telegram,whatsapp,profile_locked_at",
            )
            .maybeSingle();
          if (error) throw error;
          if (!data?.user_id || !data.profile_locked_at)
            throw new Error("PROFILE_LOCKED");

          try {
            await db.auth.updateUser({
              data: {
                display_name: displayName,
                phone,
                phone_country_code: country.code,
                phone_country_name: country.name,
                wechat,
                telegram,
                whatsapp,
              },
            });
          } catch {}

          const heading = $("profileHeading");
          if (heading) heading.textContent = displayName;
          splitStoredPhone(phone, country.code);
          message(t("memberProfileSavedLocked"), "success");
          applyProfileLock(true);
          window.dispatchEvent(new CustomEvent("gyx:profile-updated"));
          if ((locale === "zh-CN" ? "zh" : locale) !== I.locale)
            I.changeLanguage(locale);
        } catch (error) {
          console.error("profile save failed", error);
          const text = String(error?.message || "");
          if (/PROFILE_LOCKED|42501/i.test(text)) {
            await loadContactProfile();
            message(t("memberProfileLocked"));
          } else if (/JWT|session|auth/i.test(text)) {
            message(t("memberSessionExpired"));
          } else {
            message(t("memberProfileSaveFailed"));
          }
        } finally {
          if (button && !profileLocked) {
            button.disabled = false;
            button.textContent = t("saveProfile");
          }
        }
      },
      true,
    );
  }

  function buildOverview() {
    const grid = document.querySelector(".dashboard-grid");
    if (!grid || $("memberOverview")) return;
    const overview = document.createElement("section");
    overview.id = "memberOverview";
    overview.className = "member-overview";
    overview.innerHTML =
      '<button type="button" class="member-stat" data-jump="#orders"><span class="member-stat-icon">▤</span><b id="memberOrderCount">0</b><small data-i18n="memberOverviewOrders"></small></button>' +
      '<button type="button" class="member-stat" data-jump="#favorites"><span class="member-stat-icon">☆</span><b id="memberFavoriteCount">0</b><small data-i18n="memberOverviewFavorites"></small></button>' +
      '<button type="button" class="member-stat" data-jump="#downloads"><span class="member-stat-icon">↓</span><b id="memberDownloadCount">0</b><small data-i18n="memberOverviewDownloads"></small></button>' +
      '<button type="button" class="member-stat" data-jump="#materials"><span class="member-stat-icon">▣</span><b id="memberMaterialCount">0</b><small data-i18n="memberOverviewMaterials"></small></button>';
    grid.parentNode.insertBefore(overview, grid);
    overview.addEventListener("click", (event) => {
      const button = event.target.closest("[data-jump]");
      if (button)
        document
          .querySelector(button.dataset.jump)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    I.render?.(overview);
  }

  function updateOverview() {
    const count = (selector) => document.querySelectorAll(selector).length;
    const set = (id, value) => {
      const element = $(id);
      if (element) element.textContent = String(value);
    };
    set("memberOrderCount", count("#orderList>.order-card"));
    set("memberFavoriteCount", count("#favoriteList>.favorite-card"));
    set("memberDownloadCount", count("#downloadList>.order-card"));
    set("memberMaterialCount", count("#materialList>.material-card"));
  }

  function observeCounts() {
    ["orderList", "favoriteList", "downloadList", "materialList"].forEach(
      (id) => {
        const element = $(id);
        if (element)
          new MutationObserver(updateOverview).observe(element, {
            childList: true,
            subtree: false,
          });
      },
    );
    updateOverview();
  }

  function buttonFeedback() {
    document.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest?.(
          ".member-page button,.member-page a.btn",
        );
        if (!button || button.disabled) return;
        button.classList.add("member-action-hit");
        setTimeout(() => button?.classList.remove("member-action-hit"), 160);
      },
      true,
    );
  }

  function compact() {
    document
      .querySelectorAll(".dashboard-main>.panel")
      .forEach((panel) => (panel.style.minHeight = "0"));
  }

  function observeProfile() {
    const element = $("profileUserId");
    if (element)
      new MutationObserver(() => {
        if (rawUserId) requestAnimationFrame(paintMemberId);
      }).observe(element, {
        childList: true,
        characterData: true,
        subtree: true,
      });
  }

  function renderDynamicLanguage() {
    const selectedCountryCode = $("profileCountry")?.value;
    rebuildCountryOptions();
    if (selectedCountryCode && $("profileCountry"))
      $("profileCountry").value = selectedCountryCode;
    updatePhoneHint();
    paintMemberId();
    applyProfileLock(profileLocked);
    I.render?.($("memberOverview") || document);
  }

  async function init() {
    compact();
    buildOverview();
    addAccountRow();
    buildContactFields();
    installProfileSave();
    buttonFeedback();
    observeProfile();
    observeCounts();
    await resolveUser();
    await loadContactProfile();

    window.addEventListener("gyx:languagechange", renderDynamicLanguage);
    window.addEventListener(
      "pageshow",
      async () => {
        compact();
        paintMemberId();
        updateOverview();
        await resolveUser();
        await loadContactProfile();
      },
      { passive: true },
    );
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
