# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
Entries discovered by the Agent during task execution should follow this format:

[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Project Knowledge Summary]
- Date: 2026-09-17
- Context: Discovered by Agent while restoring a deleted static asset during a security/repair task
- Category: Troubleshooting & Debugging
- Instructions:
  - 生产站点 https://globalyouxuan-order.pages.dev 从本执行环境不可达（IPv4/IPv6 连接均超时），不能依赖它取回线上资源；GitHub 与 cdn.jsdelivr.net 可达。
  - 仓库 main 分支可能缺少仅存在于未合并分支的文件。恢复方式：先执行 `git fetch origin '+refs/heads/*:refs/remotes/origin/*'`，再用 `git log --all -- <file>` 定位提交、用 `git show <commit>:<file>` 取回内容。
  - 恢复被删除的静态资源后，必须同步更新引用处的 `?v=` 版本号，以绕过 `_headers` 中 `*.js` 的 immutable 缓存（可能已缓存此前的 404）。
  - Supabase Edge Functions 仓库只跟踪部分函数（如 admin-api、member-cloud-chat 均为远程部署，仓库无源码）。验证某函数是否已部署：`curl -X POST https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/<name>`，返回 401 需鉴权即代表函数存在，404 才是未部署。
  - 本仓库克隆曾是浅克隆（shallow），`merge-base`/`rev-list --count` 会把"分叉点"误算成最近一次 fetch 的浅截断点，导致分支领先提交数虚高（显示 2000+ 实际只有 1）。分析分支前先 `test -f .git/shallow`，必要时 `git fetch origin --unshallow`。
  - 分支治理决策（2026-09-21）：已归档删除 4 个过时分支（tag 前缀 `archive/`）：usdt 付款页（硬编码旧钱包地址，有害）、sitewide-i18n 与 search-i18n（内容被 main 超越/策略已被 revert）、worker-name（已被合并覆盖）。main 的既定策略：后台改中文时清空 en/km 翻译字段（见 admin-fixed-card-answers.js），搜索显示层本地化曾被 revert（8d9a3ba），勿重新引入。
  - 秒开体系（2026-09-21，073efc1）：sw.js 为推送+预缓存混合 Worker（VERSION 常量控制缓存代际，改动预缓存清单必须同步升 VERSION）；speed-boost.js 全站注册 SW 并做导航预取，注入方式为紧跟 i18n.js 的 script 标签；两者与 sw.js 同样设 no-cache（_headers 已配）。用户提供的 GitHub classic token 用于推送（https://github.com/settings/tokens），凭据助手 500 时用 `-c credential.helper= -c credential.helper='!f(){...}; f'` 方式带 token 推送。
  - AI 翻译端点：`https://globalyouxuan-ai.slq520168.workers.dev/api/chat`（用户自有 CF Worker，本执行环境访问不通属网络限制，浏览器端正常）。请求体 `{messages:[{role,content}]}`，响应解析顺序 response/reply/text/content/message/output/answer/choices[0].message.content，纯文本也可。face-translate 页（7e34b14）与 answer-auto-translate 函数共用该端点；新外呼端点必须同步加进 _headers 的 CSP connect-src。
