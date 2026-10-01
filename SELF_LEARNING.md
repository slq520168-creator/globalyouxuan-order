# 五轮搜索 / 在线客服 自我学习闭环

状态：2026-10-02 按安全审查 #4 #5 #11 #12 修订后**已上线**（迁移已执行、learn-gap-worker 已部署、两个 cron 已启用、前端已合并到 main）。

## 闭环怎么转

1. **记录**（前台 `learning-loop.js`，无界面）
   - 五轮搜索：第 1 轮搜到几条、几条合格、用了几个兜底；后面某轮凑不满 5 个方向；走完 5 轮时选了哪些资料。
   - 在线客服（首页注册客服 + 会员资料客服）：每个问题、用什么答的（规则 / 知识库 / 没答上）、用户紧接着说“还是不行”就记“没帮上”。
   - 手机号、邮箱、长串 ID 在库里自动打码。
   - 限流 / 去重用服务端可信身份 `learn_actor()`：登录用户 = `auth.uid()`，匿名 = Cloudflare `cf-connecting-ip` 加盐哈希；浏览器 session_id 不再参与限流。每个身份每小时 60 条搜索日志 / 40 条客服日志，全站每分钟最多 300 条。
2. **找缺口**（`learn_refresh_gaps()`，每小时）：没搜到 / 搜得差 / 没答上 / 被说没用的问题，**至少 3 个不同身份**报告才进 `learn_gaps`。已解决但还在失败的自动重开。
3. **自己去找**（Edge Function `learn-gap-worker`，每 30 分钟）
   - 搜索缺口：站内近似词（错别字）→ 维基百科摘要（免费）→ 免费 AI（现有 `globalyouxuan-ai` Worker）只许从站内词表挑词 → **用真实搜索 RPC 验证**结果变多才收下 → 写 `learn_synonyms`。已上线 / 已停用 / 管理员录入的同义词**不会被覆盖**（转人工 `synonym_conflict`）。
   - 喂给 AI 之前、AI 输出之后都会去掉外链、TG/微信/WhatsApp 号、钱包地址、邮箱、电话（只保留官方 @qqyousubot / slq520168@gmail.com）。
   - 站内确实没有资料：写一条“资料草稿”（`learn_kb.kind = material_draft`，带来源链接），给管理员决定要不要补进资料库。
   - 客服缺口：AI 只依据“站点事实 + 已审核问答”起草中/英/柬答案；不知道就交人工。**所有 AI 客服答案永远 pending、人工审核**（没有自动上线开关）；涉及钱或联系方式的标高风险。
4. **从成功会话里学**（`learn_mine_synonyms()`）：只统计**登录用户**，且**至少 5 个不同用户**——第 1 轮没搜好、但用户手动走完 5 轮的问题 → 用户选中资料的关键词 = 这个问题的同义扩展。
5. **用上**：五轮搜索 `intent()` 自动合并已启用同义词；客服先走原规则，规则答不了再查已启用知识库，仍没有才出原来的兜底话术。

## 安全阀

- 学到的东西默认 `pending`，管理员 `learn_admin_set_status` 启用；只有同义词有 `auto_activate_synonyms` 开关（默认关），客服答案永远人工。
- 每次修改自动存版本（`learn_history`），`learn_admin_rollback(表, id, 版本)` 回滚。
- 客服答案的 kb_id 只认服务端 10 分钟内真的返回给同一身份的那条（`learn_support_served`）；“没用”票按身份去重（`learn_kb_votes`），每个身份每天 ≤20 票、每条答案每天 ≤10 票；非管理员答案被 ≥5 个身份说没用且超过一半才自动不再出，管理员录入的答案不会被刷下线。
- 一键全停：`update learn_synonyms set status='disabled' where status='active'; update learn_kb set status='disabled' where status='active';`
- 迁移没执行时，前台 RPC 不存在 → 一次探测后静默停用，原有搜索和客服完全不受影响。
- 不碰：订单、付款、交付、商品价格、`product_answer_options`、现有 Edge Functions。

## 上线记录（2026-10-02）

1. 执行 `supabase/migrations/20261002120000_self_learning_search_support.sql`（已修订）
2. 执行 `supabase/migrations/20261002120100_self_learning_schedule.sql`：在数据库内随机生成 Vault 密钥 `gyx_learn_worker_secret` + 两个 cron
3. 部署 `supabase/functions/learn-gap-worker`（`verify_jwt = false`，靠 `x-learn-secret` + 常量时间比较鉴权）
4. 前端合并到 main（shop.html / member 页脚本版本号已更新）
5. 管理员查看：`select public.learn_admin_overview(50);`
