// ========== 配置 ==========
const CONFIG = {
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
  supportEmail: '客服@qqyousubot',
  notifyEmail: 'slq520168@gmail.com'
};

// ========== 状态管理 ==========
let currentProduct = null;
let currentOrder = null;
let countdownInterval = null;

// ========== 打开订单弹窗 ==========
function openOrder(productId) {
  currentProduct = CONFIG.products[productId];
  if (!currentProduct) return;
  
  document.getElementById('modalTitle').textContent = `${currentProduct.emoji} ${currentProduct.name}`;
  document.getElementById('orderModal').classList.add('show');
  switchOrderStep(1);
  clearError();
}

// ========== 关闭订单弹窗 ==========
function closeOrder() {
  document.getElementById('orderModal').classList.remove('show');
  clearInterval(countdownInterval);
  currentOrder = null;
}

// ========== 切换步骤 ==========
function switchOrderStep(step) {
  document.querySelectorAll('.step-content').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.step-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`orderStep${step}`).classList.add('show');
  document.querySelectorAll('.step-btn')[step - 1].classList.add('active');
}

// ========== 验证表单 ==========
function validateForm() {
  const name = document.getElementById('orderName').value.trim();
  const email = document.getElementById('orderEmail').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  
  if (!name) {
    showError('请输入姓名');
    return false;
  }
  
  if (!email || !email.includes('@')) {
    showError('请输入正确的邮箱');
    return false;
  }
  
  if (!phone || phone.length < 7) {
    showError('请输入正确的电话');
    return false;
  }
  
  return { name, email, phone };
}

// ========== 前往支付 ==========
function proceedToPayment() {
  const form = validateForm();
  if (!form) return;
  
  // 创建订单
  const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  currentOrder = {
    id: orderId,
    productId: currentProduct.id,
    productName: currentProduct.name,
    price: currentProduct.price,
    name: form.name,
    email: form.email,
    phone: form.phone,
    status: 'pending',
    createdAt: new Date().toISOString(),
    wallet: CONFIG.wallet
  };
  
  // 保存订单
  saveOrder(currentOrder);
  
  // 更新支付界面
  document.getElementById('paymentName').textContent = form.name;
  document.getElementById('paymentPrice').textContent = currentProduct.price;
  document.getElementById('paymentOrderNo').textContent = orderId;
  document.getElementById('timerText').textContent = `${CONFIG.timeoutMinutes}:00`;
  
  // 更新完成界面
  document.getElementById('finalName').textContent = form.name;
  document.getElementById('finalEmail').textContent = form.email;
  document.getElementById('finalPhone').textContent = form.phone;
  document.getElementById('finalPrice').textContent = currentProduct.price;
  document.getElementById('finalOrderNo').textContent = orderId;
  document.getElementById('successEmail').textContent = form.email;
  
  // 启动倒计时
  startCountdown(CONFIG.timeoutMinutes * 60);
  
  // 切换到支付步骤
  switchOrderStep(2);
  clearError();
}

// ========== 启动倒计时 ==========
function startCountdown(seconds) {
  clearInterval(countdownInterval);
  
  const update = () => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    const display = `${m}:${s}`;
    
    document.getElementById('countdownDisplay').textContent = display;
    document.getElementById('timerText').textContent = display;
    
    if (seconds <= 0) {
      clearInterval(countdownInterval);
      currentOrder.status = 'expired';
      saveOrder(currentOrder);
      showError('订单已过期，请重新下单');
      setTimeout(() => switchOrderStep(1), 2000);
      return;
    }
    seconds--;
  };
  
  update();
  countdownInterval = setInterval(update, 1000);
}

// ========== 复制钱包地址 ==========
async function copyWallet() {
  try {
    await navigator.clipboard.writeText(CONFIG.wallet);
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ 已复制';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  } catch {
    showError('复制失败，请手动复制');
  }
}

// ========== 检测支付状态 ==========
async function checkPaymentStatus() {
  const btn = document.getElementById('checkPaymentBtn');
  btn.disabled = true;
  btn.textContent = '检测中...';
  
  try {
    // 模拟支付检测（实际需要集成 TronWeb API）
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 发送邮件
    await sendDeliveryEmail(currentOrder);
    
    // 标记支付完成
    currentOrder.status = 'completed';
    currentOrder.paidAt = new Date().toISOString();
    saveOrder(currentOrder);
    
    clearInterval(countdownInterval);
    switchOrderStep(3);
  } catch (error) {
    showError('检测失败: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 检测支付状态';
  }
}

// ========== 发送发货邮件 ==========
async function sendDeliveryEmail(order) {
  // TODO: 集成邮件服务 (SendGrid/Mailgun)
  console.log('📧 准备发送邮件:', {
    to: order.email,
    subject: `【订单 ${order.id}】${order.productName} 已发货`,
    items: CONFIG.products[order.productId].items
  });
  
  // 暂时返回成功（等文件准备好后集成真实邮件服务）
  return Promise.resolve();
}

// ========== 保存订单 ==========
function saveOrder(order) {
  let orders = [];
  try {
    const stored = localStorage.getItem('gyx_orders');
    orders = stored ? JSON.parse(stored) : [];
  } catch (e) {
    orders = [];
  }
  orders.push(order);
  localStorage.setItem('gyx_orders', JSON.stringify(orders));
  console.log('✅ 订单已保存:', order);
}

// ========== 显示错误 ==========
function showError(msg) {
  const $error = document.getElementById('orderError');
  $error.textContent = '❌ ' + msg;
  $error.classList.add('show');
  setTimeout(() => {
    $error.classList.remove('show');
  }, 5000);
}

// ========== 清除错误 ==========
function clearError() {
  document.getElementById('orderError').classList.remove('show');
}
