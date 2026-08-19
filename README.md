# GlobalYouXuan

GlobalYouXuan 当前为真实线上业务架构，核心由 GitHub 前端、Supabase 数据/Auth/Edge Functions 与 Cloudflare AI/部署链组成。

## 当前前台

- `shop.html`：首页、AI 五轮匹配、固定四模块、统一下单弹窗
- `login.html`：会员登录/注册入口
- `forgot-password.html` / `reset-password.html`：找回密码
- `member.html`：会员资料、收藏、搜索记录、订单、交付内容
- `index.html`：统一跳转到 `shop.html`
- `order.html`：旧订单入口已退役，统一跳转到 `shop.html`，不再存在独立固定价格订单流程

## 当前数据与业务链

- Supabase Auth：真实注册、登录、会话、密码重置
- Supabase Database：会员资料、产品、问答资料库、搜索历史、收藏、订单、支付、交付、通知队列、翻译缓存
- Supabase RLS：用户数据按 `auth.uid()` 隔离
- Edge Function `create-order`：创建真实订单
- Edge Function `submit-payment`：提交 TXID
- Edge Function `verify-payments`：核验 TRON USDT-TRC20 链上交易、金额、合约和收款地址
- Edge Function `claim-answer-download`：校验会员身份并一次性领取已购买方案交付内容
- Edge Function `answer-auto-translate`：仅为缺少审核译文的订单生成交付译文
- Edge Function `download-order`：文件型产品交付
- Edge Function `notification-worker`：Telegram 通知队列处理
- Edge Function `wealth-search-lab`：AI 五轮搜索主链

## 支付规则

订单价格从 `products` 表实时读取，不在前端写死。前端不能直接把订单标记为已付款；付款结果由服务端核验链上交易后更新。

当前网络：USDT-TRC20。

## 搜索

AI 搜索执行 5 轮选择并生成最终方案；后台回归测试要求每轮 5 个方向、本地 Supabase 资料参与、方向不重复、维度逐轮推进，并生成第 6 轮总结方案。

## 多语言

前台支持：

- 简体中文 `zh-CN`
- English `en`
- ភាសាខ្មែរ `km`

所有固定可见文案只由 `i18n.js` 与 `i18n-member.js` 两份主词表负责，并通过 `GYXI18N` 读取；缺少当前语言的 key 时回退中文并记录日志。页面和业务脚本不得维护内联中/英/柬对象或第二套翻译函数。

方案交付内容以 `product_answer_options` 为唯一审核数据源。已有完整合格译文时直接使用；缺少译文时由 `answer-auto-translate` 写入 `order_delivery_translation_cache`，最终不可用时由 `claim-answer-download` 记录日志并交付中文回退，不得因缺译中断页面。交流天地的动态项目原文也只由 `answer-auto-translate` 翻译，结果缓存到对应兑换记录，不再维护独立翻译函数或翻译表。

## 安全原则

- 浏览器仅使用 Supabase publishable key
- service role / secret key 仅存在服务端 Edge Functions
- 订单、支付、会员资料受 RLS/服务端校验保护
- TXID 必须匹配 USDT 合约、指定收款地址和订单精确金额
- 通知队列领取函数仅允许服务端角色执行

## 部署

正式部署应保持 GitHub / Supabase / Cloudflare 三部分配置一致。部署后重点验收：登录、密码找回、五轮搜索、固定模块、收藏、下单、TXID 核验、会员订单、交付内容、中英柬切换、浅色/深色和移动端 Safari。
