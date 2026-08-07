(() => {
  'use strict';

  const seen = new WeakSet();
  const downloadSeen = new WeakSet();
  const answerCache = new Map();

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
        if (!/^[0-9A-F]{64}$/.test(txid)) { alert('请输入有效的 64 位 TRON TXID'); return; }
        button.disabled = true;
        button.textContent = '正在重新核验…';
        try {
          const result = await window.gyxInvokeFunction('submit-payment', { order_no: orderNo, txid });
          if (result && ['paid', 'delivered'].includes(result.status)) alert('付款已确认。');
          else alert('新的 TXID 已提交，正在核验。');
          location.reload();
        } catch (error) {
          const raw = String(error?.code || error?.message || '提交失败');
          if (raw.includes('TXID_ALREADY')) alert('这个 TXID 已被成功订单使用，请检查后重新提交。');
          else alert('重新提交失败：' + raw);
          button.disabled = false;
          button.textContent = '重新提交付款';
        }
      });
      row.append(input, button);
      card.append(tip, row);
    });
  }

  function prefetchAnswer(order) {
    if (answerCache.has(order.id)) return answerCache.get(order.id);
    const locale = window.GYXI18N?.locale || 'zh-CN';
    const promise = window.gyxInvokeFunction('get-purchased-answer', { order_id: order.id, locale })
      .then((result) => {
        if (!result?.answer?.content) throw new Error('暂无可下载内容');
        return result;
      })
      .catch((error) => {
        answerCache.delete(order.id);
        throw error;
      });
    answerCache.set(order.id, promise);
    return promise;
  }

  function saveTextFile(result, orderNo) {
    const content = result?.answer?.content || '';
    if (!content) throw new Error('暂无可下载内容');
    const title = result?.answer?.title || '交付答案';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}-${orderNo}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function downloadAnswer(order, button) {
    const old = button.textContent;
    button.disabled = true;
    try {
      let cached = answerCache.get(order.id);
      if (!cached) {
        button.textContent = '准备资料…';
        cached = prefetchAnswer(order);
      } else {
        button.textContent = '正在下载…';
      }
      const result = await cached;
      saveTextFile(result, order.order_no);
      button.textContent = '下载完成';
      setTimeout(() => { button.textContent = old; }, 1200);
    } catch (error) {
      alert('下载失败：' + String(error?.message || error || '未知错误'));
      button.textContent = old;
    } finally {
      button.disabled = false;
    }
  }

  async function enhancePaidDownloads() {
    if (!window.gyxSupabase || !window.gyxGetVerifiedUser) return;
    const user = await window.gyxGetVerifiedUser();
    if (!user) return;
    const { data } = await window.gyxSupabase
      .from('orders')
      .select('id,order_no,status,answer_id')
      .eq('user_id', user.id)
      .eq('hidden_by_user', false)
      .in('status', ['paid', 'delivered']);
    const paid = (data || []).filter((o) => o.answer_id);
    const map = new Map(paid.map((o) => [o.order_no, o]));

    // 页面一打开就在后台准备答案，客户点击下载时直接生成文件。
    paid.slice(0, 12).forEach((order) => prefetchAnswer(order).catch(() => {}));

    document.querySelectorAll('#downloadList .order-card, #orderList .order-card').forEach((card) => {
      if (downloadSeen.has(card)) return;
      const match = (card.textContent || '').match(/GYX[A-Z0-9]{10,40}/);
      if (!match) return;
      const order = map.get(match[0]);
      if (!order) return;
      downloadSeen.add(card);
      card.querySelectorAll('p.muted').forEach((p) => { if ((p.textContent || '').includes('联系客服领取')) p.remove(); });
      const actions = card.querySelector('.order-actions') || document.createElement('div');
      if (!actions.classList.contains('order-actions')) actions.className = 'order-actions';
      if (!Array.from(actions.querySelectorAll('button')).some((b) => (b.textContent || '').includes('下载答案'))) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.type = 'button';
        btn.textContent = '下载答案';
        btn.addEventListener('click', () => downloadAnswer(order, btn));
        actions.appendChild(btn);
      }
      if (!actions.parentNode) card.appendChild(actions);
    });
  }

  function runEnhancements() {
    enhanceFailedOrders();
    enhancePaidDownloads().catch(() => {});
  }

  const observer = new MutationObserver(runEnhancements);
  document.addEventListener('DOMContentLoaded', () => {
    runEnhancements();
    const list = document.getElementById('orderList');
    const downloads = document.getElementById('downloadList');
    if (list) observer.observe(list, { childList: true, subtree: true });
    if (downloads) observer.observe(downloads, { childList: true, subtree: true });
  });
})();