# Configuration

## Source Of Truth

启动配置仍以文件为基线；业务设置和连接实例由数据库设置中心持久化。

- startup baseline: `configs/config.yaml`
- loader: `internal/infrastructure/config`
- override mechanism: environment variables through Viper when needed

Frontend runtime is currently code-first rather than env-first.

- API base path is fixed to `/api/v1` in `soha-web/src/services/api-client.ts`
- local development proxies `/api` to `http://127.0.0.1:8080` in `soha-web/vite.config.ts`
- the docs surface inside the console opens `/docs/`, which the `soha` server redirects to the configured external docs URL by default
- there are no checked-in `soha-web/.env.*` templates at the moment

Docs runtime is independent.

- docs source lives in `soha-docs`
- published docs should use an external URL, such as `https://docs.opensoha.dev/`
- `assets.docs.external_url` controls where `soha` redirects `/docs/`

## 配置归属

`config.yaml` 不是所有业务配置的唯一入口。配置按生命周期和作用域分为四层：

| 层级 | 负责内容 | 典型入口 |
| --- | --- | --- |
| 部署/启动配置 | 监听地址、数据库、线程与队列拓扑、JWT/Runner/Webhook/凭据加密密钥、首次启动参数 | `config.yaml`、环境变量、Docker/Kubernetes/Helm Secret |
| 设置中心 | 登录 Provider、当前已开放的全局代码源集成、登录策略和可安全热加载的产品策略 | 登录设置、代码源和运行时配置页面 |
| 集群配置 | kubeconfig/Agent 连接，以及该集群的 Prometheus、Grafana 和资源指标查询参数 | 集群详情/编辑页 |
| 运行时配置 | Soha 自身可原子校验并热加载的模块开关和运行参数 | 设置中心的“运行时配置”页 |

运行时配置页展示的是“有效值”，不等于所有配置都可以在那里编辑。外部托管或集群托管的值应显示来源和跳转入口，避免同一个字段出现两个写入入口。

### 代码源集成

设置中心目前通过“代码源”页面提供系统集成能力：

- 当前列表和详情页只管理 GitLab 连接。身份 Provider 仍由“登录设置”管理，告警接入仍由监控工作台管理。
- GitLab 详情页负责端点、只写凭据、启停和连接测试。
- GitLab 是全局代码源，不归属于交付工作台。交付、虚拟化、容器运行时和其他需要读取 Dockerfile、YAML、Helm 或脚本的能力都通过同一个连接使用。
- 业务工作台只保存资源或任务对代码源的引用（例如 provider ID、项目/仓库、分支和路径），不复制 GitLab Token。

集成凭据必须加密保存并支持连接测试。它们不应作为普通的扁平运行时键，也不应让浏览器直接访问第三方系统。

## Backend Config Shape

```yaml
app:
http:
logger:
runtime:
database:
auth:
gitlab:
swagger:
mcp:
bootstrap:
kubernetes:
monitoring:
```

Key backend fields now used by the runtime:

- `http.cors_allowed_origins`: allowed browser origins for the frontend console
- `auth.jwt.secret`, `auth.jwt.access_ttl`, `auth.jwt.refresh_ttl`
- `auth.dev_principal.*`: bootstrap local account seed and, when enabled, the no-token development principal
- `auth.oidc.*`: legacy runtime OIDC fallback only; it does not create settings-center login sources
- `gitlab.*`: legacy startup compatibility fields; the target source is the encrypted settings-center Code Source Provider
- `runtime.workflow_workers`, `runtime.workflow_queue_size`, `runtime.workflow_node_parallelism`
- `runtime.cluster_sync_parallelism`, `runtime.copilot_inspection_parallelism`, `runtime.alert_upsert_batch_size`
- `runtime.execution_runner_token`: shared bearer token for delivery, Docker, and AI Agent Runtime runner claim/callback APIs
- `database.migration_path`: migration root directory (runtime resolves `migrations/<driver>/0001_init.sql`)
- `database.migration_file`: explicit SQL bootstrap file override; the current repo baseline points at the consolidated PostgreSQL bootstrap file
- `kubernetes.clusters[*].kubeconfig`: direct cluster file path for bootstrapped clusters
- `kubernetes.clusters[*].kubeconfig_data`: inline kubeconfig support when file paths are not used
- `mcp.default_timeout`: default timeout reused by MCP and agent HTTP integrations
- `monitoring.enabled`: toggles monitoring ingress endpoints
- `monitoring.webhook_token`: shared token accepted by the alert webhook endpoint
- `security.credential_encryption_key`：用于加密持久化的集成与平台凭据

## 标准初始配置

### PostgreSQL

- version: PostgreSQL 18.4 with pgvector 0.8.5
- host: `localhost`
- port: `5432`
- database: `soha`
- user: `pgsql`
- password: `pgsql`

## Identity Defaults

标准初始化账号来自 `config.yaml` 中的 `auth.dev_principal`。

- username: `opensoha`
- email: `opensoha@soha.local`
- password: `opensoha`

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

## Login Provider Runtime

The active console login source is now settings-driven rather than file-only.

Operationally:

- settings-center login sources are stored only under `identity.login_providers`
- `auth.oidc.*` does not seed or backfill login sources
- operators can configure multiple concurrent providers from the console login-settings page

Supported provider types in the current settings model:

- `oidc`
- `feishu`
- `dingtalk`
- `wecom`
- `oauth2`
- `saml`

Current runtime expectations:

- `oidc`: full runtime supported
- `oauth2`: supported when authorize/token/userinfo URLs and field mappings are correct
- `feishu`: supported through configured Feishu auth endpoints and field mappings
- `dingtalk`: supported through configured DingTalk auth endpoints and field mappings
- `wecom`: supported through webpage authorization plus enterprise access-token and `getuserinfo` APIs
- `saml`: configuration-visible only; runtime assertion/ACS handling is not enabled yet

## Operational Conventions

- request ID header: `X-Request-Id`
- health check: `GET /healthz`
- readiness check: `GET /readyz`
- versioned API base path: `/api/v1`
- swagger route reservation: `/swagger/*any`
- config override file: `SOHA_CONFIG_FILE=/abs/path/to/config.yaml`
- frontend local dev port: `5173`
- docs local dev port: `3000`

## Database Bootstrap

On startup the backend can:

1. run SQL migration file
2. create schema only from the migration file
3. seed bootstrap user from `auth.dev_principal`
4. seed password hash and role bindings for the bootstrap account
5. seed default RBAC roles
6. seed default ABAC policies
7. seed configured clusters into `clusters`
8. seed file-configured direct cluster metadata into `cluster_credentials_meta`

## Cluster Registration API

The runtime now supports two persisted cluster connection modes:

- `direct_kubeconfig`
  - request payload includes `kubeconfig` and optional `context`
  - kubeconfig is validated before the cluster is registered into `cluster-manager`
  - informer/cache is started dynamically for the new cluster
- `agent`
  - request payload includes `agentEndpoint` and optional `agentToken`
  - Gin uses the stored endpoint and token to pull summary, list resources, and send execution actions

Relevant routes:

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

## Monitoring Runtime

监控告警接入属于监控工作台。Alertmanager、Grafana Alerting 和 Generic Webhook 的集成、Token、路由、通知、静默、自愈和值班配置，应在 `/monitoring-workbench/integrations` 及其详情页维护。

Soha 自身只在启动配置中保留监控告警入口所需的系统级开关和密钥：

```yaml
monitoring:
  enabled: true
  webhook_token: soha-123456789012345678901234567890
```

Prometheus/Grafana 资源监控连接不属于这里。它们是集群级配置：每个集群可以使用不同的 Prometheus/Grafana，资源页面按 `clusterId` 选择对应连接。不要把集群 Prometheus URL、Bearer Token、默认查询范围或 Grafana 地址放入全局运行时配置页。

Current persistence layout:

- `alert_events`: normalized inbound alert inventory
- `notification_channels`: downstream channel definitions
- `event_stream`: normalized alert activity for the unified event center

Current public or protected routes:

- `POST /api/v1/integrations/alerts/webhook`
- `GET /api/v1/monitoring/summary`
- `GET /api/v1/alerts`
- `GET /api/v1/notification-channels`
- `POST /api/v1/notification-channels`
- `PUT /api/v1/notification-channels/:channelID`

## Application Registry And GitLab

Application management now uses one PostgreSQL-backed registry table:

- `applications`
- `build_records`
- `ai_sessions`
- `ai_messages`
- `ai_root_cause_runs`
- `ai_data_sources`
- `ai_analysis_profiles`
- `ai_automation_policies`
- `ai_agent_runs`

GitLab 是全局代码源/系统集成，而不是交付工作台专属配置。当前设置模型由“代码源”列表和 GitLab 详情页管理：

```yaml
gitlab:
  enabled: false
  base_url: https://gitlab.com/api/v4
  token: ""
  group_id: ""
  per_page: 50
  timeout: 10s
```

上面的 YAML 仅代表当前版本的启动兼容基线。新部署应优先在设置中心创建 GitLab Provider；数据库不存在 GitLab 连接时，服务端会将旧 YAML 配置导入加密的集成记录。完成迁移后，Docker、Kubernetes 和 Helm 示例中不再要求填写 GitLab Token。

集成记录包含：实例名称、GitLab 地址、加密 Token、默认组织/Group、超时、启用状态、连接测试结果和审计信息。交付和其他工作台只引用 Provider ID 及仓库定位信息。

When enabled, soha serves these routes from the backend:

- `GET /api/v1/applications`
- `POST /api/v1/applications`
- `GET /api/v1/applications/:applicationID`
- `PUT /api/v1/applications/:applicationID`
- `DELETE /api/v1/applications/:applicationID`
- `GET /api/v1/integrations/gitlab/projects`
- `GET /api/v1/integrations/gitlab/branches`
- `GET /api/v1/integrations/gitlab/tags`

Build and AI routes now also exist:

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

The browser never talks to GitLab directly. Tokens stay in encrypted backend-managed integration records.

## YAML 兼容与迁移边界

配置迁移按“先导入、再废弃、最后删除”进行：

1. 旧 `auth.oidc.*` 在仍受支持的场景中只是 YAML/运行时兼容路径；服务不会把它导入设置中心数据库，也不会创建“登录设置” Provider。删除 YAML values 前，应先在登录设置中重新创建对应 Provider。
2. 旧 `gitlab.*` 只在数据库不存在 GitLab 连接时执行一次性导入。导入后通过“代码源”页面维护，兼容期内 YAML 仅作为文档明确的启动回退。
3. Helm 已不再渲染旧的全局 Prometheus/Grafana values。升级前应按现有安全运维流程记录非敏感连接信息，再通过集群设置/API 为每个目标集群配置连接并重新录入凭据；多集群环境不能自动判断旧全局连接的归属。
4. 不再新增依赖旧 YAML/Helm 字段的功能；只有在迁移路径完成验证后才删除剩余兼容字段。

不要在没有迁移记录、加密密钥和多副本一致性保障的情况下直接删除配置字段。启动拓扑、网络信任边界、系统密钥和基础设施后端仍必须由部署配置管理。

## Agent Runner Config

The standalone `soha-agent` binary can also claim AI Agent Runtime work from the control plane. The server and agent must share the same `runtime.execution_runner_token` / `control_plane.bearer_token` value.

Minimal Hermes runner config:

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

The AI workbench and automation policy choose `agentProviderId`; the runner only executes matching `AgentRun` rows. Provider-specific commands and workspaces belong in agent config, not in browser payloads. Hermes skill arguments should come from `AgentSkillBinding.providerSkillRef`, with soha skill ids used only as fallback. External providers should invoke soha read-only tools through `/api/v1/copilot/agent-runs/tool-call`, which validates the runner token, per-run callback token, and permission-filtered `AgentRun.toolBindings` snapshot before recording `ToolExecution`. The built-in Hermes/CLI POC prefetches a small read-only tool context into the provider prompt: events, logs, metrics, traces, delivery releases, delivery builds, execution tasks, platform resource snapshots, Docker operation/service context, virtualization operations, alerts, and OnCall route resolution are currently executable. Prefetch and provider-visible tools still depend on the run's toolset selection, including exact adapter ids such as `logs.v1` or source-kind aliases such as `logs`. Richer provider-native or MCP client tool protocols should still terminate at the same soha tool-call gateway.
