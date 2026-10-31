# soha

`soha` 提供工作台原生命令和 AI Gateway 入口，管理登录与本地 profile，并支持脚本、MCP stdio 和能力发现。

工作台命令通过 Soha API 操作已注册资源；MCP tool 调用通过 Gateway，再进入所属应用服务。资源权限、范围与审计由服务端校验：

```text
soha mcp
  -> GET /api/v1/ai-gateway/capabilities
  -> POST /api/v1/ai-gateway/tools/:toolName/invoke
  -> POST /api/v1/ai-gateway/resources/read
  -> POST /api/v1/ai-gateway/prompts/get
  -> backend permissionKeys / scope grants / MCP tool grants / access policies / skill bindings / audit
  -> owning application service
```

## 安装、npx 与本地构建

`@opensoha/cli` 是原生 Go CLI 的轻量 npm 启动器。它下载与 npm 包版本匹配的平台二进制，核对 `checksums.txt` 后按版本缓存。该包会由首个包含 npm 发布步骤的 tag release 发布；在 registry 尚未出现该包时，npx 会返回 `E404`，此时应先使用原生 GitHub Release 二进制。发布后，交互式安装使用 `@latest`，CI 应固定 npm 版本：

```bash
npx -y @opensoha/cli@latest mcp
npx -y @opensoha/cli@latest setup --client codex --mode both
npx -y @opensoha/cli@0.1.0 version --json
```

`setup` 会把已校验的缓存二进制路径写入 MCP 配置，因此 Agent 每次启动 MCP 时不需要重新走 npm 下载。升级时重新执行最新的 `setup`。开发环境也可以从 `soha-cli` 源码构建并把二进制放入 `PATH`：

```bash
cd ../soha-cli
go run ./cmd/soha help
go build -o ./bin/soha ./cmd/soha
mkdir -p ~/.local/bin
install -m 0755 ./bin/soha ~/.local/bin/soha
soha help
```

如果 `~/.local/bin` 还不在 `PATH`，先把它加入 shell 配置：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

当前 Gateway 命令面：

- `login`
- `auth status|sessions|revoke-session`
- `whoami`
- `logout`
- `profile list|show|use|remove`
- `context show|set`
- `capabilities`
- `tool call`
- `resource read`
- `prompt get`
- `token list|create|revoke|rotate|rotation-status`
- `service-account list|create|token-list|token-create|token-revoke|token-rotate|rotation-status`
- `audit list`
- `approval list|timeline|approve|reject|cancel`
- `governance status`
- `mcp`
- `mcp install`
- `setup`
- `skill list|install|status|update|remove|rollback`
- `diagnose`
- `completion bash|zsh`

`skill install` 只安装 AI 可读流程和方法论，不赋予额外权限。真实授权仍由 Gateway manifest、permission keys、scope grants 和 MCP tool grants 决定。

端到端 MCP client、CI service account、delivery/k8s workflow、access policy 和 skill binding 示例见 [AI Gateway Examples](./ai-gateway-examples.md)。

## Docker 库存原生查询（候选版本）

候选 CLI 通过已有 Core API 提供分页只读查询：

```bash
soha docker hosts list --search development --page 1 --page-size 20 --profile local
soha docker projects list --host-id host-1 --profile local
soha docker services list --host-id host-1 --project-id project-1 --profile local --output yaml
```

每次命令只读取一页；继续查询前核对 `data.total`、`data.page` 和 `data.pageSize`。各类资源的过滤条件不同，具体选项见对应命令帮助。服务端仍校验当前角色、Key 权限上限和已配置的资源 scope；已登录不代表拥有工作台操作权限。

结果是带有 `configurationHidden: true` 的精简库存投影，不输出配置、环境变量值、Agent 地址或容器运行详情。这些列表不代表已实现条件更新、完整 Docker CRUD 或容器归属验证。本节描述候选行为，不代表已经发布。

## Docker 原生终端（候选版本）

匹配的候选 Core、Agent 与 CLI 支持对已登记服务打开真实 PTY。先从服务库存核对完整 64 位容器 ID，再执行：

```bash
soha docker projects terminal project-1 --service api --expected-container-id FULL_CONTAINER_ID --yes --profile local
soha docker projects terminal-session project-1 --session-id UUID --profile local
soha docker projects terminal-close project-1 --session-id UUID --yes --profile local
```

交互命令要求真实终端输入和输出，不接受 `--output`。普通用户或 Key 必须具有当前 `docker.services.terminal` 权限；Key 的权限上限仍生效，受治理 AI Key 继续使用 Gateway/MCP。终端固定项目、服务、完整容器 ID 和原登录会话或 Key，不能用另一个凭据接续；不支持的 Agent 返回错误，不回退旧 Compose 终端。

管理员还需在匹配版本 Agent 的 `security.allowed_actions` 中显式加入 `docker.runtime.terminal.v1`。旧的 `docker.runtime.terminal` action 和 bound identity 配置都不能启用新协议。默认安装器仍固定旧版 Agent，使用此候选功能时须部署匹配的候选 Agent 并单独配置授权。

Daemon 适配器接受 Linux `unix`、`tcp` 地址，TCP 可使用 mTLS。本轮真实 daemon 验收覆盖 Linux rootless Docker；当前不支持 Windows daemon 和 `npipe` 地址。Windows CLI console 验收使用 loopback 协议夹具，不能据此推断 Windows daemon 支持。

默认会话上限 300 秒，可通过 `--session-timeout-seconds` 设置 1–900 秒，并受原凭据到期时间限制。输入最多 1 MiB，合并输出最多 32 MiB。一次性连接票据不出现在 URL，CLI 不自动重连。`Ctrl-]` 在本地断开并请求关闭；断线、权限撤销或未知结果不能证明远端进程已终止，应使用原 `--session-id` 查询并核实远端效果。只有验证了原容器身份和真实退出码的结果才显示成功或失败。

## Kubernetes 原生命令（候选版本）

本节适用于包含条件资源 API 的候选 Core、Agent 和 CLI 组合，尚不代表已发布版本。先用 `soha k8s --help` 核对本机命令。旧服务器或 Agent 不支持新条件路径时返回错误，CLI 保留调用方提供的 UID/版本保护。

```bash
soha k8s clusters list --profile local
soha k8s namespaces list --cluster-id cluster-1 --profile local
soha k8s resources list Deployment --cluster-id cluster-1 --namespace default --profile local
soha k8s resources get Deployment api --cluster-id cluster-1 --namespace default --profile local
soha k8s events list --cluster-id cluster-1 --namespace default --limit 100 --profile local
soha k8s logs query --cluster-id cluster-1 --namespace default --pods api-1 --tail 100 --profile local
soha k8s logs tail --cluster-id cluster-1 --namespace default --pods api-1 --profile local
```

`resources` 当前支持19类核心资源，覆盖 workload、Pod、Node、配置、网络、存储和 namespaced RBAC；用命令 help 核对具体 kind。列表范围由服务器权限决定；`--all-namespaces` 只用于列表，指定对象的操作使用单个 namespace。日志 query 是有界读取，tail 通过客户端轮询获取增量；Ctrl+C 结束本地跟随。

变更前先读取 identity 并审阅目标。以下 `UID` 和 `RV` 替换为当时返回的 `uid`、`resourceVersion`，再次确认前保留原值：

```bash
soha k8s resources identity Deployment api --cluster-id cluster-1 --namespace default --profile local
soha k8s resources apply Deployment api --cluster-id cluster-1 --namespace default --file reviewed.yaml --expected-uid UID --expected-resource-version RV --dry-run --profile local
soha k8s resources apply Deployment api --cluster-id cluster-1 --namespace default --file reviewed.yaml --expected-uid UID --expected-resource-version RV --profile local
soha k8s workloads scale Deployment api --cluster-id cluster-1 --namespace default --replicas 2 --expected-uid UID --expected-resource-version RV --dry-run --profile local
soha k8s rollout status Deployment api --cluster-id cluster-1 --namespace default --profile local
soha k8s rollout history Deployment api --cluster-id cluster-1 --namespace default --profile local
```

apply、restart、scale 和 rollback 使用真实 Kubernetes dry-run。Deployment 支持 restart/scale/rollback，StatefulSet 支持 restart/scale，DaemonSet 支持 restart；rollback 需要明确的 `--revision`。资源版本或 UID 已变化、外部资源所有权或字段冲突会阻断变更。重新审阅后再发起新意图，不自动取最新版本覆盖，也不强制接管字段。workload 回执只确认 API 更新，实际就绪需继续检查 rollout 或资源详情。

`resources delete` 同样要求明确 UID/版本。回执 `deletion_requested` 表示删除已受理，finalizer 保持不变；需要后续读取确认对象消失。`--yes` 仅省略 CLI 确认，不改变服务器权限。

创建使用预检及稳定请求 Key：

```bash
soha k8s create preflight --cluster-id cluster-1 --file reviewed.yaml --profile local
soha k8s create execute --cluster-id cluster-1 --file reviewed.yaml --idempotency-key create-1 --profile local
```

保留原文件、Key 和返回的 operationId。响应未知时用相同文件和 Key 加 `--retry-original`：服务器先恢复已存回执，若原请求从未到达则执行首次提交。partial/failed 仍输出原回执并返回非零退出码；先核对已完成项目，再决定后续操作。

Secret 的 get/identity 默认读取元数据。读取 Secret YAML 需要显式 `--show-secret-data` 和服务端独立的数据读取权限；`--output raw` 导出授权的原文，导出文件应按敏感文件保护。交互 TTY 与 TUI 的验收独立于下面的非交互 argv 路径。

这些原生命令适用于获授权的用户或服务账号。受治理 AI Key 使用获授予的 Gateway 能力；只读 `k8s-sre` 保持只读。`--yes`、客户端 source 或 Skill 文本不授予写权限，不能用切换广权 profile 绕过 Gateway 控制。

受治理 Native 扩容流程需从在线 manifest 发现候选 `k8s.workloads.scale` / `k8s.workloads.scale.assess` 配对能力。写入仍要求独立审批和原 UID/版本；保留原 `mutationRequestId`、审批副本数及预条件。只有原回执已知成功、凭据及当前权限有效，且原 UID 当前期望副本数符合审批值时，验证才通过；允许控制器随后更新状态版本，不据此证明 rollout 就绪或状态从未改变。原通用动作和严格版本评估保持原检查；缺少能力不允许降级或重放。

### Pod argv 执行与原始回执

候选 CLI 将 `--` 后的参数原样传给远端，不隐式增加 shell。使用已审阅的 Pod UID，并为同一意图保留稳定执行键：

```sh
soha k8s resources identity Pod api-1 --cluster-id cluster-1 --namespace default --profile local
soha k8s pods exec api-1 --cluster-id cluster-1 --namespace default --expected-uid UID --container app --idempotency-key exec-1 --yes --profile local -- printf '%s\n' 'literal $(value)'
soha k8s pods execution api-1 --cluster-id cluster-1 --namespace default --idempotency-key exec-1 --profile local
```

`--exec-timeout-seconds` 默认 10 秒，最多 300 秒。stdout/stderr 合并保留量默认 65,536 字节，`--max-output-bytes` 最多允许 1 MiB。`--stdin-file FILE|-` 最多读取 65,536 字节，使用标准输入时必须同时提供 `--yes`。JSON/YAML 保留有界进程输出及编码，非 UTF-8 内容使用 base64；text 输出转义终端控制字符。已知的 1–255 远端非零退出码会成为 CLI 退出码，其他进程退出码保留在结构化回执中，CLI 返回非零。

HTTP 响应丢失后，通过原 key 或 `--execution-id` 查询。同一原请求再次提交会返回原回执；同一 key 换目标或输入会冲突。running、超时、取消、传输中断和 unknown 结果均返回非零 CLI 状态。输入与输出加密保留七天后清理，最小 key tombstone 阻止过期请求再次执行；审计不记录命令输入或输出。

exec 会在连接前和正常完成后检查 UID。Kubernetes exec 不支持原子的 UID 前置条件；目标变化或结果未知都不授权自动重放。取消传输也不能证明远端进程已停止。服务端持续检查当前身份、原凭据到期、权限上限和资源 scope。旧 Agent 不支持新协议时明确拒绝，不回退 shell 字符串路径。

### 通过 CLI tool 与 MCP 执行受治理 Pod 命令

匹配的候选服务端提供版本 1 的 `k8s.pods.exec` 和 `k8s.pods.exec.receipt`。
使用独立的 `k8s-pod-executor` Skill，凭据需具备 Gateway 调用和 Pod exec 权限，
并限制在获准的 cluster、namespace 和 Pod。能力发现还需要 Gateway 查看权限；
只读 `k8s-sre` 不包含执行能力。

将已核对的请求保存为 `pod-exec.json`：

```json
{
  "clusterId": "cluster-1",
  "namespace": "default",
  "podName": "api-1",
  "idempotencyKey": "pod-check-1",
  "execution": {
    "expectedUid": "REVIEWED_POD_UID",
    "container": "app",
    "argv": ["printf", "%s", "hello"],
    "timeoutSeconds": 10,
    "maxOutputBytes": 65536
  }
}
```

```sh
soha tool call k8s.pods.exec --profile ai-pod --capability-version 1 --input pod-exec.json --yes
soha approval approve APPROVAL_ID --profile local --comment reviewed
soha tool call k8s.pods.exec.receipt --profile ai-pod --capability-version 1 --input-json '{"clusterId":"cluster-1","namespace":"default","podName":"api-1","idempotencyKey":"pod-check-1"}'
```

`ai-pod` 表示受限凭据，审批使用具有相应权限的人工 profile。`--yes` 只确认提交，
即使命中 allow policy，也必须完成服务端独立审批。MCP 使用相同工具、schema、审批
和原执行回执；受治理 Key 不能改用原生 REST 绕过。匹配的候选版本支持 Direct 和
Agent 连接模式。

receipt 只含执行元数据，独立的 `outputState` 区分 `text`、`redacted`、
`binary_withheld` 和 `unavailable`。Gateway 文本经过脱敏，非 UTF-8 输出整体隐藏，
不会作为 base64 转发；字节计数仍表示原始保留字节。进程是否成功由回执 status 和
exitCode 判断；未知结果不能重放，应查询原 key 或 execution ID。审批视图只显示输入
摘要，不显示原 argv/stdin。匹配的候选版本也支持受治理的持久任务：必须显式启用
受保护持久存储，且能力声明原调用恢复和回执验证；缺少这些条件时仍拒绝。恢复只查
原调用，不能重放未知副作用。`k8s.pods.exec.assess` 仅证明原进程已完成且退出码为零，
不证明业务目标或工作负载健康；交互 TTY 继续使用独立原生命令。

### 显式交互终端与会话恢复查询

候选命令要求真实的终端输入和输出，不能通过管道或 JSON 输出模式启动。TTY 的原生跨平台验收单独记录，不能用 argv 验收替代；候选 TUI 见下文。

```sh
soha k8s pods terminal api-1 --cluster-id cluster-1 --namespace default --expected-uid UID --container app --profile local
soha k8s pods terminal-session api-1 --cluster-id cluster-1 --namespace default --session-id UUID --profile local
soha k8s pods terminal-close api-1 --cluster-id cluster-1 --namespace default --session-id UUID --yes --profile local
```

默认 shell 为 `/bin/sh`，可明确选择容器内已有的 `/bin/bash`。`--session-timeout-seconds` 默认 300、最多 900，且受原 access 到期限制。会话冻结 Pod UID、容器和 shell，沿用 exec 权限、资源 scope 与 Kubernetes RBAC。一次票据只在专用请求头中传输，60 秒内消费，绑定原凭据；旧 Agent 缺少版本化 TTY 协议时明确拒绝。

TTY 合并 stdout/stderr，支持尺寸调整；输入累计最多 1 MiB，输出最多 32 MiB，不保存按键或终端内容。启动时显示 session UUID。Ctrl-] 断开并请求关闭，退出时恢复本地终端；它不证明远端进程已经停止。关闭元数据可能先为 `closing`，应查询原 session。只有经过验证的退出结果才返回已知进程退出码；断线和未知结果非零退出，不自动重连或再次运行 shell。元数据及加密授权快照在会话关闭或过期后保留 24 小时。

## Delivery 工作台原生命令（候选版本）

本节要求匹配的候选 CLI/Core/contracts 组合。命令通过 Soha HTTP API 操作，继续校验当前主体的业务权限和 application/environment scope。`--yes` 只确认本地请求，服务端审批和版本校验仍生效。受治理 AI Key 继续使用 Gateway/MCP，不能通过原生命令绕过治理。

```bash
soha delivery applications list --search api --limit 20 --profile local
soha delivery applications detail app-1 --profile local
soha delivery applications runtime app-1 --profile local
soha delivery services list --application-id app-1 --profile local
soha delivery environments list --application-id app-1 --environment-id env-dev --profile local
soha delivery environment-catalog list --profile local
soha delivery blueprints usage blueprint-1 --profile local
soha delivery manifests revisions package-1 --profile local
soha delivery manifests bindings package-1 --profile local
soha delivery manifest-deployments list --application-id app-1 --profile local
```

应用、Service 和应用环境绑定支持 `create/update/delete`，通过 `--input FILE` 或 `--input -` 提交 typed JSON。创建时输入必须有稳定的 `id`；应用/Service 更新必须带审阅过的 `expectedVersion`，环境更新必须带 `expectedUpdatedAt`，过期值返回冲突。响应不确定时先查询原 ID 再决定下一动作，资源 ID 不代表请求可幂等重放。所有 Service 命令都要求 `--application-id`。

```bash
soha delivery applications create --input application.json --yes --profile local
soha delivery services update service-1 --application-id app-1 --input reviewed-service.json --yes --profile local
soha delivery environments update binding-1 --input reviewed-environment.json --yes --profile local
soha delivery plans create --input reviewed-plan.json --yes --profile local
soha delivery plans get plan-1 --profile local
soha delivery plans confirm plan-1 --yes --profile local
soha delivery tasks get task-1 --profile local
soha delivery tasks logs task-1 --limit 200 --profile local
soha delivery tasks artifacts task-1 --profile local
soha delivery tasks wait task-1 --wait-timeout 10m --profile local
soha delivery tasks cancel task-1 --reason reviewed --yes --profile local
```

Plan 可能仍在 `waiting_approval`，任务 `202` 也可能处于排队或失败状态。`tasks wait` 仅在服务端报告 `completed` 时成功；失败、取消、超时和未知状态返回非零。退出等待或 Ctrl+C 不会取消持久任务。日志是 1–1000 行的持久化查询，不是运行日志流。`tasks cancel/retry` 只使用 action-scoped `/control` 协议；旧后端不支持时明确报错，不回退旧路由，也不通过重定向重放 POST。

Manifest 查询覆盖包分页、不可变版本、交付绑定和部署期望/观测状态。绑定写入使用 `manifest-bindings create/update/delete/set-revision`：创建要求 `--package-id`，更新要求 `expectedVersion`，选择版本要求 `expectedGeneration`。Reconcile/repair/adopt/rollback 沿用服务端策略与审阅过的 generation；回滚输入必须在 `targetRevision` 和 `useLastKnownGood` 中选择一个。原生 rollout 控制要求审阅过的 `uid` 和 `resourceVersion`。命令不替代 runner 能力、部署健康验证或审批；绑定创建响应不确定时，先查看原 package 的 bindings 再决定是否发起新请求。

## AI 工作台原生命令（候选版本）

候选 CLI 可直接查询普通 Chat、个人助手与运行状态，输出 JSON 或 YAML。它们复用服务端 Copilot API；普通 Chat 不会隐式启用个人助手或创建计算资源。个人助手功能仍受服务端启用状态、当前权限和会话所有权限制。

```bash
soha ai chat sessions list --profile local
soha ai chat sessions main --yes --profile local
soha ai chat sessions create --input chat.json --yes --profile local
soha ai chat sessions get SESSION_ID --profile local
soha ai chat messages window SESSION_ID --limit 40 --profile local
soha ai assistant access get --profile local
soha ai assistant access request --yes --profile local
soha ai assistant ensure --yes --profile local
soha ai assistant sessions list --profile local
soha ai assistant tasks list --profile local
soha ai assistant artifacts list --profile local
soha ai runs list --session-id SESSION_ID --profile local
soha ai runs events RUN_ID --after-sequence 0 --profile local
soha ai runs cancel RUN_ID --yes --profile local
soha ai runs resume RUN_ID --input resume.json --yes --profile local
soha ai chat native-request SESSION_ID --request-id original-turn-1 --profile local
```

`chat.json` 使用公开会话输入，例如 `{"title":"事件跟进","mode":"general"}`；`resume.json` 可包含 `{"input":"用户补充的信息"}`。带敏感内容时使用文件或 `--input -`，避免放入命令参数。消息窗口的 `--around`、`--before`、`--after` 互斥，`--limit` 为 3–100。

申请启用只会进入审批，不会自行批准；`ensure` 只确保已获准用户的助手身份与主会话。取消返回 HTTP 202 只表示已受理，需继续读取实际运行状态；命令不把它改写成“已停止”。`native-request` 仅查询原会话与 requestId，不会重发或恢复消息；404 不证明仍在途的提交不会稍后落库。requestId 最多 128 个 Unicode code points，查询时保留原值。

这组原生命令不授予 Gateway 的 AI tool grant、Skill、预算或审批权限。受治理 Key 仍必须走受支持的 Gateway/MCP 路径；原生 API 拒绝时不会回退到广权 profile。候选 `soha tui` 使用相同服务端权限和持久回执；JSON 命令与流式检查本身不代表 TUI 或真实模型环境已验收。

### 流式提交与持久事件

先审阅 `turn.json`，例如 `{"content":"检查当前任务状态","requestId":"original-turn-1"}`，再显式提交：

```bash
soha ai chat messages stream SESSION_ID --input turn.json --yes --stream-timeout 10m --profile local
soha ai runs events RUN_ID --follow --session-id SESSION_ID --after-sequence 0 --wait-timeout 10m --profile local
```

流式命令仅输出 NDJSON。每行 `source=submission` 包含本次 POST 的 SSE 事件，最后的 `receipt.status=accepted` 只证明服务端受理；Native 与外部队列并不因此完成。只有明确的终态回执才表示该次流已结束。HTTP/帧损坏、空 EOF 或等待超时会返回非零且保留未知结果提示，禁止自动重发；使用原 session、requestId 查询。POST 不跟随重定向，仅明确的认证预检拒绝可刷新后重试一次。

`source=run-events` 是另一条持久事件通道。按每页 `nextSequence` 保存游标，`hasMore` 时继续分页；不能把 submission 的连接序号作为这个游标。跟随模式还读取原 session 的服务端 run 状态；completed 成功退出，failed/canceled/callback_timeout 非零退出，paused 或等待输入仍非终态。`resyncRequired` 输出后停止，审阅原 run 再显式选择恢复游标，不自动归零或创建替代任务。

流式默认等待 10 分钟，单帧最多 2 MiB、整个 POST 响应最多 32 MiB；显式全局 `--timeout` 仍限制单次 HTTP 请求。Ctrl+C 或等待超时只断开查看，不取消持久任务；停止任务须另行执行 `ai runs cancel RUN_ID --yes`，然后读取实际终态。旧服务不支持事件 API 时明确失败，不回退重发。

## 交互工作台（候选版本）

```bash
soha tui --profile local --cluster-id cluster-1 --namespace default
```

TUI 要求真实终端。1–6 切换工作台，Tab 切换视图，Enter 查看详情；写操作先展示 review，再明确按 `y` 确认，服务端当前权限、scope 和审批仍生效。跟随事件时 `q` 只退出查看，不取消持久任务；停止任务需使用显式取消操作，再读取原 run 确认终态。可用操作由能力发现决定，TUI 不隐式创建个人计算环境，也不绕过 Gateway 限制。

## 目录同步与原请求恢复（候选版本）

匹配的候选 CLI/Core 提供组织同步的预览、显式执行和持久结果查询；预览不会写入本地目录投影。同步仍使用服务端的连接配置与 people gate，CLI 不导出连接器凭据。

```bash
soha directory sync preview --connection-id CONNECTION_ID --profile local
soha directory sync start --connection-id CONNECTION_ID --yes --profile local
soha directory sync request ORIGINAL_UUID --connection-id CONNECTION_ID --profile local
soha directory runs list --connection-id CONNECTION_ID --profile local
soha directory runs get RUN_ID --profile local
soha directory runs cancel RUN_ID --connection-id CONNECTION_ID --yes --profile local
soha directory runtime get --connection-id CONNECTION_ID --profile local
soha directory events list --connection-id CONNECTION_ID --limit 50 --profile local
```

`sync start` 在发送前向 stderr 输出新生成的请求 UUID；脚本也可用 `--idempotency-key UUID` 提供并保存一个非零 UUID。每个新意图使用新 UUID。同一连接、原用户和原凭据重复提交相同 UUID，只返回原任务，不再拉取目录或执行投影。响应丢失时先运行 `sync request`，不要直接再次运行会生成新 UUID 的默认 `start`。旧 Core 缺少原请求协议时明确失败，不回退旧同步路由。

执行和预览需要 `access.directory.sync`；原请求查询还需要 `access.directory.view`，并绑定原登录会话或 Key。当前角色和 Key 权限上限每次重新检查。取消运行中的原请求先返回 `cancelRequested: true`，状态仍可能为 `running`；只有执行停止后才进入 `canceled`，此前已提交的变更不保证回滚。`queued/running` 不是同步完成，`failed/partial/canceled` 返回非零，保留原 UUID 排障，不自动重放。run 列表固定最多 50 条，事件列表的 `--limit` 不改变这个限制。

## 网络操作与同会话 MFA（候选版本）

这些命令要求匹配的候选 Core/CLI，尚不代表已经发布。发放要求 MFA 的访问授权前，在同一登录会话完成现有因子验证；另一个 profile、登录会话或 Key 不会继承该会话的 MFA。

```bash
soha auth mfa status --profile local
soha auth mfa totp --profile local
soha auth mfa verify --challenge-id CHALLENGE_UUID --response-stdin --profile local
```

`totp` 为已配置因子发起 step-up；首次配置只在显式 `--show-enrollment` 时输出认证器 URI，请仅在私有终端查看。`verify` 在真实终端隐藏输入，也支持受限 stdin；不接受位置参数验证码。成功验证不扩大业务权限，Key 不能借用用户会话的 MFA。

```bash
soha network-access sessions plan SESSION_ID --input action.json --profile local
soha network-access sessions execute SESSION_ID --input reviewed-command.json --yes --profile local
soha network-access sessions command COMMAND_ID --session-id SESSION_ID --profile local
soha network-access sessions request ORIGINAL_PLAN_HASH --session-id SESSION_ID --profile local
```

执行输入保留服务端计划的 `planHash`。提交前 stderr 输出原 hash；响应未知时先用 `request` 或原 command ID 读取回执，不生成新计划来重试。`pending/delivered` 只表示等待或投递，不能证明 NAS 已执行。查询重验当前权限和所属 session，旧服务器不支持时明确失败。

## 告警自愈与原 workflow（候选版本）

```bash
soha observe events heal EVENT_ID --policy-id POLICY_ID --idempotency-key ORIGINAL_UUID --yes --profile local
soha observe healing-runs request ORIGINAL_UUID --event-id EVENT_ID --profile local
soha observe healing-runs get HEALING_RUN_ID --profile local
soha observe healing-runs approve HEALING_RUN_ID --input-json '{"comment":"Reviewed"}' --yes --profile local
soha observe healing-runs retry HEALING_RUN_ID --yes --profile local
```

`heal` 先输出原 UUID，只创建待审批 run；未知响应使用同一用户、原登录会话或 Key 查回原请求，不回退旧 `/heal`。UUID 对应的 run 删除后也不重建。策略要求值班审批时，批准和拒绝按当前值班配置校验，历史候选人不能授权。

批准先持久化稳定 workflow ID 和 `unknown` 围栏，再启动原执行器；重复批准只观察该执行。运行中或未知结果不能 retry，也不能被 reject 覆盖。显式 retry 仅接受 rejected 或已读到原 workflow 失败终态，并创建新的待审批代次；原步骤可能已有部分效果，重试前应检查。`completed` 是实际 workflow 状态，业务目标仍须按资源结果验证。该协议不承诺任意进程中断后的自动完成。

## 登录

> CLI v2 认证正在准备发布。以下新设备码、凭据库和轮换恢复说明适用于包含这些端点的 Core/Web/CLI 版本组合；管理员完成兼容验证后再启用 `auth.cli.enabled`。旧实例请明确选择 `--method legacy-password`，新版 CLI 不会自动回退密码登录。

默认使用浏览器设备授权，第三方登录用户无需设置本地密码：

```bash
soha login --server http://127.0.0.1:8080 --profile local
# 远程终端或不自动打开浏览器
soha login --server https://soha.example.com --profile local --device-code --no-browser
```

打开终端提供的完整地址，在同一个 Soha 实例登录，输入终端显示的六位数字（保留开头的 0）。核对账号、实例、终端、权限和有效期后明确批准或拒绝。仅有六位数字不能查找其他登录请求。链接中的请求句柄具有高熵、不可猜测，位于 fragment；网页在转入第三方登录前移除它，仅在当前标签页短时保留。不要转发登录链接或批准别人发来的终端请求。

已有 MFA 的账号需要通过已有认证器、Passkey 或恢复码验证。新建认证器不能代替已有因子的验证。请求默认五分钟过期；Ctrl+C 尝试取消。响应丢失时再次运行相同服务器/profile 的登录会续接原请求；需要放弃原请求时使用 `--restart`，并核对个人中心的 CLI 会话。

本地密码是显式兼容路径，受当前账号及实例策略约束：

```bash
soha login --server http://127.0.0.1:8080 --profile local --method password --login admin
# 自动化从标准输入提供密码，避免写入命令参数和历史
soha login --server http://127.0.0.1:8080 --profile local --method password --login admin --password-stdin
```

配置了额外验证的实例会要求设备浏览器登录，不会绕过 SSO/MFA。旧实例使用 `--method legacy-password` 调用原登录接口。

Key 登录支持个人访问凭据（PAT）和服务账号令牌：

```bash
# 把 Key 通过秘密管理器或受控管道送入 stdin；不要在命令行中写出 Key
soha login --server https://soha.example.com --profile local --with-token
soha whoami --profile local --json
```

Key 导入只验证当前身份并保存原 Key，不创建用户刷新会话。PAT 使用所选权限，服务账号令牌使用服务账号身份；LLM Key 不会自动获得平台管理权限。CI 可注入 `SOHA_SERVER` 和 `SOHA_TOKEN` 进行无 profile、无落盘认证。环境令牌不刷新、不写回配置；退出或删除 profile 不会取消环境变量。

### 凭据保存与隔离

配置默认位于 `~/.soha/config.json`，可通过 `SOHA_CONFIG=/abs/private/config.json` 隔离。新配置只保存凭据引用和元数据；token set 独立保存，并绑定服务器、部署路径和 profile。父目录使用 `0700`，文件使用 `0600`；Windows 使用当前用户私有 ACL。

新登录默认 `--credential-store auto`，选择系统凭据库。凭据库不可用会报错，不会静默降级。需要无桌面环境的文件存储时，明确指定 `--credential-store file`；该模式的私有凭据文件包含明文秘密，应按秘密文件保护。`ephemeral` 仅验证凭据：正常退出前撤销本次新建的密码/设备码会话，验证导入的共享 Key 时不撤销 Key；已有 profile 保持原样。JSON 返回 `verified: true`、`authenticated: false`、`persisted: false`，会话验证还返回 `temporarySessionRevoked: true`。无法确认撤销时返回 `ephemeral_cleanup_unconfirmed`，需到 Web 核对会话。后续无状态命令使用环境 Key 认证。原明文 v1 profile 在首次成功刷新后迁移到独立 file envelope，保留原有存储选择；重新登录可切换到系统凭据库。

同一 profile 的并发刷新使用进程锁和持久请求 ID。新 v2 CLI 会话默认访问有效期十五分钟、空闲七天、最长三十天；自然过期可正常刷新，撤销、账号停用或最长有效期到期需要重新登录。旧 Web/App/CLI 的刷新协议保持原语义。

回退旧 CLI 时，保留新版 CLI 用于恢复或撤销 v2 会话，也可到 Web 撤销。旧 CLI 无法读取 v2 凭据，且可能覆盖不认识的配置字段。必须给旧 CLI 指定全新、独立的 `SOHA_CONFIG` 路径并重新登录，不要让它写入已迁移的配置，也不要在文件间复制 token。

### 身份、退出和会话撤销

```bash
soha auth status --profile local --json
soha auth status --profile local --offline --json
soha whoami --profile local --json
soha auth sessions --profile local
soha auth revoke-session --profile local --id SESSION_ID
soha logout --profile local
soha logout --profile local --local-only
soha profile remove local
```

在线状态和 `whoami` 查询服务端；离线状态只描述本地元数据，不证明已认证。默认退出会撤销用户 CLI 会话，再清除本地引用；服务暂时不可用时保留恢复所需凭据。`--local-only` 只清除本地认证。Key 默认退出也只移除本地副本，显式 `--revoke` 会影响所有使用同一 Key 的客户端。`profile remove` 仅删除本地 profile，不隐含服务端撤销。个人中心的“CLI 会话”可从浏览器撤销终端会话。

`profile show` 仅显示元数据；不要把凭据文件、完整 token、kubeconfig 或环境变量写入日志、issue、AI 对话或诊断附件。

## Profile 和上下文

```bash
soha profile list
soha profile show local
soha profile use local
```

AI client 上下文会作为请求头发送到 Gateway，用于审计和 tool grant 过滤：

```bash
soha context set \
  --profile local \
  --ai-client-id codex-local \
  --ai-client Codex \
  --skill-id delivery-developer \
  --source soha
```

对应请求头：

- `X-Soha-AI-Client-ID`
- `X-Soha-AI-Client`
- `X-Soha-Skill-ID`
- `X-Soha-Source`

## Capability 检查

```bash
soha capabilities --profile local
soha capabilities --profile local --json
soha capabilities --profile local --output names
soha capabilities --profile local --output inputs
soha capabilities --profile local --domain platform --output names
soha capabilities --profile local --domain platform --output json
```

`capabilities` 会调用 `GET /api/v1/ai-gateway/capabilities`，输出当前身份可用的 tools、resources、prompts、skills、permission keys 和 manifest summary。`--output inputs` 会按 tool 汇总 manifest `inputSchema` 与 `outputSchema` 中的 required 字段和 properties 字段，方便在不展开完整 JSON manifest 的情况下核对 MCP client 需要传入的参数和可预期输出字段。

`--domain platform` 会改为调用 `GET /api/v1/clusters/capabilities`，输出 Direct/Agent 连接模式的运行时能力矩阵。该矩阵用于核对 YAML apply/delete、CRD、Helm、logs、exec、port-forward 和 Docker runtime 等能力在不同连接模式下的 `available`、`partial` 或 `unsupported` 状态。平台能力矩阵支持 `json`、`yaml` 和 `names` 输出；`inputs` 只适用于默认 Gateway manifest。

如果 capability 不存在，优先检查：

- 当前 profile 是否登录到正确 server。
- 用户或 token 是否拥有 `ai.gateway.view`。
- 业务工具是否还需要对应 domain permission，例如 `delivery.*`。
- `mcp_tool_grants` 是否把 tool 收窄掉。
- `ai_access_policies` 或 `ai_gateway_skill_bindings` 是否把当前 AI client、角色或主体收窄掉。

## Tool Call

人工兜底调用 Gateway tool：

```bash
soha tool call k8s.pods.list \
  --profile local \
  --input ./pod-list-input.json
```

`--input -` 从标准输入读取 JSON；也可以用 `--input-json '{"clusterId":"cluster-a","namespace":"prod"}'`。CLI 只调用 `POST /api/v1/ai-gateway/tools/:toolName/invoke`，不直接访问数据库、Kubernetes 或 runner。

## Resource 和 Prompt

人工读取 Gateway MCP resource 或 prompt，用于排查 MCP client 能看到的上下文：

```bash
soha resource read soha://delivery/applications \
  --profile local \
  --context-json '{"applicationId":"app-1"}'

soha prompt get soha.delivery.plan_release \
  --profile local \
  --arguments-json '{"applicationId":"app-1"}' \
  --context-json '{"environmentId":"dev"}'
```

`resource read` 只调用 `POST /api/v1/ai-gateway/resources/read`，`prompt get` 只调用 `POST /api/v1/ai-gateway/prompts/get`。`--context -`、`--arguments -` 可从标准输入读取 JSON；同一命令一次只允许一个参数源读取标准输入。输出会按 CLI 脱敏规则处理。

## Token 和 Service Account

个人 token：

```bash
soha token list --profile local
soha token create --profile local --name codex-local --permission-keys ai.gateway.view,ai.gateway.invoke
soha token revoke --profile local pat-123
```

Service account：

```bash
soha service-account list --profile local
soha service-account create --profile local --name ci-runner --role-ids delivery-operator
soha service-account token-list --profile local
soha service-account token-create --profile local --service-account-id sa-123 --name ci-token
soha service-account token-revoke --profile local sat-123
```

创建 token 时后端返回的明文 token 只会在本次命令输出中出现一次。`token-list` 只返回服务账号 token 的 id、所属服务账号、prefix、权限、scope、过期、最近使用和吊销状态。列表、审计和诊断输出默认脱敏，不显示 token hash、kubeconfig、环境变量或 secret-looking 字段。


### Key 有效期与轮换恢复

新版 CLI 和 Web 新建或轮换 Key 默认设置九十天有效期，也可指定将来的过期时间。旧 API 省略过期时间的既有语义不变，已有无限期 Key 不会被批量改写。

```bash
soha token rotate --profile local --id PAT_ID --auth-profile manager
soha token rotation-status --profile local --request-id REQUEST_UUID --auth-profile manager
soha service-account token-rotate --profile local --id SAT_ID --auth-profile manager
soha service-account rotation-status --profile local --request-id REQUEST_UUID --auth-profile manager
```

轮换成功会立即撤销旧 Key；多个客户端共用时，先创建新 Key、替换所有客户端、验证后再撤销旧 Key，才能安排平滑切换。轮换入口必须使用另一个有效会话或管理 Key。`--auth-profile` 只接受同一实例，并忽略环境中的 `SOHA_TOKEN`。

CLI 在发送前保存非秘密请求 ID，并打印到 stderr。响应丢失后先查询原 ID；服务端把替代 Key、旧 Key 撤销和结果关联放在同一事务里。恢复结果只返回替代 Key ID 与完成状态，不会再次返回明文。未保存的新明文无法恢复，可撤销替代 Key 后重新生成。Web 同样保留当前标签页的轮换核对记录。不要改用新请求 ID 来猜测原轮换是否完成。

## Audit

查询 Gateway audit：

```bash
soha audit list --profile local --tool-name diagnosis.release_failure.analyze --limit 20
soha audit list --profile local --actor user-1 --from 2026-05-29T00:00:00Z
```

支持 actor、actor type、AI client、skill、tool、risk level、result、action、from/to 和 limit 过滤。时间使用 RFC3339。

## Governance

查询 Gateway 治理健康和运营指标：

```bash
soha governance status --profile local
soha governance status --profile local --window-hours 48 --json
```

`governance status` 调用 `GET /api/v1/ai-gateway/governance/status`，默认统计最近 24 小时审计；显式 `--window-hours` 只接受 1 到 168，避免直接 API 请求触发异常大窗口扫描。输出包括健康状态、health checks、调用成功/拒绝/失败数、pending approval 数、approval SLA 摘要、PAT/service token 的 last-used/过期/未使用提醒、AI client 注册审批状态、budget/rate-limit/redaction/resource-scope 覆盖度和异常调用 finding。普通文本输出会把每个 health check 的状态、名称、count 和脱敏消息打印出来，也会把 finding 的 actor、subject、AI client、approval request、policy、grant、tool 和 risk level 一并打印，并展示结构化 `recommendationAction` 的 action、target、refs 和 count，便于定位 `approval_sla_due_soon`、`stale_gateway_approvals`、`high_risk_allow_without_approval` / `high_risk_grant_without_approval` 以及 `high_risk_allow_without_resource_scope` / `high_risk_grant_without_resource_scope` 这类治理告警；普通文本输出还会展示 redaction hit summary，包括 total matches、命中 audit 数、input/output target、主要 match type/classifier/field path/policy/tool。`policyCoverage` 会同时展示 total 与 active policy/grant/binding 数量，`redactionPolicyState` 会把 input `redactionPolicy`、`outputRedactionPolicy` 和 response/output redaction aliases 计为 configured，disabled policy、expired grant 和 disabled binding 不会把 coverage state 标记为 `configured`；没有任何 active `resourceScopes` 覆盖时，后端会通过 `resource_scope_coverage` health check 和 recommendation action 提醒补齐跨环境访问约束；`--json` 保留完整脱敏 DTO，包括 approvals、riskCounts、pendingApprovalClientIds、redaction summary、activeAccessPolicies、activeToolGrants、resourceScopeState、resourceScopedAccessPolicies、`recommendationActions` 和 token due/stale day 字段。已配置的 `rateLimit`、调用次数型 `budget`、token/cost budget、strict/sanitize input redaction、output redaction 和 `resourceScopes` 会在后端 invocation 前强制执行；CLI 只展示脱敏治理摘要。

## Approval Requests

治理输出或 Console 中看到 approval request id 后，可以从 CLI 继续查询和处理：

```bash
soha approval list --profile local --status pending --tool-name delivery.actions.trigger
soha approval timeline approval-123 --profile local
soha approval approve approval-123 --profile local --comment "approved in change window"
soha approval reject approval-123 --profile local --comment "missing rollback plan"
soha approval cancel approval-123 --profile local --comment "duplicate request"
```

`approval list` 代理 `GET /api/v1/ai-gateway/approval-requests`，支持 `id`、`status`、`actor`、`actor-type`、`ai-client-id`、`skill-id`、`tool-name`、`risk-level`、`strategy`、`from`、`to` 和 `limit` 过滤。`approval timeline` 代理 `GET /api/v1/ai-gateway/approval-requests/:requestID/timeline`，返回后端从 `approvalRouting` 派生的 `approvalTrace`、decision、stage history、workflow/task 关联和同一 approval request 的 Gateway audit events。`audit list` 也支持 `--approval-request-id`，便于只查看某个审批请求关联的审计事件。`approve`、`reject` 和 `cancel` 只代理已有审批 API，并把 `--comment` 作为 decision comment 发送；实际候选审批人、change window、多阶段 quorum、AI client 激活或 tool replay 都仍由后端 Gateway application service 执行。CLI 输出会脱敏 approval tool input、decision comment、执行输出和关联 metadata。

## MCP stdio server 与 Agent 配置

本地启动：

```bash
soha mcp --profile local
soha mcp --profile local --base-url https://soha.internal.example
```

官方托管地址 `https://mcp.opensoha.com` 是默认值；私有化部署必须显式传 `--base-url`。推荐直接配置 Agent 的 MCP 和 Skills：

```bash
soha setup --client codex --mode both --profile local
soha setup --client codex --scope project --mode both --profile local
soha setup --client claude --mode mcp --base-url https://soha.internal.example
soha setup --client codex --check
```

默认 `--scope user` 写用户级配置；`--scope project` 写仓库内的客户端配置、Agent skill 和 `.soha/skills` runtime。显式 `--config`、`--dest` 和 `--runtime-skill-dest` 优先于 scope。`codex`、`claude`、`cursor`、`kiro`、`gemini`、`antigravity`、`antigravity-ide` 和 `trae` 均可作为 client。

需要手工查看通用 MCP JSON 时使用：

```bash
soha mcp install --profile local --command /usr/local/bin/soha
```

输出中的命令参数以直接 `mcp` 入口开头：

```json
{
  "mcpServers": {
    "soha": {
      "command": "/usr/local/bin/soha",
      "args": ["mcp", "--profile", "local"]
    }
  }
}
```

如果没有传 `--profile`，`mcp install` 会使用当前 profile。`--ai-client-id`、`--ai-client` 和 `--skill-id` 会写入生成的 `mcp` 参数，用于固定审计来源、AI client context 和 skill binding 上下文。`mcp start` 仅保留为兼容形式。

MCP server 支持：

- `initialize`
- `tools/list`
- `tools/call`
- `resources/list`
- `resources/read`
- `prompts/list`
- `prompts/get`

`initialize` 会返回 soha MCP 的安全边界说明：本地进程只是 AI Gateway proxy，不直接访问 PostgreSQL、Kubernetes、Docker、runner 工作目录、本地 kubeconfig，也不会绕过后端权限拼接 prompt 或 resource 内容。`tools/list`、`resources/list` 和 `prompts/list` 从 Gateway manifest 动态生成 MCP 能力列表；当前默认 Gateway tools 都会透出结构化 `inputSchema`，并在 manifest 定义输出契约时透出 `outputSchema`，让 MCP client 可以识别 `applicationId`、`action`、`clusterId`、`namespace`、`podName`、`deploymentName`、`serviceName`、`nodeName`、`taskId` 等输入字段以及可预期输出字段。`resources/list` 会透出 resource `contextSchema`，`prompts/list` 会透出 prompt `argumentSchema`、`contextSchema` 和标准 MCP `arguments[]` 摘要。`tools/list` 会输出标准 MCP `annotations`：`read` tool 标记只读/幂等，`mutate`、`execute`、`high` tool 标记 destructive，且 soha tool 默认 `openWorldHint=true`。三类列表都会在 `_meta.soha` 中带上 `permissionKeys` 和 `requiredScopes`；tool 列表还会带上 `domain`、`action`、`mcpAdapterId`、`mcpToolName`、`riskLevel` 和 `requiresApproval`，用于客户端展示调用/读取前的权限、scope、adapter 映射与风险预期。`tools/call` 只代理到 `POST /api/v1/ai-gateway/tools/:toolName/invoke`，`resources/read` 只代理到 `POST /api/v1/ai-gateway/resources/read`，`prompts/get` 只代理到 `POST /api/v1/ai-gateway/prompts/get`；缺少 tool name、resource URI/name 或 prompt name 时会直接返回 JSON-RPC invalid params，不会把无效请求发给后端。

`resources/read` 使用 manifest 暴露的 `soha://...` URI，例如 `soha://delivery/applications`、`soha://delivery/execution-tasks` 和 `soha://k8s/runtime`。`prompts/get` 支持 `soha.delivery.plan_release` 和 `soha.k8s.diagnose_workload`，并会把 MCP arguments 和 context 交给后端 Gateway 脱敏后合成 prompt messages。resource 和 prompt 也受 skill binding 约束：当 `--skill-id` 指向某个绑定 skill 时，后端只允许读取与该绑定 capability refs 相关的 resource/prompt。

当前可调用 Gateway tools 包括：

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

`delivery.actions.trigger` 支持 build、deploy、build_deploy、workflow、verify 和 rollback；rollback 应先用 `delivery.rollback.context` 读取建议上下文，再以 `action=rollback` 触发受控 workflow。k8s 工具需要 `clusterId`，`namespace` 可按平台 scope 语义为空表示聚合视图。`k8s.pods.logs` 还需要 `podName`，可选 `container`、`tailLines`、`sinceSeconds` 和 `previous`。日志输出会在 Gateway 层做基础敏感字段脱敏。

## Skills

仓库内置首批 Skills：

- `delivery-developer`
- `delivery-tester`
- `k8s-sre`
- `security-change`

查看最新稳定 GitHub Release 中可安装的 Skills：

```bash
soha skill list
```

安装单个 Skill：

```bash
soha skill install \
  --dest ~/.soha/skills \
  delivery-developer
```

安装全部：

```bash
soha skill install --all
```

默认来源是 `opensoha/soha-skills` 的最新稳定 GitHub Release，不从 branch 安装，也不提供 `--skills-version`。仅在可复现安装或回滚时使用 `--source github:opensoha/soha-skills@v0.1.0`。本地 checkout、release tarball 和 HTTPS release URL 仍可通过 `--source` 使用。默认安装目录为 `~/.soha/skills`；`--scope project` 使用当前仓库的 `.soha/skills`，显式 `--dest` 或 `SOHA_SKILLS_DIR` 会覆盖默认值。

安装和更新会先生成完整 staging 目录，再切换 active generation；旧 generation 可回滚，操作会写入本地 JSONL 安装审计：

```bash
soha skill status
soha skill update
soha skill remove k8s-sre
soha skill rollback
```

Skills 是工作流说明，不是安全边界。AI 客户端安装 Skill 后仍必须通过当前身份可见的 MCP tools 工作。

## 诊断

```bash
soha diagnose --profile local
soha diagnose --profile local --tool k8s.pods.logs
soha diagnose --profile local --resource soha://k8s/runtime
soha diagnose --profile local --prompt soha.k8s.diagnose_workload
soha diagnose --profile local --cluster-capability resource.yaml.apply
soha diagnose --profile local --tool k8s.pods.logs --ai-client-id codex-local --skill-id k8s-sre --source codex-mcp
```

`diagnose` 会验证 profile、server、token 和 Gateway capability 读取链路，并输出 tool/resource/prompt/skill/permission key 数量。传入 `--tool` 时会展示该 tool 的 risk level、审批要求、permission keys、required scopes，以及从 manifest `inputSchema` / `outputSchema` 汇总出的 `inputRequired`、`inputFields`、`outputRequired` 和 `outputFields`，并提示检查 MCP tool grants、AI access policies、skill bindings、AI client context 和 resource scopes。传入 `--resource` 或 `--prompt` 时会展示 resource/prompt 的 permission keys，并提示检查 Gateway `resources/read` / `prompts/get`、skill binding、AI client context 和 arguments/context。`--ai-client-id`、`--ai-client`、`--skill-id` 和 `--source` 只覆盖本次诊断请求，用于模拟 `mcp` 或 `mcp install` 生成的客户端上下文，不会修改 profile。它不打印 token。

传入 `--cluster-capability` 时，`diagnose` 会读取平台能力矩阵并展示指定 capability 的 Direct/Agent 支持状态、原因、required scopes、risk level、审批要求和 `docsUrl`。这条路径用于排查某个集群连接模式为什么不能执行 YAML、CRD、Helm、logs、exec、port-forward 或 Docker runtime 操作。

## Completion

```bash
soha completion bash
soha completion zsh
```
