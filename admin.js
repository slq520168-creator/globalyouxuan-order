(() => {
  "use strict";const I18N=window.GYXI18N,tr=(key,vars)=>I18N.t(key,vars),dateLocale=()=>I18N.locale==='zh'?'zh-CN':I18N.locale==='km'?'km-KH':'en';
  const $ = (s) => document.querySelector(s),
    $$ = (s) => Array.from(document.querySelectorAll(s));
  let currentEdit = null;
  const cols = {
    settings: [
      ["label", tr("adminAuto001")],
      ["value", tr("adminAuto002")],
      ["group_name", tr("category")],
      ["is_public", tr("adminAuto003")],
    ],
    members: [
      ["email", tr("email")],
      ["display_name", tr("adminAuto004")],
      ["phone", tr("phone")],
      ["telegram", "Telegram"],
      ["locale", tr("languageMenu")],
      ["email_confirmed_at", tr("adminAuto005")],
      ["last_sign_in_at", tr("adminAuto006")],
      ["banned_until", tr("adminAuto007")],
    ],
    orders: [
      ["order_no", tr("orderNo")],
      ["customer_name", tr("adminAuto008")],
      ["product_name", tr("adminAuto009")],
      ["payable_amount", tr("amount")],
      ["status", tr("status")],
      ["txid", "TXID"],
      ["created_at", tr("adminAuto010")],
    ],
    products: [
      ["id", "ID"],
      ["product_name", tr("adminAuto004")],
      ["product_price", tr("homeIosNavLockCopy179")],
      ["currency", tr("adminAuto011")],
      ["is_active", tr("adminAuto012")],
      ["sort_order", tr("adminAuto013")],
    ],
    answers: [
      ["id", "ID"],
      ["module_code", tr("adminAuto014")],
      ["title", tr("adminAuto015")],
      ["priority", tr("adminAuto016")],
      ["is_active", tr("adminAuto012")],
    ],
    fixed: [
      ["module_code", tr("adminAuto017")],
      ["module_name", tr("adminAuto014")],
      ["description", tr("adminAuto018")],
      ["sort_order", tr("adminAuto013")],
      ["is_active", tr("adminAuto012")],
    ],
    messages: [
      ["id", "ID"],
      ["message_type", tr("adminAuto019")],
      ["title", tr("adminAuto020")],
      ["is_read", tr("adminAuto021")],
      ["created_at", tr("adminAuto010")],
    ],
    payments: [
      ["order_id", tr("orders")],
      ["status", tr("status")],
      ["expected_amount", tr("adminAuto022")],
      ["received_amount", tr("adminAuto023")],
      ["checked_at", tr("adminAuto024")],
    ],
    notifications: [
      ["id", "ID"],
      ["event_type", tr("adminAuto025")],
      ["order_id", tr("orders")],
      ["status", tr("status")],
      ["attempt_count", tr("adminAuto026")],
      ["telegram_sent_at", tr("adminAuto027")],
      ["last_error", tr("adminAuto028")],
    ],
    delivery: [
      ["order_id", tr("orders")],
      ["product_id", tr("adminAuto029")],
      ["status", tr("status")],
      ["download_count", tr("adminAuto030")],
      ["max_downloads", tr("adminAuto031")],
      ["expires_at", tr("adminAuto032")],
    ],
    sessions: [
      ["email", tr("email")],
      ["ip", tr("adminAuto033")],
      ["user_agent", tr("adminAuto034")],
      ["created_at", tr("adminAuto035")],
      ["updated_at", tr("adminAuto036")],
      ["not_after", tr("adminAuto037")],
    ],
    audit: [
      ["event_type", tr("adminAuto025")],
      ["ip_address", "IP"],
      ["device_type", tr("adminAuto038")],
      ["browser_name", tr("adminAuto039")],
      ["os_name", tr("adminAuto040")],
      ["country_code", tr("adminAuto041")],
      ["region", tr("authCopy001")],
      ["city", tr("adminAuto042")],
      ["created_at", tr("adminAuto010")],
    ],
  };
  const fields = {
    settings: [
      ["key", tr("adminAuto043"), "text"],
      ["label", tr("adminAuto044"), "text"],
      ["value", tr("adminAuto045"), "textarea"],
      ["group_name", tr("category"), "text"],
      ["is_public", tr("adminAuto046"), "bool"],
    ],
    products: [
      ["id", "ID", "text"],
      ["product_name", tr("adminAuto004"), "text"],
      ["product_price", tr("homeIosNavLockCopy179"), "number"],
      ["description", tr("adminAuto018"), "textarea"],
      ["currency", tr("adminAuto011"), "text"],
      ["download_url", tr("adminAuto047"), "text"],
      ["image_url", tr("adminAuto048"), "text"],
      ["is_active", tr("adminAuto012"), "bool"],
      ["sort_order", tr("adminAuto013"), "number"],
    ],
    answers: [
      ["id", "ID", "number"],
      ["answer_code", tr("adminAuto049"), "text"],
      ["module_code", tr("adminAuto050"), "text"],
      ["title", tr("adminAuto020"), "text"],
      ["answer_summary", tr("adminAuto051"), "textarea"],
      ["keywords", tr("adminAuto052"), "textarea"],
      ["product_id", tr("adminAuto053"), "text"],
      ["priority", tr("adminAuto016"), "number"],
      ["is_active", tr("adminAuto012"), "bool"],
      ["title_en", tr("adminAuto054"), "text"],
      ["title_km", tr("adminAuto055"), "text"],
      ["answer_summary_en", tr("adminAuto056"), "textarea"],
      ["answer_summary_km", tr("adminAuto057"), "textarea"],
      ["answer_detail_zh", tr("adminAuto058"), "textarea"],
      ["answer_detail_en", tr("adminAuto059"), "textarea"],
      ["answer_detail_km", tr("adminAuto060"), "textarea"],
      ["source_name", tr("adminAuto061"), "text"],
      ["content_version", tr("adminAuto062"), "number"],
      ["image_url", tr("adminAuto048"), "text"],
    ],
    fixed: [
      ["module_code", tr("adminAuto050"), "text"],
      ["module_name", tr("adminAuto063"), "text"],
      ["emoji", tr("adminAuto064"), "text"],
      ["description", tr("adminAuto018"), "textarea"],
      ["keywords", tr("adminAuto052"), "textarea"],
      ["sort_order", tr("adminAuto013"), "number"],
      ["is_active", tr("adminAuto012"), "bool"],
      ["module_name_en", tr("adminAuto065"), "text"],
      ["module_name_km", tr("adminAuto066"), "text"],
      ["description_en", tr("adminAuto067"), "textarea"],
      ["description_km", tr("adminAuto068"), "textarea"],
      ["image_url", tr("adminAuto048"), "text"],
    ],
    orders: [
      ["status", tr("adminAuto069"), "text"],
      ["txid", "TXID", "text"],
      ["download_url", tr("adminAuto070"), "text"],
      ["hidden_by_user", tr("adminAuto071"), "bool"],
    ],
    messages: [
      ["user_id", tr("adminAuto072"), "text"],
      ["order_id", tr("adminAuto073"), "number"],
      ["message_type", tr("adminAuto074"), "text"],
      ["title", tr("adminAuto020"), "text"],
      ["body", tr("adminAuto075"), "textarea"],
      ["txid", tr("adminAuto076"), "text"],
      ["is_read", tr("adminAuto021"), "bool"],
    ],
    delivery: [
      ["status", tr("adminAuto077"), "text"],
      ["expires_at", tr("adminAuto078"), "text"],
      ["max_downloads", tr("adminAuto079"), "number"],
      ["download_count", tr("adminAuto080"), "number"],
    ],
  };
  const deletable = new Set(["products", "answers", "fixed", "messages"]);
  function esc(v) {
    return String(v ?? "—").replace(
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
  }
  function val(v, k) {
    if (typeof v === "boolean") return v ? tr("adminAuto081") : tr("adminAuto082");
    if ((k.includes("at") || k === "expires_at") && v) {
      try {
        return new Date(v).toLocaleString();
      } catch {}
    }
    if (Array.isArray(v)) return esc(v.join("，"));
    return esc(v);
  }
  function toast(t) {
    const d = document.createElement("div");
    d.className = "toast";
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }
  async function session() {
    const { data } = await window.gyxSupabase.auth.getSession();
    const s = data?.session;
    if (!s) {
      location.replace("admin-login.html");
      throw new Error(tr("adminAuto083"));
    }
    return s;
  }
  async function api(body) {
    const s = await session();
    const res = await fetch(
      "https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/admin-api",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + s.access_token,
        },
        body: JSON.stringify(body),
      },
    );
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) {
      location.replace("admin-login.html");
      throw new Error(tr("adminAuto084"));
    }
    if (res.status === 403) throw new Error(tr("adminAuto085"));
    if (!res.ok || j.error)
      throw new Error(j.message || j.error || tr("adminAuto086"));
    return j;
  }
  async function me() {
    const j = await api({ action: "me" }),
      head = $(".admin-head");
    if (head && !$("#adminIdentity")) {
      const d = document.createElement("div");
      d.id = "adminIdentity";
      d.innerHTML =
        "<strong>" +
        esc(j.email) +
        "</strong><br><span>" +
        esc(j.role) +
        tr("adminAuto087");
      head.appendChild(d);
      $("#adminLogout").onclick = async () => {
        await window.gyxSupabase.auth.signOut();
        location.replace("admin-login.html");
      };
    }
  }
  function table(rows, c, resource) {
    if (!rows?.length) return tr("adminAuto088");
    const editable = !!fields[resource],
      member = resource === "members",
      retry = resource === "notifications";
    return (
      '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      c.map((x) => "<th>" + x[1] + "</th>").join("") +
      (editable || member || retry ? tr("adminAuto089") : "") +
      "</tr></thead><tbody>" +
      rows
        .map(
          (r, i) =>
            "<tr>" +
            c.map((x) => "<td>" + val(r[x[0]], x[0]) + "</td>").join("") +
            (editable
              ? '<td><button class="edit-btn" data-edit-resource="' +
                resource +
                '" data-edit-index="' +
                i +
                tr("adminAuto090")
              : member
                ? '<td><button class="edit-btn" data-member-edit="' +
                  i +
                  tr("adminAuto091") +
                  i +
                  tr("adminAuto092") +
                  i +
                  tr("adminAuto093") +
                  i +
                  tr("adminAuto094")
                : retry
                  ? '<td><button class="edit-btn" data-retry-notification="' +
                    esc(r.id) +
                    tr("adminAuto095")
                  : "") +
            "</tr>",
        )
        .join("") +
      "</tbody></table></div>"
    );
  }
  function showPanel(name) {
    $$(".admin-panel-v2").forEach((p) => p.classList.add("hidden"));
    $("#" + name + "Panel")?.classList.remove("hidden");
    $$(".admin-nav-v2 [data-panel]").forEach((b) =>
      b.classList.toggle("active", b.dataset.panel === name),
    );
    try {
      history.replaceState(null, "", "#" + name);
    } catch {}
    if (name === "members") loadMembers();
    else if (
      [
        "settings",
        "orders",
        "products",
        "answers",
        "fixed",
        "messages",
      ].includes(name)
    )
      load(name);
    else if (name === "security") loadSecurity();
    else if (name === "delivery") loadDelivery();
    else if (name === "services") loadServices();
  }
  function nav() {
    $$(".admin-nav-v2 [data-panel]").forEach(
      (b) => (b.onclick = () => showPanel(b.dataset.panel)),
    );
    showPanel(location.hash.slice(1) || "dashboard");
  }
  function wireEdit(box, resource) {
    box
      .querySelectorAll("[data-edit-resource]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            openEditor(
              resource,
              box._rows[Number(b.dataset.editIndex)],
              false,
            )),
      );
  }
  async function load(resource) {
    const box = $('[data-table="' + resource + '"]');
    if (!box) return;
    box.innerHTML = tr("adminAuto096");
    try {
      const j = await api({
        action: "list",
        resource,
        limit: resource === "answers" ? 1000 : 200,
      });
      box._rows = j.data || [];
      box.innerHTML = table(box._rows, cols[resource], resource);
      wireEdit(box, resource);
    } catch (e) {
      box.innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }
  async function loadMembers() {
    const box = $('[data-table="members"]');
    if (!box) return;
    box.innerHTML = tr("adminAuto097");
    try {
      const j = await api({ action: "members", limit: 100 });
      box._rows = j.data || [];
      box.innerHTML = table(box._rows, cols.members, "members");
      box
        .querySelectorAll("[data-member-edit]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              editMember(box._rows[Number(b.dataset.memberEdit)])),
        );
      box
        .querySelectorAll("[data-member-confirm]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              memberAction(
                box._rows[Number(b.dataset.memberConfirm)],
                "confirm_email",
              )),
        );
      box
        .querySelectorAll("[data-member-ban]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              memberAction(box._rows[Number(b.dataset.memberBan)], "ban")),
        );
      box
        .querySelectorAll("[data-member-unban]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              memberAction(box._rows[Number(b.dataset.memberUnban)], "unban")),
        );
    } catch (e) {
      box.innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }
  async function editMember(r) {
    const display_name = prompt(tr("adminAuto004"), r.display_name || "");
    if (display_name === null) return;
    const phone = prompt(tr("phone"), r.phone || "");
    if (phone === null) return;
    const phone_country_code = prompt(
      tr("adminAuto098"),
      r.phone_country_code || "",
    );
    if (phone_country_code === null) return;
    const normalizedCountryCode = String(phone_country_code)
      .trim()
      .toUpperCase();
    let phone_country_name = r.phone_country_name || normalizedCountryCode;
    if (normalizedCountryCode && normalizedCountryCode !== "OTHER") {
      try {
        phone_country_name =
          new Intl.DisplayNames([dateLocale()], { type: "region" }).of(
            normalizedCountryCode,
          ) || normalizedCountryCode;
      } catch {
        phone_country_name = normalizedCountryCode;
      }
    }
    const locale = prompt(tr("adminAuto099"), r.locale || "zh-CN");
    if (locale === null) return;
    const wechat = prompt(tr("adminAuto100"), r.wechat || "");
    if (wechat === null) return;
    const telegram = prompt(tr("adminAuto101"), r.telegram || "");
    if (telegram === null) return;
    const whatsapp = prompt(tr("adminAuto102"), r.whatsapp || "");
    if (whatsapp === null) return;
    await api({
      action: "member_action",
      kind: "update_profile",
      user_id: r.user_id,
      profile: {
        display_name,
        phone,
        phone_country_code: normalizedCountryCode || null,
        phone_country_name: phone_country_name || null,
        locale,
        wechat,
        telegram,
        whatsapp,
      },
    });
    toast(tr("adminAuto103"));
    loadMembers();
  }
  async function memberAction(r, kind) {
    if (kind === "ban") {
      const h = prompt(tr("adminAuto104"), "24");
      if (h === null) return;
      await api({
        action: "member_action",
        kind,
        user_id: r.user_id,
        hours: Number(h) || 24,
      });
      toast(tr("adminAuto105"));
    } else if (kind === "unban") {
      if (!confirm(tr("adminAuto106"))) return;
      await api({ action: "member_action", kind, user_id: r.user_id });
      toast(tr("adminAuto107"));
    } else if (kind === "confirm_email") {
      if (!confirm(tr("adminAuto108"))) return;
      await api({ action: "member_action", kind, user_id: r.user_id });
      toast(tr("adminAuto109"));
    }
    loadMembers();
  }
  async function loadSecurity() {
    const box = $('[data-table="security"]');
    if (!box) return;
    box.innerHTML = tr("adminAuto110");
    try {
      const j = await api({ action: "security" }),
        d = j.data || {};
      box.innerHTML =
        tr("adminAuto111") +
        table(d.sessions || [], cols.sessions) +
        tr("adminAuto112") +
        table(d.audit || [], cols.audit);
    } catch (e) {
      box.innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }
  async function stats() {
    const j = await api({ action: "summary" }),
      d = j.data || {};
    Object.keys(d).forEach((k) =>
      $('[data-stat="' + k + '"]')?.replaceChildren(
        document.createTextNode(String(d[k] ?? 0)),
      ),
    );
  }
  async function loadDelivery() {
    const box = $('[data-table="delivery"]');
    if (!box) return;
    box.innerHTML = tr("adminAuto113");
    try {
      const j = await api({ action: "list", resource: "delivery", limit: 200 });
      box._rows = j.data || [];
      box.innerHTML = table(box._rows, cols.delivery, "delivery");
      wireEdit(box, "delivery");
    } catch (e) {
      box.innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }
  async function loadServices() {
    const box = $('[data-table="services"]');
    if (!box) return;
    box.innerHTML = tr("adminAuto114");
    try {
      const [p, n] = await Promise.all([
        api({ action: "list", resource: "payments", limit: 100 }),
        api({ action: "list", resource: "notifications", limit: 100 }),
      ]);
      box.innerHTML =
        tr("adminAuto115") +
        table(p.data || [], cols.payments) +
        tr("adminAuto116") +
        table(n.data || [], cols.notifications, "notifications");
      box
        .querySelectorAll("[data-retry-notification]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              retryNotification(Number(b.dataset.retryNotification))),
        );
    } catch (e) {
      box.innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }
  async function retryNotification(id) {
    await api({ action: "retry_notification", id });
    toast(tr("adminAuto117"));
    loadServices();
  }
  function inputHtml(k, label, type, v) {
    const safe = Array.isArray(v) ? v.join("，") : (v ?? "");
    if (type === "bool")
      return (
        '<div class="field"><label>' +
        esc(label) +
        '</label><select name="' +
        esc(k) +
        '"><option value="true"' +
        (v === true ? " selected" : "") +
        tr("adminAuto118") +
        (v === false ? " selected" : "") +
        tr("adminAuto119")
      );
    if (type === "textarea")
      return (
        '<div class="field full"><label>' +
        esc(label) +
        '</label><textarea name="' +
        esc(k) +
        '">' +
        esc(safe) +
        "</textarea></div>"
      );
    return (
      '<div class="field"><label>' +
      esc(label) +
      '</label><input name="' +
      esc(k) +
      '" type="' +
      (type === "number" ? "number" : "text") +
      '" value="' +
      esc(safe) +
      '"></div>'
    );
  }
  function openEditor(resource, row = {}, isNew = false) {
    const pk =
      resource === "fixed"
        ? "module_code"
        : resource === "settings"
          ? "key"
          : "id";
    currentEdit = { resource, row, isNew, pk };
    $("#editTitle").textContent =
      (isNew ? tr("adminAuto120") : tr("edit")) +
      ({
        settings: tr("adminAuto121"),
        products: tr("adminAuto122"),
        answers: tr("adminAuto123"),
        fixed: tr("adminAuto124"),
        orders: tr("orders"),
        messages: tr("adminAuto125"),
        delivery: tr("adminAuto126"),
      }[resource] || tr("adminAuto127"));
    $("#editFields").innerHTML = (fields[resource] || [])
      .map((f) => inputHtml(f[0], f[1], f[2], row[f[0]]))
      .join("");
    $("#deleteRowBtn").classList.toggle(
      "hidden",
      isNew || !deletable.has(resource),
    );
    $("#editorAssetFile").value = "";
    $("#editModal").classList.remove("hidden");
  }
  function closeEditor() {
    $("#editModal").classList.add("hidden");
    currentEdit = null;
  }
  async function saveEditor(e) {
    e.preventDefault();
    if (!currentEdit) return;
    const fd = new FormData($("#editForm")),
      data = {};
    for (const [k, v] of fd.entries()) {
      if (k === "editorAssetFile") continue;
      const meta = (fields[currentEdit.resource] || []).find((x) => x[0] === k);
      if (meta?.[2] === "bool") data[k] = String(v) === "true";
      else data[k] = v;
    }
    const original_pk = currentEdit.isNew
      ? undefined
      : currentEdit.row[currentEdit.pk];
    await api({
      action: "save",
      resource: currentEdit.resource,
      data,
      original_pk,
    });
    toast(tr("adminAuto128"));
    const r = currentEdit.resource;
    closeEditor();
    if (r === "delivery") await loadDelivery();
    else await load(r);
    await stats();
  }
  async function deleteEditor() {
    if (
      !currentEdit ||
      currentEdit.isNew ||
      !deletable.has(currentEdit.resource)
    )
      return;
    if (!confirm(tr("adminAuto129"))) return;
    await api({
      action: "delete",
      resource: currentEdit.resource,
      pk: currentEdit.row[currentEdit.pk],
    });
    const r = currentEdit.resource;
    closeEditor();
    toast(tr("adminAuto130"));
    await load(r);
    await stats();
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  async function uploadFile(file) {
    if (!file) throw new Error(tr("adminAuto131"));
    if (file.size > 10485760) throw new Error(tr("adminAuto132"));
    const base64 = await fileToBase64(file);
    return api({
      action: "upload_asset",
      name: file.name,
      mime: file.type || "application/octet-stream",
      base64,
    });
  }
  async function uploadAsset() {
    const file = $("#assetFile")?.files?.[0],
      box = $("#assetUploadStatus");
    if (!file) {
      toast(tr("adminAuto131"));
      return;
    }
    box.innerHTML = tr("adminAuto133");
    try {
      const j = await uploadFile(file);
      let html =
        tr("adminAuto134") +
        esc(j.url) +
        "</div>";
      if ((file.type || "").startsWith("image/"))
        html +=
          '<img class="asset-preview" src="' + esc(j.url) + tr("adminAuto135");
      box.innerHTML = html;
      navigator.clipboard?.writeText(j.url).catch(() => {});
      toast(tr("adminAuto136"));
    } catch (e) {
      box.innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
    }
  }
  async function quickUpload() {
    if (!currentEdit) return;
    const file = $("#editorAssetFile")?.files?.[0];
    if (!file) {
      toast(tr("adminAuto131"));
      return;
    }
    const btn = $("#editorUploadBtn");
    btn.disabled = true;
    try {
      const j = await uploadFile(file),
        isImage = (file.type || "").startsWith("image/");
      let target = null;
      if (currentEdit.resource === "settings")
        target = $('#editFields [name="value"]');
      else
        target = isImage
          ? $('#editFields [name="image_url"]')
          : $('#editFields [name="download_url"]') ||
            $('#editFields [name="image_url"]');
      if (target) {
        target.value = j.url;
        toast(tr("adminAuto137"));
      } else {
        navigator.clipboard?.writeText(j.url).catch(() => {});
        toast(tr("adminAuto136"));
      }
    } catch (e) {
      toast(tr("adminAuto138") + e.message);
    } finally {
      btn.disabled = false;
    }
  }
  async function publishAll() {
    const btns = $$("[data-publish]");
    btns.forEach((b) => (b.disabled = true));
    try {
      const j = await api({
        action: "publish",
        note: I18N.source("adminAuto139"),
      });
      toast(j.message || tr("adminAuto140"));
    } catch (e) {
      toast(tr("adminAuto141") + e.message);
    } finally {
      btns.forEach((b) => (b.disabled = false));
    }
  }
  async function runService(name) {
    const btns = $$('[data-service="' + name + '"]');
    btns.forEach((b) => (b.disabled = true));
    try {
      const j = await api({ action: "trigger_service", service: name });
      toast(j.message || tr("adminAuto142"));
      if (name === "verify-payments") load("orders");
      else loadServices();
      stats();
    } catch (e) {
      toast(tr("adminAuto143") + e.message);
    } finally {
      btns.forEach((b) => (b.disabled = false));
    }
  }
  function bind() {
    $$("[data-refresh]").forEach(
      (b) => (b.onclick = () => showPanel(b.dataset.refresh)),
    );
    $$("[data-add]").forEach(
      (b) => (b.onclick = () => openEditor(b.dataset.add, {}, true)),
    );
    $$("[data-open-assets]").forEach(
      (b) => (b.onclick = () => showPanel("assets")),
    );
    $$("[data-publish]").forEach((b) => (b.onclick = publishAll));
    $$("[data-service]").forEach(
      (b) => (b.onclick = () => runService(b.dataset.service)),
    );
    $("#assetUploadBtn").onclick = uploadAsset;
    $("#editorUploadBtn").onclick = quickUpload;
    $("#editClose").onclick = closeEditor;
    $("#editForm").onsubmit = saveEditor;
    $("#deleteRowBtn").onclick = deleteEditor;
    $("#editModal").addEventListener("click", (e) => {
      if (e.target === $("#editModal")) closeEditor();
    });
  }
  async function init() {
    try {
      await me();
      nav();
      bind();
      await stats();
    } catch (e) {
      const main = $(".admin-card-v2");
      if (main)
        main.innerHTML =
          tr("adminAuto144") + esc(e.message) + "</div>";
    }
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
