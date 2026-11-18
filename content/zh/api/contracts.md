# API 与 Contracts

主仓 `soha/contracts` 是跨仓库与跨组件共享的公开契约真实源。任何影响公开 HTTP 接口行为、JSON 传输结构、Agent 协议、MCP 清单、Skill 清单、插件清单、事件信封或鉴权声明（Claims）的变更，都必须先更新 `soha/contracts` 并重新生成配套 SDK，随后再推进各个消费端仓库与模块。

当前文档站 CI 固定检出主仓 `soha` 的指定提交，并直接读取 `../soha/contracts` 执行契约对齐校验。本页维护当前契约版本信息、核心工件说明与操作概览；全量操作与 JSON Schema 索引由自动生成的 [API 参考索引](./reference/generated/index.md) 持续校验。若同级目录缺少主仓检出，运行 `npm test` 会失败并提示先检出主仓 `soha`（`../soha/contracts` 子目录）。

## 当前契约版本

- OpenAPI title: `Soha API`
- OpenAPI version: `0.2.0`
- 源契约工件：`openapi/soha-api.yaml`
- 生成契约工件：`openapi/soha-api.json`
- Go 工件包：`github.com/opensoha/soha/contracts/openapi`
- npm 包：`@opensoha/contracts`

本页与自动生成的参考索引对应已发布的契约标签 `contracts/v0.2.0`，文档 CI 固定绑定到该标签对应的主仓源码提交。前端与 Node 生态消费 `@opensoha/contracts@0.2.0`，官方 Go 模块代理消费 `github.com/opensoha/soha/contracts@v0.2.0`。历史独立仓库源码与原始发行附件已归档保全在主仓历史记录中；旧独立仓库退役后，历史下载地址与旧导入路径不再作为受支持入口。

## 契约目录

以下目录树展示了具有代表性的公开契约工件；完整导出列表以自动生成的 [API 参考索引](./reference/generated/index.md) 与 `soha/contracts/package.json` 的 `exports` 声明为准：

```text
soha/contracts/
  openapi/
    soha-api.yaml
    soha-api.json
    spec_generated.go
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
    gateway-capability-baseline.schema.json
    gateway-manifest.schema.json
  skills/
    skill-manifest.schema.json
  plugins/
    marketplace-catalog.schema.json
    plugin-manifest.schema.json
  events/
    event-envelope.schema.json
  auth/
    token-claims.schema.json
  connectors/
    connector-event-envelope.schema.json
```

基础 npm 导出包括：

- `openapi/soha-api.yaml`
- `openapi/soha-api.json`
- `capabilities/cluster-capability-matrix.schema.json`
- `profiles/agent-profile.schema.json`
- `presets/mcp-preset.schema.json`
- `governance/approval-request.schema.json`
- `governance/audit-log.schema.json`
- `agent/agent-protocol.schema.json`
- `runner/operation-lifecycle.schema.json`
- `mcp/gateway-capability-baseline.schema.json`
- `mcp/gateway-manifest.schema.json`
- `skills/skill-manifest.schema.json`
- `plugins/marketplace-catalog.schema.json`
- `plugins/plugin-manifest.schema.json`
- `events/event-envelope.schema.json`
- `auth/token-claims.schema.json`
- `connectors/connector-event-envelope.schema.json`

## JSON Schema 工件要点

### 集群能力矩阵（Cluster Capability Matrix）

- 文件：`capabilities/cluster-capability-matrix.schema.json`
- 标题：`OpenSoha Cluster Capability Matrix`
- `$id`：`https://contracts.opensoha.dev/capabilities/cluster-capability-matrix.schema.json`
- 必填字段：`items`
- 适用范围：定义直连（Direct）与 Agent 两种集群接入模式下的运行时能力对齐矩阵、降级支持状态及原因说明、操作风险等级、审批预期以及所需权限范围（Scopes），供 Core、Web 控制台、CLI、Agent、Skills、连接器及外部扩展点统一消费。

### Agent 配置档案（Agent Profile）

- 文件：`profiles/agent-profile.schema.json`
- 标题：`OpenSoha Agent Profile`
- `$id`：`https://contracts.opensoha.dev/profiles/agent-profile.schema.json`
- 必填字段：`schemaVersion`, `id`, `name`, `version`, `description`, `mode`, `providerKind`, `skillRefs`, `mcpPresetRefs`, `capabilityRefs`, `platformCapabilityRefs`, `requiredScopes`, `enabledToolRefs`, `guardrails`
- 适用范围：约束 Agent 运行时配置档案资产，统一声明其绑定的技能引用、MCP 预设引用、集群与平台能力引用、必需权限范围、启用工具列表、执行预算上限以及安全护栏规则。

### MCP 预设（MCP Preset）

- 文件：`presets/mcp-preset.schema.json`
- 标题：`OpenSoha MCP Preset`
- `$id`：`https://contracts.opensoha.dev/presets/mcp-preset.schema.json`
- 必填字段：`schemaVersion`, `id`, `name`, `version`, `description`, `riskLevel`, `skillRefs`, `platformCapabilityRefs`, `requiredScopes`, `tools`, `guardrails`
- 适用范围：封装面向特定运维或交付场景的 MCP 预设资产包，聚合 AI Gateway 工具清单、只读资源、提示词模板、所需权限范围、平台能力引用、风险等级与调用护栏约束。

### 治理审批请求（Governance Approval Request）

- 文件：`governance/approval-request.schema.json`
- 标题：`OpenSoha Approval Request`
- `$id`：`https://contracts.opensoha.dev/governance/approval-request.schema.json`
- 必填字段：`id`, `status`, `strategy`, `actorType`, `actorId`, `toolName`, `riskLevel`, `requiresApproval`, `summary`, `createdAt`, `updatedAt`
- 适用范围：标准化高风险操作的审批单据、审批链路追踪、审批人裁决结果、多阶段流转状态及时间线事件，供 AI Gateway、控制平面、CLI、Web 控制台与外部治理扩展点共同使用。

### 治理审计日志（Governance Audit Log）

- 文件：`governance/audit-log.schema.json`
- 标题：`OpenSoha Audit Log`
- `$id`：`https://contracts.opensoha.dev/governance/audit-log.schema.json`
- 必填字段：`id`, `actorType`, `actorId`, `action`, `result`, `summary`, `createdAt`
- 适用范围：定义跨 AI Gateway、核心控制平面、连接器运行时、插件体系、技能调用与外部扩展点的统一审计日志结构，确保主体身份、动作语义、裁决结果与上下文摘要具备一致的可检索格式。

### Agent 协议（Agent Protocol）

- 文件：`agent/agent-protocol.schema.json`
- 标题：`Soha Agent Protocol`
- `$id`：`https://contracts.opensoha.dev/agent/agent-protocol.schema.json`
- 适用范围：约束面向运行器（Runner）的任务认领（Claim）、执行回调（Callback）、Docker 容器运维操作、Agent 运行时状态回调以及 Agent 运行时工具调用等跨进程通信载荷。

### 运行器操作生命周期（Runner Operation Lifecycle）

- 文件：`runner/operation-lifecycle.schema.json`
- 标题：`OpenSoha Runner Operation Lifecycle`
- `$id`：`https://contracts.opensoha.dev/runner/operation-lifecycle.schema.json`
- 必填字段：`operationId`, `operationKind`, `runnerId`, `state`, `occurredAt`
- 适用范围：统一记录应用交付、Docker 容器操作、虚拟机任务、AI 模型提供商调用、Agent 异步运行以及连接器动作等长耗时运行器任务的状态流转轨迹与心跳面包屑。

### AI Gateway 清单（AI Gateway Manifest）

- 文件：`mcp/gateway-manifest.schema.json`
- 标题：`Soha AI Gateway Manifest`
- `$id`：`https://contracts.opensoha.dev/mcp/gateway-manifest.schema.json`
- 必填字段：`name`, `version`, `generatedAt`, `principal`, `caller`, `permissionKeys`, `tools`, `summary`
- 适用范围：描述经后端权限与策略过滤后返回给当前调用主体的可用工具、资源、提示词、技能列表、调用方身份上下文以及能力摘要，供 CLI、MCP 客户端、AI 智能体和控制台界面消费。

### AI Gateway 能力基线（AI Gateway Capability Baseline）

- 文件：`mcp/gateway-capability-baseline.schema.json`
- 标题：`Soha AI Gateway Capability Baseline`
- `$id`：`https://contracts.opensoha.dev/mcp/gateway-capability-baseline.schema.json`
- 必填字段：`schemaVersion`, `version`, `source`, `tools`
- 适用范围：维护带版本号的 AI Gateway 标准工具能力基线快照，供核心服务端、CLI、Agent 运行时、官方技能包以及跨版本契约兼容性检查共同核对。

### Skill 清单（Skill Manifest）

- 文件：`skills/skill-manifest.schema.json`
- 标题：`Soha Skill Manifest`
- `$id`：`https://contracts.opensoha.dev/skills/skill-manifest.schema.json`
- 必填字段：`id`, `name`, `category`
- 适用范围：定义官方或第三方运维与交付技能包的标识元数据、关联平台能力引用、所需权限键、安装提示以及安全操作指引。

### 插件清单（Plugin Manifest）

- 文件：`plugins/plugin-manifest.schema.json`
- 标题：`OpenSoha Plugin Manifest`
- `$id`：`https://contracts.opensoha.dev/plugins/plugin-manifest.schema.json`
- 必填字段：`id`, `name`, `version`, `publisher`, `type`
- 适用范围：声明插件的身份标识、发布者、包分发来源、所需平台权限声明、依赖约束、运行时入口点以及可选随附技能资产。

### 插件市场目录（Marketplace Catalog）

- 文件：`plugins/marketplace-catalog.schema.json`
- 标题：`OpenSoha Marketplace Catalog`
- `$id`：`https://contracts.opensoha.dev/plugins/marketplace-catalog.schema.json`
- 必填字段：`schemaVersion`, `generatedAt`, `sourceId`, `plugins`
- 适用范围：定义公开插件市场目录索引的元数据与多版本插件条目结构，供控制台与 CLI 的扩展发现与安装流程读取校验。

### 事件信封（Event Envelope）

- 文件：`events/event-envelope.schema.json`
- 标题：`Soha Event Envelope`
- `$id`：`https://contracts.opensoha.dev/events/event-envelope.schema.json`
- 必填字段：`id`, `source`, `category`, `severity`, `summary`
- 适用范围：统一封装平台审计、应用交付、监控告警、安全治理与集群运行时的标准化事件信封，支持跨领域关联检索与流式分发。

### 令牌声明（Token Claims）

- 文件：`auth/token-claims.schema.json`
- 标题：`Soha Token Claims`
- `$id`：`https://contracts.opensoha.dev/auth/token-claims.schema.json`
- 必填字段：`sub`, `exp`, `iat`, `tokenId`, `tokenKind`, `subjectType`, `subjectId`
- 适用范围：约束 Bearer 访问令牌中的主体身份标识、过期与签发时间、令牌唯一 ID、令牌类别、主体类型（用户或服务账号）以及可选的权限与作用范围声明。

### 连接器事件信封（Connector Event Envelope）

- 文件：`connectors/connector-event-envelope.schema.json`
- 标题：`OpenSoha Connector Event Batch Envelope`
- `$id`：`https://contracts.opensoha.dev/connectors/connector-event-envelope.schema.json`
- 必填字段：`connectorId`, `events`
- 适用范围：定义与具体第三方平台解耦的连接器运行时批量事件上报结构，在进入 Soha 核心控制平面完成持久化入库与幂等去重前提供统一校验边界。

## AI 平台 JSON Schema 工件

以下契约覆盖 AI 平台的四大核心子域：Agent 执行器与多智能体编排（`agent/*`）、评测数据集与门禁裁决（`evaluation/*`）、企业知识库采集与检索追踪（`knowledge/*`）以及受策略治理的显式长期记忆（`memory/*`）：

- `agent/agent-provider-definition.schema.json` — Agent 执行器定义（`Agent Provider Definition`），约束适配器协议、运行时形态与声明能力；`$id`：`https://opensoha.dev/schemas/agent-provider-definition.schema.json`；必填字段：`schemaVersion`, `id`, `kind`, `providerVersion`, `adapterProtocol`, `runtime`, `capabilities`。
- `agent/agent-provider-registry.schema.json` — Agent 执行器注册表快照（`Agent Provider Registry Snapshot`），用于下发带摘要校验的执行器目录版本；`$id`：`https://opensoha.dev/schemas/agent-provider-registry.schema.json`；必填字段：`schemaVersion`, `revision`, `digest`, `issuedAt`, `providers`。
- `agent/agent-run-step.schema.json` — Agent 运行步骤记录（`Agent Run Step`），追踪单次运行内的序号、重试次数与上下文引用；`$id`：`https://opensoha.dev/schemas/agent-run-step.schema.json`；必填字段：`schemaVersion`, `id`, `runId`, `sequence`, `attempt`, `state`, `contextRef`, `startedAt`。
- `agent/agent-observation.schema.json` — Agent 观测证据项（`Agent Observation`），记录步骤产出的脱敏状态与观测摘要；`$id`：`https://opensoha.dev/schemas/agent-observation.schema.json`；必填字段：`schemaVersion`, `id`, `runId`, `stepId`, `kind`, `status`, `summary`, `redacted`, `observedAt`。
- `agent/agent-checkpoint.schema.json` — Agent 状态检查点（`Agent Checkpoint`），保存可恢复的步骤状态哈希与上下文指针；`$id`：`https://opensoha.dev/schemas/agent-checkpoint.schema.json`；必填字段：`schemaVersion`, `id`, `runId`, `stepId`, `attempt`, `sequence`, `stateHash`, `contextRef`, `createdAt`。
- `agent/environment-lease.schema.json` — Agent 执行环境租约（`Agent Environment Lease`），约束隔离模式、资源配额与租约有效期；`$id`：`https://opensoha.dev/schemas/environment-lease.schema.json`；必填字段：`schemaVersion`, `id`, `runId`, `ownerId`, `scopeHash`, `mode`, `quota`, `issuedAt`, `expiresAt`。
- `agent/environment-snapshot.schema.json` — Agent 执行环境快照（`Agent Environment Snapshot`），记录租约期内的实时状态与资源用量；`$id`：`https://opensoha.dev/schemas/environment-snapshot.schema.json`；必填字段：`schemaVersion`, `leaseId`, `runId`, `state`, `resourceUsage`, `observedAt`。
- `agent/agent-provider-runtime-event.schema.json` — Agent 执行器运行时事件（`Agent Provider Runtime Event`），上报运行器侧版本与生命周期变化；`$id`：`https://opensoha.dev/schemas/agent-provider-runtime-event.schema.json`；必填字段：`schemaVersion`, `eventType`, `runnerId`, `revision`, `observedAt`。
- `agent/fleet-target.schema.json` — Agent 集群目标定义（`Agent Fleet Target`），描述执行器灰度发布的目标范围；`$id`：`https://opensoha.dev/schemas/agent/fleet-target.schema.json`；必填字段：`schemaVersion`。
- `agent/provider-rollout.schema.json` — Agent 执行器发布单（`Agent Provider Rollout`），跟踪目标修订与上一稳定修订的切换状态；`$id`：`https://opensoha.dev/schemas/agent/provider-rollout.schema.json`；必填字段：`schemaVersion`, `id`, `desiredRevision`, `previousRevision`, `target`, `status`, `createdAt`。
- `agent/conformance-run.schema.json` — Agent 执行器一致性测试记录（`Agent Provider Conformance Run`），校验执行器与目标环境的协议合规性；`$id`：`https://opensoha.dev/schemas/agent/conformance-run.schema.json`；必填字段：`schemaVersion`, `id`, `providerRef`, `environmentRef`, `suiteVersion`, `status`, `results`, `startedAt`。
- `agent/environment-template.schema.json` — Agent 执行环境模板（`Agent Environment Template`），预置后端类型、隔离级别、配额与默认存活时长；`$id`：`https://opensoha.dev/schemas/agent/environment-template.schema.json`；必填字段：`schemaVersion`, `id`, `version`, `backend`, `isolationMode`, `quota`, `ttlSeconds`, `enabled`。
- `agent/multi-agent-plan.schema.json` — 受界多智能体协同计划（`Bounded Multi-Agent Plan`），定义协调器、子任务拆分与共享预算上限；`$id`：`https://opensoha.dev/schemas/agent/multi-agent-plan.schema.json`；必填字段：`schemaVersion`, `id`, `coordinatorRef`, `subtasks`, `sharedBudget`, `status`, `createdAt`。
- `evaluation/evaluation-dataset.schema.json` — 评测数据集（`Evaluation Dataset`），管理版本化的基准评测样本集合；`$id`：`https://opensoha.dev/schemas/evaluation-dataset.schema.json`；必填字段：`schemaVersion`, `id`, `name`, `version`, `samples`, `createdAt`。
- `evaluation/evaluation-run.schema.json` — 评测运行记录（`Evaluation Run`），关联数据集版本、被测候选对象与运行状态；`$id`：`https://opensoha.dev/schemas/evaluation-run.schema.json`；必填字段：`schemaVersion`, `id`, `datasetId`, `datasetVersion`, `candidateRefs`, `status`, `startedAt`。
- `evaluation/evaluation-result.schema.json` — 单样本评测结果（`Evaluation Result`），记录多维评分明细与是否达标；`$id`：`https://opensoha.dev/schemas/evaluation-result.schema.json`；必填字段：`schemaVersion`, `sampleId`, `scores`, `passed`。
- `evaluation/executor-profile.schema.json` — 评测执行器配置（`Evaluation Executor Profile`），定义评测沙箱环境策略、隔离模式与超时限制；`$id`：`https://opensoha.dev/schemas/evaluation/executor-profile.schema.json`；必填字段：`schemaVersion`, `id`, `environmentPolicy`, `isolationMode`, `timeoutSeconds`, `enabled`。
- `evaluation/sample-attempt.schema.json` — 评测样本执行尝试（`Evaluation Sample Attempt`），记录单次尝试的耗时、候选对象与完成状态；`$id`：`https://opensoha.dev/schemas/evaluation/sample-attempt.schema.json`；必填字段：`schemaVersion`, `runId`, `sampleId`, `attempt`, `candidateRefs`, `status`, `latencyMillis`, `completedAt`。
- `evaluation/replay-plan.schema.json` — 评测轨迹重放计划（`Evaluation Replay Plan`），支持基于历史追踪记录在只读约束下对比候选版本；`$id`：`https://opensoha.dev/schemas/evaluation/replay-plan.schema.json`；必填字段：`schemaVersion`, `id`, `sourceTraceRefs`, `candidateRefs`, `executorProfileId`, `readOnly`, `createdAt`。
- `evaluation/gate-policy.schema.json` — 评测门禁策略（`Evaluation Gate Policy`），声明准出所需的最低指标阈值；`$id`：`https://opensoha.dev/schemas/evaluation/gate-policy.schema.json`；必填字段：`schemaVersion`, `id`, `version`, `minimumScores`, `enabled`。
- `evaluation/gate-decision.schema.json` — 评测门禁裁决记录（`Evaluation Gate Decision`），保存基线运行与候选运行的对比结论、原因及证据引用；`$id`：`https://opensoha.dev/schemas/evaluation/gate-decision.schema.json`；必填字段：`schemaVersion`, `id`, `policyId`, `policyVersion`, `baselineRunId`, `candidateRunId`, `decision`, `reasons`, `evidenceRefs`, `evaluatedAt`。
- `evaluation/feedback-sample.schema.json` — 精选评测反馈样本（`Curated Evaluation Feedback Sample`），记录经过脱敏、授权与人工审核的生产反馈样本；`$id`：`https://opensoha.dev/schemas/evaluation/feedback-sample.schema.json`；必填字段：`schemaVersion`, `id`, `traceRef`, `scopeHash`, `redactedInput`, `redactedOutput`, `licenseRef`, `decision`, `createdAt`。
- `knowledge/knowledge-base.schema.json` — 知识库定义（`Knowledge Base`），维护归属主体、可见范围与检索策略；`$id`：`https://opensoha.dev/schemas/knowledge/knowledge-base.schema.json`；必填字段：`id`, `name`, `status`, `ownerId`, `scope`, `retrievalPolicy`, `createdAt`, `updatedAt`。
- `knowledge/knowledge-source.schema.json` — 知识来源定义（`Knowledge Source`），声明接入知识库的数据源类型与同步策略；`$id`：`https://opensoha.dev/schemas/knowledge/knowledge-source.schema.json`；必填字段：`id`, `knowledgeBaseId`, `name`, `kind`, `syncPolicy`, `status`, `createdAt`, `updatedAt`。
- `knowledge/knowledge-search.schema.json` — 知识检索请求（`Knowledge Search Request`），约束目标知识库集合与查询输入；`$id`：`https://opensoha.dev/schemas/knowledge/knowledge-search.schema.json`；必填字段：`knowledgeBaseIds`, `query`。
- `knowledge/context-envelope.schema.json` — 上下文装配信封（`Context Envelope`），记录面向任务的上下文预算分配、实际消耗、策略快照与内容哈希；`$id`：`https://opensoha.dev/schemas/knowledge/context-envelope.schema.json`；必填字段：`version`, `id`, `requestId`, `principal`, `task`, `budgets`, `budgetUsage`, `policySnapshot`, `contentHash`, `createdAt`。
- `knowledge/connector-definition.schema.json` — 知识连接器定义（`Knowledge Connector Definition`），声明外部知识连接器类型、版本与配置引用；`$id`：`https://opensoha.dev/schemas/knowledge/connector-definition.schema.json`；必填字段：`schemaVersion`, `id`, `kind`, `version`, `configRef`, `enabled`。
- `knowledge/connector-checkpoint.schema.json` — 知识连接器增量位点（`Knowledge Connector Checkpoint`），持久化增量同步游标与配置哈希；`$id`：`https://opensoha.dev/schemas/knowledge/connector-checkpoint.schema.json`；必填字段：`schemaVersion`, `sourceId`, `connectorVersion`, `cursor`, `configHash`, `committedAt`。
- `knowledge/ingestion-job.schema.json` — 知识导入作业（`Knowledge Ingestion Job`），追踪目标索引修订的导入阶段与重试状态；`$id`：`https://opensoha.dev/schemas/knowledge/ingestion-job.schema.json`；必填字段：`schemaVersion`, `id`, `sourceId`, `targetRevision`, `stage`, `status`, `attempt`, `createdAt`。
- `knowledge/ingestion-stage.schema.json` — 知识导入阶段完成事件（`Knowledge Ingestion Stage Completion`），记录各流水线阶段的独立执行结果；`$id`：`https://opensoha.dev/schemas/knowledge/ingestion-stage.schema.json`；必填字段：`schemaVersion`, `jobId`, `stage`, `attempt`, `status`, `completedAt`。
- `knowledge/index-publish.schema.json` — 知识索引发布裁决（`Knowledge Index Publish Decision`），基于并发基线修订控制新索引版本的原子切换；`$id`：`https://opensoha.dev/schemas/knowledge/index-publish.schema.json`；必填字段：`schemaVersion`, `knowledgeBaseId`, `revisionId`, `expectedActiveRevision`, `decision`, `decidedAt`。
- `knowledge/retrieval-trace.schema.json` — 生产检索追踪记录（`Production Retrieval Trace`），记录查询哈希、命中索引版本、候选与命中数量、无答案标记及耗时指标；`$id`：`https://opensoha.dev/schemas/knowledge/retrieval-trace.schema.json`；必填字段：`schemaVersion`, `traceId`, `queryHash`, `indexRevision`, `routeRef`, `candidateCount`, `hitCount`, `noAnswer`, `timingMs`。
- `knowledge/graph-revision.schema.json` — 知识图谱修订版本（`Knowledge Graph Revision`），记录源索引引用、抽取器版本以及实体与关系规模；`$id`：`https://opensoha.dev/schemas/knowledge/graph-revision.schema.json`；必填字段：`schemaVersion`, `id`, `knowledgeBaseId`, `sourceIndexRef`, `extractorVersion`, `status`, `entityCount`, `relationCount`, `createdAt`。
- `memory/memory-record.schema.json` — 显式长期记忆记录（`Explicit Long-Term Memory Record`），保存带归属范围哈希、来源类型、置信度、生效时间与策略版本的事实条目；`$id`：`https://opensoha.dev/schemas/memory/memory-record.schema.json`；必填字段：`schemaVersion`, `id`, `ownerType`, `ownerId`, `scopeHash`, `fact`, `sourceType`, `confidence`, `validFrom`, `policyVersion`, `status`, `createdAt`。
- `memory/memory-policy.schema.json` — 长期记忆治理策略（`Long-Term Memory Policy`），约束允许的主体类型、默认与最大存活周期、最低置信度及仅允许显式写入等规则；`$id`：`https://opensoha.dev/schemas/memory/memory-policy.schema.json`；必填字段：`schemaVersion`, `id`, `version`, `ownerTypes`, `defaultTtlSeconds`, `maximumTtlSeconds`, `minimumConfidence`, `explicitWriteOnly`, `enabled`。

## 生成式 API 参考

自动生成 API 参考页面的输入边界、渲染规则与发布漂移校验方式详见 [API Reference 生成路径](./reference.md)。文档生成器统一消费 `../soha/contracts/openapi/soha-api.yaml`、各领域公开 JSON Schema 工件、标准请求与响应示例文件（`../soha/contracts/examples/**`），以及由文档仓库维护的核心路由元数据叠加层（`api/reference/route-metadata.overlay.json`），将接口状态、权限键、资源范围、兼容性说明、审计行为与调用示例自动汇入生成的参考索引中，确保双语参考页与契约真实源保持严格一致。

## 公开 OpenAPI 操作索引

以下公开 HTTP 路由清单与 `../soha/contracts/openapi/soha-api.yaml` 中的契约定义保持一致，覆盖健康探针、身份认证与单点登录交换、流式一次性票据、应用交付与容器运维运行器通道、Copilot Agent 运行通道、集群能力矩阵、AI Gateway 能力与长时任务、工具/资源/提示词调用、个人与服务账号访问令牌治理、审计与高风险审批单、MCP 能力发现以及插件市场与插件生命周期管理。路径中的动态参数按文档站统一约定使用 `:param` 形式表示 OpenAPI 规范中的 `{param}` 占位符：

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

## 稳定导入入口

已发布 SDK `0.2.0` 的代码导入路径如下：

```text
github.com/opensoha/soha/contracts/gen/go/sohaapi
@opensoha/contracts/gen/ts/sohaapi
```

各消费端可按模块节奏逐步从历史手写本地 DTO 迁移到生成的标准 SDK，但严禁跨仓库复制控制平面业务逻辑或权限判定规则。

## 依赖方向

- 主仓 `soha/contracts` 是公开契约源码的唯一真实源；外部仓库按需消费已发布的公开 Go 模块与 npm 包版本。
- 主仓 `soha/web` 通过生成的 TypeScript SDK 与同源 HTTP API 访问核心控制平面。
- 主仓 `soha/cli` 通过生成的 Go SDK DTO、客户端封装与 HTTP API 访问核心控制平面。
- 主仓 `soha/agent` 通过 Agent 协议与生成的 SDK 客户端调用面向运行器的控制平面接口。
- 外部集成与扩展实现统一通过公开契约包、HTTP API、生成 SDK 或正式发布产物组合核心能力。

## 持续校验门禁

`soha/contracts` 模块持续执行以下契约质量校验：

- OpenAPI 规范语法与引用完整性检查。
- JSON Schema 语法与元模型合规检查。
- 全局操作标识符（`operationId`）唯一性检查。
- 生成的 Go SDK 编译与单元测试。
- 生成的 TypeScript SDK 类型检查。
- `soha` 核心服务端公开 JSON 传输结构的向后兼容性测试。

`soha-docs` 文档仓库持续执行以下对齐校验：

- `api/core-endpoints.md` 完整覆盖 OpenAPI 中的 AI Gateway 与 MCP 接口。
- 生成参考索引完整覆盖全部 OpenAPI 操作与 `package.json` 导出的 JSON Schema 工件。
- 本页准确记录当前 OpenAPI 契约标题、版本号与源工件路径。
- CI 工作流在固定检出主仓 `soha` 后运行全套文档契约一致性检查。
