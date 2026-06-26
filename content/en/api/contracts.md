# API 与 Contracts

`soha-contracts` 是跨仓库共享契约源头。任何影响公开行为、wire shape、Agent protocol、MCP manifest、Skill manifest、Plugin manifest、事件 envelope 或鉴权 claims 的变更，都应先进入 contracts，再更新消费者仓库。

当前 docs CI 会读取 sibling checkout `../soha-contracts`，校验本页和 API 页面是否覆盖真实 OpenAPI 与 JSON Schema artifact。缺少 sibling 仓库时，`npm test` 会失败并提示先 checkout `soha-contracts`。

## 当前契约版本

- OpenAPI title: `Soha API`
- OpenAPI version: `0.1.1`
- Source artifact: `openapi/soha-api.yaml`
- npm package: `@opensoha/contracts`

## 契约目录

当前公开 artifact：

```text
soha-contracts/
  openapi/
    soha-api.yaml
  capabilities/
    cluster-capability-matrix.schema.json
  profiles/
    agent-profile.schema.json
  presets/
    mcp-preset.schema.json
  governance/
    approval-request.schema.json
    audit-log.schema.json
  agent/
    agent-protocol.schema.json
  runner/
    operation-lifecycle.schema.json
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
  connectors/
    connector-event-envelope.schema.json
```

The npm package exports these artifact paths:

- `openapi/soha-api.yaml`
- `capabilities/cluster-capability-matrix.schema.json`
- `profiles/agent-profile.schema.json`
- `presets/mcp-preset.schema.json`
- `governance/approval-request.schema.json`
- `governance/audit-log.schema.json`
- `agent/agent-protocol.schema.json`
- `runner/operation-lifecycle.schema.json`
- `mcp/gateway-manifest.schema.json`
- `skills/skill-manifest.schema.json`
- `plugins/plugin-manifest.schema.json`
- `events/event-envelope.schema.json`
- `auth/token-claims.schema.json`
- `connectors/connector-event-envelope.schema.json`

## JSON Schema Artifact

### Cluster Capability Matrix

- File: `capabilities/cluster-capability-matrix.schema.json`
- Title: `OpenSoha Cluster Capability Matrix`
- `$id`: `https://contracts.opensoha.dev/capabilities/cluster-capability-matrix.schema.json`
- Required fields: `items`
- Scope: Direct/Agent runtime capability parity, degraded support states, risk levels, approval expectations, and required scopes consumed by Core, Web, CLI, Agent, Skills, Connectors, and external extension points.

### Agent Profile

- File: `profiles/agent-profile.schema.json`
- Title: `OpenSoha Agent Profile`
- `$id`: `https://contracts.opensoha.dev/profiles/agent-profile.schema.json`
- Required fields: `schemaVersion`, `id`, `name`, `version`, `description`, `mode`, `providerKind`, `skillRefs`, `mcpPresetRefs`, `capabilityRefs`, `platformCapabilityRefs`, `requiredScopes`, `enabledToolRefs`, `guardrails`
- Scope: agent runtime profile assets that bind skills, MCP presets, capabilities, scopes, tool refs, budgets, and guardrails.

### MCP Preset

- File: `presets/mcp-preset.schema.json`
- Title: `OpenSoha MCP Preset`
- `$id`: `https://contracts.opensoha.dev/presets/mcp-preset.schema.json`
- Required fields: `schemaVersion`, `id`, `name`, `version`, `description`, `riskLevel`, `skillRefs`, `platformCapabilityRefs`, `requiredScopes`, `tools`, `guardrails`
- Scope: MCP preset assets that package Gateway tools, resources, prompts, scopes, capabilities, risk level, and guardrails.

### Governance Approval Request

- File: `governance/approval-request.schema.json`
- Title: `OpenSoha Approval Request`
- `$id`: `https://contracts.opensoha.dev/governance/approval-request.schema.json`
- Required fields: `id`, `status`, `strategy`, `actorType`, `actorId`, `toolName`, `riskLevel`, `requiresApproval`, `summary`, `createdAt`, `updatedAt`
- Scope: high-risk operation approval requests, approval traces, decisions, stages, and timeline events shared by Gateway, platform, CLI, Web, and external extension points.

### Governance Audit Log

- File: `governance/audit-log.schema.json`
- Title: `OpenSoha Audit Log`
- `$id`: `https://contracts.opensoha.dev/governance/audit-log.schema.json`
- Required fields: `id`, `actorType`, `actorId`, `action`, `result`, `summary`, `createdAt`
- Scope: normalized audit log records for Gateway, platform, connector, plugin, skill, and external extension point actions.

### Agent Protocol

- File: `agent/agent-protocol.schema.json`
- Title: `Soha Agent Protocol`
- `$id`: `https://contracts.opensoha.dev/agent/agent-protocol.schema.json`
- Scope: runner-facing claim, callback, Docker operation, Agent Runtime callback, and Agent Runtime tool-call payloads.

### Runner Operation Lifecycle

- File: `runner/operation-lifecycle.schema.json`
- Title: `OpenSoha Runner Operation Lifecycle`
- `$id`: `https://contracts.opensoha.dev/runner/operation-lifecycle.schema.json`
- Required fields: `operationId`, `operationKind`, `runnerId`, `state`, `occurredAt`
- Scope: long-running operation lifecycle breadcrumbs across delivery, Docker, VM, AI provider, agent run, and connector action runners.

### AI Gateway Manifest

- File: `mcp/gateway-manifest.schema.json`
- Title: `Soha AI Gateway Manifest`
- `$id`: `https://contracts.opensoha.dev/mcp/gateway-manifest.schema.json`
- Required fields: `name`, `version`, `generatedAt`, `principal`, `caller`, `permissionKeys`, `tools`, `summary`
- Scope: permission-filtered tools, resources, prompts, skills, caller context, and manifest summary consumed by CLI, MCP clients, AI agents, and console surfaces.

### Skill Manifest

- File: `skills/skill-manifest.schema.json`
- Title: `Soha Skill Manifest`
- `$id`: `https://contracts.opensoha.dev/skills/skill-manifest.schema.json`
- Required fields: `id`, `name`, `category`
- Scope: official or third-party skill metadata, capability refs, permissions, install hints, and operating guidance.

### Plugin Manifest

- File: `plugins/plugin-manifest.schema.json`
- Title: `OpenSoha Plugin Manifest`
- `$id`: `https://contracts.opensoha.dev/plugins/plugin-manifest.schema.json`
- Required fields: `id`, `name`, `version`, `publisher`, `type`
- Scope: plugin identity, package source, permissions, dependencies, entry points, and optional skills.

### Event Envelope

- File: `events/event-envelope.schema.json`
- Title: `Soha Event Envelope`
- `$id`: `https://contracts.opensoha.dev/events/event-envelope.schema.json`
- Required fields: `id`, `source`, `category`, `severity`, `summary`
- Scope: normalized audit, delivery, monitoring, governance, and runtime event envelopes.

### Token Claims

- File: `auth/token-claims.schema.json`
- Title: `Soha Token Claims`
- `$id`: `https://contracts.opensoha.dev/auth/token-claims.schema.json`
- Required fields: `sub`, `exp`, `iat`, `tokenId`, `tokenKind`, `subjectType`, `subjectId`
- Scope: bearer-token subject identity, token kind, subject type, subject id, and optional permission/scope claims.

### Connector Event Envelope

- File: `connectors/connector-event-envelope.schema.json`
- Title: `OpenSoha Connector Event Batch Envelope`
- `$id`: `https://contracts.opensoha.dev/connectors/connector-event-envelope.schema.json`
- Required fields: `connectorId`, `events`
- Scope: provider-neutral connector runtime event batches before durable ingest by Soha core.

## Generated API Reference

The generated API reference path is documented in [API Reference 生成路径](./reference.md). It consumes `../soha-contracts/openapi/soha-api.yaml`, public JSON Schemas, contract examples, and the docs-owned core route metadata overlay.

## Public OpenAPI Operation Index

This list mirrors `../soha-contracts/openapi/soha-api.yaml`. Paths use the docs convention `:param` for OpenAPI `{param}` placeholders.

- `GET /api/v1/healthz`
- `GET /api/v1/readyz`
- `GET /api/v1/auth/providers`
- `GET /api/v1/auth/login-options`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/oidc/login`
- `GET /api/v1/auth/oidc/callback`
- `POST /api/v1/auth/oidc/exchange`
- `GET /api/v1/auth/login/:providerID/start`
- `GET /api/v1/auth/login/:providerID/callback`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/profile`
- `GET /api/v1/auth/bootstrap`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/stream-ticket`
- `POST /api/v1/delivery/execution-tasks/claim`
- `GET /api/v1/delivery/execution-tasks/:taskID/runner-status`
- `POST /api/v1/delivery/execution-callbacks`
- `POST /api/v1/docker/operations/claim`
- `GET /api/v1/docker/operations/:operationID/runner-status`
- `POST /api/v1/docker/operation-callbacks`
- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`
- `POST /api/v1/copilot/agent-runs/tool-call`
- `GET /api/v1/copilot/agent-runs`
- `GET /api/v1/clusters/capabilities`
- `GET /api/v1/ai-gateway/capabilities`
- `POST /api/v1/ai-gateway/tools/:toolName/invoke`
- `POST /api/v1/ai-gateway/resources/read`
- `POST /api/v1/ai-gateway/prompts/get`
- `GET /api/v1/ai-gateway/personal-access-tokens`
- `POST /api/v1/ai-gateway/personal-access-tokens`
- `POST /api/v1/ai-gateway/personal-access-tokens/:tokenID/revoke`
- `POST /api/v1/ai-gateway/personal-access-tokens/:tokenID/rotate`
- `GET /api/v1/ai-gateway/service-accounts`
- `POST /api/v1/ai-gateway/service-accounts`
- `GET /api/v1/ai-gateway/service-account-tokens`
- `POST /api/v1/ai-gateway/service-accounts/:serviceAccountID/tokens`
- `POST /api/v1/ai-gateway/service-account-tokens/:tokenID/revoke`
- `POST /api/v1/ai-gateway/service-account-tokens/:tokenID/rotate`
- `GET /api/v1/ai-gateway/audit-logs`
- `GET /api/v1/ai-gateway/approval-requests`
- `GET /api/v1/ai-gateway/approval-requests/:requestID/timeline`
- `POST /api/v1/ai-gateway/approval-requests/:requestID/:action`
- `GET /api/v1/ai-gateway/governance/status`
- `GET /api/v1/mcp/capabilities`
- `GET /api/v1/plugins/marketplace`
- `GET /api/v1/plugins/marketplace/:pluginID`
- `GET /api/v1/plugins/installed`
- `POST /api/v1/plugins/install`
- `GET /api/v1/plugins/:pluginID`
- `DELETE /api/v1/plugins/:pluginID`
- `GET /api/v1/plugins/:pluginID/manifest`
- `POST /api/v1/plugins/:pluginID/enable`
- `POST /api/v1/plugins/:pluginID/disable`
- `POST /api/v1/plugins/:pluginID/upgrade`
- `PUT /api/v1/plugins/:pluginID/config`

## 稳定入口

SDK import 路径应保持稳定：

```text
github.com/opensoha/soha-contracts/gen/go/sohaapi
@opensoha/contracts/gen/ts/sohaapi
```

消费者可以逐步从本地 DTO 迁移到生成 SDK，但不应复制跨仓库业务逻辑。

## 依赖方向

- `soha` relies on `soha-contracts`; public contracts use `soha-contracts` as the source of truth.
- `soha-web` 通过 TypeScript SDK 和 HTTP API 访问 core。
- `soha-cli` 通过 Go SDK DTO / client 和 HTTP API 访问 core。
- `soha-agent` 通过 Agent protocol 和 generated SDK client 访问 runner-facing API。
- 外部实现通过公开包、API、SDK 或构建产物组合 core 能力。

## 校验

Contracts 仓库应持续校验：

- OpenAPI 语法。
- JSON Schema 语法。
- operation ID 唯一性。
- Go SDK 编译和测试。
- TypeScript SDK typecheck。
- `soha` 中公开 JSON wire shape 兼容测试。

Docs 仓库应持续校验：

- `api/core-endpoints.md` 覆盖 OpenAPI 中的 AI Gateway 与 MCP endpoints。
- 本页覆盖 OpenAPI operation index。
- 本页覆盖 npm package 导出的 OpenAPI 与 JSON Schema artifact。
- 发布 workflow checkout sibling `soha-contracts` 后运行 docs consistency tests。
