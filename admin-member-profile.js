(() => {
  "use strict";
  const db = window.gyxSupabase;
  if (!db) return;
  async function api(body) {
    const { data } = await db.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("请先登录管理员账号");
    const r = await fetch("https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/admin-api", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.message || j.error || "修改失败");
    return j;
  }
  async function edit(row) {
    const display_name = prompt("名称", row.display_name || "");
    if (display_name === null) return;
    const phone = prompt("电话", row.phone || "");
    if (phone === null) return;
    const countryCodeInput = prompt("国家/地区代码，例如 CN / KH / US / OTHER（可空）", row.phone_country_code || "");
    if (countryCodeInput === null) return;
    const phone_country_code = String(countryCodeInput).trim().toUpperCase();
    if (phone_country_code && phone_country_code !== "OTHER" && !/^[A-Z]{2}$/.test(phone_country_code)) throw new Error("国家/地区代码格式不正确");
    let phone_country_name = "";
    if (phone_country_code === "OTHER") {
      const countryNameInput = prompt("国家/地区名称（可空）", row.phone_country_name || "");
      if (countryNameInput === null) return;
      phone_country_name = String(countryNameInput).trim();
    } else if (phone_country_code) {
      try { phone_country_name = new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(phone_country_code) || phone_country_code; }
      catch { phone_country_name = phone_country_code; }
    }
    const wechat = prompt("微信（可空）", row.wechat || ""); if (wechat === null) return;
    const telegram = prompt("TG / Telegram（可空）", row.telegram || ""); if (telegram === null) return;
    const whatsapp = prompt("WhatsApp（可空）", row.whatsapp || ""); if (whatsapp === null) return;
    const locale = prompt("语言：zh-CN / en / km", row.locale || "zh-CN"); if (locale === null) return;
    await api({ action: "member_action", kind: "update_profile", user_id: row.user_id, profile: { display_name, phone, phone_country_code: phone_country_code || null, phone_country_name: phone_country_name || null, wechat, telegram, whatsapp, locale } });
    alert("会员资料已更新");
    document.querySelector('[data-member-security-refresh]')?.click();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-member-edit],[data-ms-detail]");
    if (!b) return;
    const box = b.closest('[data-table="members"]');
    const index = Number(b.dataset.memberEdit ?? b.dataset.msDetail);
    const row = box?._rows?.[index] || box?._securityRows?.[index];
    if (!row) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    edit(row).catch((err) => alert(err.message));
  }, true);
})();