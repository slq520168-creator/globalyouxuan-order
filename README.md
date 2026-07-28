# AI实战资源中心 - 完整订单系统

🎉 **完全自动化的资源销售系统** - 支付→发货→下载 全自动

---

## 📦 系统包含

- ✅ **shop.html** - 4个商品分类首页（美观响应式设计）
- ✅ **order.js** - 订单逻辑系统（信息收集、支付、倒计时）
- ✅ **service.js** - 邮件服务 + 支付监控 + 订单管理
- ✅ **README.md** - 完整文档（本文件）

---

## 🚀 快速开始

### 第1步：本地测试

1. 在浏览器中打开 `shop.html`
2. 点击任意商品 → "进入购买"
3. 填写信息 → "下一步：支付"
4. 复制钱包地址，看倒计时
5. 点击 "检测支付状态"（模拟支付）
6. 完成后会跳到第3步

### 第2步：部署上线

```bash
# 1. 复制所有文件到你的服务器
cp shop.html order.js service.js /var/www/html/

# 2. 配置域名指向（可选）
# https://your-domain.com/shop.html

# 3. 配置 HTTPS（建议）
# 邮件和支付需要 HTTPS
```

---

## 💰 商品配置

目前配置的 4 个商品：

| 商品 | 价格 | 资源数 |
|------|------|--------|
| **💼 AI办公** | 9.9 USDT | 6个 |
| **🎨 AI创作** | 19.99 USDT | 8个 |
| **🚀 AI商业** | 29.99 USDT | 10个 |
| **⚙️ AI自动化** | 19.99 USDT | 8个 |

**修改价格：** 编辑 `order.js` 第 6-44 行的 `CONFIG.products` 对象

---

## 💳 支付配置

### 当前钱包地址
```
TKfQoN7kZirALGYxMkxU4SoqMWJRqXsh7k
```

**修改钱包地址：** 编辑 `order.js` 第 15 行

### 支持的币种
- ✅ **USDT-TRC20**（推荐，手续费最低）
- ⏳ 支持 USDT-ERC20（需要配置）
- ⏳ 支持 USDT-Polygon（需要配置）

---

## 📧 邮件系统

### 当前状态
- ⏳ **暂时使用本地模拟**（已记录到浏览器本地存储）
- ✅ 等你文件准备好后集成真实邮件服务

### 即将集成（3选1）

**方案A：SendGrid（推荐）**
```javascript
// 在 service.js 中添加
const SENDGRID_API_KEY = 'your-api-key';
// 使用 SendGrid 官方 API
```

**方案B：Mailgun**
```javascript
const MAILGUN_DOMAIN = 'your-domain';
const MAILGUN_API_KEY = 'your-key';
```

**方案C：阿里云邮件服务**
```javascript
const ALIYUN_ACCESS_KEY = 'your-key';
const ALIYUN_SECRET_KEY = 'your-secret';
```

---

## 🔍 支付监控

### 当前状态
- ⏳ **暂时使用模拟检测**（随机时间内模拟支付成功）
- ✅ 完全自动化，用户点击按钮立即触发

### 实时监控需要集成

**方案：TronWeb API**

```javascript
// 安装钱包插件
// Tronlink / TokenPocket

// 在页面加载时初始化
if (typeof window.tronWeb !== 'undefined') {
  // 自动监控 USDT 到账
  const result = await tronWeb.trx.getAccount(walletAddress);
}
```

---

## 📁 文件管理

### 当前状态
- ⏳ **暂时使用虚拟下载链接**
- ✅ 等你上传文件后自动配置

### 准备文件时

```
/downloads/
├── office/          (AI办公)
│   ├── 01.pdf
│   ├── 02.pdf
│   └── ...
├── creation/        (AI创作)
│   ├── 01.pdf
│   ├── 02.pdf
│   └── ...
├── business/        (AI商业)
│   └── ...
└── automation/      (AI自动化)
    └── ...
```

---

## 📊 订单数据

所有订单自动保存到浏览器本地存储：

```javascript
// 查看所有订单
const orders = JSON.parse(localStorage.getItem('gyx_orders'));
console.log(orders);

// 查看已发送的邮件
const mails = JSON.parse(localStorage.getItem('gyx_sent_mails'));
console.log(mails);
```

---

## 🔧 常见问题

### Q: 如何修改支付钱包？
A: 编辑 `order.js` 第 15 行 `wallet` 字段

### Q: 如何修改商品价格？
A: 编辑 `order.js` 第 6-44 行 `CONFIG.products`

### Q: 如何修改倒计时？
A: 编辑 `order.js` 第 17 行 `timeoutMinutes: 15`（改成你想要的分钟数）

### Q: 支付后如何自动发邮件？
A: 文件准备好后，集成邮件服务（SendGrid/Mailgun）

### Q: 如何导出订单数据？
```javascript
// 导出为 JSON
const data = localStorage.getItem('gyx_orders');
// 复制到记事本，保存为 .json 文件
```

---

## 🎯 接下来要做的事

**第1步：测试完整流程** ✅ 已完成

**第2步：上传文件资源**
- [ ] 整理资源文件
- [ ] 上传到服务器 `/downloads/` 目录
- [ ] 更新 `service.js` 的下载链接

**第3步：集成邮件服务**
- [ ] 申请 SendGrid/Mailgun 账号
- [ ] 获取 API Key
- [ ] 配置 `service.js`

**第4步：集成支付监控**
- [ ] 配置 TronWeb API
- [ ] 自动监控 USDT 到账

**第5步：上线推广** 🚀
- [ ] 部署到服务器
- [ ] 配置 HTTPS
- [ ] 开始打广告

---

## 📞 支持

- 客服邮箱：`客服@qqyousubot`
- 管理员邮箱：`slq520168@gmail.com`

---

**祝你生意兴隆！🎉**
