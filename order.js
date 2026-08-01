// ========== 配置 ==========
const CONFIG = {
  apiBase: 'https://globalyouxuan-order.pages.dev',
  products: {
    office: {
      id: 'office',
      name: 'AI办公',
      emoji: '💼',
      price: 9.9,
      count: '6个资源',
      items: ['ChatGPT办公实战', 'AI文案创作', 'Excel智能办公', 'PPT一键生成', '数据分析', '办公提示词库']
    },
    creation: {
      id: 'creation',
      name: 'AI创作',
      emoji: '🎨',
      price: 19.99,
      count: '8个资源',
      items: ['AI绘画', 'AI视频生成', 'AI剪辑', 'AI数字人', 'AI配音', 'AI图片修复', '爆款内容制作', '创作提示词大全']
    },
    business: {
      id: 'business',
      name: 'AI商业',
      emoji: '🚀',
      price: 29.99,
      count: '10个资源',
      items: ['大模型实战教程', 'AI智能体开发', 'AI网站建设', 'AI知识库搭建', 'AI客服系统', 'AI营销获客', 'AI销售自动化', 'AI项目实战', 'AI创业案例', '企业级AI解决方案']
    },
    automation: {
      id: 'automation',
      name: 'AI自动化',
      emoji: '⚙️',
      price: 19.99,
      count: '8个资源',
      items: ['AI工作流', '多Agent协同', '自动内容生成', '自动发布系统', '自动数据采集', '自动回复系统', '自动执行任务', '企业级自动化实战']
    }
  },
  wallet: 'TKfQoN7kZirALGYxMkxU4SoqMWJRqXsh7k',
  network: 'USDT-TRC20',
  timeoutMinutes: 15,
  supportTelegram: '@qqyousubot'
};

// ========== 状态 ==========
let currentProduct = null;
let currentOrder = null;
let countdownInterval = null;
let pollInterval = null;

// ========== 工具函数 ==========
function $(id) {
  return document.getElementById(id);
}

function showError(msg) {
  const el = $('orderError');
  if (!el) return;
  el.textContent = '❌ ' + msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 6000);
}

function clearError() {
  const el = $('orderError');
  if (el) el.classList.remove('show');
}

async function api(path, options = {}) {
  const url = CONFIG.apiBase + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.message || ('请求失败 ' + res.status));
  }
  return data;
}

// ========== 打开订单弹窗 ==========
function openOrder(productId) {
  currentProduct = CONFIG.products[productId];
  if (!currentProduct) return;

  currentOrder = null;
  clearInterval(countdownInterval);
  clearInterval(pollInterval);

  $('modalTitle').textContent = `${currentProduct.emoji} ${currentProduct.name}`;
  $('orderModal').classList.add('show');
  switchOrderStep(1);
  clearError();

  $('orderName').value = '';
  $('orderEmail').value = '';
  $('orderPhone').value = '';
}

// ========== 关闭订单弹窗 ==========
function closeOrder() {
  $('orderModal').classList.remove('show');
  clearInterval(countdownInterval);
  clearInterval(pollInterval);
  currentOrder = null;
}

// ========== 切换步骤 ==========
function switchOrderStep(step) {
  document.querySelectorAll('.step-content').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.step-btn').forEach(el => el.classList.remove('active'));

  const content = $(`orderStep${step}`);
  if (content) content.classList.add('show');
  const btns = document.querySelectorAll('.step-btn');
  if (btns[step - 1]) btns[step - 1].classList.add('active');
}

// ========== 验证表单 ==========
function validateForm() {
  const name = $('orderName').value.trim();
  const email = $('orderEmail').value.trim();
  const phone = $('orderPhone').value.trim();

  if (!name) {
    showError('请输入姓名');
    return null;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('请输入正确的邮箱');
    return null;
  }
  if (!phone || phone.length < 7) {
    showError('请输入正确的电话');
    return null;
  }
  return { name, email, phone };
}

// ========== 创建订单并进入支付 ==========
async function proceedToPayment() {
  const form = validateForm();
  if (!form) return;

  const btn = document.querySelector('#orderStep1 .action-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '创建订单中...';
  }

  try {
    const data = await api('/api/create-order', {
      method: 'POST',
      body: JSON.stringify({
        product: currentProduct.name,
        amount: currentProduct.price
      })
    });

    currentOrder = {
      orderId: data.orderId,
      product: data.product,
      amount: data.amount,
      baseAmount: currentProduct.price,
      walletAddress: data.walletAddress || CONFIG.wallet,
      network: data.network || CONFIG.network,
      expiresAt: data.expiresAt,
      status: data.status,
      name: form.name,
      email: form.email,
      phone: form.phone
    };

    $('paymentName').textContent = form.name;
    $('paymentPrice').textContent = currentOrder.amount.toFixed(2);
    $('paymentOrderNo').textContent = currentOrder.orderId;
    $('walletAddr').textContent = currentOrder.walletAddress;

    $('finalName').textContent = form.name;
    $('finalEmail').textContent = form.email;
    $('finalPhone').textContent = form.phone;
    $('finalPrice').textContent = currentOrder.amount.toFixed(2);
    $('finalOrderNo').textContent = currentOrder.orderId;
    $('successEmail').textContent = form.email;

    const remainSec = Math.max(0, Math.floor((currentOrder.expiresAt - Date.now()) / 1000));
    startCountdown(remainSec);

    switchOrderStep(2);
    clearError();
  } catch (err) {
    showError(err.message || '创建订单失败，请稍后重试');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '下一步：支付';
    }
  }
}

// ========== 倒计时 ==========
function startCountdown(seconds) {
  clearInterval(countdownInterval);

  const update = () => {
    if (seconds <= 0) {
      clearInterval(countdownInterval);
      clearInterval(pollInterval);
      $('countdownDisplay').textContent = '00:00';
      $('timerText').textContent = '00:00';
      showError('订单已过期，请重新下单');
      setTimeout(() => switchOrderStep(1), 2500);
      return;
    }
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    const display = `${m}:${s}`;
    $('countdownDisplay').textContent = display;
    $('timerText').textContent = display;
    seconds--;
  };

  update();
  countdownInterval = setInterval(update, 1000);
}

// ========== 复制钱包地址 ==========
async function copyWallet() {
  try {
    const addr = currentOrder?.walletAddress || CONFIG.wallet;
    await navigator.clipboard.writeText(addr);
    const btn = event.target;
    const original = btn.textContent;
    btn.textContent = '✓ 已复制';
    setTimeout(() => { btn.textContent = original; }, 2000);
  } catch {
    showError('复制失败，请手动长按复制');
  }
}

// ========== 提交付款信息 + 检测状态 ==========
async function checkPaymentStatus() {
  if (!currentOrder) {
    showError('订单不存在，请重新下单');
    return;
  }

  const btn = $('checkPaymentBtn');
  btn.disabled = true;
  btn.textContent = '提交中...';

  try {
    await api('/api/payment-submitted', {
      method: 'POST',
      body: JSON.stringify({
        orderId: currentOrder.orderId,
        contact: `${currentOrder.name} | ${currentOrder.email} | ${currentOrder.phone}`,
        amount: currentOrder.amount
      })
    });

    btn.textContent = '核对中...';
    startPolling();
  } catch (err) {
    showError(err.message || '提交失败');
    btn.disabled = false;
    btn.textContent = '🔄 检测支付状态';
  }
}

// ========== 轮询订单状态 ==========
function startPolling() {
  clearInterval(pollInterval);
  let tries = 0;
  const maxTries = 60;

  const poll = async () => {
    tries++;
    try {
      const data = await api(`/api/order-status?orderId=${encodeURIComponent(currentOrder.orderId)}`);

      if (data.status === 'paid') {
        clearInterval(pollInterval);
        clearInterval(countdownInterval);
        await finishDelivery();
        return;
      }

      if (data.status === 'expired') {
        clearInterval(pollInterval);
        showError('订单已过期');
        const btn = $('checkPaymentBtn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🔄 检测支付状态';
        }
        return;
      }

      if (tries >= maxTries) {
        clearInterval(pollInterval);
        showError('核对超时，请联系客服 ' + CONFIG.supportTelegram);
        const btn = $('checkPaymentBtn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🔄 检测支付状态';
        }
      }
    } catch (err) {
      console.warn('轮询失败', err);
    }
  };

  poll();
  pollInterval = setInterval(poll, 5000);
}

// ========== 完成交付 ==========
async function finishDelivery() {
  try {
    const data = await api(`/api/delivery?orderId=${encodeURIComponent(currentOrder.orderId)}`);
    switchOrderStep(3);

    if (data.deliveryUrl) {
      const box = document.querySelector('#orderStep3 .info-box');
      if (box) {
        const linkEl = document.createElement('div');
        linkEl.style.marginTop = '12px';
        linkEl.innerHTML = `<a href="${data.deliveryUrl}" target="_blank" style="color:#46efc0;font-weight:700;">点击获取资源 →</a>`;
        box.appendChild(linkEl);
      }
    }
  } catch (err) {
    switchOrderStep(3);
    showError('交付链接获取失败，请联系客服 ' + CONFIG.supportTelegram);
  } finally {
    const btn = $('checkPaymentBtn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 检测支付状态';
    }
  }
}

// 暴露给 HTML 调用
window.openOrder = openOrder;
window.closeOrder = closeOrder;
window.switchOrderStep = switchOrderStep;
window.proceedToPayment = proceedToPayment;
window.copyWallet = copyWallet;
window.checkPaymentStatus = checkPaymentStatus;