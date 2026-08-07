(() => {
  'use strict';

  const seen = new WeakSet();

  function enhanceFailedOrders() {
    document.querySelectorAll('#orderList .order-card').forEach((card) => {
      if (seen.has(card)) return;
      const badge = card.querySelector('.status-badge.failed');
      if (!badge) return;
      const orderNoEl = card.querySelector('.order-number');
      const orderNo = (orderNoEl?.textContent || '').trim();
      if (!/^GYX[A-Z0-9]{10,40}$/.test(orderNo)) return;
      seen.add(card);

      const tip = document.createElement('p');
      tip.className = 'order-number';
      tip.textContent = '付款核验失败，可重新提交新的 TXID。原失败记录会保留。';

      const row = document.createElement('div');
      row.className = 'txid-row';

      const input = document.createElement('input');
      input.className = 'field';
      input.type = 'text';
      input.maxLength = 64;
      input.autocapitalize = 'characters';
      input.autocomplete = 'off';
      input.placeholder = '重新粘贴新的 64 位 TRON 交易哈希';

      const button = document.createElement('button');
      button.className = 'btn';
      button.type = 'button';
      button.textContent = '重新提交付款';

      button.addEventListener('click', async () => {
        const txid = input.value.trim().toUpperCase();
        if (!/^[0-9A-F]{64}$/.test(txid)) {
          alert('请输入有效的 64 位 TRON TXID');
          return;
        }
        button.disabled = true;
        button.textContent = '正在重新核验…';
        try {
          const result = await window.gyxInvokeFunction('submit-payment', {
            order_no: orderNo,
            txid
          });
          if (result && ['paid', 'delivered'].includes(result.status)) {
            alert('付款已确认。');
          } else {
            alert('新的 TXID 已提交，正在核验。');
          }
          location.reload();
        } catch (error) {
          const raw = String(error?.code || error?.message || '提交失败');
          if (raw.includes('FAILED_TXID_CANNOT_BE_REUSED')) {
            alert('这个失败的 TXID 不能重复使用，请提交新的 TXID。');
          } else if (raw.includes('TXID_ALREADY')) {
            alert('这个 TXID 已被其他订单使用，请检查后重新提交。');
          } else {
            alert('重新提交失败：' + raw);
          }
          button.disabled = false;
          button.textContent = '重新提交付款';
        }
      });

      row.append(input, button);
      card.append(tip, row);
    });
  }

  const observer = new MutationObserver(enhanceFailedOrders);
  document.addEventListener('DOMContentLoaded', () => {
    enhanceFailedOrders();
    const list = document.getElementById('orderList');
    if (list) observer.observe(list, { childList: true, subtree: true });
  });
})();
