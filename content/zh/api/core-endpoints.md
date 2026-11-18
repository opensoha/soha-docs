# 核心端点

本页按领域列出常用 HTTP API 分组；完整的操作与 Schema 索引以[生成 API 参考](./reference/generated/index.md)为准。

## 集群接口

- `GET /api/v1/clusters`
- `POST /api/v1/clusters`
- `GET /api/v1/clusters/capabilities`
- `GET /api/v1/clusters/:clusterID/detail`
- `GET /api/v1/clusters/:clusterID/namespaces`
- `GET /api/v1/clusters/:clusterID/infrastructure/nodes`
- `GET /api/v1/clusters/:clusterID/workloads/pods?namespace=default`
- `GET /api/v1/clusters/:clusterID/workloads/deployments?namespace=default`
- `GET /api/v1/clusters/:clusterID/workloads/statefulsets?namespace=<optional>`
- `GET /api/v1/clusters/:clusterID/network/services?namespace=<optional>`
- `GET /api/v1/clusters/:clusterID/network/ingresses?namespace=<optional>`
- `GET /api/v1/clusters/:clusterID/events?namespace=<optional>&limit=20`
- `POST /api/v1/clusters/:clusterID/workloads/deployments/restart`
- `POST /api/v1/clusters/:clusterID/workloads/deployments/scale`

`/clusters/capabilities` 返回供控制台、CLI、Skills 与外部集成统一消费的直连（Direct）与 Agent 运行时能力矩阵。每条记录包含能力键、所属分类、所需权限范围、风险等级、审批要求、文档链接，以及分别针对直连模式和 Agent 模式的支持状态与 `partial` 或 `unsupported` 降级原因说明。

## 审计接口

- `GET /api/v1/audit/logs`

## 监控与告警接口

- `POST /api/v1/integrations/alerts/webhook`
- `GET /api/v1/monitoring/summary`
- `GET /api/v1/alerts?status=<optional>&clusterId=<optional>&limit=50`
- `GET /api/v1/notification-channels`
- `POST /api/v1/notification-channels`
- `PUT /api/v1/notification-channels/:channelID`

## AI 设置接口

- `GET /api/v1/settings/ai`
- `PUT /api/v1/settings/ai/workbench-model`
- `PUT /api/v1/settings/ai/skills`

## 虚拟化接口

公开契约覆盖连接、虚拟机、镜像、规格、操作、指标、控制台、同步、取消和重试接口。完整真实源路由与 Schema 请查阅[生成 API 参考](./reference/generated/index.md#virtualization)。

PVE 凭据仅在创建或更新请求载荷中接收，API 响应绝不回传明文凭据，仅暴露 `credentialConfigured` 布尔标识。

KubeVirt 虚拟化当前要求直连 Kubernetes 客户端，明确不支持 Agent 连接模式；客户端必须读取实时能力矩阵与虚拟机 `allowedActions`，不能假设其操作集与 PVE 完全等价。

## 计算资源接口

- `GET /api/v1/compute/capabilities`
- `GET /api/v1/compute/overview`
- `GET /api/v1/compute/access-sources`
- `GET /api/v1/compute/providers`
- `GET /api/v1/compute/provider-instances`
- `GET /api/v1/compute/provider-instances/:domain/:providerKey/:instanceRef`
- `POST /api/v1/compute/provider-instances/:domain/:providerKey/:instanceRef/health-checks`
- `POST /api/v1/compute/provider-instances/:domain/:providerKey/:instanceRef/discoveries`
- `GET /api/v1/compute/resources/:domain/:kind/:id`
- `GET /api/v1/compute/resources/:domain/:kind/:id/relations`
- `POST /api/v1/compute/resources/:domain/:kind/:id/actions/:action`
- `GET /api/v1/compute/tasks`
- `GET /api/v1/compute/tasks/:domain/:id`
- `GET /api/v1/compute/tasks/:domain/:id/logs`
- `POST /api/v1/compute/tasks/:domain/:id/cancel`
- `POST /api/v1/compute/tasks/:domain/:id/retry`

这些路由均已在 Core 中上线，并委托给已启用的虚拟化或容器运行时后端执行。实际可用性仍取决于模块启用状态、后端能力与调用方权限。

## 应用与交付接口

- `GET /api/v1/applications?search=<optional>&limit=100`
- `POST /api/v1/applications`
- `GET /api/v1/applications/:applicationID`
- `GET /api/v1/applications/:applicationID/detail`
- `GET /api/v1/applications/:applicationID/runtime`
- `GET /api/v1/applications/:applicationID/services`
- `POST /api/v1/applications/:applicationID/services`
- `GET /api/v1/applications/:applicationID/services/:serviceID`
- `PUT /api/v1/applications/:applicationID/services/:serviceID`
- `DELETE /api/v1/applications/:applicationID/services/:serviceID`
- `POST /api/v1/applications/:applicationID/delivery-actions`
- `PUT /api/v1/applications/:applicationID`
- `DELETE /api/v1/applications/:applicationID`
- `GET /api/v1/build-templates`
- `POST /api/v1/build-templates`
- `PUT /api/v1/build-templates/:buildTemplateID`
- `DELETE /api/v1/build-templates/:buildTemplateID`
- `GET /api/v1/delivery/environments`
- `GET /api/v1/application-environments`
- `POST /api/v1/application-environments`
- `GET /api/v1/application-environments/:applicationEnvironmentID`
- `PUT /api/v1/application-environments/:applicationEnvironmentID`
- `DELETE /api/v1/application-environments/:applicationEnvironmentID`
- `GET /api/v1/application-environments/:applicationEnvironmentID/detail`
- `GET /api/v1/application-environments/target-candidates?clusterId=<required>&namespace=<required>&search=<optional>`
- `GET /api/v1/workflow-templates`
- `POST /api/v1/workflow-templates`
- `PUT /api/v1/workflow-templates/:workflowTemplateID`
- `DELETE /api/v1/workflow-templates/:workflowTemplateID`
- `POST /api/v1/delivery/plans`
- `GET /api/v1/delivery/plans/:planID`
- `POST /api/v1/delivery/plans/:planID/confirm`
- `GET /api/v1/delivery/release-board`
- `GET /api/v1/delivery/release-bundles?applicationId=<optional>&applicationEnvironmentId=<optional>&limit=50`
- `GET /api/v1/delivery/release-bundles/:bundleID`
- `GET /api/v1/delivery/release-bundles/:bundleID/artifacts`
- `GET /api/v1/delivery/execution-tasks?applicationId=<optional>&applicationEnvironmentId=<optional>&releaseBundleId=<optional>&status=<optional>&providerKind=<optional>&limit=50`
- `GET /api/v1/delivery/execution-tasks/:taskID`
- `GET /api/v1/delivery/execution-tasks/:taskID/artifacts`
- `GET /api/v1/delivery/artifacts`
- `POST /api/v1/delivery/execution-tasks/:taskID/cancel`
- `POST /api/v1/delivery/execution-tasks/:taskID/retry`
- `POST /api/v1/delivery/execution-callbacks`
- `GET /api/v1/delivery/execution-tasks/:taskID/runner-status`
- `GET /api/v1/builds?applicationId=<optional>&limit=50`
- `POST /api/v1/builds/trigger`
- `GET /api/v1/workflows?applicationId=<optional>&limit=50`
- `POST /api/v1/workflows/trigger`
- `POST /api/v1/workflows/:workflowRunID/approve`
- `POST /api/v1/workflows/:workflowRunID/reject`
- `GET /api/v1/releases?applicationId=<optional>&clusterId=<optional>&limit=50`
- `POST /api/v1/releases/trigger`
- `GET /api/v1/integrations/gitlab/projects?search=<optional>&limit=50`
- `GET /api/v1/integrations/gitlab/branches?projectId=<required>&search=<optional>&limit=50`
- `GET /api/v1/integrations/gitlab/tags?projectId=<required>&search=<optional>&limit=50`

控制台以创建并确认 `DeliveryPlan` 作为唯一交付写入口；直接触发构建、工作流和发布的端点继续作为兼容 API 保留。

## Copilot 接口

- `GET /api/v1/copilot/insights`
- `GET /api/v1/copilot/sessions`
- `GET /api/v1/copilot/sessions/:sessionID`
- `POST /api/v1/copilot/sessions`
- `PATCH /api/v1/copilot/sessions/:sessionID`
- `DELETE /api/v1/copilot/sessions/:sessionID`
- `GET /api/v1/copilot/sessions/:sessionID/messages`
- `POST /api/v1/copilot/sessions/:sessionID/messages`
- `POST /api/v1/copilot/sessions/:sessionID/messages/stream`
- `POST /api/v1/copilot/global-assistant/events`
- `POST /api/v1/copilot/sessions/:sessionID/analyze`
- `GET /api/v1/copilot/root-cause/runs`
- `POST /api/v1/copilot/root-cause/runs`
- `GET /api/v1/copilot/root-cause/runs/:runID`
- `GET /api/v1/copilot/agent-providers`
- `GET /api/v1/copilot/agent-runs`
- `GET /api/v1/copilot/data-source-capabilities`
- `GET /api/v1/copilot/data-sources`
- `POST /api/v1/copilot/data-sources`
- `PUT /api/v1/copilot/data-sources/:dataSourceID`
- `POST /api/v1/copilot/data-sources/:dataSourceID/validate`
- `GET /api/v1/copilot/analysis-profiles`
- `POST /api/v1/copilot/analysis-profiles`
- `PUT /api/v1/copilot/analysis-profiles/:profileID`
- `GET /api/v1/copilot/automation-policies`
- `POST /api/v1/copilot/automation-policies`
- `PUT /api/v1/copilot/automation-policies/:policyID`
- `GET /api/v1/copilot/inspection-tasks`
- `POST /api/v1/copilot/inspection-tasks`
- `PUT /api/v1/copilot/inspection-tasks/:taskID`
- `GET /api/v1/copilot/inspection-runs`
- `POST /api/v1/copilot/inspection-tasks/:taskID/execute`
- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`
- `POST /api/v1/copilot/agent-runs/tool-call`

`/copilot/agent-runs/claim`、`/copilot/agent-runs/callback` 与 `/copilot/agent-runs/tool-call` 是面向运行器的接口，要求携带 `Authorization: Bearer <runtime.execution_runner_token>`（或具备对应权限的服务账号令牌）。工具调用还必须附带当次运行的专属 `callbackToken`；控制平面仅执行 `AgentRun.toolBindings` 快照中允许的工具，并将执行结果记录为 `ToolExecution`。

`POST /copilot/root-cause/runs` 接收 `agentProviderId`、`analysisProfileId` 与 `triggerType`。当 `agentProviderId=internal` 时会同步运行内置分析流程；选择 `hermes` 等外部执行器时，服务端会先创建排队状态的根因分析业务运行单及关联的 `AgentRun`，随后由运行器回调写回最终分析结果。

## AI 平台接口

- `GET /api/v1/ai/agent-providers/catalog`
- `GET /api/v1/ai/agent-providers/runtime-status`
- `GET /api/v1/ai/agent-providers/registry-snapshot`
- `POST /api/v1/ai/agent-providers/registry-acks`
- `GET /api/v1/ai/agent-providers/rollouts`
- `POST /api/v1/ai/agent-providers/rollouts`
- `POST /api/v1/ai/agent-providers/rollouts/:rolloutID/:rolloutAction`
- `GET /api/v1/ai/agent-providers/conformance-runs`
- `POST /api/v1/ai/agent-providers/conformance-runs`
- `GET /api/v1/ai/agent-runs/multi-agent`
- `POST /api/v1/ai/agent-runs/multi-agent`
- `POST /api/v1/ai/agent-runs/multi-agent/:planID/subtasks/:subtaskID/complete`
- `POST /api/v1/ai/agent-runs/multi-agent/:planID/cancel`
- `GET /api/v1/ai/knowledge-bases`
- `POST /api/v1/ai/knowledge-bases`
- `GET /api/v1/ai/knowledge-bases/:baseID`
- `PATCH /api/v1/ai/knowledge-bases/:baseID`
- `DELETE /api/v1/ai/knowledge-bases/:baseID`
- `GET /api/v1/ai/knowledge-bases/:baseID/sources`
- `POST /api/v1/ai/knowledge-bases/:baseID/sources`
- `POST /api/v1/ai/knowledge-bases/:baseID/sources/:sourceID/sync`
- `GET /api/v1/ai/knowledge-bases/:baseID/documents`
- `GET /api/v1/ai/knowledge-bases/:baseID/sync-runs`
- `GET /api/v1/ai/knowledge-bases/:baseID/index-revisions`
- `GET /api/v1/ai/knowledge-bases/:baseID/graph-revisions`
- `POST /api/v1/ai/knowledge-bases/:baseID/graph-revisions`
- `POST /api/v1/ai/knowledge-bases/:baseID/graph-revisions/:revisionID/publish`
- `POST /api/v1/ai/knowledge-bases/:baseID/graph-revisions/:revisionID/query`
- `POST /api/v1/ai/knowledge-bases/:baseID/rebuild`
- `POST /api/v1/ai/knowledge/search`
- `POST /api/v1/ai/context/inspect`
- `GET /api/v1/ai/knowledge/connectors`
- `POST /api/v1/ai/knowledge/connectors`
- `POST /api/v1/ai/knowledge/connectors/:connectorID/validate`
- `POST /api/v1/ai/knowledge-bases/:baseID/sync-jobs`
- `GET /api/v1/ai/knowledge/sync-jobs/:jobID`
- `POST /api/v1/ai/knowledge/sync-jobs/:jobID/cancel`
- `POST /api/v1/ai/knowledge/sync-jobs/:jobID/retry`
- `GET /api/v1/ai/evaluations/datasets`
- `POST /api/v1/ai/evaluations/datasets`
- `GET /api/v1/ai/evaluations/runs`
- `POST /api/v1/ai/evaluations/runs`
- `GET /api/v1/ai/evaluations/runs/:runID`
- `GET /api/v1/ai/evaluations/runs/:runID/results`
- `POST /api/v1/ai/evaluations/runs/:runID/complete`
- `GET /api/v1/ai/evaluations/executor-profiles`
- `POST /api/v1/ai/evaluations/executor-profiles`
- `POST /api/v1/ai/evaluations/runs/:runID/execute`
- `GET /api/v1/ai/evaluations/runs/:runID/attempts`
- `GET /api/v1/ai/evaluations/replays`
- `POST /api/v1/ai/evaluations/replays`
- `GET /api/v1/ai/evaluations/gate-policies`
- `POST /api/v1/ai/evaluations/gate-policies`
- `GET /api/v1/ai/evaluations/gate-decisions`
- `POST /api/v1/ai/evaluations/gates/evaluate`
- `GET /api/v1/ai/evaluations/feedback`
- `POST /api/v1/ai/evaluations/feedback`
- `GET /api/v1/ai/memory/policies`
- `POST /api/v1/ai/memory/policies`
- `GET /api/v1/ai/memory`
- `POST /api/v1/ai/memory`
- `DELETE /api/v1/ai/memory/:memoryID`
- `GET /api/v1/ai/environments/templates`
- `POST /api/v1/ai/environments/templates`
- `GET /api/v1/ai/environments/leases`
- `POST /api/v1/ai/environments/leases/:leaseID/release`
- `POST /api/v1/ai/environments/gc`
- `GET /api/v1/ai/operations`
- `POST /api/v1/ai/operations`
- `GET /api/v1/ai/operations/runbook-evidence`

## AI Gateway 接口

公开契约 `../soha/contracts/openapi/soha-api.yaml` 当前覆盖以下 AI Gateway、访问令牌、审计、审批、治理状态、模型中继与 MCP 能力边界：

- `GET /api/v1/ai-gateway/capabilities`
- `POST /api/v1/ai-gateway/plans/validate`
- `POST /api/v1/ai-gateway/tasks`
- `GET /api/v1/ai-gateway/tasks`
- `GET /api/v1/ai-gateway/tasks/:taskId`
- `POST /api/v1/ai-gateway/tasks/:taskId/resume`
- `POST /api/v1/ai-gateway/tasks/:taskId/cancel`
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
- `POST /api/v1/ai-gateway/governed-credentials/personal-access-tokens`
- `POST /api/v1/ai-gateway/governed-credentials/personal-access-tokens/:tokenID/rotate`
- `POST /api/v1/ai-gateway/governed-credentials/service-accounts/:serviceAccountID/tokens`
- `POST /api/v1/ai-gateway/governed-credentials/service-account-tokens/:tokenID/rotate`
- `GET /api/v1/ai-gateway/audit-logs`
- `GET /api/v1/ai-gateway/approval-requests`
- `GET /api/v1/ai-gateway/approval-requests/:requestID/timeline`
- `POST /api/v1/ai-gateway/approval-requests/:requestID/:action`
- `POST /api/v1/ai-gateway/approval-requests/:requestID/approve`
- `POST /api/v1/ai-gateway/approval-requests/:requestID/reject`
- `POST /api/v1/ai-gateway/approval-requests/:requestID/cancel`
- `GET /api/v1/ai-gateway/governance/status`
- `GET /api/v1/ai-gateway/relay/upstreams`
- `POST /api/v1/ai-gateway/relay/upstreams`
- `PUT /api/v1/ai-gateway/relay/upstreams/:upstreamID`
- `POST /api/v1/ai-gateway/relay/upstreams/test`
- `POST /api/v1/ai-gateway/relay/upstreams/health-checks/run`
- `POST /api/v1/ai-gateway/relay/upstreams/:upstreamID/test`
- `GET /api/v1/ai-gateway/relay/model-routes`
- `POST /api/v1/ai-gateway/relay/model-routes`
- `PUT /api/v1/ai-gateway/relay/model-routes/:routeID`
- `DELETE /api/v1/ai-gateway/relay/model-routes/:routeID`
- `GET /api/v1/ai-gateway/relay/model-calls`
- `GET /api/v1/ai-gateway/relay/metrics`
- `GET /api/v1/ai-gateway/llm/openai/v1/models`
- `POST /api/v1/ai-gateway/llm/openai/v1/chat/completions`
- `POST /api/v1/ai-gateway/llm/openai/v1/responses`
- `POST /api/v1/ai-gateway/llm/openai/v1/embeddings`
- `POST /api/v1/ai-gateway/llm/openai/v1/images/generations`
- `POST /api/v1/ai-gateway/llm/openai/v1/images/edits`
- `POST /api/v1/ai-gateway/llm/openai/v1/images/variations`
- `POST /api/v1/ai-gateway/llm/openai/v1/audio/speech`
- `POST /api/v1/ai-gateway/llm/openai/v1/audio/transcriptions`
- `POST /api/v1/ai-gateway/llm/openai/v1/audio/translations`
- `GET /api/v1/ai-gateway/llm/openai/v1/realtime`
- `GET /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/models`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/chat/completions`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/responses`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/embeddings`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/images/generations`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/images/edits`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/images/variations`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/audio/speech`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/audio/transcriptions`
- `POST /api/v1/ai-gateway/llm/:openaiCompatibleProvider/v1/audio/translations`
- `GET /api/v1/ai-gateway/llm/gemini/v1beta/models`
- `POST /api/v1/ai-gateway/llm/gemini/v1beta/models`
- `POST /api/v1/ai-gateway/llm/gemini/v1beta/models/:geminiModel:generateContent`
- `POST /api/v1/ai-gateway/llm/gemini/v1beta/models/:geminiModel:streamGenerateContent`
- `POST /api/v1/ai-gateway/llm/gemini/v1beta/interactions`
- `POST /api/v1/ai-gateway/llm/cohere/v2/rerank`
- `GET /api/v1/ai-gateway/llm/anthropic/v1/models`
- `POST /api/v1/ai-gateway/llm/anthropic/v1/messages`
- `GET /api/v1/mcp/capabilities`

## 插件市场接口

- `GET /api/v1/marketplace/index.json`
- `GET /api/v1/marketplace/plugins/:pluginID/:version/plugin.manifest.json`

同一 OpenAPI 工件中已预留、但当前后端尚未挂载路由的中继缓存契约端点：

- `GET /api/v1/ai-gateway/relay/cache/stats`
- `POST /api/v1/ai-gateway/relay/cache/purge`

`/ai-gateway/capabilities` 返回经后端权限过滤后对当前调用主体可见的 AI 原生工具、资源、提示词和技能清单。建议 AI 客户端在可用时附带 `X-Soha-AI-Client-ID`、`X-Soha-AI-Client` 与 `X-Soha-Skill-ID` 请求头，以便审计记录清晰区分人类用户、服务账号、客户端应用、技能与具体工具调用上下文。

`/ai-gateway/plans/validate` 在执行前校验能力计划；`/ai-gateway/tasks` 创建和列出持久化任务，每一步执行时都会重新检查权限和当前条件。恢复任务会创建新的计划版本；取消任务不会回滚已完成步骤的副作用。

`/ai-gateway/tools/:toolName/invoke` 是 MCP、CLI 与 AI 智能体共用的统一工具调用入口。该接口必须逐次复核 Gateway 权限、领域权限、资源范围（Scope）、工具授权（Grant）及风险策略，随后委托给所属业务应用服务执行，不得绕过 `soha` 控制平面逻辑。

`/ai-gateway/resources/read` 与 `/ai-gateway/prompts/get` 是完全收敛在后端的 MCP 资源读取与提示词获取边界。本地 `soha mcp` 进程仅代理转发这些请求，不在客户端本地拼装受权限保护的资源文档或提示词内容。

`/ai-gateway/governance/status` 是只读的 Gateway 治理运营概览端点，用于汇总近期审计统计、待处理审批、令牌与客户端风险发现、策略覆盖率、高风险护栏巡检结果、敏感字段脱敏覆盖率以及资源范围绑定覆盖率。

`/ai-gateway/approval-requests/:requestID/:action` 支持 `approve`、`reject` 与 `cancel` 三种动作；上方同时列出了展开后的具体动作路径，供 CLI 与运维手册直接调用。审批通过后的重放执行仍在 Gateway 应用服务内完成，并会重新校验原始工具授权、访问策略、技能绑定、当前有效权限与目标业务服务的授权规则。

`/ai-gateway/relay/*` 用于管理模型中继上游（Upstream）、模型路由规则、模型调用日志与运行指标；响应缓存统计与清理契约预留给后续响应缓存阶段。管理类接口统一采用 OpenSoha 标准响应信封，并要求具备中继查看或管理权限。

`/ai-gateway/llm/*` 面向标准模型 SDK 暴露 OpenAI、Anthropic、Gemini、Cohere 以及 OpenAI 兼容提供商接口，覆盖模型发现、对话与 Responses、向量嵌入（Embeddings）、图像与音频处理、实时流（Realtime）以及重排序（Rerank）等上游支持的能力。这些端点通过 `Authorization: Bearer` 或 `x-api-key` 接收既有的 `soha_pat_` 与 `soha_sat_` 凭据，要求令牌显式包含中继授权元数据，并直接返回原生提供商格式的 JSON 或流式响应，不额外包裹 OpenSoha 响应信封。

### 公开契约状态（Public OpenAPI contract status）

- 已纳入公开契约的 Gateway 运行时、令牌、审计、审批、治理与 MCP 能力端点均已列于上方，并由测试脚本自动核对 `../soha/contracts/openapi/soha-api.yaml`。
- 待纳入契约（Pending contracts addition — not yet included in the public OpenAPI artifact）：以下控制台管理端点已在 Core 与 Web 的 Gateway 工作台中实现，但尚未写入公开 OpenAPI 契约工件：

- `GET /api/v1/ai-gateway/ai-clients`
- `POST /api/v1/ai-gateway/ai-clients`
- `PUT /api/v1/ai-gateway/ai-clients/:clientID`
- `GET /api/v1/ai-gateway/tool-grants`
- `POST /api/v1/ai-gateway/tool-grants`
- `DELETE /api/v1/ai-gateway/tool-grants/:grantID`
- `GET /api/v1/ai-gateway/access-policies`
- `POST /api/v1/ai-gateway/access-policies`
- `PUT /api/v1/ai-gateway/access-policies/:policyID`
- `DELETE /api/v1/ai-gateway/access-policies/:policyID`
- `GET /api/v1/ai-gateway/skill-bindings`
- `POST /api/v1/ai-gateway/skill-bindings`
- `PUT /api/v1/ai-gateway/skill-bindings/:bindingID`
- `DELETE /api/v1/ai-gateway/skill-bindings/:bindingID`

当前内置 Gateway 工具名称清单：

- `delivery.applications.list`
- `delivery.applications.detail`
- `delivery.applications.create`
- `delivery.application_environments.list`
- `delivery.application_services.list`
- `delivery.build_sources.list`
- `delivery.release_targets.list`
- `delivery.actions.trigger`
- `delivery.release_bundles.list`
- `delivery.execution_tasks.list`
- `delivery.execution_logs.list`
- `delivery.workflow_templates.list`
- `delivery.release_context.diff`
- `delivery.rollback.context`
- `k8s.pods.list`
- `k8s.pods.logs`
- `k8s.pods.describe`
- `k8s.deployments.list`
- `k8s.deployments.rollout_status`
- `k8s.deployments.events`
- `k8s.services.list`
- `k8s.services.backends`
- `k8s.routes.context`
- `k8s.storage.context`
- `k8s.nodes.detail`
- `k8s.events.list`
- `diagnosis.release_failure.analyze`

Kubernetes 相关工具均为只读工具，统一通过平台资源应用服务路由执行；Gateway 在将日志返回给 MCP 或 CLI 调用方前会对常见敏感字段执行基础脱敏。

个人访问令牌（PAT）与服务账号令牌（SAT）在创建和轮换响应中仅一次性返回明文令牌值；数据库只持久化哈希值与显示前缀，调用方必须将返回的明文凭据妥善保存在本地 CLI 或 MCP 凭据存储中。

AI 客户端、工具授权、访问策略与技能绑定管理端点均要求 `ai.gateway.manage` 权限。工具授权、访问策略与技能绑定支持 `user`、`service_account`、`role` 与 `ai_client` 四类主体；运行时评估会合并主体、角色与客户端维度的规则：拒绝（Deny）策略与授权始终优先，允许（Allow）记录构成白名单，技能绑定仅用于收敛可见的技能与能力引用，不会额外放大已有权限。

每次工具调用都会同时写入平台标准审计表与 `ai_gateway_audit_logs` 专用审计表。AI Gateway 专用审计记录保存操作者、AI 客户端、技能、工具名称、风险等级、资源范围、请求/结果状态及关联单据 ID，不会落盘完整令牌、kubeconfig、原始容器日志或未裁剪的全量工具输入。

## 应用请求载荷示例

```json
{
  "id": "billing-api",
  "name": "Billing API",
  "key": "billing-api",
  "group": "commerce",
  "language": "Go",
  "description": "Core billing service",
  "ownerTeam": "platform",
  "repositoryProvider": "gitlab",
  "repositoryProjectId": "12345",
  "repositoryPath": "platform/billing-api",
  "defaultBranch": "main",
  "defaultTag": "v1.0.0",
  "buildImage": "registry.example.com/platform/billing-api",
  "buildContextDir": ".",
  "dockerfilePath": "Dockerfile",
  "buildSources": [
    {
      "id": "default:billing-api",
      "name": "Repository Dockerfile",
      "type": "repo_dockerfile",
      "enabled": true,
      "isDefault": true,
      "buildImage": "registry.example.com/platform/billing-api",
      "defaultTag": "v1.0.0",
      "config": {
        "contextDir": ".",
        "dockerfilePath": "Dockerfile",
        "builderKind": "docker"
      }
    }
  ],
  "enabled": true,
  "metadata": {
    "tier": "core"
  }
}
```

## 构建触发载荷示例

```json
{
  "applicationId": "billing-api",
  "applicationEnvironmentId": "binding-prod",
  "buildSourceId": "default:billing-api",
  "refType": "branch",
  "refName": "main",
  "imageTag": "billing-api:manual-20260322",
  "buildArgs": {
    "profile": "default"
  },
  "variables": {
    "GO_VERSION": "1.24"
  }
}
```

## 执行回调载荷示例

```json
{
  "callbackToken": "task-callback-token",
  "status": "completed",
  "payload": {
    "logs": [
      "checkout source",
      "build image completed"
    ],
    "image": "registry.example.com/platform/billing-api:20260505",
    "imageDigest": "sha256:..."
  }
}
```

## 告警 Webhook 载荷示例

```json
{
  "source": "alertmanager",
  "alerts": [
    {
      "fingerprint": "cpu-high-prod-1",
      "title": "CPUHigh",
      "summary": "CPU usage exceeded threshold",
      "severity": "critical",
      "status": "firing",
      "clusterId": "local",
      "namespace": "default",
      "labels": {
        "alertname": "CPUHigh",
        "team": "platform"
      },
      "annotations": {
        "runbook": "https://example.internal/runbooks/cpu-high"
      },
      "receiver": "platform-default",
      "generatorUrl": "http://prometheus.local/graph"
    }
  ]
}
```

请求头：

- `X-Soha-Webhook-Token: <monitoring.webhook_token>`
  或
- `Authorization: Bearer <monitoring.webhook_token>`

## 通知渠道载荷示例

```json
{
  "id": "platform-default-webhook",
  "name": "Platform Default Webhook",
  "channelType": "webhook",
  "enabled": true,
  "config": {
    "url": "https://notify.example.internal/hooks/platform-alerts",
    "method": "POST"
  }
}
```

## 集群注册载荷示例

### 直连 kubeconfig 模式

```json
{
  "id": "direct-prod-01",
  "name": "Direct Production 01",
  "region": "cn-shanghai",
  "environment": "production",
  "labels": {
    "provider": "kubeconfig",
    "owner": "platform"
  },
  "connectionMode": "direct_kubeconfig",
  "kubeconfig": "apiVersion: v1\n..."
}
```

### Agent 连接模式

```json
{
  "id": "edge-prod-01",
  "name": "Edge Production 01",
  "region": "cn-shanghai",
  "environment": "production",
  "labels": {
    "provider": "agent",
    "owner": "platform"
  },
  "connectionMode": "agent",
  "agentEndpoint": "https://agent.example.internal",
  "agentToken": "optional-bearer-token"
}
```
