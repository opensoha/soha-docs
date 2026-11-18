# 应用交付

## 设计目标

`soha` 统一承载应用注册、多来源构建配置、按环境隔离的交付编排、镜像替换部署以及部署与发布记录管理。

面向研发与测试人员的 DevOps 工作台交互方案另行记录在 [应用交付 DevOps 工作台方案](./delivery-devops-workbench.md) 中；本文维护当前已落地的控制平面实现基线与兼容性契约。

## 当前已实现能力面

当前应用交付控制平面围绕七类核心稳定对象组织：

- 应用（`applications`）
- 应用服务（`application services`）
- 平台环境目录（`platform environments`）
- 构建模板（`build templates`）
- 应用环境绑定（`application-environment bindings`）
- 执行记录（`execution records`）
- 交付蓝图（`delivery blueprints`）

已实现的接口、前端路由与持久化表结构如下：

- 应用增删改查与详情接口：
  - `GET /api/v1/applications`
  - `POST /api/v1/applications`
  - `GET /api/v1/applications/:applicationID`
  - `GET /api/v1/applications/:applicationID/detail`
  - `PUT /api/v1/applications/:applicationID`
  - `DELETE /api/v1/applications/:applicationID`
- 应用服务与容器接口：
  - `GET /api/v1/applications/:applicationID/services`
  - `POST /api/v1/applications/:applicationID/services`
  - `GET /api/v1/applications/:applicationID/services/:serviceID`
  - `PUT /api/v1/applications/:applicationID/services/:serviceID`
  - `DELETE /api/v1/applications/:applicationID/services/:serviceID`
- 构建模板接口：
  - `GET /api/v1/build-templates`
  - `POST /api/v1/build-templates`
  - `PUT /api/v1/build-templates/:buildTemplateID`
  - `DELETE /api/v1/build-templates/:buildTemplateID`
- 交付蓝图接口：
  - `GET /api/v1/delivery/blueprints`
  - `POST /api/v1/delivery/blueprints`
  - `PUT /api/v1/delivery/blueprints/:blueprintID`
  - `POST /api/v1/delivery/blueprints/:blueprintID/render-spec`
  - `POST /api/v1/delivery/blueprints/:blueprintID/bootstrap-application`
- 执行平面接口：
  - `GET /api/v1/delivery/release-bundles`
  - `GET /api/v1/delivery/release-bundles/:bundleID`
  - `GET /api/v1/delivery/execution-tasks`
  - `GET /api/v1/delivery/execution-tasks/:taskID`
  - `POST /api/v1/delivery/execution-tasks/:taskID/cancel`
  - `POST /api/v1/delivery/execution-tasks/:taskID/retry`
  - `GET /api/v1/delivery/execution-tasks/:taskID/runner-status`
  - `POST /api/v1/delivery/execution-callbacks`
- 应用环境详情与目标候选接口：
  - `GET /api/v1/delivery/environments`
  - `GET /api/v1/application-environments/:applicationEnvironmentID/detail`
  - `GET /api/v1/application-environments/target-candidates`
- 交付聚合接口：
  - `GET /api/v1/delivery/release-board`
- 工作流审批接口：
  - `POST /api/v1/workflows/:workflowRunID/approve`
  - `POST /api/v1/workflows/:workflowRunID/reject`
- GitLab 仓库浏览接口：
  - `GET /api/v1/integrations/gitlab/projects`
  - `GET /api/v1/integrations/gitlab/branches`
  - `GET /api/v1/integrations/gitlab/tags`
- 当前前端路由：
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
- PostgreSQL 数据表：
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

应用模型维护的核心信息：

- 应用名称与标识元数据
- 代码仓库连接元数据
- 构建来源集合（`buildSources`）
- 由聚合详情视图汇总的最近执行状态
- 由发布看板聚合视图汇总的多环境覆盖情况

应用服务维护的核心信息：

- 服务标识键（`service key`）与显示名称
- 服务形态（如 Kubernetes 工作负载、Helm Release、外部服务或批处理作业）
- 可选的服务级代码仓库与构建来源覆盖配置
- 归属该服务的容器定义（包含镜像仓库、标签模板、Dockerfile 路径、构建上下文目录、运行时端口及扩展元数据）

为保证平滑迁移，后端仍兼容接收旧版顶层应用构建字段，但当前 Web 应用中心仅通过 `buildSources` 编辑交付构建配置。

支持的构建来源类型：

- `repo_dockerfile`
- `platform_build_template`
- `repo_buildpacks`
- `external_pipeline`

DAG 工作流模板继续作为按环境作用域编排交付流程的模板对象，不作为构建来源的变体类型处理。

当前交付写入口约定：

- `POST /api/v1/delivery/plans`
- `POST /api/v1/delivery/plans/:planID/confirm`
- `GET /api/v1/builds`
- `POST /api/v1/builds/trigger` 继续作为兼容 API 保留；控制台不再提供平行的绕过写入口
- `build_records` 同时保存手动构建请求与工作节点回填的产物元数据
- 每次获准受理的触发请求都会向 `event_stream` 写入统一的构建事件
- DAG 中的 `build` 节点复用同一构建应用服务路径，并可向下游 `deploy_update_image` 节点传递产物元数据

当前交付链路并非仅限 GitOps，也不是静态模拟流水线，而是完整的平台闭环流程：

1. 在应用中心创建或接入应用
2. 在该应用内维护服务（`services`）与构建来源（`buildSources`）
3. 应用环境绑定选择平台环境目录中的目标环境，并保存应用专属策略与发布目标
4. 用户创建并确认唯一的交付计划（`DeliveryPlan`）
5. 计划在执行平面中生成发布包（`ReleaseBundle`）与执行任务（`ExecutionTask`）
6. 产物镜像同时记录到构建记录与发布包元数据中
7. 目标 Kubernetes Deployment 完成镜像替换，并同步推进执行任务状态
8. `soha` 完整落盘工作流、执行任务、部署与发布结果

平台环境目录在交付工作台中是只读库存；应用环境绑定只在应用详情或交付流程中写入。资源包（`ManifestPackage`）在应用或服务下维护；Kubernetes 工作台只消费渲染后的修订版本，用于观察、差异比对、同步、修复和回滚。

在企业 AI 研发辅助场景下，`delivery_blueprints` 作为控制平面模板对象存在，而非代码仓库内文件本身：

- 蓝图组合应用草稿、构建来源、环境绑定模板、目标模板与文件模板
- `render-spec` 返回渲染后的规范预览（`RenderedDeliverySpec`）
- `bootstrap-application` 仅负责创建或更新平台控制平面对象
- 当前服务端接口不会直接改写远端 Git 仓库文件

## 模板、构建与更新、工作流中心

先在应用设置中选择 HTTP、Worker、静态站点或批处理作业预设，关联 Git 仓库、构建来源和部署模板，再保存环境配置。平台已配置默认连接、运行器和镜像仓库时可直接使用；单一代码库多项目（monorepo）需指定子项目目录。源码分析只读取已授权仓库的固定提交（Commit），返回语言、构建文件和配置建议，不执行仓库脚本，也不会覆盖人工配置。

构建、部署与流程模板均使用不可变发布版本。参数、默认值和允许的环境覆盖由后端校验，系统变量不能覆盖，敏感输入使用密钥引用。模板更新后，旧服务和已发起交付保持原版本；查看差异后显式采用新版，或复制为独立配置。保存与预览只处理配置，不会开始构建或部署。

服务页的“构建与更新”支持构建并部署、仅构建、部署已有产物和仅更新配置。“工作流中心”统一查看定义、交付记录与模板，可保存跨应用、服务和环境的目标；每次执行生成独立批次。旧工作流深链及历史仍可访问。目标顺序与分组控制先后、组内并发；业务依赖要求前项成功。同一服务相同输入可在开发与生产环境间复用一次构建，并将同一镜像摘要（Digest）逐级晋级。服务数、环境目标数与实际创建的构建记录数分别统计；等待或取消前尚未创建的构建不计入实际构建数。

“任一服务失败时停止本次发布”默认开启：停止新派发并取消未完成执行，已完成目标保留。关闭后，失败目标及其业务依赖跳过，独立后继继续，历史显示部分完成。逐服务模式完成前一服务的完整链路再执行下一服务；先构建后部署模式先完成构建屏障，再按部署顺序和依赖执行。

构建得到可核验的镜像摘要后才生成最终部署计划。环境审批绑定该计划及真实清单；授权或配置改变后须重新检查。取消先显示“正在取消”，执行器确认停止后才结束，不代表自动回滚。重试会重新读取环境并创建新批次，保留旧失败、停止原因和重试关系。交付记录可查看目标阶段、日志、产物、计划、审批及资源结果；权限受限时只显示有权查看的目标、计数和状态。

CLI 可用 `soha delivery workflows` 保存流程、`soha delivery batches` 发起或取消交付、`soha delivery plans get|approve|reject` 查看及处理最终审批；本地环境显式传 `--profile local`。批次由服务端在审批通过后继续派发，客户端无需再次确认批次计划。独立计划的创建与确认使用公开 `DeliveryPlan` API 或 Gateway 的 `delivery.plans.create` / `delivery.plans.confirm`。

### 构建与部署能力

| 方式 | 可用路径和条件 |
| --- | --- |
| Dockerfile / 平台构建模板 | 独立运行器执行、推送镜像并核验摘要；仓库、模板版本、构建参数固定到本次交付 |
| Buildpacks | 专用运行器使用固定的构建器（Builder）、运行基础镜像和生命周期组件；平台能力就绪且版本/架构匹配后可执行。已验证 Go、Node、Java、Python 的私有源码与私有镜像仓库构建、SBOM 和部署 |
| YAML / Kustomize | 固定资源包、部署提交、环境入口和镜像摘要；直连或 Agent 模式执行预检、服务端应用（Server-Side Apply）和当前版本健康检查 |
| Helm | 固定公共/私有 HTTPS 或 OCI Chart；支持检查默认 `values`/Schema、环境覆盖、镜像字段映射、首次安装、升级和选择历史修订（Revision）回滚；直连与 Agent 模式均使用原生 Helm 历史 |

Buildpacks 支持 `pack` 与无守护进程的 Podman 两条专用运行器路径，管理员固定构建器、运行镜像与生命周期组件的摘要、工具版本、CPU 架构、应用白名单与超时上限。Podman 在隔离 Linux 主机或虚拟机内使用独占存储目录，不连接 Docker 守护进程；`pack` 路径仍需其容器后端。已验收 `pack` 0.40.9、Podman 5.7.0：`arm64` 的 Go、Node、Java、Python 为原生执行，`amd64` 四语言在 Apple Silicon 上通过仿真验收，不能作为原生性能结论。私有 HTTPS/SSH、固定 `gitlink` 子模块、私有镜像仓库、镜像摘要与 SBOM 均纳入验收。源码凭据使用临时密钥租约，不注入普通构建变量。取消须等待进程和容器清理；清理状态未知时运行器拒绝接收下一任务。缓存上限不等于进程峰值资源配额。安装、权限与崩溃恢复步骤见 [Agent Buildpacks runner](https://github.com/opensoha/soha/tree/main/agent#buildpacks-runner)。

Helm 预检不安装资源，确认后才执行冻结的 Chart 和 `values`。Chart 包与敏感 `values` 不进入普通历史响应。当前服务交付限制在绑定的单一命名空间内，拒绝 Chart CRD、跨范围资源、外部 Schema 引用及模板动态查询（`lookup`）；集群级扩展请使用专用安装流程。现有应用托管的 Release 不能通过旧 Helm 写接口绕过交付计划。确认响应丢失或回调失败后会核对原生修订号并复用原任务，不会将未知结果误判为成功。

`external_pipeline` 当前受支持的外部提供商为 GitLab。交付过程冻结已授权项目、受保护分支或标签、流水线提交与构建源码提交，持续跟踪父子流水线、下载约定产物报告并核验镜像仓库摘要后才生成可部署发布包。发起请求结果不明时，通过已持久化身份查询原运行，禁止盲目重复提交；停止操作也须确认父子流水线均已结束。仅保存配置、仅触发成功或外部任务返回成功但缺少产物报告/镜像摘要，均不能进入部署。历史命令型配置仍可读取，但不具备上述核验凭据的提供商不进入新批次。

### YAML/JSON 定义和 Git 模板库

交付文档使用 `apiVersion: delivery.soha.io/v1alpha1`，支持 `BuildTemplate`、`DeploymentTemplate`、`WorkflowTemplate`、`Workflow` 四种 `kind`。前三种区分构建、部署及流程模板，`Workflow.spec.definition` 保存可运行定义；`metadata.name` 是文件标识，工作流显示名称位于 `definition.name`。交付蓝图（Blueprint）继续使用原有专用接口，不属于该文档协议。YAML 与 JSON 采用相同 Schema；历史 `release_dag` 定义可在 `WorkflowTemplate` 中无损往返。

单个文件须为单一 UTF-8 文档且不超过 1 MiB；单次导入最多 100 个文件、总计 2 MiB、最大嵌套深度 64 层。解析器拒绝 YAML 别名/自定义标签、重复键、未知字段、未知版本、非字符串键和非安全数值。示例与 CLI 流程见 [第一次交付](../tutorials/first-delivery.md)。

导入流程先执行预览（`preview`），再携带返回的预览 ID、`candidateDigest` 和幂等键执行应用（`apply`）；所有文件、引用、权限和条件版本一并校验，应用成功后也仅生成草稿。更新已有对象必须显式提供 `targetId` 与 `expectedRevision`，同名文件不会自动覆盖存量对象。预览过期、草稿发生变更或调用方权限变化时须重新预览。发布模板是独立操作，服务绑定明确的已发布 ID 与版本号；模板库同步不会自动升级存量服务或触发工作流运行。导出模板必须指定已发布版本，`Workflow` 导出当前定义。

Git 模板库可选择已授权仓库、分支/标签/提交、相对目录和文档类型，默认递归匹配 `*.soha.yaml`、`*.soha.yml`、`*.soha.json`。仅保存来源配置不会自动拉取或执行；同步操作会锁定具体提交并生成 `SyncRun`，展示新增、变更、删除、诊断信息与候选摘要，再针对该 `SyncRun` 显式应用。来源代数（Generation）、草稿修订号和候选摘要共同防止并发覆盖；应用阶段不会重新拉取已前移的远端分支。私有 HTTPS/SSH 复用仓库连接凭据，导出文件与历史记录不携带明文令牌。远端删除文件仅标记来源差异，不自动删除本地模板；解除来源绑定可保留存量对象，模板也可单独标记弃用。已发布版本完整保留源提交、路径和摘要溯源记录。

### 自动触发和发布日历

模板来源的 Webhook 与定时轮询只生成同步草稿；工作流 Webhook 与定时计划才会请求新交付批次，两类触发器分别独立配置。自动触发使用专用服务账号身份，配置者与执行身份均须具备对应权限；服务账号凭据撤销或权限收窄后会在触发时重新校验，不能借助自动触发绕过应用、环境或审批策略。Webhook 密钥加密存储，轮换后旧密钥立即失效。

GitLab Webhook 要求校验 Standard Webhooks 签名、时间戳与稳定事件 ID；不支持该签名机制的旧版 GitLab 可改用轮询模式。重复或乱序事件不会回退来源版本或触发重复运行。发布日历采用五段式 Cron 表达式与 IANA 时区：错过的历史分钟自动跳过，夏令时跳变不存在的本地分钟自动跳过，夏令时回拨重复的本地分钟仅触发一次。同一触发器存在未结束的活动批次时会自动跳过新一轮触发。触发记录状态为 `accepted` 仅表示批次请求已被受理，最终执行结果仍以交付记录为准。

### GitOps、渐进发布与 Operator

以下为已完成验收的受控交付组合；平台管理员须预先在目标集群安装对应控制器、CRD 和网络入口，应用服务模板不会代装集群级基础设施组件：

| 方式 | 控制器及健康依据 |
| --- | --- |
| GitOps | Argo CD 3.5.2；Application 固定 `project`、提交号、命名空间和镜像，逐项核验冻结子资源与实际 Deployment |
| 蓝绿 | Argo Rollouts 1.10.0；冻结 Rollout、稳定/预览 Service 与 AnalysisTemplate，核验实际 Service 修订号及完整指标窗口 |
| 金丝雀 | Argo Rollouts 1.10.0 + Traefik 3.6.17；额外冻结 TraefikService/IngressRoute，核验原生权重、实际流量和指标 |
| Operator | `workloads.soha.io/v1alpha1` 的 `WorkloadCronJob`；核验源 Deployment、当前代数（Generation）和受控 CronJob，不按未知自定义资源的任意 `Ready` 字段猜测 |

上述组合在直连模式与 Agent 模式下均沿相同的交付计划、执行任务、审批与资源归属路径运行。GitOps 模式禁止开启自动同步或自动清理与 Soha 并发写入；受管子 Deployment 也不能通过常规重启、扩缩容或 YAML 编辑入口绕过交付计划。Operator 子资源与 GitOps 子资源必须与冻结清单一致；旧代数的健康或失败状态不能决定新操作的终态。

蓝绿和金丝雀发布在执行任务详情页展示实际暂停原因、稳定/预览修订号、流量权重、指标采样次数和时间窗口。暂停、提升（Promote）和停止操作要求当前任务及已批准计划仍然有效，并校验集群资源的 `UID` 与 `resourceVersion`；提升仅解除人工暂停，不能跳过指标分析或定时等待阶段。指标失败和人工取消必须确认流量已切回稳定版本；“正在取消”不代表已经停止，也不会自动回写期望配置。恢复发布需选择已知稳定配置并新建交付计划，同样经过审批和健康验证。

内置 `soha-bluegreen` 与 `soha-canary` 模板提供明确的同命名空间指标查询地址参数。`${system.previewServiceName}` 是占据完整 YAML 标量值的系统身份变量，由后端生成且不允许用户覆盖，不支持将其拼接到任意字符串表达式中。未列入上表的其他控制器、流量插件或自定义健康判断协议不会自动获得同等受控能力。

### 升级与混合版本

升级后，存量构建模板与工作流模板会迁移为初始发布版本，既有应用工作流与历史记录保留原有语义。新发起的批次会独立冻结自身引用的模板、配置、来源与产物。省略条件版本号的旧版兼容客户端写入请求仍不具备全局防并发覆盖保证。

新服务端对接缺少 Helm 预备接口的旧版 Agent 时，会在预检阶段明确返回能力不可用；缺少 Buildpacks 能力或未配置专用运行器时同样拒绝启动对应构建方式。Kustomize 清单在服务端完成渲染后，沿既有资源包应用协议下发执行。升级前应先完成数据库备份，并配套部署对应版本的服务端、`contracts` 与 Agent 产物；版本回退不会自动将新模型模板或批次逆向转换为旧版工作流，升级或回退前应先等待在途新任务完成或确认取消。

GitOps 与渐进式发布要求 Agent 具备 `manifest.execution.v3` 能力；集群原生资源写操作走 `ownership-v2` 归属校验路由，缺少能力时直接拒绝且不会回退到旧接口。新版交付文档格式仅用于显式导入，存量模板无需批量改写。Git 托管对象与控制台/内置模板各自保留来源属性；系统升级不会自动改写来源类型、强制切换至最新模板版本或重放历史任务。

## 服务配置与 Kustomize 交付

在应用设置抽屉中新建或编辑服务时，依次填写服务来源、构建方式和产物配置。代码仓库可原地接入，共享构建定义支持直接复用或复制为独立配置；选择部署已有镜像或仅更新部署配置时无需创建构建定义。保存操作仅写入控制平面配置，若多步保存中途失败，已成功创建的子资源会保留并允许继续修正保存。

应用与共享构建编辑请求均携带读取时的配置版本号。若其他协作者或仓库联动在此期间更新了配置，过期保存会返回版本冲突并保留浏览器本地草稿，提示先执行“重新加载”拉取最新配置后再合并提交。接口层的 `expectedVersion` 字段暂为兼容旧客户端保留为可选参数，未携带该字段的外部调用仍可能覆盖存量配置；跨仓库绑定、构建定义与服务配置的组合操作不属于单一跨表原子事务。

Kustomize 通过归属在服务下的资源包完成交付：

1. 创建 `renderer=kustomize` 的资源包并关联当前应用与服务。Git 同步根目录必须同时包含 `base`、`overlays` 及生成器依赖文件（例如包根目录同时包含 `base/` 与 `overlays/prod/`）。
2. 在环境配置中填写叠加层入口路径（如 `overlays/prod`）；目录内支持识别 `kustomization.yaml`、`kustomization.yml` 或 `Kustomization`。既有的“环境覆盖参数”继续用于字符串变量替换。
3. 按原始镜像名称配置目标镜像仓库与 `sha256:` 摘要映射；多容器工作负载逐项指定。仅更新部署配置时可跳过镜像构建阶段。
4. 同步并发布资源包修订版本，关联目标应用环境。从服务的“部署配置”入口生成交付计划，触发集群服务端干跑（Dry-Run），展示锁定的修订号、源码提交号、渲染摘要与目标资源清单。
5. 预检通过后确认交付计划并完成环境审批策略校验。实际执行严格使用预检冻结的同一份渲染快照；若入口路径、镜像摘要、环境绑定或资源包修订发生变化，必须重新生成交付计划。

直连模式与 Agent 模式均通过 Kubernetes Server-Side Apply 应用冻结清单，并明确区分已提交、等待就绪、已就绪、执行失败和状态未知五种阶段。应用运行态页面从受管资源清单中提取并展示 Deployment 关联的 Pod；不包含 Deployment 的纯配置资源包保留配置同步状态。对于未知自定义资源，在缺少匹配当前代数的健康证据前不会标记为已就绪。

当前单次应用交付计划限制在绑定的单一命名空间内，每次管理 1–50 个 Kubernetes 资源对象。支持资源包内部的 `base`/`overlay`、`components`、`patches`、`replacements` 以及常规 `ConfigMap` 文件生成器；明确禁止路径越界、符号链接、远程 URL 依赖、`exec`/Alpha 插件、Kustomize 内嵌 Helm 渲染以及明文 `Secret` 生成器。集群级资源扩展须走独立的平台安装流程；应用交付计划与资源包自动同步部署不能同时接管同一目标资源。

历史 `kustomize_overlay` 发布目标仍可只读查看，但新发起的发布不再拼接本地 Shell `kubectl apply` 命令。迁移时需先关联服务资源包与环境绑定，再通过标准交付计划执行；历史遗留字段不会自动转换。

版本回退通过新建交付计划并选择历史已发布修订号完成。部分资源应用失败时会保留已成功写入的资源归属记录；取消任务不会回滚已写入集群的变更；从新版清单中移除某个资源对象不会自动删除集群中的存量对象。持久卷声明（PVC）、数据库业务数据、Kubernetes 不可变字段冲突以及集群外部系统状态均不在自动回退覆盖范围内。

## 模块职责划分

### 后端模块

- `internal/application/app`
  - 应用注册表管理
  - 应用归属关系与环境绑定管理
  - GitLab 代码仓库浏览与关联编排
- `internal/application/build`
  - 构建请求编排
  - 手动构建触发与状态流转
  - 构建记录（`build_records`）全生命周期维护
- `internal/application/execution`
  - 发布包（`release_bundles`）生命周期管理
  - 执行任务（`execution_tasks`）状态机管理
  - 运行器回调处理与环境审批策略控制面
- `internal/application/release`
  - 部署与发布的镜像滚动替换编排
  - 部署记录（`deploy_records`）生命周期维护
- `internal/application/delivery`
  - 面向应用详情、应用环境详情、发布看板与目标工作负载候选列表的聚合读模型
- `internal/infrastructure/integration/scm`
  - 代码托管平台适配器（如 GitLab 项目、分支、标签与提交读取）
- `internal/infrastructure/integration/runner`
  - Docker、Buildx、Kaniko 与自定义构建运行器连接适配层
- `internal/repository/app`、`internal/repository/build`、`internal/repository/release`
  - 应用、构建与发布领域的 PostgreSQL 仓储实现

### 前端模块

- `web/src/features/delivery/delivery-app-pages.tsx`
  - 应用列表与应用详情工作区
  - 构建模板管理
  - 发布包列表查看
  - 执行任务列表与实时日志排障视图
  - 环境审批策略配置与工作流审批/触发交互
- `web/src/features/delivery/delivery-catalog-pages.tsx`
  - 结构化应用环境绑定表单
  - 多环境聚合发布看板
  - 应用环境维度的交付工作区
- `web/src/features/delivery/delivery-blueprint-pages.tsx`
  - 交付蓝图增删改查
  - 渲染规范预览（`RenderedDeliverySpec`）
  - 平台应用初始化结果核验视图

## 数据模型设计

PostgreSQL 持久化维护以下交付核心表：

- `applications`
- `application_build_sources`
- `application_services`
- `application_service_containers`
- `build_templates`
- `release_bundles`
- `execution_tasks`
- `execution_logs`
- `execution_callbacks`
- `application_environments`
- `release_targets`
- `workflow_templates`
- `workflow_approvals`
- `build_records`
- `deploy_records`
- `registry_credentials_meta`

运行时执行状态统一由持久化行记录配合运行器异步回调共同表达：

- 运行中任务的存活心跳持久化在 `execution_tasks` 中
- 终态裁决与重试归属权由 `execution_tasks` 统一维护
- 实时与归档执行证据分别保存在 `execution_logs` 与结构化产物记录中

## 执行架构分层

平台在运行时严格拆分为两层：

- 控制平面（Control Plane）：位于 API 服务端进程内，负责权限校验、计划冻结、审批治理与状态编排
- 执行平面（Execution Plane）：位于独立后台工作节点或专用运行器（Runner）进程内，负责执行耗时的源码拉取、镜像构建与部署动作

API 服务端严禁在 Gin HTTP 请求处理协程内直接内联运行长耗时的容器镜像构建任务。

## Kubernetes 交付模型

发布执行面向标准化的平台目标视图，核心定位字段包括：

- 目标集群（`target cluster`）
- 目标命名空间（`target namespace`）
- 工作负载类别（`workload kind`）
- 工作负载名称（`workload name`）
- 目标容器名称（`target container`）
- 新镜像完整引用（`new image reference`）

镜像替换目标保持显式的 Deployment 绑定；声明式部署使用关联资源包的 `manifest_ssa` 目标。浏览器端输入绝不作为实际集群工作负载身份的真实源。

这一分层使前端界面与上层业务编排服务无需在各处直接拼接或修改底层原始 Kubernetes YAML。

## 执行语义与运行机制

- `dev`、`test`、`pre` 环境在界面中采用“部署（Deploy）”语义，即使底层复用同一套编排状态机；`prod` 环境在界面中采用“发布（Release）”语义。
- 工作流中的人工审批节点（`manual_approval`）会将工作流运行挂起为 `waiting_approval` 状态。
- 审批裁决通过显式的批准/驳回接口落盘到 `workflow_approvals` 表；当工作流由 AI Gateway 审批通过后重放触发时，审批行元数据会保留与 Gateway 审批单的关联引用。
- 构建与发布动作会自动生成关联的 `releaseBundleId` 与 `executionTaskId` 元数据，使执行平面演进与前端既有交互保持平滑兼容。
- 执行任务暴露清晰的生命周期状态：`queued`、`dispatching` 或 `running`，随后经运行器回调或同步执行进入终态；任务日志可统一通过交付控制平面查询。
- `ci_agent_runner` 提供完整的认领与回调闭环：控制平面暴露任务认领与回调接口，Agent 轮询拉取 `ci_agent_runner` 任务、在受控本地工作区执行命令载荷，并通过回调接口持续上报日志与构建产物结果。
- 任务认领与回调处理全部收口在专用的执行应用服务内，确保心跳时间戳、发布包状态以及构建/部署业务记录在同一编排路径中保持同步。
- `execution_tasks.last_heartbeat_at` 持久化记录最新心跳并展示在执行任务页面；回调驱动的状态推进会自动回填 `build_records` 与 `deploy_records`。
- `ci_agent_runner` 任务载荷具备工作区感知能力：构建与发布任务可携带 `workspace.path`、`workspace.commandDir`、`workspace.checkout` 与 `workspace.artifactFiles`，由 Agent 准备本地目录、执行 Git 拉取检出、在指定目录运行命令并上报结构化产物摘要。
- 异步构建成功回调会将关联发布包状态标准化推进为 `ready`，并从回调载荷更新 `release_bundles.artifact_ref` 与 `artifact_digest`，避免构建产物包停留在笼统的任务中间状态。
- 执行应用服务内置后台超时巡检：凡处于 `dispatching` 或 `running` 状态且心跳超过 `timeout_seconds` 的任务，会自动标记为 `callback_timeout`、写入超时执行日志，并同步回填发布包、构建记录和部署记录的失败状态。
- 执行任务支持控制平面发起的取消（`cancel`）与重试（`retry`）动作：重试会在重新入队前轮换回调令牌；`ci_agent_runner` 在上报心跳时检查服务端返回的取消信号，从而主动终止本地子进程，而非仅修改数据库状态。
- Agent 进程在内存维护活动任务注册表，并暴露受 Agent Bearer 令牌保护的本地运行时接口，支持列出活动任务、查询单任务详情与立即取消，为控制平面主动下发停止指令提供支撑。
- 任务认领请求可附带运行器的本地运行时地址；控制平面取消任务时会优先尝试直连运行器执行即时取消，失败时再回退到心跳轮询感知取消，使 `ci_agent_runner` 具备主动停止能力。
- `k8s_job_runner` 对接服务端执行集群配置（`runtime.execution_job_cluster_id`、`runtime.execution_job_namespace`、`runtime.execution_job_image`、`runtime.execution_job_git_image`、`runtime.execution_job_ttl_seconds`），配置就绪后构建链路可派发隔离的 Kubernetes Job 执行构建。
- 执行任务 DTO 将各类构建产物统一归一化为一等字段 `artifacts[]`，前端与 CLI 无需手工解析非结构化 `result` JSON 即可查看输出镜像、工作区文件与 Kubernetes Job 执行证据。
- `release_targets` 数据模型已内置 `targetKind`、`executorKind`、`groupKey`、`waveKey`、`regionKey` 与 `configRef` 等多批次分波次扩展字段，同时在默认界面中保持以 Kubernetes Deployment 为主目标。
- 任意自定义构建命令仅允许在隔离的专用构建运行器路径内执行，严禁在 API 服务端的 HTTP 请求生命周期内直接运行。
