---
title: AI Gateway 示例
description: soha AI Gateway 的 MCP 客户端配置、CI 服务账号设置、控制台字段映射、交付与 Kubernetes 工作流及策略配置示例。
---

# AI Gateway 示例

本页提供 `soha` 与 AI Gateway 的可复制运维示例。以下示例假设后端服务可通过 `http://localhost:8080` 访问、初始化管理员用户具备管理 Gateway 对象的权限，且本机 `PATH` 中已安装 `soha`。

切勿将真实令牌、`kubeconfig` 内容、环境变量或原始日志正文粘贴到工单或 AI 对话中。下文所有命令均使用占位符表示敏感值。

## 初始化 Profile

创建一个用于管理 Gateway 的管理员 profile：

```bash
soha login \
  --server http://localhost:8080 \
  --login admin \
  --profile gateway-admin \
  --ai-client soha-admin \
  --ai-client-id soha-admin
```

为交互式客户端创建本地 profile。AI 客户端 ID 与 Skill ID 会作为 Gateway 请求头发送，供审计记录、工具授权、访问策略及 Skill 绑定使用。

当团队新接入的客户端需要经过人工审核时，可先将其注册为待审批状态：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/ai-clients" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "codex-local",
    "name": "Codex Local",
    "kind": "mcp_client",
    "status": "pending_approval",
    "metadata": {"owner":"platform"}
  }'
```

创建请求会生成一条待审批单，审批通过后即可激活该客户端：

```bash
soha governance status --profile gateway-admin --json
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/approval-requests/$APPROVAL_REQUEST_ID/approve" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment":"approved for local development"}'
```

```bash
soha context set \
  --profile gateway-admin \
  --ai-client-id codex-local \
  --ai-client Codex \
  --skill-id delivery-developer \
  --source soha
```

## MCP 客户端配置

生成标准的 JSON 配置结构：

```bash
soha mcp install --profile gateway-admin --command /usr/local/bin/soha
```

Cursor 与 Claude Code 使用 `mcpServers` JSON 结构：

```json
{
  "mcpServers": {
    "soha": {
      "command": "/usr/local/bin/soha",
      "args": ["mcp", "start", "--profile", "gateway-admin"]
    }
  }
}
```

Codex 在 `~/.codex/config.toml` 中使用 TOML 结构：

```toml
[mcp_servers.soha]
command = "/usr/local/bin/soha"
args = ["mcp", "start", "--profile", "gateway-admin"]
```

在项目级或团队托管的配置方式下，请将 `soha` profile 保存在运行编辑器的用户账号下。MCP 进程默认读取 `~/.soha/config.json`，也可通过环境变量 `SOHA_CONFIG` 指定路径。

## CI 服务账号

为 CI 创建专用服务账号，并仅授予流水线所需的最小角色或作用域授权：

```bash
soha service-account create \
  --profile gateway-admin \
  --id ci-delivery \
  --name "CI Delivery" \
  --role-ids delivery-operator \
  --metadata-json '{"owner":"platform","purpose":"delivery-ci"}'
```

创建短期有效的访问令牌。令牌明文仅在创建时输出一次，请将其存入 CI 密钥管理中心，切勿写入仓库文件：

```bash
soha service-account token-create \
  --profile gateway-admin \
  --service-account-id ci-delivery \
  --name "github-actions" \
  --permission-keys ai.gateway.view,ai.gateway.invoke \
  --expires-at 2026-12-31T00:00:00Z
```

随后 CI 作业即可使用相互隔离的 profile 配置文件：

```bash
export SOHA_CONFIG="$RUNNER_TEMP/soha-config.json"
export SOHA_TOKEN="$SOHA_GATEWAY_TOKEN"
export SOHA_SERVER="https://soha.example.com"

soha context set \
  --profile ci \
  --ai-client-id ci-github-actions \
  --ai-client "GitHub Actions" \
  --skill-id delivery-developer \
  --source ci

soha capabilities --profile ci --output names
```

如果 CI 作业仅需启动 MCP 服务，可将客户端指向以下命令：

```bash
soha mcp start --profile ci --ai-client-id ci-github-actions --ai-client "GitHub Actions" --skill-id delivery-developer
```

## 模型中转示例

以下示例对应 OpenAPI 中的中转（Relay）契约。截至 2026-06-25，后端领域模型、权限键、令牌元数据、仓储接口和配置默认值已合入代码库，中转 HTTP 处理器与路由注册由并行后端工作单元完成。SDK 和 `curl` 调用应在中转路由落地后执行；在此之前，请以 OpenAPI 的 `x-soha-implementation-status` 标注判断接口状态。

创建中转专用 PAT 或 SAT，不要复用旧的仅限 MCP 的令牌。关键边界有两层：`ai.gateway.relay.invoke` 用于授权模型中转调用，`metadata.purpose=llm-relay` 或 `metadata.scopes` 中的 `relay` 用于防止旧 Gateway 令牌被意外用于模型中转。

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/personal-access-tokens" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "local-relay-dev",
    "scopes": ["ai_gateway", "relay"],
    "permissionKeys": ["ai.gateway.relay.invoke"],
    "metadata": {
      "purpose": "llm-relay",
      "scopes": ["relay"],
      "allowedModels": ["gpt-4.1", "claude-sonnet-4-5"],
      "allowedProviderKinds": ["openai", "anthropic"],
      "allowedUpstreamIds": [],
      "allowedIPCIDRs": ["10.0.0.0/8"]
    },
    "expiresAt": "2026-12-31T00:00:00Z"
  }'
```

上游密钥应来自环境变量或密钥管理系统。不要将上游提供商密钥粘贴进工单、终端记录、文档或 AI 对话。

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/relay/upstreams" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "openai-primary",
    "name": "OpenAI primary",
    "providerKind": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "'"$OPENAI_UPSTREAM_API_KEY"'",
    "status": "active",
    "priority": 10,
    "weight": 100,
    "timeoutSeconds": 120,
    "streamTimeoutSeconds": 300,
    "maxConcurrency": 20,
    "supportedModels": ["gpt-4.1"]
  }'

curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/relay/model-routes" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "route-gpt-4-1",
    "publicModel": "gpt-4.1",
    "providerKind": "openai",
    "upstreamId": "openai-primary",
    "upstreamModel": "gpt-4.1",
    "routeGroup": "default",
    "priority": 10,
    "weight": 100,
    "enabled": true
  }'
```

OpenAI SDK Responses 示例：

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.SOHA_RELAY_TOKEN,
  baseURL: `${process.env.SOHA_SERVER}/api/v1/ai-gateway/llm/openai/v1`,
});

const response = await client.responses.create({
  model: "gpt-4.1",
  input: "Return one sentence describing the relay smoke test.",
});

console.log(response.output_text);
```

OpenAI SDK Chat Completions 流式示例：

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.SOHA_RELAY_TOKEN,
  baseURL: `${process.env.SOHA_SERVER}/api/v1/ai-gateway/llm/openai/v1`,
});

const stream = await client.chat.completions.create({
  model: "gpt-4.1",
  messages: [{ role: "user", content: "Stream three short words." }],
  stream: true,
  stream_options: { include_usage: true },
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```

Anthropic SDK Messages 示例：

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.SOHA_RELAY_TOKEN,
  baseURL: `${process.env.SOHA_SERVER}/api/v1/ai-gateway/llm/anthropic`,
});

const message = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 256,
  messages: [{ role: "user", content: "Return one sentence describing the relay smoke test." }],
});

console.log(message.content);
```

curl 原生兼容端点示例：

```bash
curl -sS "$SOHA_SERVER/api/v1/ai-gateway/llm/openai/v1/models" \
  -H "Authorization: Bearer $SOHA_RELAY_TOKEN"

curl -sS "$SOHA_SERVER/api/v1/ai-gateway/llm/openai/v1/responses" \
  -H "Authorization: Bearer $SOHA_RELAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4.1","input":"Say ok."}'

curl -sS "$SOHA_SERVER/api/v1/ai-gateway/llm/anthropic/v1/messages" \
  -H "x-api-key: $SOHA_RELAY_TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":64,"messages":[{"role":"user","content":"Say ok."}]}'
```

中转安全检查项：

- 上游密钥加密保存，读接口仅返回 `apiKeyPrefix`。
- PAT/SAT 明文仅在创建时展示一次；日志、审计、模型调用元数据、错误响应和前端状态只记录令牌前缀。
- 原生模型流量必须具备 `ai.gateway.relay.invoke` 权限，且令牌元数据必须显式声明中转用途或作用域。
- `metadata.allowedModels`、`allowedProviderKinds`、`allowedUpstreamIds`、`allowedIPCIDRs` 和限流配置只会进一步收窄中转使用范围。
- 模型调用日志仅保留模型、上游、端点、状态、延迟、用量计数、缓存 Token 和脱敏元数据；不保存提示词正文、完整请求头、`Authorization` 值、提供商密钥或提供商原始载荷。
- 运维人员只能配置自己已获授权使用的上游账号，并遵守提供商服务条款与内部数据处理规范。

## P0 模型中转冒烟检查清单

后端中转路由工作单元完成 HTTP 处理器注册后，按以下清单验收：

- OpenAPI 可正常解析，并包含中转上游、模型路由、模型调用记录、指标、缓存、OpenAI 兼容及 Anthropic 兼容路径。
- 携带 `ai.gateway.relay.invoke` 与 `metadata.purpose=llm-relay` 的中转专用 PAT/SAT 可通过 Soha 根地址完成 OpenAI SDK 非流式和流式请求。
- 同一个中转令牌可通过 Soha 根地址完成 Anthropic SDK 非流式和流式 Messages 请求。
- 缺少 `ai.gateway.relay.invoke` 或中转元数据的令牌返回 `403`。
- 已禁用、已过期或已吊销的 PAT/SAT 均无法调用中转端点。
- 上游 API 密钥不会出现在控制台或 API 读响应、模型调用日志、审计日志、应用日志或错误响应中。
- 成功调用后，`GET /api/v1/ai-gateway/relay/model-calls` 可查看模型、上游、状态、首字节时间（TTFB）、总耗时、输入/输出/总 Token 数及缓存 Token 字段。
- 流式请求中客户端断开连接时，会自动取消上游请求并记录 `client_cancelled`。
- 修改上游或模型路由后，下一次路由请求前中转配置缓存已失效。
- 现有 MCP `POST /api/v1/ai-gateway/tools/:toolName/invoke` 使用普通 Gateway 令牌仍可正常工作。

## 控制台字段映射

控制台管理页面位于 `/ai-gateway`，与 `soha` 和 MCP 操作的是同一组 Gateway API 对象。`ai.gateway.view` 可查看页面，`ai.gateway.invoke` 可创建个人访问令牌，而管理 AI 客户端、服务账号、工具授权、访问策略、Skill 绑定及审批决策则需要 `ai.gateway.manage` 权限。

将运维变更需求转化为控制台表单字段时，可参考以下映射关系：

- **Manifest（能力清单）** 对应 `GET /api/v1/ai-gateway/capabilities`，筛选项包括 `AI client`、`Skill` 和 `source`。工具列表仅作为当前可见能力的预览；每次实际调用仍会重新校验权限键、作用域、工具授权、访问策略、Skill 绑定以及所属业务服务的授权规则。
- **AI clients（AI 客户端）** 对应 `ai_clients`，表单字段包括 `Client ID`、`name`、`kind`、`status`、`redirectUris` 和 `allowedOrigins`。控制台直接创建和编辑启用或禁用状态的客户端；需要注册审核的接入流程仍可通过 API 以 `pending` 或 `pending_approval` 状态提交，再在审批页签中完成审批。
- **Personal access tokens（个人访问令牌）** 对应 `personal_access_tokens`，创建表单字段包括 `name`、`permissionKeys`、`scopes` 和 `expiresAt`。令牌明文仅在创建或轮换后展示一次，不会保存在浏览器状态中；轮换操作会沿用旧令牌的权限边界并自动吊销旧令牌。
- **Service accounts（服务账号）** 对应 `service_accounts` 与 `service_account_tokens`。服务账号字段包括可选的 `id`、`name`、`description`、`status`、`roleIds`、`teamIds` 和 `scopeGrantIds`。服务账号令牌字段包括 `name`、`permissionKeys`、`scopes` 和 `expiresAt`；令牌列表展示 ID、所属服务账号、令牌前缀、权限、作用域、过期时间、最近使用时间、吊销/过期状态以及轮换和吊销操作。
- **MCP tool grants（MCP 工具授权）** 对应 `mcp_tool_grants`，表单字段包括 `subjectType`、`subjectId`、可选的 `aiClientId`、`toolName`、`effect`、可选的 `riskLevel`、附加 `permissionKeys`、`requiresApproval`，以及业务线、应用、应用环境、环境、集群、命名空间、发布包和执行任务等资源作用域字段。
- **Access policies（访问策略）** 对应 `ai_access_policies`。控制台覆盖策略基础字段：`name`、`description`、`enabled`、`subjectType`、`subjectId`、可选的 `aiClientId`、`effect`、`toolPatterns`、`skillIds`、`riskLevels`、`approvalMode` 以及上述资源作用域字段；同时提供常用审批路由控件（`approvalPolicyRef`、候选用户/角色/团队、`onCallRef`、`approvalMode=all|any`、`requiredApprovals` 及变更时间窗边界）和常用治理条件控件：`rateLimit`（固定窗口、滑动窗口或 GCRA/令牌桶限流）、每日调用次数/Token/费用 `budget`、支持字段路径/正则表达式/密钥分类器的输入脱敏 `redactionPolicy`，以及支持输出字段路径、正则表达式、密钥分类器、替换文本和保留格式掩码的输出脱敏 `outputRedactionPolicy`。分阶段审批和按工具细分的脱敏 `rules[]` 仍通过 API 配置（见下文策略示例）。
- **Skill bindings（Skill 绑定）** 对应 `ai_gateway_skill_bindings`，表单字段包括 `subjectType`、`subjectId`、可选的 `aiClientId`、`skillId`、`capabilityRefs` 和 `enabled`。绑定用于收窄指定 Skill 下可见的能力清单，本身不授予业务权限。
- **Governance（治理状态）** 对应 `GET /api/v1/ai-gateway/governance/status`，时间窗口选择器支持发送 1h、6h、24h、48h 或 7d 对应的 `windowHours` 参数。该页签展示健康状态与检查项、近期调用量、令牌/客户端/审批汇总、策略覆盖率明细、脱敏命中汇总、令牌风险发现、审批队列、高频工具、高频 AI 客户端、高频调用主体、异常发现、文本建议以及结构化的 `recommendationActions`。脱敏命中汇总由 Gateway 审计元数据聚合生成，包含总命中次数、已脱敏审计条数、输入/输出目标分布、匹配方式、分类器、字段路径、策略及高频工具。令牌风险发现可一键筛选个人访问令牌表、筛选服务账号令牌表，或按令牌 ID 预填服务账号令牌吊销表单；脱敏策略/工具行可跳转至对应的策略或审计筛选视图；审批队列、异常发现与治理建议操作可跳转至对应的审批、AI 客户端、策略、工具授权或审计筛选视图。针对覆盖缺口与高风险发现，还可直接打开预填好的访问策略草稿，快速补齐预算、限流、脱敏、资源作用域或审批护栏。策略覆盖率会将启用中的输入 `redactionPolicy`、`outputRedactionPolicy` 及响应/输出脱敏别名统一计入脱敏覆盖。该页签要求 `ai.gateway.manage` 权限，且仅展示脱敏后的汇总信息、请求 ID 和令牌前缀。
- **Approval requests（审批请求）** 对应 `ai_gateway_approval_requests`，筛选项包括 `approvalRequestId`、`status`、`actorId`、`AI client`、`Tool`、`Risk`、`Strategy` 及创建时间范围。列表行展示状态、发起主体、客户端/Skill、工具、风险等级、审批策略、过期时间、摘要和追踪列。展开追踪详情可查看 Gateway 审批单 ID、工作流运行链接、应用、应用环境、执行任务、发布包、审批意见、资源作用域、脱敏后的工具输入、关联 ID 及输出结果。批准、驳回和取消操作均支持填写备注说明。
- **Audit（审计日志）** 对应 `ai_gateway_audit_logs`，筛选项包括 `actorId`、`AI client`、`Tool`、`Risk`、`Result` 及创建时间范围。展开行仅显示资源作用域、请求 ID 和来源 IP；原始工具输入、令牌明文、`kubeconfig`、环境变量及原始日志正文均不会暴露。

运行时基础设施配置不在该页面修改。例如，Redis 限流后端通过配置文件中的 `ai_gateway.rate_limit.backend=redis` 与 `ai_gateway.rate_limit.redis.addr`（或对应环境变量）启用，而控制台或 API 中的访问策略则决定哪些调用受限流规则约束。

## 应用交付开发流程

自助式应用交付场景推荐使用 `delivery-developer` Skill，遵循“先读取上下文，再发起受控操作”的顺序执行。

查看应用与环境上下文：

```bash
soha tool call delivery.applications.detail \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1"}'

soha tool call delivery.application_services.list \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1"}'

soha tool call delivery.build_sources.list \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","includeBindings":true}'
```

查看发布目标与当前执行状态：

```bash
soha tool call delivery.release_targets.list \
  --profile gateway-admin \
  --input-json '{"applicationEnvironmentId":"binding-1"}'

soha tool call delivery.release_context.diff \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","sourceReleaseBundleId":"bundle-old","targetReleaseBundleId":"bundle-new"}'
```

触发受控的构建或部署动作。变更类工具仍须经过访问策略的风险评估以及所属交付应用服务的权限校验：

```bash
soha tool call delivery.actions.trigger \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","action":"build_deploy"}'
```

执行回滚时，同样先收集只读回滚上下文，再触发受控回滚动作。绑定的工作流模板必须包含 `rollback_to_previous` DAG 节点；Gateway 审批通过并重放执行时，会保持 `releaseBundleId` 与 `workflowRunId` 的关联：

```bash
soha tool call delivery.rollback.context \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","releaseBundleId":"bundle-prev"}'

soha tool call delivery.actions.trigger \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","action":"rollback","releaseBundleId":"bundle-prev"}'
```

若匹配的策略要求审批，调用将返回 `pending_approval` 或 `pending_human_confirm` 状态以及对应的审批请求 ID。调用方应等待审批完成，不得绕过 Gateway 直接重试。

## Kubernetes SRE 发布失败诊断

受限的运行时故障诊断推荐使用 `k8s-sre` Skill。首先收集工作负载滚动状态与事件上下文：

```bash
soha tool call k8s.deployments.rollout_status \
  --profile gateway-admin \
  --input-json '{"clusterId":"cluster-a","namespace":"prod","deploymentName":"api"}'

soha tool call k8s.deployments.events \
  --profile gateway-admin \
  --input-json '{"clusterId":"cluster-a","namespace":"prod","deploymentName":"api","limit":50}'
```

查看 Pod 详情与 Service 后端端点上下文：

```bash
soha tool call k8s.pods.describe \
  --profile gateway-admin \
  --input-json '{"clusterId":"cluster-a","namespace":"prod","podName":"api-7d9f"}'

soha tool call k8s.services.backends \
  --profile gateway-admin \
  --input-json '{"clusterId":"cluster-a","namespace":"prod","serviceName":"api"}'
```

运行发布失败诊断分析器。Gateway 会通过 Copilot 应用服务保存脱敏后的 `AnalysisArtifact`，不会持久化原始日志正文。在 AI 工作台中，诊断产物历史会将已记录的 `sessionId`、`rootCauseRunId`、`inspectionRunId` 以及 `agentRunId` / `agentRuntimeId` 展示为上下文跳转链接；巡检复核类产物还可通过 `view=runs&inspectionRunId=...` 直接打开对应的巡检运行记录视图：

```bash
soha tool call diagnosis.release_failure.analyze \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","releaseBundleId":"bundle-new","executionTaskId":"task-1","clusterId":"cluster-a","namespace":"prod","workloadName":"api","podName":"api-7d9f"}'
```

如需借助外部 Agent Runtime Provider 进行深度推理，可发起异步诊断分析。在此模式下，Gateway 仍然只负责收集并脱敏上下文，随后创建一条 `queued` 状态的 `AgentRun`，并返回 `agentRunId`、`agentProviderId` 和 `agentRunStatus`；后续由已配置的 Agent Runner 领取该运行任务，并在完成后回调写回标准化的 `analysisArtifacts`：

```bash
soha tool call diagnosis.release_failure.analyze \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","releaseBundleId":"bundle-new","executionTaskId":"task-1","clusterId":"cluster-a","namespace":"prod","workloadName":"api","podName":"api-7d9f","deepAnalysis":true,"agentProviderId":"hermes","timeoutSeconds":900}'
```

## 访问策略配置示例

使用 `POST /api/v1/ai-gateway/access-policies` 创建访问策略。HTTP 处理器保持轻量，所有运行时策略执行均在调用所属业务应用服务之前，由 AI Gateway 应用服务统一完成。

面向本地 Codex 的只读交付策略：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Codex read-only delivery",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "aiClientId": "codex-local",
    "effect": "allow",
    "toolPatterns": ["delivery.*.list", "delivery.applications.detail", "delivery.release_context.diff"],
    "riskLevels": ["read", "analyze"],
    "conditions": {
      "rateLimit": {"maxCallsPerMinute": 60, "scope": "actor_client", "mode": "gcra", "burst": 20},
      "budget": {"maxCallsPerDay": 500, "scope": "actor_client"},
      "redactionPolicy": {"mode": "sanitize"}
    }
  }'
```

要求交付变更操作必须经过审批：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivery mutation approval",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "aiClientId": "codex-local",
    "effect": "allow",
    "toolPatterns": ["delivery.actions.trigger"],
    "riskLevels": ["execute", "high"],
    "approvalPolicy": {
      "strategy": "require_approval",
      "approvalPolicyRef": "delivery-standard",
      "approvalMode": "all",
      "approverRoles": ["release-manager"],
      "approverTeams": ["platform-ops"],
      "requiredApprovals": 2,
      "requiredRoleApprovals": {"release-manager": 1},
      "requiredTeamApprovals": {"platform-ops": 1},
      "approvalStages": [
        {
          "name": "release",
          "approverRoles": ["release-manager"],
          "requiredApprovals": 1
        },
        {
          "name": "security",
          "approverRoles": ["security-reviewer"],
          "requiredApprovals": 1
        }
      ],
      "onCallRef": "prod-release-oncall",
      "changeWindow": {
        "startsAt": "2026-05-29T10:00:00Z",
        "endsAt": "2026-05-29T12:00:00Z",
        "timezone": "UTC"
      }
    },
    "conditions": {
      "rateLimit": {"maxCallsPerHour": 10, "scope": "actor_client_tool"},
      "redactionPolicy": {"mode": "strict"}
    }
  }'
```

禁止共享客户端调用高风险工具：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shared client high-risk deny",
    "enabled": true,
    "subjectType": "ai_client",
    "subjectId": "shared-agent",
    "effect": "deny",
    "riskLevels": ["high", "execute", "mutate"]
  }'
```

将 SRE 策略限定在指定集群与命名空间内：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SRE prod runtime read",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "sre",
    "effect": "allow",
    "toolPatterns": ["k8s.*", "diagnosis.release_failure.analyze"],
    "riskLevels": ["read", "analyze"],
    "resourceScopes": {"clusterId": "cluster-a", "namespace": "prod"},
    "conditions": {
      "rateLimit": {"maxCallsPerMinute": 120, "scope": "actor_client", "mode": "token_bucket", "burst": 30},
      "budget": {"maxCallsPerDay": 1000, "scope": "actor_client"}
    }
  }'
```

条件说明（Condition notes:）：

- `rateLimit` 默认使用 Gateway 固定窗口计数表执行原子限流。将 `mode` / `algorithm` / `strategy` 设为 `sliding_window`、`rolling_window` 或 `audit_window` 时，会基于 Gateway 审计日志计算真实滑动窗口；设为 `gcra`、`token_bucket`、`leaky_bucket` 或 `strict` 时，则启用 GCRA/TAT 令牌桶语义，并由 `burst` / `burstSize` / `capacity` 控制突发容量。默认后端使用基于 PostgreSQL 的限流表；配置 `ai_gateway.rate_limit.backend=redis` 与 `ai_gateway.rate_limit.redis.addr` 后，可切换为基于 Redis `INCR`/`EXPIRE` 和 Lua GCRA 的高吞吐共享限流器。Redis 故障时会自动回退到 PostgreSQL；尚未执行对应迁移的旧版数据库则会临时回退到审计窗口计数。
- Docker Compose 可通过 `docker compose --profile redis-rate-limit up` 启动可选的 Redis 限流组件；此时设置 `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND=redis`，并保持 `SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR=redis:6379` 或指向外部 Redis 地址。
- `approvalPolicy.approvalPolicyRef` 记录 Gateway 审批策略引用。Gateway 审批超时和路由来自同一个内联 `approvalPolicy` 对象，包括 `slaMinutes`、`approvalMode`、审批人数、候选用户/角色/团队、变更窗口和分阶段路由。
- `approvalPolicy.approverUsers`、`approverRoles`、`approverTeams`、`onCallRef`、`approvalMode`、`approvalStages`、`requiredApprovals` / `minApprovals`、`requiredRoleApprovals` / `requiredTeamApprovals` 以及 `changeWindow.startsAt/endsAt` 会作为审批路由元数据持久化保存。`onCallRef` 通过监控值班解析器解析，当前值班人员会被追加到 `candidateUserIds`，同时 Gateway 会记录 `onCallCandidateUserIds` 与脱敏后的 `onCallResolution` 摘要。审批决策接口会拒绝非候选审批人；执行批准操作还要求当前时间处于变更时间窗之内。多人会签按不重复的审批人 `userId` 计数，同一审批人再次提交决策会覆盖其前一次意见而不会重复计数。`approvalMode=all` 为默认的会签模式，直到总人数及所有角色/团队配额全部满足前请求保持 `pending`；`approvalMode=any` 为或签模式，满足任意显式配置的总人数、角色或团队配额即触发执行。待审批请求记录 `pendingRequirements`，已满足条件记录 `satisfiedRequirements`。分阶段审批使用 `approvalStages[]`，仅当前阶段的候选人可审批，阶段完成后推进 `currentStageIndex` 并记录 `stageHistory`，只有最后一个阶段通过后才会重放工具调用。
- 当已批准的 Gateway 审批单重放 `delivery.actions.trigger` 时，重放请求会将 `aiGatewayApprovalRequestId` 及关联的策略、工具、Skill 和客户端字段注入交付工作流变量。工作流运行元数据会保留这些值，工作流中的人工审批（`manual_approval`）决策也会将其写入 `workflow_approvals.metadata`，且 Gateway 与交付记录的关联 ID 中均包含 `workflowRunId` 以便双向追溯。访问 `/workflows?workflowRunId=...&gatewayApprovalRequestId=...` 时会自动展开对应工作流行，展示 Gateway 关联信息、人工审批节点详情、工作流节点时间线及原始追踪记录。
- `budget.maxCalls*` 为调用次数预算；`budget.maxTokens*` 与 `budget.maxCost*` 为基于脱敏 Gateway 审计元数据（如 `usage`、`tokenUsage` 或 `providerUsage`）计算的用量预算。
- 在成功的工具调用及审批重放后，当所属业务服务的输出或关联 ID 中包含 `usage`、`tokenUsage`、`aiUsage`、`providerUsage`、`llmUsage`、`metering`、`billing` 或 `costUsage` 时，Gateway 会自动提取数值型 Token 与费用摘要；同时也会映射常见原生字段，例如 Gemini/Vertex 的 `usageMetadata.promptTokenCount/candidatesTokenCount/totalTokenCount`、cached content、tool-use prompt 与 thoughts token 字段，Ollama 的 `prompt_eval_count/eval_count`，Anthropic 的缓存输入 Token，OpenAI 的 cached/audio/reasoning/prediction Token 明细，Bedrock 的文本/图像/音频 Token 字段，Cohere 的计费单位（同一容器内优先采用 `billed_units` 而非 `tokens` 以避免重复计数），检索/分类/向量嵌入/重排/请求/响应用量单位，Brave Search / SerpAPI 的查询与检索额度别名，Browserbase 的会话/分钟/页面加载别名，Exa/Jina/Unstructured/LlamaCloud 的文档页/解析页/字符/分块别名，Helicone 的请求计数别名，可计费/已计费/用量 Token 别名，多模态文本/图像/音频/视频输入输出别名，缓存读取/写入/命中/未命中输入 Token 变体，DashScope/Moonshot/Zhipu/Qianfan 风格的 `*_tokens_count` / `*_token_usage` 变体，通用的 `promptCost` / `inputCost` / `completionCost` / `outputCost`，以及常见的 `cost` / `costMicros` / `costCents` 字段。审计元数据中仅写入数值型的 `providerUsage` / `usage` 摘要；提供商原始载荷、模型名称字符串及其他非数值明细均不会保存。
- `redactionPolicy.mode=strict` 会在工具请求到达所属业务服务之前，直接拒绝包含 `token`、`password`、`secret`、`authorization`、`kubeconfig` 等敏感键或疑似密钥文本的请求。
- `redactionPolicy.mode=sanitize|mask|redact` 会在所属业务服务读取输入前，将敏感输入值重写为 `[REDACTED]`。
- `redactionPolicy.fields` / `redactFields` 用于将脱敏范围限定到指定字段路径；`allowFields` 用于豁免受信任的字段路径；`replacement` 用于自定义替换字符串；`preserveFormat=true` 在掩码处理时保留末尾四位字符。
- `redactionPolicy.valuePatterns` 支持添加基于自定义正则表达式的值匹配；`secretTypes` 用于启用内置密钥分类器，例如 `github`、`gitlab`、`openai`、`anthropic`、`google_api_key`、`huggingface`、`cohere`、`mistral`、`deepseek`、`groq`、`together`、`replicate`、`langsmith`、`pinecone`、`xai`、`perplexity`、`tavily`、`langfuse`、`qdrant`、`wandb`、`linear`、`openrouter`、`fireworks`、`voyage`、`brave_search`、`serpapi`、`browserbase`、`exa`、`jina`、`unstructured`、`llama_cloud`、`helicone`、`dashscope`、`moonshot`、`zhipu`、`siliconflow`、`hunyuan`、`qianfan`、`volcengine`、`grafana`、`sentry`、`newrelic`、`azure_openai`、`azure_devops`、`datadog`、`pagerduty`、`posthog`、`splunk`、`elastic`、`terraform`、`npm`、`stripe`、`slack`、`jwt`、`aws`、`private_key`、`kubernetes_secret`、`kubeconfig`、`docker_config`、`gcp_service_account` 和 `aws_credentials`。
- 脱敏命中情况会作为 `redaction` 摘要写入 Gateway 审计元数据，仅包含目标方向、字段路径、匹配类型、分类器名称和命中次数，不会保存命中的敏感明文。治理状态接口会聚合同一批元数据生成运行汇总，便于运维人员在不查看原始工具输入输出的前提下掌握脱敏触发分布。
- `redactionPolicy.rules[]` 可将字段级脱敏规则绑定到特定的 `toolPatterns`，使单条策略能够针对交付、Kubernetes 和诊断工具分别执行不同的输入清洗规则。
- 默认启用输入脱敏。如需在 Gateway 返回或持久化结果前对所属业务服务的输出进行脱敏，请配置 `outputRedactionPolicy`，或将规则的 `target` 设为 `output` / `both`。
- `scope` 支持设为 `actor`、`client`、`actor_client`、`actor_tool`、`client_tool`、`actor_client_tool` 或 `global`。

Token 与费用预算示例：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Codex daily usage budget",
    "enabled": true,
    "subjectType": "ai_client",
    "subjectId": "codex-local",
    "effect": "allow",
    "toolPatterns": ["delivery.*", "k8s.*", "diagnosis.*"],
    "conditions": {
      "budget": {
        "maxTokensPerDay": 200000,
        "maxCostPerDay": 15.0,
        "scope": "actor_client"
      }
    }
  }'
```

带豁免白名单与保留格式掩码的字段级脱敏示例：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivery field redaction",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "effect": "allow",
    "toolPatterns": ["delivery.*"],
    "riskLevels": ["read", "analyze", "mutate"],
    "conditions": {
      "redactionPolicy": {
        "mode": "mask",
        "fields": ["metadata.apiToken", "buildSources.*.config.password"],
        "allowFields": ["search"],
        "preserveFormat": true,
        "rules": [
          {
            "toolPatterns": ["delivery.applications.create"],
            "fields": ["metadata.apiToken"],
            "replacement": "[MASKED]",
            "preserveFormat": true
          },
          {
            "toolPatterns": ["diagnosis.*"],
            "fields": ["context.rawLogs", "context.env"],
            "mode": "redact"
          }
        ]
      }
    }
  }'
```

正则表达式与结构化密钥分类脱敏示例：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Secret classifier redaction",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "effect": "allow",
    "toolPatterns": ["delivery.*", "k8s.*", "diagnosis.*"],
    "conditions": {
      "redactionPolicy": {
        "mode": "sanitize",
        "valuePatterns": ["APP-[0-9]{4}", "ticket-[A-F0-9]{8}"],
        "secretTypes": ["github", "openai", "anthropic", "google_api_key", "huggingface", "cohere", "mistral", "deepseek", "groq", "together", "replicate", "langsmith", "pinecone", "xai", "perplexity", "tavily", "langfuse", "qdrant", "wandb", "linear", "openrouter", "fireworks", "voyage", "brave_search", "serpapi", "browserbase", "exa", "jina", "unstructured", "llama_cloud", "helicone", "dashscope", "moonshot", "zhipu", "siliconflow", "hunyuan", "qianfan", "volcengine", "grafana", "sentry", "newrelic", "azure_openai", "azure_devops", "datadog", "pagerduty", "posthog", "splunk", "elastic", "terraform", "npm", "stripe", "jwt", "aws", "private_key", "kubernetes_secret", "kubeconfig", "docker_config", "gcp_service_account"],
        "replacement": "[CLASSIFIED]",
        "preserveFormat": false
      }
    }
  }'
```

面向工具响应与审批重放的输出脱敏示例：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivery output redaction",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "effect": "allow",
    "toolPatterns": ["delivery.*"],
    "riskLevels": ["read", "analyze", "mutate", "execute"],
    "conditions": {
      "outputRedactionPolicy": {
        "mode": "sanitize",
        "fields": [
          "application.buildSources.*.config.token",
          "build.metadata.token",
          "release.metadata.secret"
        ]
      }
    }
  }'
```

## Skill 绑定配置示例

Skill 绑定用于收窄主体或 AI 客户端在指定 Skill 下可使用的能力范围，其本身不会授予任何业务权限。

将 Codex 绑定到应用交付开发 Skill：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/skill-bindings" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectType": "ai_client",
    "subjectId": "codex-local",
    "skillId": "delivery-developer",
    "enabled": true,
    "capabilityRefs": [
      "delivery.applications.*",
      "delivery.application_services.list",
      "delivery.build_sources.list",
      "delivery.release_targets.list",
      "delivery.release_bundles.list",
      "delivery.execution_tasks.list",
      "delivery.execution_logs.list",
      "delivery.release_context.diff",
      "delivery.rollback.context",
      "delivery.actions.trigger"
    ],
    "metadata": {"owner":"platform"}
  }'
```

将 SRE 角色绑定到受限的运行时诊断能力：

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/skill-bindings" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectType": "role",
    "subjectId": "sre",
    "skillId": "k8s-sre",
    "enabled": true,
    "capabilityRefs": [
      "k8s.pods.*",
      "k8s.deployments.*",
      "k8s.services.backends",
      "k8s.routes.context",
      "k8s.storage.context",
      "k8s.nodes.detail",
      "diagnosis.release_failure.analyze"
    ]
  }'
```

使用 `diagnose` 检查当前 profile 可见的能力与授权判定：

```bash
soha diagnose --profile gateway-admin --tool diagnosis.release_failure.analyze
soha capabilities --profile gateway-admin --json
```

当 MCP 客户端能够列出能力清单，但资源读取或提示词上下文结果不符合预期时，可直接比对经由后端代理的资源与提示词调用路径：

```bash
soha resource read soha://delivery/applications \
  --profile gateway-admin \
  --skill-id delivery-developer \
  --context-json '{"applicationId":"app-1"}'

soha prompt get soha.delivery.plan_release \
  --profile gateway-admin \
  --skill-id delivery-developer \
  --arguments-json '{"applicationId":"app-1","applicationEnvironmentId":"dev"}' \
  --context-json '{"environmentId":"dev"}'

soha diagnose --profile gateway-admin --resource soha://k8s/runtime
soha diagnose --profile gateway-admin --prompt soha.k8s.diagnose_workload
```

上述命令同样通过 Gateway 的 `resources/read` 与 `prompts/get` 接口转发，因此排查调用失败时，应结合与 MCP 服务端一致的运行时权限、Skill 绑定、AI 客户端上下文和资源作用域逐项核对。

## 运维检查

完成客户端接入后，复核审计记录与治理状态：

```bash
soha audit list --profile gateway-admin --ai-client-id codex-local --limit 20
soha governance status --profile gateway-admin --window-hours 24
```

放宽访问权限前，请先确认治理状态无告警：若出现 `approval_sla_due_soon` 或 `stale_gateway_approvals` 告警，说明存在待处理的 Gateway 审批（pending Gateway approvals），需运维人员及时介入处理，避免因 SLA 临期或队列积压阻塞发布；若出现 `high_risk_allow_without_approval` 或 `high_risk_grant_without_approval` 告警，说明当前存在启用中的放行策略或未过期授权，可在无审批、无人工确认或无演练（dry-run）护栏的情况下直接调用高风险工具；若出现 `high_risk_allow_without_resource_scope` 或 `high_risk_grant_without_resource_scope` 告警，说明高风险放行路径未配置具体的 `resourceScopes` 约束，或仅配置了 `"*"` 等通配作用域。

若预期的工具未出现在能力清单中，请按以下顺序排查：

- 运行时权限键（如 `ai.gateway.invoke` 以及所属业务模块的权限键）；
- `mcp_tool_grants` 中的拒绝/允许匹配规则；
- `ai_access_policies` 中的拒绝/允许效果、资源作用域、风险策略及附加条件；
- 当前 `skillId` 对应的 `ai_gateway_skill_bindings` 绑定配置；
- 工具输入参数中的资源作用域字段，重点核对 `clusterId`、`namespace`、`applicationId` 和 `applicationEnvironmentId`。
