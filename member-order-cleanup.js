(() => {
  'use strict';

  const db = window.gyxSupabase;
  if (!db) return;

  let hiddenOrders = new Map();
  let initialized = false;

  async function loadHiddenOrders() {
    const user = await window.gyxGetVerifiedUser();
    if (!user) return;
    const { data } = await db
      .from('orders')
      .select('id,order_no,hidden_by_user')
      .eq('user_id', user.id)
      .eq('hidden_by_user', true);
    hiddenOrders = new Map((data || []).map((row) => [String(row.order_no || ''), Number(row.id)]));
  }

  function orderNoFromCard(card) {
    const text = card.textContent || '';
    const match = text.match(/GYX[A-Z0-9]{10,40}/);
    return match ? match[0] : '';
  }

  async function hideOrder(card, orderNo, button) {
    if (!orderNo) return;
    if (!window.confirm('确定从会员中心删除这条订单记录吗？删除后只是不再显示，不影响后台支付审计记录。')) return;
    button.disabled = true;
    button.textContent = '删除中…';
    const { data, error } = await db
      .from('orders')
      .select('id')
      .eq('order_no', orderNo)
      .maybeSingle();
    if (error || !data?.id) {
      button.disabled = false;
      button.textContent = '删除';
      return;
    }
    const result = await db.rpc('hide_own_order', { p_order_id: data.id });
    if (result.error || result.data !== true) {
      button.disabled = false;
      button.textContent = '删除';
      return;
    }
    hiddenOrders.set(orderNo, Number(data.id));
    card.remove();
  }

  function processCards() {
    document.querySelectorAll('#orderList .order-card').forEach((card) => {
      const orderNo = orderNoFromCard(card);
      if (!orderNo) return;
      if (hiddenOrders.has(orderNo)) {
        card.remove();
        return;
      }
      if (card.querySelector('[data-member-delete-order]')) return;
      const actions = document.createElement('div');
      actions.className = 'order-actions';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-danger btn-small';
      button.dataset.memberDeleteOrder = '1';
      button.textContent = '删除';
      button.addEventListener('click', () => hideOrder(card, orderNo, button));
      actions.appendChild(button);
      card.appendChild(actions);
    });

    document.querySelectorAll('#downloadList .order-card').forEach((card) => {
      const orderNo = orderNoFromCard(card);
      if (orderNo && hiddenOrders.has(orderNo)) card.remove();
    });
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    await loadHiddenOrders();
    processCards();
    const observer = new MutationObserver(processCards);
    const orderList = document.getElementById('orderList');
    const downloadList = document.getElementById('downloadList');
    if (orderList) observer.observe(orderList, { childList: true, subtree: true });
    if (downloadList) observer.observe(downloadList, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(init, 250));
})();
