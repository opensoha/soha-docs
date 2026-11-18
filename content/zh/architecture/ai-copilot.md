# AI Copilot

## 设计目标

`soha` 的 AI 层已经从单一聊天页升级为面向运维中后台的 AIOps 智能运维工作台。

当前目标分成两个层面：

1. 一个总入口 `/ai-workbench`
2. 一组工作台型子页面，承载调查分析、巡检自动化与工具装配

AI 层主要协助完成以下任务：

- 告警驱动的根因分析
- 性能抖动与容量异常分析
- 链路慢点和错误热点分析（规划方向；当前尚无外部调用链提供商集成）
- 日志、事件、审计、发布、构建的多源证据归并
- 巡检结果到调查会话的闭环流转
- 工具、技能与数据源的会话级装配

## 当前已实现能力面

当前前后端已经实现以下能力：

- 总入口：
  - `/ai-workbench`
- 调查工作台：
  - `/ai-workbench/chat`
  - `/ai-workbench/root-cause`
  - `/ai-workbench/performance`
- 巡检与自动化：
  - `/ai-workbench/inspection`
- 工具与技能：
  - `/ai-workbench/tool-settings`
  - `/ai-workbench/model-settings`

兼容旧入口仍保留重定向跳转：

- `/ai-observe`
- `/ai-observe/workbench`
- `/ai-observe/operations`
- `/ai-observe/tools`
- `/ai-observe/root-cause`
- `/ai-observe/performance`
- `/ai-observe/chat`
- `/ai-observe/inspection`
- `/chat`
- `/ai-workbench/investigation`
- `/ai-workbench/automation`
- `/ai-workbench/tools`

## 会话模型

AI 调查以会话为一等对象，而不是临时聊天记录。

持久化基础表仍然是：

- `ai_sessions`
- `ai_messages`

但 `ai_sessions.metadata` 现在承载完整的工作台元数据：

- `mode`
- `status`
- `scope`
- `pinnedContext`
- `toolset`
- `agentProviderId`
- `analysisRunRefs`
- `summary`
- `tags`
- `archivedAt`

其中 `scope` 也是监控工作台向 AI 工作台传递调查上下文的标准载体，统一承接：

- `alertId`
- `clusterId`
- `namespace`
- `workload`
- `timeRangeMinutes`

其中 `toolset` 已经进入后端执行路径：

- `enabledAdapterIds` 用于限制本会话可用的 MCP 适配器
- `disabledToolNames` 用于屏蔽具体工具名或 `adapter.tool` 形式的工具
- `budgetOverrides.maxEvidenceItems` 用于限制会话分析采集的证据数量上限
- `budgetOverrides.timeoutSeconds` 用于限制单次分析工具运行时长
- `scopeOverrides` 会叠加到会话 `scope` 上，再进入根因、性能和链路分析

会话工具装配读取 `/api/v1/copilot/workbench/catalog`，该接口面向具备 `observe.ai.chat`、`observe.ai.view` 或 `settings.ai.view` 权限的用户返回安全目录摘要：适配器元数据、数据源启用状态、分析模板摘要、技能摘要、Agent 执行器、平台能力、工具绑定与技能绑定。完整的 AI 模型提供商配置与密钥仍仅允许通过 `settings.ai.view` 访问。

当前会话模式：

- `general`
- `root_cause`
- `performance`
- `trace`
- `inspection_review`

`trace` 会话模式仍保留在会话模型中，但 Core 当前没有内置调用链检索、调用链提供商执行或服务拓扑视图。相关路由和查询 DTO 继续保留，并在后续外部提供商集成就绪前明确报告能力不可用。

## API 能力面

当前已实现或扩展的会话接口：

- `GET /api/v1/copilot/sessions`
- `GET /api/v1/copilot/sessions/:sessionID`
- `POST /api/v1/copilot/sessions`
- `PATCH /api/v1/copilot/sessions/:sessionID`
- `DELETE /api/v1/copilot/sessions/:sessionID`
- `GET /api/v1/copilot/sessions/:sessionID/messages`
- `POST /api/v1/copilot/sessions/:sessionID/messages`

消息发送不再只返回纯消息列表，当前统一返回响应信封：

- `messages`
- `toolCalls`
- `analysisArtifacts`
- `sessionPatch`

分析运行接口当前围绕统一分析工件模型扩展：

- `GET /api/v1/copilot/root-cause/runs`
- `POST /api/v1/copilot/root-cause/runs`
- `GET /api/v1/copilot/root-cause/runs/:runID`
- `POST /api/v1/copilot/sessions/:sessionID/analyze`
- `GET /api/v1/copilot/agent-providers`
- `GET /api/v1/copilot/agent-runs`
- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`

当前 `ai_root_cause_runs` 已承载：

- `kind`
- `session_id`
- `tool_executions`
- 原有的根因证据、假设、处置建议和数据源快照字段

## 数据源与 MCP

当前 AIOps 工具能力继续通过 MCP 适配器抽象统一暴露。

已注册的内置适配器：

- `platform-native.v1`
- `logs.v1`
- `metrics.v1`
- `traces.v1`
- `delivery.v1`

当前实现状态：

- `platform-native.v1`
  - 已可读取平台聚合证据
- `logs.v1`
  - 通用 `logs.query` 能力当前仅查询持久化集群日志
- `metrics.v1`
  - 已补齐基于 Prometheus 的查询执行层
- `traces.v1`
  - 适配器标识为兼容性保留，但 Core 当前不提供调用链执行能力

控制平面采用分层配置入口：

1. 系统设置中的 AI 配置页
   - 维护全局模型提供商、数据源、分析模板与自动化策略配置
2. `/ai-workbench/tools`
   - 兼容旧入口，自动跳转到 `/ai-workbench/tool-settings`
3. `/ai-workbench/tool-settings`
   - 会话级临时工具集与技能装配入口

全局技能注册表采用完整的企业级技能定义结构，而不仅保留简单展示字段：

- `id`
- `name`
- `category`
- `ownerModule`
- `capabilityRefs`
- `blueprintRefs`
- `inputSchema`
- `outputSchema`
- `scopeRules`
- `enabled`

## Agent 运行时

Core `v0.1.12` 及更早版本使用旧内置运行时。从 Core `v0.1.13` 起，`dsh_runtime` 默认关闭；启用并部署匹配的 `soha-dsh:v0.2.0` 服务后，Core 将普通对话与 Heya 请求直接发往独立的 Node `dsh` 服务。未启用或 `dsh` 不可用时请求明确失败，不回退到旧内置运行时。新请求中的 `internal` 和 `native` 执行器标识作为 `dsh` 的兼容别名处理。

核心领域对象：

- `AgentProvider`：执行器目录。启用 `dsh` 时，对话和 Heya 的内置默认项为 `dsh`。显式配置的 Hermes 或 CLI 外部执行器仍可按各自协议使用。
- `AgentCapability`：`soha` 平台能力定义，包括 `root_cause`、`performance`、`trace`、`inspection_review`、`delivery_failure`、`post_deploy_observation`、`platform_resource_diagnosis`、`docker_diagnosis`、`virtualization_diagnosis`、`oncall_brief`
- `AgentToolBinding`：平台能力到 MCP 适配器、平台只读工具或执行器原生工具的映射
- `AgentSkillBinding`：`soha` 技能到 Hermes 技能、提示词模板或后续外部执行器技能的映射
- `AgentRun`：外部执行器的持久化异步运行记录，统一承载状态、作用范围、工具集、技能列表、回调令牌、工具执行明细和输出工件

Core 继续负责会话与运行事实存储、权限校验、Heya 资格与环境门禁、审批、预算、审计及领域分析。`dsh` 运行时负责模型推理与工具调用循环，并通过受认证的运行时接口和授权工具桥调用 Core。显式选择的 Hermes 或其他 CLI 执行器仍是独立外部集成，不作为普通对话或 Heya 的隐式默认项或故障回退路径。

历史内置运行记录仍可只读查看。切换前，在途旧运行必须通过离线维护流程排空或显式隔离；不要将旧检查点或审批单热转换为 `dsh` 运行。详见 [Agent Runtime 运维说明](../operations/agent-runtime)。

Agent 运行时的输出统一回写为 `soha` 的 `AnalysisArtifact`，继续复用证据、假设、建议、关系图、工具调用记录和数据源快照。权限、菜单、预算、数据源脱敏、审计和高风险操作边界仍由 `soha` 统一把关。

## 前端界面形态

### `/ai-workbench`

总入口负责展示：

- 智能助手欢迎引导
- 最近调查会话
- 最近分析运行
- 风险态势雷达
- 前往调查工作台、巡检自动化与工具技能页的快捷入口

### `/ai-workbench/chat`

调查工作台采用 Ant Design X 与 `antd` 组合布局：

- 左侧会话列表（`Conversations`）
- 中间消息流、输入框与快捷提示词（`Bubble.List`、`Sender`、`Prompts`）
- 右侧上下文、证据、假设与处置建议面板
- 思维链（`ThoughtChain`）抽屉展示工具调用链与分析步骤
- 当当前会话 `scope` 携带 `alertId` 时，工作台支持一键回跳原始监控告警详情
- 支持通过 `mode=trace` 和 `mode=inspection_review` 在同一会话画布内切换链路分析和巡检复盘
- “会话级工具集”抽屉直接展示当前生效的执行策略，并可编辑适配器选择、`adapter.tool` 级禁用清单、预算覆盖与范围覆盖
- “显式分析”会先打开确认弹窗，供用户选择执行器、分析模板、可运行分析模式、编辑本轮分析目标，并预览会话范围与工具集来源后再调用会话分析接口；当前可运行模式为 `root_cause`、`performance`、`trace` 和 `inspection_review`，后端拒绝 `general`，执行成功后会将所选模式与 `agentProviderId` 写回会话元数据
- 启用 `dsh` 时普通对话与 Heya 默认使用 `dsh`，同时由 Core 保留授权、Heya 门禁、审批、预算、审计和领域分析职责；显式选择的 Hermes 或 CLI 外部执行器按已配置协议运行，不作为故障回退
- 会话内所有助手消息携带的 `analysisArtifacts` 会汇总为“分析工件历史”，用户可在根因、性能、链路和巡检复盘工件之间切换查看关系图谱、证据和建议

### `/ai-workbench/root-cause` 与 `/ai-workbench/performance`

根因和性能模式复用同一个会话画布，但入口路径直接表达当前分析类型，避免继续通过旧 `investigation?mode=*` 私有查询参数承载主导航结构。

### `/ai-workbench/inspection`

该页面是巡检任务、运行记录和自动化策略的统一入口。

`/ai-workbench/inspection` 提供完整的交互闭环而非只读列表：

- 支持在 AI 工作台内直接新建和编辑巡检任务
- 巡检任务表单按平台、集群、命名空间三种作用范围收敛输入项
- 巡检任务可选择 `mode=inspection` 的分析模板并写入任务元数据的 `analysisProfileId`，后端执行时据此覆盖巡检剧本和数据源约束
- 巡检任务支持删除；删除入口受 `observe.ai.inspection.manage` 权限控制，后端按创建者隔离并依赖数据库外键级联清理关联巡检运行记录
- 任务创建、编辑、立即执行和巡检运行转调查会话均在同一工作区内完成，并分别受 `observe.ai.inspection.manage`、`observe.ai.inspection.run` 和 `observe.ai.chat` 权限控制；将巡检运行转为调查会话还必须具备 `observe.ai.view`，从调查会话生成巡检任务必须具备 `observe.ai.chat`
- 从调查会话生成巡检任务时，工作台优先附带当前可用的巡检分析模板，避免转入巡检后丢失模板驱动的检查契约
- 自动化策略页签支持直接新建和编辑触发类型、分析类型、分析模板、修复策略、去重窗口、冷却时间和启用状态
- 自动化策略的读取、创建、编辑和删除使用后端 `/api/v1/copilot/automation-policies` 接口，并受 `settings.ai.manage` 权限控制；缺少该权限时工作台不会主动拉取策略列表，仅展示明确的权限边界提示
- 自动化策略表单必须从工作台安全目录的分析模板摘要中选择 `analysisProfileId`，并从执行器目录选择 `agentProviderId`；当前执行器仅支持 `alert_webhook` 触发类型，尚未接入执行器的触发类型不会暴露为可运行策略选项
- 自动化策略的可运行分析类型包括 `root_cause`、`performance`、`trace` 和 `inspection_review`；外部执行器还可通过 Agent 运行时扩展到交付失败、发布后观察、平台资源诊断、Docker/虚拟化诊断和值班摘要等能力
- 告警级别、状态、最小持续时间、标签匹配、分析时间范围和审批角色均写入结构化 `triggerConditions` 与 `approvalPolicy`，避免在工作台中创建无法触发的空壳策略
- 自动化执行器会将内置根因、性能和链路分析运行写入带策略前缀的 `dedupKey`；外部执行器会将相同的去重上下文写入 `AgentRun.input`。`dedupWindowSeconds` 负责同一告警指纹去重，`cooldownSeconds > 0` 负责策略级冷却，防止不同告警在冷却期内频繁触发

巡检结果转入调查会话时会自动预填完整调查上下文：

- 后端将巡检任务的 `clusterId` 与 `namespace` 写入会话 `scope`
- 会话 `pinnedContext` 保留 `inspectionRunId`、`inspectionTaskId`、严重级别与执行状态
- 首条助手消息自动附带 `inspection_review` 分析工件
- 该工件将巡检发现项转换为结构化证据、处置建议与从左到右的关系图，供会话右侧证据面板直接渲染

### `/ai-workbench/tool-settings`

当前页面展示并管理：

- MCP 适配器列表
- 全局数据源状态镜像
- 会话级工具集装配入口
- 企业技能注册表
- Agent 执行器、能力、工具绑定与技能绑定安全目录

工具装配入口与后端执行契约严格保持一致：

- 禁用工具统一保存为 `adapter.tool` 格式，防止同名工具误伤其他适配器
- 空适配器列表表示自动选择；推荐预设优先启用已注册且具备可用数据源支撑的适配器
- 预算覆盖仅保存正整数，避免 `0` 被误判为有效限额
- 范围覆盖写入结构化的 `clusterId`、`namespace`、`workload`、`service`、`alertId` 与 `timeRangeMinutes`

### `/ai-workbench/model-settings`

在 AI 工作台内嵌全局 AI 设置能力，继续沿用 `settings.ai.view` 与 `settings.ai.manage` 权限键。

## 安全与执行模型

AI 层始终坚持“分析与建议优先”的安全原则。

当前核心边界包括：

- 聚合多维运维上下文
- 调用只读诊断工具
- 生成可追溯的证据、假设与处置建议
- 将工具调用记录和分析工件持久化沉淀到会话中
- 将外部智能体输出标准化转换为 `soha` 的 `AnalysisArtifact`

高风险变更动作不会直接挂入对话自动执行链路。

应用接入规范生成与平台交付编排归属应用交付工作台而非 AI 工作台；AI 工作台仅负责向企业 AI 研发客户端与 Agent 运行时受控暴露可发现、可审计的 MCP 与技能能力。

## 近期演进约定

后续扩展 AI 相关能力时默认遵循以下架构约束：

- 新增 AI 交互能力优先融入 `/ai-workbench` 工作台体系，避免继续拆分孤立的传统管理表格页
- 会话能力演进优先扩展 `ai_sessions.metadata`，避免过早拆散调查会话实体模型
- 新增数据源或工具能力须同步对齐全局配置、会话级装配与分析工件落盘三层链路
- 根因、性能、链路、巡检复盘及外部智能体分析共用统一的 `AnalysisArtifact` 结构，不按页面重复定义私有渲染协议
- 接入新的 Agent 执行器时仅扩展执行器适配层、工具绑定、技能绑定与运行器，禁止前端页面或核心业务分析流程直接耦合特定提供商的 SDK 或 CLI
- 监控工作台到 AI 工作台的上下文传递保持标准 `scope` 契约，不由各页面自定义私有跳转参数

## 知识来源的导入权限

外部 HTTP、Git 和对象存储来源可在连接器配置中保存版本化 `importPolicy`，明确该来源能够授予的用户、角色、团队和项目范围。缺省范围属于知识库的稳定所有者；显式 `private` 空授权表示拒绝所有人。Core 在写入文档和分片前裁剪抓取结果的访问控制列表，即使远端返回公开可见也不会超出该上限。共享来源可显式配置受限范围；有限授权按相同身份类别求交，不同类别之间不会自动推断成员关系。内联（`inline`）导入沿用既有行为。

来源凭据通过 Gateway 的 `secretRefs` 授权、版本固定和解析，不得写入普通插件输入或文档正文。来源凭据使用 `soha://secrets/<id>`（可选附带 `/versions/<n>`），通过 `SOURCE` 别名进入 Gateway 的引用授权、版本固定和解析流程。历史 `secret:` 配置仍可读取，但在有编辑权限的用户明确切换为规范引用前，抓取操作会被拒绝；系统不会根据旧名称或路径猜测凭据身份。当运行时尚未支持逐次凭据传输时，调用会明确拒绝。完成权限上限校验并不代表三类抓取插件已在当前环境就绪；存量索引不会自动重写，来源策略修改、存量数据撤权和真实抓取仍需分别通过对应验收。
