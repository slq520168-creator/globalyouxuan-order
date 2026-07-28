// ========== 邮件服务配置 ==========
// 支持 SendGrid、Mailgun、Gmail SMTP 等

const MAIL_SERVICE = {
  // 邮件模板
  templates: {
    orderConfirm: (order) => ({
      to: order.email,
      subject: `订单确认: ${order.id}`,
      html: `
        <h2>订单确认</h2>
        <p>亲爱的 ${order.name},</p>
        <p>感谢您的购买！您的订单已创建：</p>
        <ul>
          <li>订单号: ${order.id}</li>
          <li>商品: ${order.productName}</li>
          <li>金额: ${order.price} USDT</li>
          <li>时间: ${new Date(order.createdAt).toLocaleString('zh-CN')}</li>
        </ul>
        <p>请在15分钟内完成支付。支付地址将在确认页显示。</p>
      `
    }),
    
    delivery: (order, downloadLink) => ({
      to: order.email,
      subject: `【已发货】${order.productName} - 立即下载`,
      html: `
        <h2>🎉 发货通知</h2>
        <p>亲爱的 ${order.name},</p>
        <p>您购买的 <strong>${order.productName}</strong> 已准备好！</p>
        <p style="margin: 20px 0;">
          <a href="${downloadLink}" style="
            display: inline-block;
            padding: 12px 24px;
            background: #46efc0;
            color: #07111f;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
          ">📥 点击下载</a>
        </p>
        <p style="color: #666; font-size: 13px;">
          链接有效期：24小时<br>
          如有问题，请联系客服: 客服@qqyousubot
        </p>
      `
    })
  },

  // 发送邮件（集成点）
  async send(mailData) {
    console.log('📧 [邮件服务] 准备发送邮件:', mailData);
    
    // TODO: 集成真实邮件服务
    // 1. SendGrid API
    // 2. Mailgun API  
    // 3. Gmail SMTP
    // 4. 自定义 SMTP 服务器
    
    // 暂时使用本地存储模拟
    let sentMails = [];
    try {
      const stored = localStorage.getItem('gyx_sent_mails');
      sentMails = stored ? JSON.parse(stored) : [];
    } catch (e) {}
    
    sentMails.push({
      ...mailData,
      sentAt: new Date().toISOString()
    });
    localStorage.setItem('gyx_sent_mails', JSON.stringify(sentMails));
    
    console.log('✅ [邮件服务] 邮件已记录:', mailData.to);
    return { success: true, messageId: 'msg-' + Date.now() };
  }
};

// ========== 支付监控系统 ==========
const PAYMENT_MONITOR = {
  
  // TronWeb 实例
  tronWeb: null,
  
  // 初始化
  async init() {
    if (typeof window.tronWeb !== 'undefined') {
      this.tronWeb = window.tronWeb;
      console.log('✅ TronWeb 已连接');
    } else {
      console.warn('⚠️ TronWeb 未安装，支付监控功能将受限');
    }
  },
  
  // 检测单笔支付
  async checkPayment(walletAddress, amount, maxWaitSeconds = 60) {
    console.log(`🔍 [支付监控] 检测支付:`, { walletAddress, amount, maxWaitSeconds });
    
    if (!this.tronWeb) {
      console.warn('⚠️ TronWeb 未连接，使用模拟检测');
      return await this.simulatePayment(walletAddress, amount, maxWaitSeconds);
    }
    
    try {
      // 实际支付检测逻辑
      const result = await this.queryBlockchain(walletAddress, amount);
      return result;
    } catch (error) {
      console.error('❌ [支付监控] 检测失败:', error);
      throw error;
    }
  },
  
  // 查询区块链
  async queryBlockchain(walletAddress, amount) {
    // TODO: 实现真实的 TronWeb API 调用
    // 1. 获取最新区块
    // 2. 遍历交易列表
    // 3. 检查是否有匹配的 USDT 转账
    
    return { found: false, txid: null };
  },
  
  // 模拟支付检测（用于测试）
  async simulatePayment(walletAddress, amount, maxWaitSeconds) {
    return new Promise((resolve) => {
      console.log(`⏳ [支付监控] 模拟检测中...（${maxWaitSeconds}秒）`);
      
      // 随机在指定时间内"检测到"支付
      const randomDelay = Math.random() * maxWaitSeconds * 1000;
      setTimeout(() => {
        const mockTxid = 'MOCK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        console.log('✅ [支付监控] 模拟检测到支付:', mockTxid);
        resolve({
          found: true,
          txid: mockTxid,
          amount: amount,
          timestamp: new Date().toISOString()
        });
      }, randomDelay);
    });
  }
};

// ========== 订单管理系统 ==========
const ORDER_SERVICE = {
  
  // 处理订单支付
  async handlePaymentSuccess(order, paymentInfo) {
    console.log('💰 [订单服务] 处理支付成功:', order.id);
    
    try {
      // 1. 更新订单状态
      order.status = 'paid';
      order.paidAt = new Date().toISOString();
      order.paymentInfo = paymentInfo;
      
      // 2. 保存订单
      this.saveOrder(order);
      
      // 3. 生成下载链接（等文件准备好后实现）
      const downloadLink = this.generateDownloadLink(order);
      
      // 4. 发送发货邮件
      const mailData = MAIL_SERVICE.templates.delivery(order, downloadLink);
      await MAIL_SERVICE.send(mailData);
      
      // 5. 通知管理员
      await this.notifyAdmin(order, paymentInfo);
      
      console.log('✅ [订单服务] 订单处理完成');
      return { success: true, downloadLink };
    } catch (error) {
      console.error('❌ [订单服务] 处理失败:', error);
      throw error;
    }
  },
  
  // 生成下载链接
  generateDownloadLink(order) {
    // TODO: 集成文件管理系统
    // 1. 从云存储获取文件
    // 2. 生成临时下载链接
    // 3. 设置过期时间
    
    const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
    return `/downloads/${order.productId}?token=${token}`;
  },
  
  // 保存订单
  saveOrder(order) {
    let orders = [];
    try {
      const stored = localStorage.getItem('gyx_orders');
      orders = stored ? JSON.parse(stored) : [];
    } catch (e) {}
    
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      orders[index] = order;
    } else {
      orders.push(order);
    }
    localStorage.setItem('gyx_orders', JSON.stringify(orders));
  },
  
  // 获取订单
  getOrder(orderId) {
    let orders = [];
    try {
      const stored = localStorage.getItem('gyx_orders');
      orders = stored ? JSON.parse(stored) : [];
    } catch (e) {}
    return orders.find(o => o.id === orderId);
  },
  
  // 通知管理员
  async notifyAdmin(order, paymentInfo) {
    console.log('📢 [订单服务] 通知管理员:', order.id);
    
    // TODO: 发送管理员通知邮件
    // 包含订单详情、客户信息等
  }
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 [初始化] AI资源中心订单系统已就绪');
  await PAYMENT_MONITOR.init();
});

// 暴露到全局作用域
window.MAIL_SERVICE = MAIL_SERVICE;
window.PAYMENT_MONITOR = PAYMENT_MONITOR;
window.ORDER_SERVICE = ORDER_SERVICE;
