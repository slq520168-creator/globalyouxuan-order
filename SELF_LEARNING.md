# 五轮搜索 / 在线客服 自我学习闭环

状态：代码在分支 `feat/self-learning-search-support`，**未推送、未部署、迁移未执行**。

## 闭环怎么转

1. **记录**（前台 `learning-loop.js`，无界面）
   - 五轮搜索：第 1 轮搜到几条、几条合格、用了几个兜底；后面某轮凑不满 5 个方向；走完 5 轮时选了哪些资料。
   - 在线客服（首页注册客服 + 会员资料客服）：每个问题、用什么答的（规则 / 知识库 / 没答上）、用户紧接着说“还是不行”就记“没帮上”。
   - 手机号、邮箱、长串 ID 在库里自动打码；每个会话每小时有上限。
2. **找缺口**（`learn_refresh_gaps()`，每小时）：没搜到 / 搜得差 / 没答上 / 被说没用的问题进 `learn_gaps`。已解决但还在失败的自动重开。
3. **自己去找**（Edge Function `learn-gap-worker`，每 30 分钟）
   - 搜索缺口：站内近似词（错别字）→ 维基百科摘要（免费）→ 免费 AI（现有 `globalyouxuan-ai` Worker）只许从站内词表挑词 → **用真实搜索 RPC 验证**结果变多才收下 → 写 `learn_synonyms`。
   - 站内确实没有资料：写一条“资料草稿”（`learn_kb.kind = material_draft`，带来源链接），给管理员决定要不要补进资料库。
   - 客服缺口：AI 只依据“站点事实 + 已审核问答”起草中/英/柬答案；不知道就交人工。涉及钱（付款/退款/到账/TXID/价格）一律标高风险，永远人工审核。
4. **从成功会话里学**（`learn_mine_synonyms()`）：第 1 轮没搜好、但用户手动走完 5 轮的问题 → 用户选中资料的关键词 = 这个问题的同义扩展。
5. **用上**：五轮搜索 `intent()` 自动合并已启用同义词；客服先走原规则，规则答不了再查已启用知识库，仍没有才出原来的兜底话术。

## 安全阀

- 学到的东西默认 `pending`，管理员 `learn_admin_set_status` 启用；`learn_settings` 里打开 `auto_activate_*` 才自动上线（钱相关客服答案永远不自动）。
- 每次修改自动存版本（`learn_history`），`learn_admin_rollback(表, id, 版本)` 回滚。
- 被说“没用” ≥3 次且超过一半的答案自动不再出。
- 一键全停：`update learn_synonyms set status='disabled' where status='active'; update learn_kb set status='disabled' where status='active';`
- 迁移没执行时，前台 RPC 不存在 → 一次探测后静默停用，原有搜索和客服完全不受影响。
- 不碰：订单、付款、交付、商品价格、`product_answer_options`、现有 Edge Functions。

## 上线步骤（需要确认后执行）

1. 执行 `supabase/migrations/20261002120000_self_learning_search_support.sql`
2. Vault 建密钥：`select vault.create_secret('<随机长字符串>', 'gyx_learn_worker_secret');`
3. 部署 `supabase/functions/learn-gap-worker`（`verify_jwt = false`，靠 `x-learn-secret` 鉴权）
4. 执行 `supabase/migrations/20261002120100_self_learning_schedule.sql`（两个 cron）
5. 合并前端（shop.html / member 页脚本版本号已更新）
6. 管理员查看：`select public.learn_admin_overview(50);`
