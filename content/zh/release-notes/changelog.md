---
title: 更新日志
description: 记录 OpenSoha current docs 中可本地验证的 release-facing 文档变更，不声明外部发布状态。
---

# 更新日志

本页只记录 current docs 中已经落地并可由本地 docs checks 验证的 release-facing 文档变化。真实 GitHub Release、npm publish、镜像发布、docs host deployment 和公网 smoke 仍以对应 release notes 或发布验收记录为准；本页不推断外部发布状态。

## Unreleased

- 同步主仓 `opensoha/soha` 合仓后的版本说明、部署示例与已退役旧独立仓库说明，对齐已公开的 Contracts `0.2.0`、Core `v0.1.13`、CLI `v0.2.1`、Agent `v0.2.0`、Skills `v0.1.4`、Connectors `v0.1.1` 与 Operator `v0.1.1`。
- 修正文档站编辑与反馈仓库链接至 `opensoha/soha-docs`，并补齐中英双语布局文案、页面描述与 `html lang` 同步。
- 将文档发布与验收说明切换为标准 Next.js 托管与官方 Nextra i18n 路由。
- 新增基于 `../soha/contracts` 自动生成的 API 参考索引 [`/docs/api/reference/generated/`](../api/reference.md)。
- 新增首次部署、首次接入集群、首次交付、首次接入 AI Gateway MCP 与首次安装插件五篇入门教程及预期输出校验。
- 新增覆盖侧栏导航、front matter、Markdown 链接、教程命令覆盖、发布配置、发布说明与待纳入 OpenAPI 管理端点的本地防漂移门禁。

## 0.1.x Beta

- 各组件公开版本矩阵、升级顺序与回滚边界见 [OpenSoha 0.1.x 发布说明](./v0-1-x.md)。
- 文档站外部 Vercel 生产部署与公网域名 smoke 记录仍待首次远端发布完成后回填至 [文档发布验收记录](../operations/docs-publish-acceptance.md)。
