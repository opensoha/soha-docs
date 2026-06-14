---
title: 更新日志
description: 记录 OpenSoha current docs 中可本地验证的 release-facing 文档变更，不声明外部发布状态。
---

# 更新日志

本页只记录 current docs 中已经落地并可由本地 docs checks 验证的 release-facing 文档变化。真实 GitHub release、npm publish、镜像发布、docs host deployment 和公网 smoke 仍以对应 release notes 或发布验收记录为准；本页不推断外部发布状态。

## Unreleased

- Switched docs publishing notes and acceptance records to standard Next.js hosting with official Nextra i18n routes.
- Added generated API reference route contract at [`/docs/api/reference/generated/`](../api/reference.md).
- Added tutorial entry pages for first deploy, cluster registration, delivery, AI Gateway MCP, and plugin installation.
- Added local docs drift checks covering sidebar entries, front matter, markdown links, tutorial command coverage, publish config, release notes, and pending OpenAPI management endpoint status.

## 0.1.x Beta

- See [OpenSoha 0.1.x Beta 发布说明草案](./v0-1-x.md).
- Release artifacts and public smoke evidence remain pending until real tags, packages, images, binaries, and docs host deployment records exist.
