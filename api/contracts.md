# API 与 Contracts

`soha-contracts` 是跨仓库共享契约源头。任何影响公开行为、wire shape、Agent protocol、MCP manifest、Skill manifest、Plugin manifest、事件 envelope 或鉴权 claims 的变更，都应先进入 contracts，再更新消费者仓库。

## 契约目录

推荐结构：

```text
soha-contracts/
  openapi/
    soha-api.yaml
  agent/
    agent-protocol.schema.json
  mcp/
    gateway-manifest.schema.json
  skills/
    skill-manifest.schema.json
  plugins/
    plugin-manifest.schema.json
  events/
    event-envelope.schema.json
  auth/
    token-claims.schema.json
```

## 稳定入口

SDK import 路径应保持稳定：

```text
github.com/opensoha/soha-contracts/gen/go/sohaapi
@opensoha/contracts/gen/ts/sohaapi
```

消费者可以逐步从本地 DTO 迁移到生成 SDK，但不应复制跨仓库业务逻辑。

## 依赖方向

- `soha` 依赖 `soha-contracts`，不依赖 `soha-cloud`。
- `soha-web` 通过 TypeScript SDK 和 HTTP API 访问 core。
- `soha-cli` 通过 Go SDK DTO / client 和 HTTP API 访问 core。
- `soha-agent` 通过 Agent protocol 和 generated SDK client 访问 runner-facing API。
- `soha-cloud` 通过公开包、API、SDK 或构建产物组合 core 能力。

## 校验

Contracts 仓库应持续校验：

- OpenAPI 语法。
- JSON Schema 语法。
- operation ID 唯一性。
- Go SDK 编译和测试。
- TypeScript SDK typecheck。
- `soha` 中公开 JSON wire shape 兼容测试。
