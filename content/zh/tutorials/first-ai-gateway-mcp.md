---
title: 第一次接入 AI Gateway MCP
description: 使用 Soha CLI 登录、查看 Gateway capability、生成 MCP 客户端配置，并验证后端 manifest 边界。
---

# 第一次接入 AI Gateway MCP

本地 `soha` CLI 和 MCP server 都是 Gateway client。它们不会直接读取 PostgreSQL、kubeconfig、Docker 或 runner workspace。所有 tool call、resource read 和 prompt read 都会回到后端 AI Gateway 边界。

## 前置条件

- 已按 [第一次部署](./first-deploy.md) 启动 Soha 控制平面。
- 本地 `PATH` 中已经可以执行 `soha` CLI。
- 当前用户或 service account 拥有 `ai.gateway.view`；如果要调用工具，还需要 `ai.gateway.invoke`。

## 登录

```bash
soha login \
  --server http://localhost:8080 \
  --login admin \
  --profile gateway-admin \
  --ai-client soha-admin \
  --ai-client-id soha-admin
```

## 读取 Capability

```bash
soha capabilities --profile gateway-admin
soha capabilities --profile gateway-admin --output names
```

对应的后端 API reference 名称是 `GET /api/v1/ai-gateway/capabilities`。

## 生成 MCP 配置

```bash
soha mcp install --profile gateway-admin --command /usr/local/bin/soha
```

生成的配置会让客户端启动：

```bash
soha mcp start --profile gateway-admin
```

Codex、Cursor 和 Claude Code 的示例见 [AI Gateway 示例](../operations/ai-gateway-examples.md)。

## 验证 Resource 和 Prompt 读取

```bash
soha resource read soha://delivery/applications --profile gateway-admin
soha prompt get soha.delivery.plan_release --profile gateway-admin
```

这些命令仍然会通过 `POST /api/v1/ai-gateway/resources/read` 和 `POST /api/v1/ai-gateway/prompts/get` 代理到后端。

## 预期输出形状

Capability 列表会按权限过滤。配置正确的 profile 和 MCP command 应该能输出形状兼容的结果，并且不会暴露 access token：

Fixture artifact: [`first-ai-gateway-mcp.expected.txt`](/tutorial-fixtures/first-ai-gateway-mcp.expected.txt)

```bash
soha login
soha capabilities --profile gateway-admin --output names
soha resource read soha://delivery/applications --profile gateway-admin
soha prompt get soha.delivery.plan_release --profile gateway-admin
```

```text
profile: gateway-admin
delivery.actions.trigger
k8s.pods.list
resource: soha://delivery/applications
prompt: soha.delivery.plan_release
```

## 验收标准

- `soha login` 能保存本地 profile，后续 profile 输出不会把 token 打印回来。
- `soha capabilities` 返回经过权限过滤的 manifest。
- MCP client config 启动的是 `soha mcp start`，不是直接数据库或集群进程。
- Resource 和 prompt 读取要么返回脱敏内容，要么返回清晰的权限或 binding 错误。

## 已知缺口

AI client、grant、access policy 和 skill binding 的 Gateway 管理端点已经在控制平面和 Console 中实现，但其中若干管理接口仍标记为待补公开 OpenAPI contract，详见 [Core Endpoints](../api/core-endpoints.md)。
