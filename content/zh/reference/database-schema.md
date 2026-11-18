# 数据库结构

## PostgreSQL 数据表

### `users`

平台核心用户身份资料表。

建议的 JSONB 扩展字段：

- `tags`
- `preferences`

### `teams`

组织架构兼容数据表（含可选 JSONB 元数据）。新部署应将其视为公司与部门层级的组织架构表；历史遗留的 `team` 主体标识与绑定表名作为兼容别名保留。

建议的关系型字段：

- `parent_id`
- `org_path`
- `source`
- `external_id`

### `projects`

绑定到组织单元与交付环境的项目作用域表。

### `roles`

系统内置角色与自定义角色表，使用 JSONB 存储权限与能力描述符。

### `user_role_bindings`

用户与角色的绑定关系表。管理员在本地手工分配的绑定保持 `source = local`；登录阶段自动补充的外部角色绑定会将 `source` 设为登录源类型，并将 `provider_id` 设为对应登录源 ID。`replace_external` 登录同步模式仅允许替换相同 `user_id + source + provider_id` 组合下的记录。

### `user_team_bindings`

用户与组织的成员绑定关系表。表名保留 `team` 以兼容存量模型，实际运行时语义为组织成员关系。本地手工分配保持 `source = local`；OIDC、OAuth2、飞书、钉钉与企业微信登录映射写入带 `source` 和 `provider_id` 的外部托管记录，以便仅针对外部来源执行替换更新。

### `policies`

基于属性的访问控制（ABAC）策略定义表。JSONB 字段承载：

- 主体匹配规则（`subject matcher`）
- 目标资源匹配规则（`target matcher`）
- 附加条件表达式（`conditions`）
- 允许或拒绝的动作列表（`action list`）

### `clusters`

集群注册表元数据与健康状态快照表。

JSONB 字段承载：

- `labels`
- `capabilities`
- `health_snapshot`

### `cluster_credentials_meta`

集群连接凭据元数据表（首阶段基线不直接裸存敏感明文凭据）。

JSONB 字段承载：

- 提供商连接元数据
- 认证插件配置项

### `announcements`

系统公告目录表，包含发布生命周期状态、目标受众元数据与生效时间窗口字段。

### `announcement_receipts`

面向已发布公告的用户级已读回执表。

### `audit_logs`

只追加（append-only）的持久化安全审计日志表。

JSONB 字段承载：

- `request_meta`
- `target_meta`
- `decision_meta`

### `operation_logs`

面向变更类业务流程的操作任务记录表。

核心字段包含操作者上下文、请求上下文，以及由后端统一生成供前端格式化展示的 `target_scope` JSON 结构。

### AI Gateway 凭据与策略表

面向 AI 原生外部接入的凭据、策略与审计数据持久化在以下表中：

- `personal_access_tokens`
- `service_accounts`
- `service_account_tokens`
- `ai_clients`
- `ai_access_policies`
- `mcp_tool_grants`
- `ai_gateway_skill_bindings`
- `ai_gateway_audit_logs`

令牌表仅存储哈希值与显示前缀；明文令牌仅在创建或轮换时一次性返回，严禁写入日志或在调用方自有凭据存储之外落盘。

`mcp_tool_grants` 支持 `user`、`service_account`、`role`、`team`（组织）与 `ai_client` 五类主体。运行时评估会合并命中的个人/服务账号、组织、角色与客户端授权记录，并在 `permissionKeys` 基础上执行“拒绝优先 + 允许白名单”语义。

`ai_access_policies` 与 `ai_gateway_skill_bindings` 复用相同的主体模型：访问策略按工具名称模式、技能 ID、风险等级与裁决动作收敛可用工具和技能；技能绑定进一步收敛暴露的技能与能力引用。这两张表都只能收窄访问范围，不能放大既有的 RBAC 或资源范围授权。

### `event_stream`

统一事件信封持久化表。

JSONB 字段承载：

- `resource_ref`
- `payload`
- 关联追踪上下文（`correlation data`）

### `build_records`

构建历史记录与构建工作节点回传的产物元数据表。

核心元数据字段包括：

- `applicationEnvironmentId`
- `buildSourceId`
- `artifact`
- `image`
- `variables`
- `triggeredByWorkflowRunId`

### `deploy_records`

部署与发布历史记录表。

核心元数据字段包括：

- `applicationEnvironmentId`
- `actionKind`
- `previousImage`
- `image`
- `imageTag`

### `application_build_sources`

应用维度的多构建来源注册表。

### `build_templates`

平台统一托管的 Dockerfile 与构建命令模板表。

### `release_bundles`

面向跨环境晋级与合规审计的不可变交付制品包表。

### `execution_tasks`

执行平面任务记录表，统一跟踪构建、部署、健康核验与异步回调驱动的运行器任务。

### `execution_logs`

按执行任务隔离持久化的详细运行日志表，与构建/发布摘要表解耦存储。

### `execution_callbacks`

运行器回调记录表，用于审计并推进 `execution_tasks` 状态流转。

### `virtualization_connections`

虚拟化工作台的 KubeVirt 与 PVE 连接注册表。PVE 敏感凭据仅加密存储在 `encrypted_credential` 列中；API 响应只暴露 `credentialConfigured` 标识，绝不返回明文。

### `virtualization_vms`

按提供商、连接实例与外部唯一标识建立索引的虚拟机同步资产表。

### `virtualization_images`

从 KubeVirt CDI/PVC 来源或 PVE 模板、ISO 与存储卷同步发现的镜像与模板资产表。

### `virtualization_flavors`

由 `soha` 托管或从底层虚拟化提供商同步发现的标准虚拟机实例规格目录表。

### `virtualization_tasks`

承载 `vm_create`、`vm_action` 与 `asset_sync` 操作的虚拟化专用任务队列表，不与应用交付领域的 `execution_tasks` 混用。

### `virtualization_task_logs`

虚拟化生命周期操作与资产同步任务的专属日志表。

### `workflow_approvals`

挂起工作流运行的人工审批裁决记录表，其扩展元数据支持将应用交付工作流审批关联回 AI Gateway 审批请求。

### `notification_channels`

面向邮件、Webhook、即时通讯群组或事件响应平台的通知渠道配置表。

## PostgreSQL 存储边界

当数据满足以下任一特征时应持久化到 PostgreSQL：

- 需要跨进程重启的数据持久性
- 需要多维关系型条件检索
- 需要明确的合规留存周期管理
- 需要可追溯的安全与业务审计证据

瞬态界面交互状态、单次请求级缓存与实时流式扇出缓冲应保留在进程内存中，或收敛到明确的持久化任务表与事件表中，不在缺少明确业务诉求时引入额外的外部状态依赖。
