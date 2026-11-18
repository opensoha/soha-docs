---
title: API Reference 生成路径
description: 定义 OpenSoha API 参考文档的生成输入、输出路径、契约分发方式和发布验收边界。
---

# API Reference 生成路径

OpenSoha 当前的公开 API 文档由两部分协同组成：手写专题说明页面，以及根据公开契约工件自动生成的参考索引页面。手写页面负责解释认证模型、权限边界、关键调用流程与典型载荷示例；自动生成的参考索引负责提供完整的 OpenAPI 操作清单与 JSON Schema 工件覆盖。文档站测试套件会直接对照 `../soha/contracts` 校验契约一致性，并检查中英文两个语言目录（`content/zh` 与 `content/en`）下的生成页面不存在漂移或遗漏。

- 生成索引（Generated reference）：[`/docs/api/reference/generated/`](./reference/generated/index.md)
- 生成命令：`npm run api:reference:generate`
- 漂移检查：`npm run api:reference:check`

执行生成命令会同时渲染并更新 `content/en` 和 `content/zh` 下的生成式参考索引文件；发布前必须运行漂移检查确认磁盘产物与当前检出的契约版本完全一致，禁止手改 `generated/` 目录中的输出文件。

## 生成输入源

文档生成器严格限定只读取已纳入公开契约边界的输入源：

- `../soha/contracts/openapi/soha-api.yaml`：公开 HTTP API 的主 OpenAPI 规范文件。
- `../soha/contracts/*/*.schema.json`：按领域导出的公开 JSON Schema 契约工件。
- `../soha/contracts/examples/**`：供路由元数据引用的标准请求与响应契约示例。
- `api/reference/route-metadata.overlay.json`：由文档仓库维护的核心路由元数据叠加层，用于为已覆盖路由补充实现状态、所需权限键、资源范围（Scope）、审计记录行为以及调用示例引用。

生成器不得读取主仓 `soha/web` 前端代码或后端内部运行时实现来推断公开 API，避免未契约化的内部路由进入公开参考索引。

## 契约分发渠道

除浏览文档站外，集成方与自动化工具也可以不运行文档生成器，直接消费同一版本的已发布契约工件：

- npm 包：通过 `@opensoha/contracts/openapi/soha-api.yaml` 和 `@opensoha/contracts/openapi/soha-api.json` 获取原始与编译后的 OpenAPI 规范，或按子路径导入各领域 JSON Schema。
- Go 模块：通过 `github.com/opensoha/soha/contracts/openapi` 读取内嵌的 YAML/JSON 字节内容、契约版本号和 SHA-256 摘要元数据。
- 运行中的 Soha 服务端：在配置中显式启用 Swagger 后，可直接访问 `/swagger/openapi.yaml` 和 `/swagger/openapi.json`。

服务端契约响应固定附带 `X-Soha-Contracts-Version` 与 `X-Soha-Contracts-SHA256` 响应头，便于客户端核验服务端加载的契约版本。Soha 直接返回随版本发布的契约工件原文，不会在运行时动态拼装第二份规范。

## 生成产物契约

当前自动生成的参考索引页面固定包含以下结构化内容：

- 按 OpenAPI 标签分组的操作索引（Operation Index）与操作标识符（`operationId`）。
- 每个接口关联的请求体与响应体 Schema 引用列表。
- 全量导出的 JSON Schema 工件索引（包含文件路径、标题、`$id` 与必填字段）。
- 来自 `api/reference/route-metadata.overlay.json` 的核心路由元数据叠加切片，在对应路由条目下展示实现状态、权限要求、作用范围、兼容性与弃用说明、审计行为及示例路径。

## 当前发布边界与演进范围

当前发布版本承诺稳定的生成输出路径、明确的契约输入源边界、确定性的操作与 Schema 索引渲染规则，以及 AI Gateway 等核心路由的元数据叠加能力。后续版本可在不改变生成路径与校验机制的前提下，持续扩大路由元数据叠加层的覆盖面，为更多公开接口补充跨版本兼容性说明与弃用迁移指引。
