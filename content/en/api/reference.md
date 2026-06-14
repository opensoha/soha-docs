---
title: API Reference 生成路径
description: 定义 OpenSoha API reference 的生成输入、输出路径和发布验收边界。
---

# API Reference 生成路径

OpenSoha 当前 API 文档包含手写叙述页面和由 contracts artifact 生成的 reference index。Docs tests 会对 `../soha-contracts` 中的 OpenAPI 和 JSON Schema artifact 做一致性校验，并检查生成页面没有漂移。

- Generated reference: [`/docs/api/reference/generated/`](./reference/generated/index.md)
- Source command: `npm run api:reference:generate`
- Drift check: `npm run api:reference:check`

## Source Inputs

生成器只消费发布契约源：

- `../soha-contracts/openapi/soha-api.yaml`
- `../soha-contracts/*/*.schema.json`
- `../soha-contracts/examples/**`
- `api/reference/route-metadata.overlay.json`，用于为已覆盖核心 route 补充实现状态、权限、scope、审计说明和 examples。

The generator must not read `soha-web` or runtime implementations as the public API source of truth.

## Generated Output Contract

当前生成产物包含：

- operation index。
- request/response schema refs。
- JSON Schema artifact index。
- `api/reference/route-metadata.overlay.json` 中已落地的核心 route metadata overlay 切片，用于在 generated reference 中补充实现状态、权限、scope、审计说明和 examples。

## 当前状态

当前 release 范围承诺稳定路径、source input contract、operation/schema index renderer，以及首批 AI Gateway 核心 route metadata overlay。后续可以继续扩展 overlay 覆盖率，用于补充更多 route 的 compatibility 和 deprecation notes。
