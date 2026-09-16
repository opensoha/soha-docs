# Application Delivery

## Goal

soha now owns application registration, multi-source build configuration, environment-scoped delivery orchestration, image replacement deployment, and deploy/release records.

The developer/tester-facing DevOps workbench design is documented separately in [应用交付 DevOps 工作台方案](./delivery-devops-workbench.md). This file remains the implemented application-delivery baseline and compatibility contract.

## Current Implemented Surface

The repository now has a delivery control-plane baseline centered on six stable objects:

- applications
- application services
- platform environments
- build templates
- application-environment bindings
- execution records
- delivery blueprints

- application CRUD and detail APIs:
  - `GET /api/v1/applications`
  - `POST /api/v1/applications`
  - `GET /api/v1/applications/:applicationID`
  - `GET /api/v1/applications/:applicationID/detail`
  - `PUT /api/v1/applications/:applicationID`
  - `DELETE /api/v1/applications/:applicationID`
- application service and container APIs:
  - `GET /api/v1/applications/:applicationID/services`
  - `POST /api/v1/applications/:applicationID/services`
  - `GET /api/v1/applications/:applicationID/services/:serviceID`
  - `PUT /api/v1/applications/:applicationID/services/:serviceID`
  - `DELETE /api/v1/applications/:applicationID/services/:serviceID`
- build-template APIs:
  - `GET /api/v1/build-templates`
  - `POST /api/v1/build-templates`
  - `PUT /api/v1/build-templates/:buildTemplateID`
  - `DELETE /api/v1/build-templates/:buildTemplateID`
- delivery blueprint APIs:
  - `GET /api/v1/delivery/blueprints`
  - `POST /api/v1/delivery/blueprints`
  - `PUT /api/v1/delivery/blueprints/:blueprintID`
  - `POST /api/v1/delivery/blueprints/:blueprintID/render-spec`
  - `POST /api/v1/delivery/blueprints/:blueprintID/bootstrap-application`
- execution-plane APIs:
  - `GET /api/v1/delivery/release-bundles`
  - `GET /api/v1/delivery/release-bundles/:bundleID`
  - `GET /api/v1/delivery/execution-tasks`
  - `GET /api/v1/delivery/execution-tasks/:taskID`
  - `POST /api/v1/delivery/execution-tasks/:taskID/cancel`
  - `POST /api/v1/delivery/execution-tasks/:taskID/retry`
  - `GET /api/v1/delivery/execution-tasks/:taskID/runner-status`
  - `POST /api/v1/delivery/execution-callbacks`
- application-environment detail and target-candidate APIs:
  - `GET /api/v1/delivery/environments`
  - `GET /api/v1/application-environments/:applicationEnvironmentID/detail`
  - `GET /api/v1/application-environments/target-candidates`
- delivery aggregate API:
  - `GET /api/v1/delivery/release-board`
- workflow approval APIs:
  - `POST /api/v1/workflows/:workflowRunID/approve`
  - `POST /api/v1/workflows/:workflowRunID/reject`
- GitLab browse APIs:
  - `GET /api/v1/integrations/gitlab/projects`
  - `GET /api/v1/integrations/gitlab/branches`
  - `GET /api/v1/integrations/gitlab/tags`
- current frontend routes:
  - `/applications`
  - `/delivery/blueprints`
  - `/applications/:applicationId`
  - `/delivery/environments`
  - `/build-templates`
  - `/delivery/release-bundles`
  - `/delivery/execution-tasks`
  - `/application-environments`（只读兼容索引）
  - `/application-environments/:applicationEnvironmentId`（进入应用详情的兼容适配页）
  - `/workflow-templates`
  - `/release-board`
  - `/workflows`
  - `/releases`
  - `/registries`
- PostgreSQL tables:
- `applications`
- `application_build_sources`
- `application_services`
- `application_service_containers`
- `build_templates`
- `delivery_blueprints`
- `release_bundles`
- `execution_tasks`
- `execution_logs`
- `execution_callbacks`
- `application_environments`
- `release_targets`
- `workflow_templates`
- `workflow_approvals`
- `build_records`
- `workflow_runs`
- `deploy_records`

Application model now keeps:

- name
- repository metadata
- buildSources
- latest execution state via aggregate detail
- environment coverage via release-board aggregate

Application services now keep:

- service key and display name
- service kind such as Kubernetes workload, Helm release, external service, or job
- optional service-level repository and build-source override
- service-owned container definitions with image repository, tag template, Dockerfile path, build context, runtime ports, and metadata

The backend still accepts legacy top-level application build fields for compatibility and migration, but the active web application center now edits delivery build configuration through `buildSources` only.

Build-source types:

- `repo_dockerfile`
- `platform_build_template`
- `repo_buildpacks`
- `external_pipeline`

DAG templates remain environment-scoped delivery orchestration templates and are not treated as build-source variants.

Current delivery write surface:

- `POST /api/v1/delivery/plans`
- `POST /api/v1/delivery/plans/:planID/confirm`
- `GET /api/v1/builds`
- `POST /api/v1/builds/trigger` 继续作为兼容 API；控制台不再提供平行写入口
- `build_records` now stores manual build requests plus worker-completed artifact metadata
- each accepted trigger also emits a unified build event into `event_stream`
- DAG `build` nodes now reuse the same build service path and can emit artifact metadata for downstream `deploy_update_image` nodes

The current model is not GitOps-only and not a fake mock pipeline. It is a real platform workflow where:

1. 在应用中心创建或接入 application
2. 在该 application 内维护 services 与 build sources
3. application-environment binding 选择平台环境目录中的环境，并保存应用专属策略和目标
4. 用户创建并确认唯一的 `DeliveryPlan`
5. plan 在 execution plane 中创建 release bundle 与 execution task
6. 产物镜像同时记录到 build record 与 release bundle metadata
7. Kubernetes Deployment 替换目标镜像，并同步推进 execution task 状态
8. soha 记录 workflow、execution task、deploy 与 release 结果

平台环境目录在交付工作台中是只读库存；应用环境绑定只在应用详情或交付流程中写入。ManifestPackage 在应用或服务下维护；K8s 工作台只消费渲染后的修订，用于观察、diff、同步、修复和回滚。

企业 AI coding 场景下，`delivery_blueprints` 作为控制平面模板对象存在，而不是仓库文件本身：

- 蓝图组合应用草稿、build sources、环境绑定模板、目标模板与文件模板
- `render-spec` 返回 `RenderedDeliverySpec`
- `bootstrap-application` 只负责创建或更新平台控制面对象
- v1 不在 API 服务端直接改 Git 仓库文件

## 模板、构建与更新、工作流中心

先在应用设置中选择 HTTP、Worker、静态站点或 Job 预设，关联 Git、构建来源和部署模板，再保存环境配置。平台已配置默认连接、runner 和 registry 时可直接使用；monorepo 需指定项目目录。源码分析只读取已授权仓库的固定 commit，返回语言、构建文件和建议，不执行仓库脚本或覆盖人工配置。

构建、部署与流程模板均使用不可变发布版本。参数、默认值和允许的环境覆盖由后端校验，系统变量不能覆盖，敏感输入使用 Secret 引用。模板更新后，旧服务和已发起交付保持原版本；查看差异后显式采用新版，或复制为独立配置。保存与预览只处理配置，不会开始构建或部署。

服务页的“构建与更新”支持构建并部署、仅构建、部署已有产物和仅更新配置。“工作流中心”统一查看定义、交付记录与模板，可保存跨应用、服务和环境的目标；每次执行生成独立批次。旧工作流深链及历史仍可访问。目标顺序与分组控制先后、组内并发；业务依赖要求前项成功。同一服务相同输入可在 dev/prod 复用一次构建，并将同一镜像 digest 晋级。服务数、环境目标数与实际创建的构建记录数分别统计；等待或取消前尚未创建的构建不计入实际构建数。

“任一服务失败时停止本次发布”默认开启：停止新派发并取消未完成执行，已完成目标保留。关闭后，失败目标及其业务依赖跳过，独立后继继续，历史显示部分完成。逐服务模式完成前一服务的完整链路再执行下一服务；先构建后部署模式先完成构建屏障，再按部署顺序和依赖执行。

构建得到可核验 digest 后才生成最终部署计划。环境审批绑定该计划及真实清单；授权或配置改变后须重新检查。取消先显示“正在取消”，执行器确认停止后才结束，不代表回滚。重试会重新读取环境并创建新批次，保留旧失败、停止原因和重试关系。交付记录可查看目标阶段、日志、产物、计划、审批及资源结果；权限受限时只显示有权查看的目标、计数和状态。

CLI 可用 `soha delivery workflows` 保存流程、`soha delivery batches` 发起或取消交付、`soha delivery plans get|approve|reject` 查看及处理最终审批；本地环境显式传 `--profile local`。批次由服务端在审批通过后继续派发，客户端不用再次确认批次计划。独立计划的创建/确认使用公开 DeliveryPlan API 或 Gateway 的 `delivery.plans.create` / `delivery.plans.confirm`。

### 构建与部署能力

| 方式 | 可用路径和条件 |
| --- | --- |
| Dockerfile / 平台构建模板 | 独立 runner 执行、推送镜像并核验 digest；仓库、模板版本、构建参数固定到本次交付 |
| Buildpacks | 专用 runner 使用固定的 builder、run image 和 lifecycle；平台能力就绪且版本/架构匹配后可执行。已验证 Go、Node、Java、Python 的私有源码与 registry 构建、SBOM 和部署 |
| YAML / Kustomize | 固定资源包、部署 commit、环境入口和镜像 digest；Direct 或 Agent 执行预检、apply 和当前版本健康检查 |
| Helm | 固定公共/私有 HTTPS 或 OCI Chart；支持检查默认 values/schema、环境覆盖、镜像字段映射、首次安装、升级和选择历史 revision 回滚；Direct / Agent 均使用原生 Helm 历史 |

Buildpacks 支持 `pack` 与无 daemon 的 Podman 两条专用 runner 路径，管理员固定 builder/run image/lifecycle digest、工具版本、架构、应用白名单与超时。Podman 在隔离 Linux 主机或虚拟机内使用独占存储目录，不连接 Docker daemon；`pack` 路径仍需其容器后端。已验收 pack 0.40.9、Podman 5.7.0：arm64 的 Go、Node、Java、Python 为原生执行，amd64 四语言在 Apple Silicon 上通过仿真验收，不能作为原生性能结论。私有 HTTPS/SSH、固定 gitlink 子模块、私有 registry、digest 与 SBOM 均纳入验收。源码凭据使用临时 Secret 租约，不注入普通构建变量。取消须等待进程和容器清理；清理状态未知时 runner 拒绝下一任务。缓存上限不等于进程峰值资源配额。安装、权限与崩溃恢复步骤见 [Agent Buildpacks runner](https://github.com/opensoha/soha-agent#buildpacks-runner)。

Helm 预检不安装资源，确认后才执行冻结的 Chart 和 values。Chart 包与敏感 values 不进入普通历史响应。当前服务交付限制在绑定 namespace 内，拒绝 Chart CRD、跨范围资源、外部 schema 引用及模板 lookup；集群扩展请使用专用安装流程。现有应用托管 release 不能通过旧 Helm 写接口绕过计划。确认响应丢失或回调失败后会核对原生 revision 并复用原任务；不会把未知结果当作成功。

`external_pipeline` 的受支持 provider 为 GitLab。交付冻结授权项目、受保护 ref、流水线 commit 与构建源码 commit，持续跟踪父/子流水线、下载约定产物报告并核验 registry digest 后才生成可部署 Bundle。发起请求结果不明时，通过已持久化身份查询原运行，禁止盲目重复 POST；停止也须确认父/子流水线均已结束。只保存配置、触发成功或外部任务返回成功但缺少报告/digest，均不能部署。旧命令型配置仍可读取，不具备这些证据的 provider 不进入新批次。

### YAML/JSON 定义和 Git 模板库

交付文档使用 `apiVersion: delivery.soha.io/v1alpha1`，支持 `BuildTemplate`、`DeploymentTemplate`、`WorkflowTemplate`、`Workflow` 四种 `kind`。前三种区分构建、部署及流程模板，`Workflow.spec.definition` 保存可运行定义；`metadata.name` 是文件标识，Workflow 显示名在 `definition.name`。Blueprint 继续使用原 API，不属于此文档协议。YAML 与 JSON 采用相同 schema；旧 `release_dag` 定义可在 WorkflowTemplate 中往返。

每文件为单个 UTF-8 文档，最多 1 MiB；一次最多 100 文件、合计 2 MiB、嵌套 64 层。拒绝 YAML alias/tag、重复 key、未知字段、未知版本、非字符串键和非安全数字。示例与 CLI 流程见 [第一次交付](../tutorials/first-delivery.md)。

导入先 preview，再携带返回的 preview ID、candidateDigest 和幂等键 apply；所有文件、引用、权限和条件版本一起检查，成功也只生成草稿。更新必须显式提供 `targetId` 与 `expectedRevision`；同名文件不会自动覆盖已有对象。预览过期、草稿被修改或权限变化时重新预览。发布模板是独立操作，服务绑定明确的已发布 ID/version；模板库同步不会升级服务或运行工作流。导出模板必须选择已发布版本，Workflow 导出当前定义。

Git 模板库选择已授权仓库、branch/tag/commit、相对目录和 kind，默认递归匹配 `*.soha.yaml`、`*.soha.yml`、`*.soha.json`。保存来源不拉取或执行；同步固定 commit 并产生 SyncRun，展示增改删、诊断与候选摘要，再对该 SyncRun 显式应用。源 generation、草稿 revision 和候选摘要共同防止并发覆盖；应用不重新读取已移动的分支。私有 HTTPS/SSH 复用仓库连接的凭据，文件与历史不携带 token。被删除文件只标记来源差异，不自动删除模板；解除来源可保留对象，模板也可选择弃用。已发布版本保留 commit、路径和摘要来源记录。

### 自动触发和发布日历

模板来源的 webhook/轮询只生成同步草稿；工作流 webhook/定时才请求新批次，两类触发单独配置。触发使用专用服务账号身份，配置者与执行身份均需相应权限；账号凭据撤销或权限收窄后重新校验，不能借自动触发绕过应用、环境或审批策略。Webhook 密钥加密保存，轮换立即使旧密钥失效。

GitLab webhook 要求 Standard Webhooks 签名、时间戳与稳定事件 ID；不支持该签名的旧 GitLab 使用轮询。重复、乱序事件不会回退来源或重复运行。发布日历采用五字段 cron 和 IANA 时区；错过的分钟跳过，夏令时不存在的分钟跳过，重复本地分钟仅触发一次。同一触发器已有活动批次时跳过新一轮。触发记录的 accepted 仅表示批次已接收，最终结果仍查看交付记录。

### GitOps、渐进发布与 Operator

以下为已验收的受限组合，平台管理员须先安装对应控制器、CRD 和网络入口，服务模板不代装集群组件：

| 方式 | 控制器及健康依据 |
| --- | --- |
| GitOps | Argo CD 3.5.2；Application 固定 project、commit、namespace 和镜像，逐项核验冻结子资源与实际 Deployment |
| 蓝绿 | Argo Rollouts 1.10.0；Rollout、稳定/预览 Service、AnalysisTemplate，核验实际 Service revision 及完整指标窗口 |
| 金丝雀 | Argo Rollouts 1.10.0 + Traefik 3.6.17；额外冻结 TraefikService/IngressRoute，核验原生权重、实际流量和指标 |
| Operator | `workloads.soha.io/v1alpha1` 的 WorkloadCronJob；核验源 Deployment、当前 generation 和受控 CronJob，不按未知 CR 的任意 Ready 字段猜测 |

这些组合沿 Direct / Agent 的相同 Plan/Task、审批与归属路径运行。GitOps 禁止自动同步/自动清理与 Soha 并发写入；已管理的子 Deployment 也不能从普通重启、扩缩容或 YAML 入口绕过计划。Operator 子资源以及 GitOps 子资源必须与冻结清单一致；旧 generation 的健康或失败不能决定新操作的终态。

蓝绿和金丝雀在执行任务详情显示实际暂停原因、稳定/预览 revision、权重、指标次数和时间窗口。暂停、提升和停止要求当前任务及已批准计划仍有效，并校验资源 UID/resourceVersion；提升仅解除人工暂停，不能跳过分析或定时等待。指标失败和取消须确认稳定流量；“正在取消”不是已经停止，也不自动改回 desired 配置。恢复时选择已知配置并新建计划，仍经过审批和健康验证。

内置 `soha-bluegreen` / `soha-canary` 模板提供明确的同命名空间指标 URL 参数。`${system.previewServiceName}` 是整个 YAML 值的系统身份变量，由后端生成，用户不能覆盖；不支持把它拼接到任意字符串表达式。其他控制器、流量插件或自定义健康协议不自动获得上述能力。

### 升级与混合版本

旧构建/流程模板迁移为初始发布版本，已有应用工作流与历史保留原语义。新批次冻结自己的模板、配置、来源和产物。旧客户端省略条件版本的兼容写入仍不具备全局防覆盖保证。

新 Server 遇到缺少 Helm prepare RPC 的旧 Agent，会在预检阶段返回不可用；缺少 Buildpacks capability 或未配置专用 runner 时也不能启动该方式。Kustomize 在 Server 渲染后沿既有 Manifest 协议执行。升级时先完成数据库备份并部署对应 Server、contracts 与 Agent 产物；降级不会自动将新模板或批次转换成旧工作流，运行中的新任务应先完成或确认取消。

GitOps/渐进发布要求 `manifest.execution.v3` 的 Agent；原生修改使用 `ownership-v2` 路由，缺少能力时拒绝且不回退到旧接口。新格式仅用于显式导入，旧模板无需批量转换。Git 管理对象与 UI/内置模板保留各自来源；升级不会自动迁移来源、采用最新版或重放历史。

## 服务配置与 Kustomize 交付

在应用设置抽屉中新建或编辑服务，依次填写服务来源、构建方式和产物配置。仓库可原地接入，共享构建可复用或复制；选择已有镜像或仅部署配置时无需创建构建定义。保存只写配置，部分保存失败会保留已创建的资源并允许继续保存。

应用与共享构建的编辑携带读取时的配置版本。其他编辑者或仓库关联修改了配置后，陈旧保存返回冲突并保留本地草稿；使用“重新加载”取得最新配置后再合并修改。API 的 `expectedVersion` 暂为兼容旧客户端保留可选，未发送版本的外部客户端仍可能覆盖已有配置；这不是跨仓库、构建和服务的原子提交。

Kustomize 通过服务下的资源包交付：

1. 创建 `renderer=kustomize` 的资源包并关联当前应用、服务。Git 同步根必须同时包含 base、overlays 和 generator 依赖文件，例如包根包含 `base/` 与 `overlays/prod/`。
2. 在环境配置中填写入口 `overlays/prod`；目录内使用 `kustomization.yaml`、`kustomization.yml` 或 `Kustomization`。已有“环境覆盖参数”仍用于字符串变量替换。
3. 按原镜像名称添加目标仓库和 `sha256:` digest 映射；多容器逐项配置。只更新部署配置时可跳过镜像构建。
4. 同步并发布资源包 revision，关联当前应用环境。服务的“部署配置”入口生成交付计划，执行集群 dry-run，展示固定 revision、来源 commit、渲染摘要及资源清单。
5. 预检通过后确认计划，并满足环境审批策略。执行使用同一份渲染快照；修改入口、镜像、绑定或 revision 后须重新生成计划。

Direct 和 Agent 都通过 Server-Side Apply 执行固定清单，并区分提交、等待就绪、就绪、失败和状态未知。应用运行页从已管理资源清单中展示 Deployment Pods；没有 Deployment 的资源包保留配置状态。未知 CR 缺少当前 generation 的健康证据时不会显示已就绪。

当前应用计划限制在绑定的单一 namespace、每次 1–50 个资源。支持包内 base/overlay、components、patches、replacements 和普通 ConfigMap generator 文件；禁止越界、符号链接、远程依赖、exec/alpha 插件、Helm-in-Kustomize 和明文 Secret generator。集群级扩展需要独立的平台安装流程。应用计划与资源包自动部署不能同时管理同一目标。

历史 `kustomize_overlay` 发布目标仍可读取，但新发布不再生成 shell apply 命令。先关联服务资源包和环境绑定，再从应用交付计划执行；历史字段不会自动转换为新配置。

回退通过新的交付计划选择旧 revision。部分执行失败保留成功资源记录；取消不会撤销已发生的集群写入；从新清单移除资源不会自动删除原对象。PVC、数据库数据、不可变字段和外部状态不属于自动恢复范围。

## Recommended Modules

### Backend

- `internal/application/app`
  - application registry
  - ownership and environment binding
  - GitLab repository selection orchestration
- `internal/application/build`
  - build request orchestration
  - manual run execution
  - build record lifecycle
- `internal/application/execution`
  - release bundle lifecycle
  - execution task lifecycle
  - callback and approval-policy control plane
- `internal/application/release`
  - deploy/release image rollout orchestration
  - deploy record lifecycle
- `internal/application/delivery`
  - aggregate detail/read models for application detail, application-environment detail, release board, and target candidates
- `internal/infrastructure/integration/scm`
  - source repository adapters
- `internal/infrastructure/integration/runner`
  - docker/buildx/kaniko/custom worker connector
- `internal/repository/app`
- `internal/repository/build`
- `internal/repository/release`

### Frontend

- `web/src/features/delivery/delivery-app-pages.tsx`
  - application list
  - application detail
  - build-template management
  - release-bundle list
  - execution-task list and log inspection
  - approval-policy management
  - workflow approval/trigger surface
- `web/src/features/delivery/delivery-catalog-pages.tsx`
  - structured application-environment binding form
  - aggregated release board
  - application-environment delivery workspace
- `web/src/features/delivery/delivery-blueprint-pages.tsx`
  - blueprint CRUD
  - rendered spec preview
  - platform bootstrap result inspection

## Data Model Direction

PostgreSQL now holds:

- applications
- application_build_sources
- application_services
- application_service_containers
- build_templates
- release_bundles
- execution_tasks
- execution_logs
- execution_callbacks
- application_environments
- release_targets
- workflow_templates
- workflow_approvals
- build_records
- deploy_records
- registry_credentials_meta

Runtime execution state should be represented by durable rows plus runner callbacks:

- running build heartbeat in `execution_tasks`
- terminal status and retry ownership in `execution_tasks`
- live and retained log evidence in `execution_logs` and artifacts

## Execution Direction

The platform should reserve two runtime layers:

- control plane in the API server
- execution plane in background workers or runners

The API server should never run long Docker builds inline in Gin handlers.

## Kubernetes Delivery Direction

Release execution operates on platform views such as:

- target cluster
- target namespace
- workload kind
- workload name
- target container
- new image reference

镜像替换目标保持显式的 Deployment 绑定；声明式部署使用关联资源包的 `manifest_ssa` 目标。浏览器不作为实际工作负载身份的真实源。

This keeps frontend and application service code from dealing with raw manifest mutation everywhere.

## Execution Semantics

- `dev/test/pre` use deploy semantics in the UI even when they run the same orchestration model
- `prod` uses release semantics in the UI
- `manual_approval` nodes now suspend a workflow run with status `waiting_approval`
- approval resolution uses explicit approve/reject APIs and persists `workflow_approvals`; when a workflow was started by AI Gateway approval replay, the approval row metadata keeps the Gateway approval request linkage
- build and release actions now start creating `releaseBundleId` and `executionTaskId` metadata so the execution plane can evolve without breaking the current UI flow
- execution tasks now expose a minimal provider lifecycle: `queued`, `dispatching` or `running`, then callback-driven or direct completion, and task logs are queryable from the delivery control plane
- `ci_agent_runner` now has a first runnable path: the control plane exposes task claim and callback endpoints, the agent can poll for `ci_agent_runner` tasks, execute command payloads locally, and push logs/results back through execution callbacks
- execution-task claim and callback handling now route through the dedicated execution application service, so heartbeat timestamps, release-bundle status, and build/deploy record status stay synchronized from one orchestration path
- `execution_tasks.last_heartbeat_at` is now persisted and reflected in the execution-task page, and callback-driven task updates backfill `build_records` and `deploy_records` with the current execution-task status
- `ci_agent_runner` payloads are now workspace-aware: build/release tasks may carry `workspace.path`, `workspace.commandDir`, `workspace.checkout`, and `workspace.artifactFiles`, and the agent can prepare a local workspace, perform git fetch or checkout, run commands in that directory, and report structured artifact summaries back through callbacks
- asynchronous build callbacks now normalize bundle status to `ready` and update `release_bundles.artifact_ref` or `artifact_digest` from the callback payload instead of leaving build bundles stuck at generic task status values
- the execution application service now runs a background timeout sweep: `dispatching` or `running` tasks whose heartbeat exceeds `timeout_seconds` are marked `callback_timeout`, emit execution logs, and backfill bundle, build-record, and deploy-record failure state automatically
- execution tasks now expose `cancel` and `retry` control-plane actions; retry rotates the callback token before re-queueing, and `ci_agent_runner` now inspects callback responses during heartbeat so a server-side cancel can stop the local shell process instead of only changing task status in the database
- the agent process now keeps an in-memory active-task registry and exposes agent-local runtime APIs for listing active execution tasks, fetching a single active task, and canceling it with the agent bearer token; this is the local runtime surface that later control-plane initiated stop flows can reuse
- execution-task claim now carries a runner runtime endpoint, and the control plane will attempt a direct runtime cancel call before falling back to runner-side status polling; this makes `ci_agent_runner` cancellation proactive instead of heartbeat-only
- `k8s_job_runner` is now wired to server runtime execution-cluster settings (`runtime.execution_job_cluster_id`, `runtime.execution_job_namespace`, `runtime.execution_job_image`, `runtime.execution_job_git_image`, `runtime.execution_job_ttl_seconds`) and the build path can dispatch an isolated Kubernetes Job when that execution cluster is configured
- execution-task DTOs now normalize artifact payloads into a first-class `artifacts[]` view so image outputs, workspace files, and Kubernetes Job evidence are inspectable without manually parsing `result` JSON
- `release_targets` now carry enterprise contract fields such as `targetKind`, `executorKind`, `groupKey`, `waveKey`, `regionKey`, and `configRef`, even though the active UI still defaults to Kubernetes Deployment targets
- arbitrary build commands are only allowed inside the dedicated build worker path, never inline in the Gin request lifecycle
