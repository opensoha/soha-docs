# 配置

## 配置真实源

启动配置仍以文件为基线；业务设置和连接实例由数据库设置中心持久化。

- 源码配置模板为 `configs/config.example.yaml`。Compose 将它挂载到 `/app/configs/config.yaml`。本机运行可用私有的 `configs/config.yaml`，也可设置 `SOHA_CONFIG_FILE`。
- 配置加载器：`internal/infrastructure/config`
- 覆盖机制：按需通过 Viper 使用环境变量覆盖

前端运行时当前采用代码约定优先，而非环境变量驱动：

- Web 默认请求同源 `/api/v1`；候选前缀构建使用 `<VITE_BASE_PATH>api/v1`，显式设置 `VITE_API_BASE_URL` 时使用该覆盖值
- 本地开发在 `../soha/web/vite.config.ts` 中将 `/api` 代理到 `http://127.0.0.1:8080`
- 控制台内的文档入口会打开 `/docs/`，`soha` 服务端默认将其重定向至已配置的外部文档站地址
- 仓库当前未检入 `../soha/web/.env.*` 模板文件

文档站运行时相互独立：

- 文档源码位于 `soha-docs` 仓库
- 正式发布的文档站应使用独立的外部地址（如 `https://docs.opensoha.dev/`）
- `assets.docs.external_url` 控制 `soha` 将 `/docs/` 重定向到的目标地址

## 配置归属

`config.yaml` 不是所有业务配置的唯一入口。配置按生命周期和作用域分为四层：

| 层级 | 负责内容 | 典型入口 |
| --- | --- | --- |
| 部署/启动配置 | 监听地址、数据库、进程拓扑、JWT/Runner/Webhook/凭据加密密钥、首次启动参数 | `config.yaml`、环境变量、Docker/Kubernetes/Helm Secret |
| 设置中心 | 登录 Provider、当前已开放的全局代码源集成、登录策略和可安全热加载的产品策略 | 登录设置、代码源和运行时配置页面 |
| 集群配置 | kubeconfig/Agent 连接，以及该集群的 Prometheus、Grafana 和资源指标查询参数 | 集群详情/编辑页 |
| 运行时配置 | Soha 自身可版本化校验，并按即时、重配或重启方式生效的模块开关和运行参数 | 设置中心的“运行时配置”页 |

运行时配置页展示的是“有效值”，不等于所有配置都可以在那里编辑。外部托管或集群托管的值应显示来源和跳转入口，避免同一个字段出现两个写入入口。

工作流 Worker/队列/节点并行度、集群同步、AI 巡检、告警批量、虚拟化 Worker、执行任务默认值、MCP 超时和 AI Gateway 中继限制均由运行时配置页持久化，不再要求写入 `config.yaml`。

### 代码源集成

设置中心目前通过“代码源”页面提供系统集成能力：

- 当前列表和详情页只管理 GitLab 连接。身份 Provider 仍由“登录设置”管理，告警接入仍由监控工作台管理。
- GitLab 详情页负责端点、只写凭据、启停和连接测试。
- GitLab 是全局代码源，不归属于交付工作台。交付、虚拟化、容器运行时和其他需要读取 Dockerfile、YAML、Helm 或脚本的能力都通过同一个连接使用。
- 业务工作台只保存资源或任务对代码源的引用（例如 provider ID、项目/仓库、分支和路径），不复制 GitLab Token。

集成凭据必须加密保存并支持连接测试。它们不应作为普通的扁平运行时键，也不应让浏览器直接访问第三方系统。

## 后端配置结构

```yaml
app:
http:
logger:
runtime:
database:
auth:
swagger:
mcp:
bootstrap:
kubernetes:
monitoring:
security:
```

当前运行时使用的关键后端配置项：

- `http.cors_allowed_origins`：允许访问前端控制台的浏览器源地址列表
- `auth.jwt.secret`、`auth.jwt.access_ttl`、`auth.jwt.refresh_ttl`：JWT 签名密钥及访问、刷新令牌有效期
- `auth.dev_principal.*`：初始化本地种子账号；启用开发态免令牌鉴权时也作为默认开发身份
- `auth.oidc.*`：仅作为旧版运行时 OIDC 回退配置，不会在设置中心创建登录源
- `runtime.execution_runner_token`：交付、Docker 与 AI Agent Runtime Runner 领取和回调接口共用的 Bearer Token
- `database.migration_path`：数据库迁移根目录（运行时解析为 `migrations/<driver>/0001_init.sql`）
- `database.migration_file`：显式指定的 SQL 初始化迁移文件覆盖路径；当前仓库基线指向合并后的 PostgreSQL 初始化文件
- `kubernetes.clusters[*].kubeconfig`：初始化直连集群时使用的 `kubeconfig` 文件路径
- `kubernetes.clusters[*].kubeconfig_data`：不使用文件路径时的内联 `kubeconfig` 内容
- `mcp.default_timeout`：MCP 与 Agent HTTP 集成共用的默认超时时间
- `monitoring.enabled`：控制是否启用监控接入端点
- `monitoring.webhook_token`：告警 Webhook 端点校验所用的共享令牌
- `security.credential_encryption_key`：用于加密持久化的集成与平台凭据
- `security.secret_provider`：留空时使用本地加密值，设为 `vault_kv2` 时启用 Vault Secret 版本
- `security.vault_kv2.*`：仅服务端使用的 Vault 地址、Token、Namespace、超时和响应大小限制

## Vault KV v2 Secret Store

Vault KV v2 是 Secret Store 的首个外部后端，只在 Soha 服务端配置：

```yaml
security:
  secret_provider: vault_kv2
  vault_kv2:
    address: https://vault.example.com
    token: replace-with-a-server-token
    namespace: ""
    timeout: 10s
    max_response_bytes: 2097152
```

地址必须是无凭据、path、query 和 fragment 的 origin。除本机 loopback 开发地址外必须使用 HTTPS。公开 Secret API 不接收 Vault Token，Secret 记录也不会保存 Token。

创建或轮换 Vault Secret 版本时，需要提供 KV v2 `mount`、`path`、数据 `key` 和显式正整数 Vault `version`。Soha 只保存该定位信息；调用方仍使用 `soha://secrets/{id}` 或 `soha://secrets/{id}/versions/{version}`。Core 会先完成 RBAC、scope、binding、审批、审计和 lease 校验，再读取 Vault。配置缺失或 Vault 读取失败时保持 fail-closed，并隐藏 Provider 原始响应。

## 标准初始配置

### PostgreSQL

- 版本：PostgreSQL 18.4（含 pgvector 0.8.5）
- 主机：`localhost`
- 端口：`5432`
- 数据库：`soha`
- 用户名：`pgsql`
- 密码：`pgsql`

## 默认身份配置

标准初始化账号来自 `config.yaml` 中的 `auth.dev_principal`。

- 用户名：`opensoha`
- 邮箱：`opensoha@soha.local`
- 密码：`opensoha`

即使 `auth.enable_dev_auth` 为 `false`，该账号仍会写入 PostgreSQL，用于真实密码登录；该开关只控制无 bearer token 时是否接受自动开发身份。日常重启会保留初始密码，也不会覆盖用户已经修改的密码。Soha 不实施按环境区分的凭据策略，仍支持显式覆盖。

## 系统密钥默认值

项目配置直接展示四项系统密钥，并为它们提供同一个标准默认值：

```yaml
auth:
  jwt:
    secret: soha-123456789012345678901234567890

runtime:
  execution_runner_token: soha-123456789012345678901234567890

monitoring:
  webhook_token: soha-123456789012345678901234567890

security:
  credential_encryption_key: soha-123456789012345678901234567890
```

这组默认值使本地进程、`docker run`、Docker Compose、Kubernetes 和 Helm 都可以直接启动，不依赖生成 SecretStore 文件、writer lock 或专用 secret PVC。后端不会因为使用文档中的默认值或四个字段复用该值而拒绝启动。每个字段仍可在 `config.yaml` 中单独修改，也可以通过对应环境变量覆盖。

这是开源安装的便利默认值，不是生产密钥。任何公网或正式部署都应在接收流量前覆盖全部四项。继续使用公开值会使第三方能够伪造 JWT、runner/webhook 请求，并在取得数据库内容后解密凭据。

修改 `security.credential_encryption_key` 时必须区别于 bearer token 和签名密钥：移除旧 key 前，先用旧 key 解密并迁移或重新加密全部历史密文。直接替换会导致已有加密凭据永久不可读。在迁移完成前，所有副本和每次重启都必须继续使用同一加密 key。

## 登录提供商运行时

控制台当前启用的登录源由设置中心驱动，而非仅靠配置文件维护。

运行规则如下：

- 设置中心的登录源统一保存在 `identity.login_providers` 下
- `auth.oidc.*` 不会初始化或回填设置中心的登录源
- 管理员可在控制台“登录设置”页面同时配置多个并存的登录提供商

当前设置模型支持的提供商类型：

- `oidc`
- `feishu`
- `dingtalk`
- `wecom`
- `oauth2`
- `saml`

各类型的当前运行时支持情况：

- `oidc`：完整支持运行时登录流程
- `oauth2`：正确配置授权、令牌、用户信息地址及字段映射后即可使用
- `feishu`：通过已配置的飞书认证端点与字段映射提供支持
- `dingtalk`：通过已配置的钉钉认证端点与字段映射提供支持
- `wecom`：通过企业微信网页授权配合企业 `access_token` 与 `getuserinfo` 接口提供支持
- `saml`：支持 SP 元数据、ACS、签名与断言校验、属性映射和重放防护

把 `http.access_url` 设置为用户实际访问的根地址。私有化安装支持 HTTP 和 HTTPS，由部署方决定；仍强烈建议使用 HTTPS，否则身份令牌、断言和会话 Cookie 缺少传输保护。OIDC/SAML Issuer 和公开协议地址均使用该值，不从客户端提交的转发头（Forwarded Host/Proto）推断。

## 运行约定

- 请求 ID 请求头：`X-Request-Id`
- 存活检查：`GET /healthz`
- 就绪检查：`GET /readyz`
- 版本化 API 根路径：`/api/v1`
- Swagger 预留路由：`/swagger/*any`
- 配置文件覆盖环境变量：`SOHA_CONFIG_FILE=/abs/path/to/config.yaml`
- 前端本地开发端口：`5173`
- 文档站本地开发端口：`3000`

## 数据库初始化引导

后端启动时可自动完成以下步骤：

1. 执行 SQL 迁移文件
2. 仅依据迁移文件创建数据库结构
3. 根据 `auth.dev_principal` 写入初始化用户
4. 写入初始化账号的密码哈希与角色绑定
5. 写入默认 RBAC 角色
6. 写入默认 ABAC 策略
7. 将配置文件中声明的集群写入 `clusters` 表
8. 将配置文件中直连集群的凭据元数据写入 `cluster_credentials_meta` 表

## 集群注册 API

当前运行时支持两种持久化集群连接模式：

- `direct_kubeconfig`
  - 请求体包含 `kubeconfig` 与可选的 `context`
  - 注册进 `cluster-manager` 前会先校验 `kubeconfig` 有效性
  - 注册成功后为新集群动态启动 Informer 与缓存
- `agent`
  - 请求体包含 `agentEndpoint` 与可选的 `agentToken`
  - Gin 后端使用已保存的端点与令牌拉取集群摘要、列举资源并下发执行操作

相关接口路由：

- `POST /api/v1/clusters`
- `POST /api/v1/clusters/:clusterID/workloads/deployments/restart`
- `POST /api/v1/clusters/:clusterID/workloads/deployments/scale`

### 集群资源监控连接

Prometheus 和 Grafana 连接属于集群，而不是 Soha 全局运行时配置。集群记录可以保存：

- Prometheus URL 和 Bearer Token
- Prometheus cluster label
- Grafana Base URL

资源和虚拟化页面查询指标时必须携带 `clusterId`，由后端选择对应集群连接。服务端当前使用 60 分钟查询范围和 60 秒 step 作为查询默认值。这样多个集群可以使用不同的监控栈，未配置、暂无数据和查询失败也可以被清晰区分。全局运行时配置页不再展示这些连接字段。

Bearer Token 保存后不会通过 API 回显，但当前集群实现会将它写入数据库中的集群连接 metadata，未做字段级加密。应将数据库访问、备份、副本和诊断导出都视为敏感边界；不要假定 `security.credential_encryption_key` 会保护该字段。

## 监控运行时

监控告警接入属于监控工作台。Alertmanager、Grafana Alerting 和通用 Webhook 的集成、令牌、路由、通知、静默、自愈和值班配置，应在 `/monitoring-workbench/integrations` 及其详情页维护。

Soha 自身只在启动配置中保留监控告警入口所需的系统级开关和密钥：

```yaml
monitoring:
  enabled: true
  webhook_token: soha-123456789012345678901234567890
```

Prometheus/Grafana 资源监控连接不属于这里。它们是集群级配置：每个集群可以使用不同的 Prometheus/Grafana，资源页面按 `clusterId` 选择对应连接。不要把集群 Prometheus URL、Bearer Token、默认查询范围或 Grafana 地址放入全局运行时配置页。

当前持久化表结构：

- `alert_events`：标准化后的入站告警清单
- `notification_channels`：下游通知渠道定义
- `event_stream`：供统一事件中心消费的标准化告警活动流

当前公开或受保护的接口路由：

- `POST /api/v1/integrations/alerts/webhook`
- `GET /api/v1/monitoring/summary`
- `GET /api/v1/alerts`
- `GET /api/v1/notification-channels`
- `POST /api/v1/notification-channels`
- `PUT /api/v1/notification-channels/:channelID`

## 应用注册表与 GitLab

应用管理及相关能力使用以下基于 PostgreSQL 的持久化表：

- `applications`
- `build_records`
- `ai_sessions`
- `ai_messages`
- `ai_root_cause_runs`
- `ai_data_sources`
- `ai_analysis_profiles`
- `ai_automation_policies`
- `ai_agent_runs`

GitLab 是全局代码源与系统集成，而不是交付工作台专属配置。当前设置模型仅由“代码源”列表和 GitLab 详情页管理，不再读取或导入 `config.yaml` 中的 `gitlab` 配置。

集成记录包含：实例名称、GitLab 地址、加密 Token、默认组织/群组、超时时间、启用状态、连接测试结果和审计信息。交付和其他工作台只引用连接实例 ID 及仓库定位信息。

启用后，`soha` 后端提供以下接口路由：

- `GET /api/v1/applications`
- `POST /api/v1/applications`
- `GET /api/v1/applications/:applicationID`
- `PUT /api/v1/applications/:applicationID`
- `DELETE /api/v1/applications/:applicationID`
- `GET /api/v1/integrations/gitlab/projects`
- `GET /api/v1/integrations/gitlab/branches`
- `GET /api/v1/integrations/gitlab/tags`

交付兼容与 AI 接口路由同样由后端提供。新的控制台交付动作统一创建并确认 `DeliveryPlan`；直接触发构建的接口仅作为 API 兼容入口保留：

- `POST /api/v1/delivery/plans`
- `POST /api/v1/delivery/plans/:planID/confirm`
- `GET /api/v1/builds`
- `POST /api/v1/builds/trigger`
- `GET /api/v1/copilot/insights`
- `GET /api/v1/copilot/sessions`
- `GET /api/v1/copilot/sessions/:sessionID`
- `POST /api/v1/copilot/sessions`
- `PATCH /api/v1/copilot/sessions/:sessionID`
- `DELETE /api/v1/copilot/sessions/:sessionID`
- `GET /api/v1/copilot/sessions/:sessionID/messages`
- `POST /api/v1/copilot/sessions/:sessionID/messages`
- `POST /api/v1/copilot/sessions/:sessionID/analyze`
- `GET /api/v1/copilot/agent-providers`
- `GET /api/v1/copilot/agent-runs`
- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`
- `POST /api/v1/copilot/agent-runs/tool-call`

浏览器绝不会直接访问 GitLab；访问令牌始终加密保存在由后端托管的集成记录中。

## YAML 兼容与迁移边界

配置迁移按“先导入、再废弃、最后删除”进行：

1. 旧 `auth.oidc.*` 在仍受支持的场景中只是 YAML/运行时兼容路径；服务不会把它导入设置中心数据库，也不会创建“登录设置” Provider。删除 YAML values 前，应先在登录设置中重新创建对应 Provider。
2. 旧 `gitlab.*` 只在数据库不存在 GitLab 连接时执行一次性导入。导入后通过“代码源”页面维护，兼容期内 YAML 仅作为文档明确的启动回退。
3. Helm 已不再渲染旧的全局 Prometheus/Grafana values。升级前应按现有安全运维流程记录非敏感连接信息，再通过集群设置/API 为每个目标集群配置连接并重新录入凭据；多集群环境不能自动判断旧全局连接的归属。
4. 不再新增依赖旧 YAML/Helm 字段的功能；只有在迁移路径完成验证后才删除剩余兼容字段。

不要在没有迁移记录、加密密钥和多副本一致性保障的情况下直接删除配置字段。启动拓扑、网络信任边界、系统密钥和基础设施后端仍必须由部署配置管理。

## Agent Runner 配置

独立的 `soha-agent` 二进制程序也可从控制平面领取 AI Agent Runtime 任务。服务端与 Agent 必须共享相同的 `runtime.execution_runner_token` / `control_plane.bearer_token` 值。

最小化 Hermes Runner 配置示例：

```yaml
control_plane:
  enabled: true
  base_url: http://127.0.0.1:8080
  bearer_token: soha-123456789012345678901234567890
  agent_id: local-agent
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

AI 工作台和自动化策略选择 `agentProviderId`，Runner 只执行匹配的 `AgentRun`。Provider 专属命令和工作目录应配置在 Agent 配置文件中，不放入浏览器请求。Hermes Skill 参数来自 `AgentSkillBinding.providerSkillRef`，仅在缺少该值时回退到 `soha` Skill ID。外部 Provider 应通过 `/api/v1/copilot/agent-runs/tool-call` 调用 `soha` 只读工具；该入口会校验 Runner 令牌、单次运行回调令牌和经过权限过滤的 `AgentRun.toolBindings` 快照，再记录 `ToolExecution`。内置 Hermes/CLI 概念验证（POC）会将少量只读上下文预取到 Provider 提示词中，目前可执行的内容包括事件、日志、指标、交付发布、交付构建、执行任务、平台资源快照、Docker 操作与服务上下文、虚拟化操作、告警以及值班（On-Call）路由解析。链路追踪（Trace）路由和查询 DTO 为兼容性保留，但在后续外部 Provider 集成实现前暂不可用。通用外部 `logs.query` 能力当前仅覆盖持久化的集群日志。预取内容和 Provider 可见工具仍受当次运行的工具集选择控制，支持精确适配器 ID（如 `logs.v1`）或数据源类别别名（如 `logs`）。更丰富的 Provider 原生协议或 MCP 客户端工具协议，最终也应收敛并终止于同一个 `soha` 工具调用网关。

## CLI v2 认证策略（待发布组合）

管理员验证匹配的 Core/Web/CLI 后才启用新会话入口。默认关闭；Key 认证与既有 Web/App 登录独立。

```yaml
auth:
  cli:
    enabled: true
    public_url: https://soha.example.com
    allow_password: false
    device_ttl: 5m
    poll_interval: 5s
    access_ttl: 15m
    idle_ttl: 168h
    absolute_ttl: 720h
    create_limit: 10
    source_pending_limit: 5
    active_grant_limit: 1000
    source_attempt_limit: 20
    user_attempt_limit: 5
```

`public_url` 是外部可访问的控制台地址；非根部署需包含前缀，并让 Web 构建、反向代理和第三方提供商回调使用同一路径。非 loopback 地址要求 HTTPS。设备有效期为 30 秒至 10 分钟，轮询间隔为 1 至 30 秒；会话期限须满足 access ≤ idle ≤ absolute ≤ 365 天，限额均为 1 至 10000。分层限速和状态保存在 PostgreSQL，不能靠重启清零。

所有副本须连接同一个持久数据库，并在每次重启继续使用相同 JWT 与凭据加密密钥。Helm 升级复用 live Secret 中的两把密钥；离线渲染不能证明 live lookup。计划中的密钥迁移需要独立备份、兼容验证和旧密钥保留窗口，不能通过直接覆盖值完成。关闭 `auth.cli.enabled` 阻止新设备/密码会话，但仍允许已有 CLI 会话刷新和撤销。

用法、文件存储风险、Key 导入和恢复见 [CLI 登录](./soha-cli.md#登录)。
