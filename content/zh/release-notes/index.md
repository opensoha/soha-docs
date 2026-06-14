---
title: 发布说明与版本策略
description: 定义 OpenSoha 文档版本、发布说明、兼容矩阵、升级和回滚记录的维护规则。
---

# 发布说明与版本策略

OpenSoha 的 release notes 是 beta 发布闭环的一部分。每个对外版本必须能回答四个问题：

- 发布了哪些仓库、tag、package、binary、image、chart 或文档产物。
- 哪些契约、SDK、CLI、Agent、Skills、Connectors 和 Web artifact 是兼容组合。
- 升级前需要确认什么，失败后如何回滚。
- 哪些验证证据来自本地或 CI，哪些仍依赖真实 GitHub release、npm publish 或公网 smoke。

## 文档版本策略

当前文档站仍发布 current docs。Nextra 版本快照策略应在真实 release cut 时创建，而不是在普通开发变更中提前冻结。

创建版本快照时必须同时记录：

- Git tag，例如 `docs-v0.1.0`。
- 对应 core、web、contracts、CLI、Agent、Skills、Connectors 和外部扩展切片的版本或 commit。
- `DOCS_SITE_URL`、`DOCS_BASE_URL` 和 locale routing 配置。
- docs host deployment URL。
- 发布后 smoke 结果。

## Release Notes 规则

每个 release notes 页面必须包含：

- Release scope。
- Artifact matrix。
- Compatibility matrix。
- Upgrade notes。
- Rollback notes。
- Verification evidence。
- Known gaps。

如果某项证据还没有真实远端记录，必须明确标为 pending，不得用本地测试替代真实发布证明。

## 兼容矩阵形状

| Component | Version or ref | Required evidence |
| --- | --- | --- |
| Contracts | npm version + Go tag | npm publish、Go module tag、GitHub release assets |
| Web | GitHub release tag | dist tarball、checksum、post-download verify |
| Core | GitHub release tag | pinned contracts/web inputs、binary checksum、manifest |
| CLI | GitHub release tag | release binary smoke、checksum、`soha add` install smoke |
| Agent | GitHub release tag | multi-arch binaries/images、checksum、release verify |
| Skills | GitHub release tag | package、manifest、validation report、install smoke |
| Connectors | package/release ref | package check、manifest registry、runtime smoke |
| External extension slices | private release ref | contracts dependency mode、migration/readiness checks |

## 生成式 API Reference 路径

Handwritten API docs remain checked against `../soha-contracts`, but generated reference output is reserved at [API Reference](../api/reference.md). The generated route is intentionally a publishing contract now; generator implementation can land independently once the release artifact shape is stable.
