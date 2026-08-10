(() => {
  "use strict";

  const db = window.gyxSupabase;
  const I = window.GYXI18N;
  if (!db || !I) return;

  const t = (key) => I.t(key);
  const invalidStatuses = new Set(["expired", "failed", "cancelled"]);
  const orderIndex = new Map();
  const busyOrders = new Set();
  let currentUser = null;

  function toast(text, error = false) {
    const element = document.getElementById("toast");
    if (!element) return;
    element.textContent = text;
    element.className = `toast show${error ? " error" : ""}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (element.className = "toast"), 2200);
  }

  async function user() {
    if (!currentUser) currentUser = await window.gyxGetVerifiedUser?.();
    return currentUser;
  }

  function orderNoFromCard(card) {
    const match = String(card.textContent || "").match(/GYX[A-Z0-9]{10,40}/);
    return match?.[0] || "";
  }

  function removeHiddenCards() {
    document
      .querySelectorAll("#orderList>.order-card,#downloadList>.order-card")
      .forEach((card) => {
        const orderNo = orderNoFromCard(card);
        if (orderNo && orderIndex.get(orderNo)?.hidden_by_user) card.remove();
      });
  }

  async function preloadOrders() {
    const member = await user();
    if (!member) return;
    const { data, error } = await db
      .from("orders")
      .select("id,order_no,status,hidden_by_user")
      .eq("user_id", member.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    orderIndex.clear();
    for (const row of data || []) {
      const orderNo = String(row.order_no || "");
      if (orderNo) orderIndex.set(orderNo, row);
    }
  }

  async function hideInvalidOrder(card, orderNo, button) {
    if (busyOrders.has(orderNo)) return;
    const row = orderIndex.get(orderNo);
    if (!row || !invalidStatuses.has(row.status)) {
      toast(t("memberOrderDeleteNotAllowed"), true);
      return;
    }
    if (!window.confirm(t("memberDeleteInvalidOrderConfirm"))) return;

    busyOrders.add(orderNo);
    button.disabled = true;
    button.textContent = t("memberDeleting");
    try {
      const { data, error } = await db.rpc("hide_own_order", {
        p_order_id: row.id,
      });
      if (error) throw error;
      if (data !== true) throw new Error("ORDER_NOT_HIDDEN");
      row.hidden_by_user = true;
      card.remove();
      toast(t("memberInvalidOrderDeleted"));
    } catch (error) {
      console.error("delete invalid order failed", error);
      button.disabled = false;
      button.textContent = t("delete");
      toast(t("memberInvalidOrderDeleteFailed"), true);
    } finally {
      busyOrders.delete(orderNo);
    }
  }

  function enhanceCard(card) {
    if (!(card instanceof Element) || !card.matches(".order-card")) return;
    const orderNo = orderNoFromCard(card);
    if (!orderNo) return;
    const row = orderIndex.get(orderNo);
    if (!row) return;
    if (row.hidden_by_user) {
      card.remove();
      return;
    }
    if (!invalidStatuses.has(row.status)) {
      card.querySelector("[data-member-delete-order]")?.remove();
      return;
    }
    if (card.querySelector("[data-member-delete-order]")) return;

    let actions = card.querySelector(".order-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "order-actions";
      card.appendChild(actions);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-delete btn-small";
    button.dataset.memberDeleteOrder = "1";
    button.textContent = t("delete");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideInvalidOrder(card, orderNo, button);
    });
    actions.appendChild(button);
  }

  function enhanceExisting() {
    removeHiddenCards();
    document.querySelectorAll("#orderList>.order-card").forEach(enhanceCard);
  }

  function observeOrders() {
    const orderList = document.getElementById("orderList");
    if (!orderList) return;
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(".order-card")) enhanceCard(node);
          else node.querySelectorAll?.(".order-card").forEach(enhanceCard);
        }
      }
    }).observe(orderList, { childList: true });
  }

  function syncLabels() {
    document
      .querySelectorAll("[data-member-delete-order]")
      .forEach((button) => {
        if (!button.disabled) button.textContent = t("delete");
      });
  }

  async function init() {
    try {
      await preloadOrders();
      enhanceExisting();
      observeOrders();
      window.addEventListener("gyx:languagechange", syncLabels);
    } catch (error) {
      console.error("load order cleanup index failed", error);
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
