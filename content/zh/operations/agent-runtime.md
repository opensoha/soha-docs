# Agent Runtime

## dsh 部署候选版

Core `v0.1.12` 使用该版本自带的运行时。下面的 dsh、Hindsight 和运行配置说明适用于源码候选版。部署前核对配套的 Core、Web、Contracts 和 dsh 镜像。Kubernetes 安装使用 [Soha Helm 仓库](https://github.com/opensoha/soha-helm) 中与候选组合匹配的 Chart。

构建 dsh 镜像需要包含 `agent/dsh-runtime.schema.json` 的兼容 Contracts 发行版。Contracts `v0.1.29` 缺少该 schema。

- 新 Chat 和 Heya 依赖 dsh。在私有网络部署 dsh，向 Core 和 dsh 提供同一服务令牌文件，再启用 `dsh_runtime.enabled`。所有 Core worker 都能读取加密检查点后才启用 `security.protected_durable_storage`。仍需恢复检查点时，保留受保护存储和原安装的有效凭据加密密钥。
- Hindsight 可选。启用前将 Core 迁移至 `0145`，为 Hindsight 配置独立 PostgreSQL 和凭据、配套保护网关以及仅授权所用模型的 Gateway 令牌。
- 使用运行配置和托管资产前，将 Core 迁移至 `0147`，并确认 dsh 报告 `runtime-assembly-v1`。注册表、Skill 文件和 MCP 凭据只挂载到 dsh。
- 升级和回滚时保留单写者 dsh journal。已部署过早期候选且 PVC 未设置保留策略的安装，先保持 dsh 启用并沿用原 claim 执行一次升级。确认 Helm release 清单已包含保留注解，再停用 dsh。重装时通过 `dshRuntime.existingClaim` 引用保留的 claim。
- Core `/readyz` 检查 PostgreSQL。开放流量前检查 dsh 鉴权健康，并确认一条 Chat 和一条有资格的 Heya 请求都完成且留下对应 Run。轮换共享服务令牌时，暂停准入、排空受影响的运行，再协调重启 Core 副本和对应运行时。

## Runtime 切换维护（运维）

使用与 Core 同一修订版的离线 `runtime-upgrade` 工具。源码构建依赖匹配且已发布的 Contracts。核对依赖后执行 `GOWORK=off go build -o runtime-upgrade ./cmd/runtime-upgrade`。在维护窗口排空旧运行并停止旧写入者，再运行该工具。

先备份目标 PostgreSQL，再执行 schema 或应用变更。dry-run 和 apply 要求 schema 已包含 `0143` 和 `0144`。保持旧写入者停止，并沿用该安装的迁移流程应用 schema。

使用不含其他 `PG*` 环境变量的干净 shell。准备仅运维人员可读的 `pg_service.conf`，在 `[soha-upgrade]` 节指定预期 host、port、dbname、user 和 TLS 配置；凭据放在独立的 0600 权限 pgpass 文件中。`psql`、`pg_dump` 和维护工具共用这些文件和环境。

```bash
export PGSERVICEFILE=/YOUR_PRIVATE_PATH/pg_service.conf
export PGPASSFILE=/YOUR_PRIVATE_PATH/pgpass
export PGSERVICE=soha-upgrade
export SOHA_UPGRADE_DATABASE_URL="service=$PGSERVICE"
psql -X -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user, inet_server_addr(), inet_server_port()'
```

将显示的数据库、用户、服务器地址和端口与预期维护目标核对；不一致时停止。

```bash
umask 077
BACKUP_PATH=$(mktemp /YOUR_PRIVATE_PATH/soha-before-dsh.XXXXXX)
pg_dump --format=custom --file "$BACKUP_PATH"
pg_restore --list "$BACKUP_PATH" >/dev/null
```

完成所需的 schema 迁移后生成计划。

```bash
./runtime-upgrade -mode=dry-run > /YOUR_PRIVATE_PATH/runtime-upgrade-plan.json
```

备份、dry-run 和 apply 期间保持 service 配置与环境不变。工具只检查备份是非空的 0600 普通文件并记录 SHA-256，不验证备份的数据库身份或可恢复性。

审核 dry-run 清单及其中的 SHA-256 `digest` 后再 apply。`pg_restore --list` 只检查归档格式，不等同于恢复演练。Apply 必须提供已审核的计划 digest 和备份文件。若清单中的旧运行租约已过期且需明确隔离，使用 `-quarantine-runs` 指定精确 ID（最多 1000 个）；否则省略该参数：

```bash
./runtime-upgrade -mode=apply -digest REVIEWED_PLAN_SHA256 -backup "$BACKUP_PATH"
./runtime-upgrade -mode=apply -digest REVIEWED_PLAN_SHA256 -backup "$BACKUP_PATH" -quarantine-runs RUN_ID_1,RUN_ID_2
```

命令会复核清单 digest，并拒绝仍有有效租约或其他活跃写入者的情况。隔离后的旧运行状态为只读 `unknown` 并加 fence，等待核对；隔离不代表已确认停止，不会重试运行，也不会转换 Native checkpoint。若清单或写入状态变化，应停止操作并重新生成、审核 dry-run。

回滚仅针对对应 checkpoint，并且有条件地恢复未变化的 session metadata；不会清除切换 gate，也不会恢复 Run、记忆或 tombstone：

```bash
./runtime-upgrade -mode=rollback -digest APPLIED_CHECKPOINT_SHA256
```

被隔离的记忆仍可通过服务端字段 `quarantined` 与 `quarantineReason` 查看；客户端不能解除隔离，记录所有者可以删除。不要将状态不明的记录标为过期，也不要推断缺失的所有者。本流程属于源码候选说明，不代表已发布或通过生产资格；依赖、镜像与发布验收仍待完成。

使用候选版 CLI 时，若聊天提交结果不确定，查询原请求，不要重新发送：`soha ai chat request SESSION --request-id ID`。`native-request` 是兼容别名。查询无结果不能证明原请求不会稍后提交；后续核对由服务端负责。

## 定位

soha 的 agent 进程同时承担两类运行时职责：

- 远程集群 agent：为 `connectionMode=agent` 的 Kubernetes 集群提供资源读取和有限操作入口。
- 控制平面 runner：从 soha 控制面领取 delivery、Docker 和 AI Agent Runtime 任务，通过回调写回状态和结果。

AI Agent Runtime 是 soha 面向 AI 工作台、自动化策略和业务诊断场景的统一执行抽象。页面和业务模块只面向 soha 的能力契约，不直接依赖 Hermes、OpenClaw 或任何具体 agent。

核心抽象：

- `AgentProvider`：一个可插拔执行器，例如 `internal`、`hermes`，后续可以扩展 OpenClaw 或其它 provider。
- `AgentCapability`：平台能力，例如 `root_cause`、`performance`、`trace`、`inspection_review`、`delivery_failure`、`docker_diagnosis`。
- `AgentToolBinding`：capability 到 MCP adapter、平台只读工具或 provider 原生工具的绑定。
- `AgentSkillBinding`：soha skill 到 Hermes skill、prompt template 或未来 provider skill 机制的映射。
- `AgentRun`：一次 durable agent 执行，包含 provider、capability、skills、toolset、scope、状态、回调 token、工具记录和输出工件。

Hermes Agent 是当前第一个外部 provider。它通过 soha agent runner 领取 `ai_agent_runs`，执行 Hermes CLI 或 Hermes Agent 能力，然后把结果统一回写为 `AnalysisArtifact`。

`AgentRun` 会保存创建时的 `toolBindings` 和 `skillBindings` 快照。runner claim 拿到的是一次完整的 soha capability contract：scope、toolset、预算、平台 playbook、provider skill 映射、MCP/internal tool 映射都会随任务一起下发。后续接 OpenClaw、internal agent 或其它 provider 时，应读取这份快照来实现 provider adapter，而不是在页面或业务模块里重新推导 Hermes/OpenClaw 私有参数。

## 控制面合约

AI 工作台的安全目录接口会返回 Agent Runtime 目录摘要：

- `GET /api/v1/copilot/workbench/catalog`
- `GET /api/v1/copilot/agent-providers`
- `GET /api/v1/copilot/agent-runs`

这些接口面向已授权用户，返回 provider、capability、tool binding、skill binding、MCP adapter、data source、analysis profile 和 skill registry 摘要。全量 provider 密钥和数据源凭据仍由 Settings > AI 管理。

Agent 执行相关的 runner 接口使用 `runtime.execution_runner_token` 鉴权：

- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`
- `POST /api/v1/copilot/agent-runs/tool-call`

`tool-call` 是外部 provider 调用 soha 工具的受控网关。请求必须同时携带 runner bearer token 和当前 `AgentRun.callbackToken`，并且只能调用该 run 创建时快照到 `toolBindings` 的只读工具。控制面当前可执行日志、指标、链路、平台事件、交付发布、交付构建、执行任务、平台资源快照、Docker operation/service、虚拟化 operation、告警查询和 OnCall 路由解析，并把每次调用写入 `ToolExecution`，供最终 `AnalysisArtifact` 复用。Provider adapter 不应该绕过这个网关直接访问 soha 数据源或凭据。

当前 runner 的 Hermes/CLI provider POC 会在执行 provider 命令前预取最多 3 个可预取只读工具结果，例如 `events.query`、`logs.query`、`metrics.query`、`traces.query`、`delivery.releases.list`、`delivery.builds.list`、`delivery.execution_tasks.list`、`platform.resources.snapshot`、`docker.operations.list`、`docker.services.list`、`virtualization.operations.list`、`alerts.list`、`oncall.routes.resolve`，并把结果作为 `prefetchedToolResults` 注入 provider prompt 和最终 output。`traces.query` 路由为兼容性保留，但当前返回能力不可用；通用 `logs.query` 只查询持久化集群日志。这样即使 provider 还没有接入私有 tool-call 协议，也能消费 soha 受控工具上下文。后续如果 Hermes 或其它 agent 使用 MCP client 方式接入，应在 runner adapter 层把同一个 `tool-call` 网关包装成 provider 可识别的 MCP/tool server，仍然不暴露 soha 数据源凭据。

`AgentRun.toolBindings` 快照在创建时会按创建者或系统 principal 的运行时 permission keys 过滤。runner token 和 callback token 只允许执行这份已经过滤后的快照，不能扩展用户原本无权访问的数据源、工具或业务上下文。toolset 的 adapter 选择同时支持精确 adapter id（如 `logs.v1`）和 source-kind 别名（如 `logs`、`metrics`、`traces`），但匹配规则必须显式且有测试覆盖。

这些工具仍然只读且受 `AgentRun.toolBindings` 快照约束。后续新增其它 provider 或工具时，应继续通过 reader/adapter 接入 `executeAgentToolBindingOutput`，再加入 runner 预取白名单；高风险写操作不能直接成为聊天工具。

`ai_agent_runs` 是 AI Agent Runtime 的 durable 队列表。状态包括：

- `queued`
- `running`
- `completed`
- `failed`
- `canceled`
- `callback_timeout`

## 平台能力矩阵

平台运行时能力通过 `GET /api/v1/clusters/capabilities` 暴露为稳定契约，用来描述同一个 capability 在 Direct 和 Agent 两种集群连接模式下的可用性。每个条目包含：

- `key`、`label`、`category`：稳定能力标识、展示名称和分类。
- `direct.status`、`agent.status`：`available`、`partial` 或 `unsupported`。
- `direct.reason`、`agent.reason`、`notes`：解释不可用或部分可用的真实产品约束。
- `requiredScopes`、`riskLevel`、`requiresApproval`：调用前需要展示或诊断的 scope、风险和审批预期。
- `docsUrl`：指向对应操作文档或限制说明。

Console、CLI、Skills 和外部集成不应自行推断 Agent/Direct parity；它们应消费这份 matrix 来决定按钮可用性、unsupported 态、降级文案和诊断输出。`unsupported` 与 `partial` 不是前端兜底状态，而是控制面暴露的真实能力边界。

CLI 侧可以直接读取同一份平台能力矩阵：

```bash
soha capabilities --domain platform --output names
soha capabilities --domain platform --output json
soha diagnose --cluster-capability resource.yaml.apply
```

`diagnose --cluster-capability` 会展示目标 capability 的 Direct/Agent 支持状态、风险等级、审批要求、required scopes 和文档链接，用于解释为什么 YAML apply、CRD、Helm、logs、exec、port-forward 或 Docker runtime 在某个连接模式下可用、部分可用或不可用。

## 分析链路

AI 工作台显式分析链路：

1. 用户在 `/ai-workbench` 会话中选择 provider、analysis profile、toolset 和分析模式。
2. 前端调用 `POST /api/v1/copilot/sessions/:sessionID/analyze`。
3. `internal` provider 继续走 soha 内置同步分析路径。
4. 外部 provider 通过 `AgentRun` 入队，assistant 消息先写入 queued 状态。
5. agent runner 使用 claim 接口领取任务。
6. Hermes provider runner 将 scope、toolset、skills、budget 和 prompt 转为 Hermes 调用。
7. provider 如需查询日志、指标、链路、事件、交付发布/构建或告警，应由 runner adapter 通过 `agent-runs/tool-call` 调用 soha 受控工具。
8. runner 通过 callback 回写 `running`、`completed` 或 `failed`。
9. 控制面把 provider 输出转换为 soha `AnalysisArtifact`，继续沉淀证据、假设、建议、关系图、工具调用和数据源快照。

自动化策略链路：

1. soha automation policy 仍是持续分析的主调度源。
2. `alert_webhook` 告警进入后，由 automation policy 做匹配、去重窗口和冷却控制。
3. `agentProviderId=internal` 时沿用内置分析。
4. `agentProviderId=hermes` 或其它外部 provider 时创建 `AgentRun`，由 runner 异步执行。
5. Hermes cron 只作为实验性 provider 原生能力，不作为 soha 平台主调度源。

## Hermes Runner 配置

服务端需要配置 runner token：

```yaml
runtime:
  execution_runner_token: demo-execution-runner-token
```

agent 侧通过 `configs/agent.config.yaml` 启用 AI Agent Runtime：

```yaml
control_plane:
  enabled: true
  base_url: http://127.0.0.1:8080
  bearer_token: demo-execution-runner-token
  agent_id: local-agent
  poll_interval: 5s
  agent_runtime:
    enabled: true
    worker_id: local-hermes-runner
    provider_ids:
      - hermes
    provider_kinds:
      - hermes
    hermes_command: hermes
    providers:
      hermes:
        command: hermes
        args:
          - chat
          - -Q
        prompt_arg: -q
        skill_arg: ""
        provider_skill_arg: -s
    workspace_root: ./.soha/agent-runtime
    poll_interval: 5s
```

启动方式：

```bash
cd ../soha-agent
go run ./cmd/agent
```

使用自定义配置文件：

```bash
SOHA_AGENT_CONFIG_FILE=/abs/path/to/agent.config.yaml go run ./cmd/agent
```

当前 Hermes provider runner 的最小 POC 约定：

- runner 只领取 provider id 或 kind 匹配 `hermes` 的 `AgentRun`。
- 默认命令为 `hermes`，可通过 `control_plane.agent_runtime.hermes_command` 覆盖。
- runner 会把 soha run 输入、tool binding 快照、skill binding 快照转换为 prompt，并优先把 `AgentSkillBinding.providerSkillRef` 作为 Hermes skill 参数传给 CLI；只有没有 provider skill ref 时才回退到 soha skill id。
- runner 提供 `agent-runs/tool-call` 客户端 helper，provider adapter 可以用它执行 run 快照中授权的只读工具；默认 Hermes CLI POC 会预取一小批只读工具结果并注入 prompt，包括日志、指标、链路、事件、交付发布/构建和告警上下文，但不假设某个 Hermes 私有 tool-call 协议。
- runner 在 provider 命令运行期间会周期性回调 `running` heartbeat，保持控制面的 `lastHeartbeatAt` 新鲜；如果控制面回调响应返回 `canceled`、`callback_timeout`、`failed` 或 `completed` 等终态，runner 会取消本地 provider 进程，不再提交最终 completed 回调。
- `soha-agent/internal/agent/runner` 具备不依赖真实 Hermes 安装的 smoke 覆盖：fake control plane 可验证 claim -> running callback -> tool-call prefetch -> CLI provider -> completed callback -> `AnalysisArtifact` 的完整协议链路。真实环境仍应把 `hermes_command` 指向 Hermes CLI 做最后端到端验证。
- runner 回调中的 `analysisArtifacts` 优先作为最终工件；如果缺失，runner 和控制面会用 provider 输出摘要合成基础 `AnalysisArtifact`，并保留 provider 返回的 evidence、hypotheses、recommendations、graph、toolExecutions、dataSourceSnapshot 以及 runner 自己的工具执行记录。

runner 侧已经按 provider 分发执行器。Hermes 是内置默认 executor；其它 CLI 型 provider 可以先通过 `control_plane.agent_runtime.providers.<providerKind>` 配置接入，例如：

```yaml
control_plane:
  agent_runtime:
    provider_ids:
      - openclaw
    provider_kinds:
      - openclaw
    providers:
      openclaw:
        command: openclaw
        args:
          - run
        prompt_arg: --prompt
        skill_arg: ""
        provider_skill_arg: --skill
```

这种 provider executor 仍然只接收 soha `AgentRun` 合约：prompt 内包含 scope、toolset、toolBindings、skillBindings 和 output schema；provider 原生 skill 参数来自 `AgentSkillBinding.providerSkillRef`。如果没有配置对应 provider executor，runner 会显式回调 failed，而不是把未知 provider 伪装成 Hermes 执行。

## 扩展新 Provider

新增 provider 时只扩 adapter，不重写 AI 工作台和业务分析流程：

1. 在 copilot service 的 provider catalog 中注册 `AgentProvider`。
2. 声明 provider 支持的 `AgentCapability`。
3. 为 capability 增加 `AgentToolBinding` 和 `AgentSkillBinding`。
4. 在 runner 中实现 provider-specific 执行器，将 `AgentRun` 输入转换为该 provider 的调用。
5. 保持 callback 输出为 soha `AnalysisArtifact` 或可被合成为 `AnalysisArtifact` 的结构。

硬性边界：

- 页面、handler 和业务模块不得直接调用 Hermes。
- 预算、权限、菜单、审计、数据源脱敏和操作边界由 soha 控制。
- Agent 只作为可插拔执行器，不能绕过 soha 的 MCP adapter、scope、toolset、tool-call 网关和 analysis profile 合约。
- 高风险写操作不能自动挂到聊天链路，必须先落到对应业务模块的 durable operation 或 approval 流程。

## 远程集群 Agent 范围

同一个 `soha-agent` 二进制仍保留远程集群 agent 能力：

- `GET /healthz`
- `GET /api/v1/healthz`
- `GET /api/v1/platform/summary`
- `GET /api/v1/platform/namespaces`
- `GET /api/v1/platform/workloads/pods?namespace=default`
- `GET /api/v1/platform/workloads/deployments?namespace=default`
- `POST /api/v1/platform/actions/deployments/restart`
- `POST /api/v1/platform/actions/deployments/scale`

当前远程集群 agent 仍是较小范围能力，日志、YAML、事件、exec 和 rollout history 需要继续按平台 agent 语义补齐，不能和 AI Agent Runtime 的 provider 执行链路混用。
