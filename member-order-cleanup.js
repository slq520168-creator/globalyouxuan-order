(() => {
  'use strict';

  const db = window.gyxSupabase;
  if (!db) return;

  // 仅会员页：阻止 iPhone 聚焦表单时自动放大页面。
  function lockMemberViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) viewport.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
    if (!document.getElementById('member-ios-zoom-fix')) {
      const style = document.createElement('style');
      style.id = 'member-ios-zoom-fix';
      style.textContent = `
        html,body{max-width:100%;overflow-x:hidden;-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}
        #profileForm input,#profileForm select,#profileForm textarea,
        #materialForm input,#materialForm select,#materialForm textarea,
        #materialSearch,#orderFilters button{font-size:16px!important;max-width:100%!important;min-width:0!important;transform:none!important}
        #profileForm,#materialForm,.dashboard-grid,.dashboard-main,.profile-card{min-width:0!important;max-width:100%!important}
      `;
      document.head.appendChild(style);
    }
  }
  lockMemberViewport();

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
    lockMemberViewport();
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
