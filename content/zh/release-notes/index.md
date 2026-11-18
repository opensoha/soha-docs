---
title: 发布说明与版本策略
description: 定义 OpenSoha 文档版本、发布说明、兼容矩阵、升级和回滚记录的维护规则。
---

# 发布说明与版本策略

OpenSoha 的 release notes 是发布闭环的一部分。每个对外版本组合必须能回答四个问题：

- 发布了哪些仓库、tag、package、binary、image、chart 或文档产物。
- 哪些契约、SDK、Core（含同提交内嵌 Web）、CLI、Agent、Skills、Connectors 与 Operator 产物是兼容组合。
- 升级前需要确认什么，失败后如何回滚。
- 哪些验证证据来自本地或 CI，哪些来自已公开的 GitHub Release、npm、GHCR、Helm 仓库或公网部署验收。

## 文档版本策略

当前文档站发布 current docs。Nextra 版本快照策略应在真实版本切分时创建，而不是在日常开发变更中提前冻结。

创建版本快照时必须同时记录：

- Git tag，例如 `docs-v0.1.0`。
- 对应主仓 `opensoha/soha`（Core、Web、Contracts、CLI、Agent、Skills、Connectors）与独立仓（如 `soha-operator`、`soha-helm`）的标签或提交。
- `DOCS_SITE_URL`、`DOCS_BASE_URL` 和 locale routing 配置。
- docs host deployment URL。
- 发布后 smoke 结果。

## Release Notes 规则

每个 release notes 页面必须包含：

- Release scope（发布范围）。
- Artifact matrix（公开产物矩阵）。
- Compatibility matrix（兼容矩阵）。
- Upgrade notes（升级顺序与前置条件）。
- Rollback notes（回滚边界与不可变产物约束）。
- Verification evidence（校验与发布证据）。
- Known gaps（待发布 chart 或未完成项）。

如果某项远端产物或公网部署尚未完成（例如待发布的 Helm chart 或外部 Vercel 生产验收），必须明确标为待发布 / pending，不得用本地构建测试替代真实发布证明。

## 兼容矩阵形状

| 组件 | 版本或标签形态 | 必需证据 |
| --- | --- | --- |
| Contracts（`opensoha/soha` `contracts/`） | `contracts/v*` + npm 版本 | npm 签名发布、Go 子模块标签与 proxy 校验、GitHub Release 附件 |
| Core 与内嵌 Web（`opensoha/soha`） | `v*` | 固定的已发布 Contracts 依赖、同提交 Web 构建与摘要、二进制 checksum、公开 manifest 与 GHCR 镜像校验；Web dist 为 Actions 构建产物，不承诺独立 Release 附件 |
| CLI（`opensoha/soha` `cli/`） | `cli/v*` + `@opensoha/cli` 版本 | 多平台归档与 checksum、签名 npm 启动器、干净缓存 `npx` 安装验证、GHCR 镜像 |
| Agent 与运行时（`opensoha/soha` `agent/`） | `agent/v*` | 多平台归档与 checksum、Agent / DSH / Buildpacks / Volume Reader 多架构 GHCR 镜像校验 |
| Skills（`opensoha/soha` `skills/`） | `skills/v*` | 资产归档、manifest、校验报告与签名 |
| Connectors（`opensoha/soha` `connectors/`） | `connectors/v*` | 运行时包校验、manifest 清单与签名 |
| Operator（`opensoha/soha-operator`） | `v*` | Kustomize 发布清单、多架构 GHCR 镜像与 CRD/控制器验证 |
| Helm Charts（`opensoha/soha-helm`） | `<chart>-*` | 引用镜像可获取性校验、OCI/GitHub Release 包与 `gh-pages` 索引 |

六个原独立组件仓库已归档退役，仅保留历史只读记录；新发布统一核对上表所属仓库。

## 生成式 API Reference 路径

手写 API 说明与生成的 [`/docs/api/reference/generated/`](../api/reference.md) 索引均对照固定提交的主仓 `../soha/contracts`（当前固定 `contracts/v0.2.0`）进行校验。契约变更后通过 `npm run api:reference:generate` 更新双语生成索引，并由 CI 执行 `npm run api:reference:check` 与契约一致性门禁。
