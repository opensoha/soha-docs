# 部署

## 安装已发布版本

Core 镜像同时提供 API 和内嵌的 Web 控制台，应用数据存放在 PostgreSQL。文档站、远程集群 Agent 和可选的 Operator 分别发布。

用 Compose 在本机安装 Core `v0.1.13` 时，按 [第一次部署](../tutorials/first-deploy.md) 操作。Kubernetes 可使用发行版本的 `deploy/deployment.yaml`，或从 [Soha Helm 仓库](https://github.com/opensoha/soha-helm) 选择兼容的 Chart（面向 Core `v0.1.13` 的新版 Chart 发布前，请核对已发布 Chart 的 `appVersion`）。升级时一并核对清单或 Chart 与镜像版本。开放外部访问前请更换初始凭据和系统密钥，详见 [配置指南](./configuration.md)。

Core `v0.1.13` 默认关闭 `dsh_runtime` 与 `hindsight`；如需启用新 Chat 和 Heya，需额外部署匹配的 `ghcr.io/opensoha/soha-dsh:v0.2.0` 并按 [Agent Runtime](./agent-runtime.md) 完成配置与切换（Core `v0.1.12` 及更早版本使用旧内置运行时）。

## 从源码构建

准备支持 BuildKit 的 Docker、Compose、Make 和 Web CI 声明的 Node 版本。检出匹配版本的 Root `soha` 仓库；Core、Web（`web/`）和 Contracts（`contracts/`）都位于同一源码树中。按 tag 发布时使用对应版本的 Web 产物。在 `soha` 仓库执行以下命令。

```bash
npm ci
make deploy-image
docker compose -f deploy/docker-compose.yaml up -d --no-build --wait soha
```

`make deploy-image` 构建 Web，将产物放入 `internal/staticassets/web/dist` 后构建本地 Core 镜像。Compose 默认挂载 `configs/config.example.yaml`，并将数据库主机设为 `postgres`。如需沿用私有配置，设置 `SOHA_COMPOSE_CONFIG_FILE=../configs/config.yaml`。相对路径以 `deploy/` 为基准。

本地 Chart 可用 `helm template soha ../soha-helm/charts/soha` 渲染，并按该 Chart 标明的镜像版本部署。

## Soha Operator

Soha Operator 是一个独立版本化的可选组件，用于在集群内执行 `WorkloadCronJob` 自动化。通过 OpenSoha 的公开 Helm 仓库安装：

```bash
helm repo add opensoha https://opensoha.github.io/soha-helm
helm repo update
helm install soha-operator opensoha/soha-operator \
  --namespace soha-operator \
  --create-namespace
```

也可以固定 Operator 的发布标签，直接通过 Kustomize 安装发布清单：

```bash
kubectl apply -k "https://github.com/opensoha/soha-operator//config/default?ref=v0.1.1"
```

Operator `v0.1.1` 默认使用公开的多架构镜像 `ghcr.io/opensoha/soha-operator:0.1.1`，支持 `linux/amd64` 和 `linux/arm64`。Helm Chart 与 Operator 运行时各自独立版本化；Chart 的 `appVersion` 表示默认运行时镜像版本（当前已发布的 `soha-operator` Chart `0.1.2` 对应 `appVersion` `0.1.1`）。

## 本地运行默认约定

- PostgreSQL 位于 `localhost:5432`，数据库 `soha`，用户名 `pgsql`，密码 `pgsql`
- 默认从 `$HOME/.kube/config` 读取 `kubeconfig`（除非显式覆盖）
- 前端开发服务器运行在 `http://localhost:5173`
- 文档站开发服务器运行在 `http://localhost:3000/`

## Docker 部署 Hermes Runner

发布版 Compose 为显式选择 Hermes 的工作负载保留独立 Runner profile。`soha-hermes-agent` 在 `v0.1.12` 之后已停止发布新镜像，既有 `v0.1.12` 及更早镜像继续保留供兼容集成使用。下列命令沿用 [第一次部署](../tutorials/first-deploy.md) 的 Core Compose 项目及其密钥配置。

```bash
SOHA_IMAGE=ghcr.io/opensoha/soha:v0.1.13 \
SOHA_HERMES_IMAGE=ghcr.io/opensoha/soha-hermes-agent:v0.1.12 \
SOHA_HERMES_BIND=127.0.0.1 \
  docker compose -f deploy/docker-compose.yaml --profile hermes up -d --no-build hermes-agent-runner
```

Runner 通过 Compose 网络访问 `http://soha:8080`，并使用 Core 配置的执行 Runner 令牌。保留存放状态和工作目录的 `soha-hermes-data` 和 `soha-hermes-runtime` 卷。需要初始化提供方凭据时，使用 `hermes-setup` profile。

```bash
docker compose -f deploy/docker-compose.yaml --profile hermes-setup run --rm hermes-agent-setup
docker compose -f deploy/docker-compose.yaml --profile hermes logs --tail 50 hermes-agent-runner
```

## PostgreSQL 18.4 与 pgvector 0.8.5

新建本地数据卷和全新集群安装统一使用 `pgvector/pgvector:0.8.5-pg18-trixie` 镜像，该镜像当前基于 PostgreSQL 18.4，并与标准 PostgreSQL 18.4 镜像保持同一 Debian 发行代际。应用迁移会自动启用 `vector` 与 `pg_trgm` 扩展；内置部署还会预加载并创建 `pg_stat_statements`。外部 PostgreSQL 18 实例必须在启动前提供 `pgvector` 与 `pg_trgm`；若执行迁移的数据库用户无权创建扩展，需由数据库管理员预先创建。升级或更换镜像时，请保持数据库镜像的 `libc` 排序规则版本与初始化现有数据卷时的镜像兼容。

对于外部 PostgreSQL，`pg_stat_statements` 为可选项。如需启用，需在 `shared_preload_libraries` 中加入 `pg_stat_statements`，设置 `compute_query_id=on`，重启 PostgreSQL，并在 Soha 数据库中创建该扩展。保持禁用不会阻塞 Soha 启动。

PostgreSQL 18 默认将 `PGDATA` 存放在 `/var/lib/postgresql/18/docker` 下，因此 Compose、原生 Kubernetes 清单和 Helm Chart 均将持久化卷挂载在 `/var/lib/postgresql`。如果现有环境已有 PostgreSQL 16 数据目录，切勿将 PostgreSQL 18 pgvector 镜像直接挂载到同一数据卷；请采用 `pg_dump`/`pg_restore`、逻辑备份恢复或受控的 `pg_upgrade` 升级路径。对于可丢弃的本地开发数据，可删除旧 PostgreSQL 卷后重建环境栈；当前 Compose 配置固定使用 `soha-postgres-data` 卷。

## 虚拟化运行时说明

- macOS 上的 Docker Desktop（尤其是 Apple Silicon 环境）不适合作为本地 KubeVirt 或嵌套 Proxmox VE 实验环境的可靠验证路径。
- 本地 `k3s` 仅用于平台控制平面与 Kubernetes API 路径测试。
- 请在真实外部服务器或专用实验宿主机上验证 KubeVirt 与 PVE 能力，再将这些端点注册到 `soha`。
- 外部环境前置条件与验收清单请参阅 [KubeVirt / PVE 虚拟化实验环境 Runbook](./virtualization-lab-runbook.md)。

## CLI 会话与重启连续性

新 CLI v2 入口仍需匹配版本组合和管理员启用，见 [认证配置](./configuration.md#cli-v2-认证策略待发布组合)。保留 PostgreSQL、JWT 与凭据加密密钥；正常进程重启不应删除有效会话。先检查 `readyz`、版本、选中的 server/profile 和 `auth status`，再判断是访问过期、刷新被拒绝、环境覆盖还是会话撤销。不要为排查登录清空数据库或重新生成密钥。

### 候选 Web 部署在路径前缀下

以 `VITE_BASE_PATH=/team/` 构建 Web，将 CLI public URL 设为 `https://soha.example/team`，并将登录提供商的前端回调设为 `https://soha.example/team/login/callback`。反向代理除了剥除上游 API 请求的 `/team` 前缀，还必须改写响应 cookie 的 Path：`/api/v1/auth` 改为 `/team/api/v1/auth`，`/` 改为 `/team/`。否则第三方登录当时可以成功，刷新页面后却无法发送 refresh cookie。刷新和退出响应也要使用同样的改写规则。配置前缀后的 Vite 开发代理已执行这些改写；生产代理需要配置等效规则。
