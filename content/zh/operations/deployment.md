# 部署

## 安装已发布版本

Core 镜像同时提供 API 和内嵌的 Web 控制台，应用数据存放在 PostgreSQL。文档站、远程集群 Agent 和可选的 Operator 分别发布。

用 Compose 在本机安装 Core `v0.1.12` 时，按 [第一次部署](../tutorials/first-deploy.md) 操作。Kubernetes 可使用发行版本的 `deploy/deployment.yaml`，或从 [Soha Helm 仓库](https://github.com/opensoha/soha-helm) 选择兼容的 Chart。升级时一并核对清单或 Chart 与镜像版本。开放外部访问前更换初始凭据和系统密钥。 [配置指南](./configuration.md)

Core `v0.1.12` 使用该版本自带的运行时。dsh 和 Hindsight 的部署说明适用于 [dsh 候选版](./agent-runtime.md)。

## 从源码构建

准备支持 BuildKit 的 Docker、Compose、Make 和 Web CI 声明的 Node 版本。把版本匹配的 Core 和 Web 检出到相邻目录，并按 Core `go.mod` 中固定的版本准备 Contracts 构建上下文。按 tag 发布时使用对应版本的 Web 产物。

在 `soha` 仓库执行以下命令。

```bash
npm --prefix ../soha-web ci
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

也可以固定 Operator 的 release tag，直接通过 Kustomize 安装发布清单：

```bash
kubectl apply -k "https://github.com/opensoha/soha-operator//config/default?ref=v0.1.0"
```

Operator `v0.1.0` 默认使用公开的多架构镜像 `ghcr.io/opensoha/soha-operator:0.1.0`，支持 `linux/amd64` 和 `linux/arm64`。Helm chart 与 Operator runtime 各自独立版本化；chart 的 `appVersion` 表示默认 runtime 镜像版本。

## Local Run Assumptions

- PostgreSQL at `localhost:5432`, database `soha`, user `pgsql`, password `pgsql`
- kubeconfig available at `$HOME/.kube/config` unless overridden
- frontend dev server at `http://localhost:5173`
- docs dev server at `http://localhost:3000/`

## Docker 部署 Hermes Runner

发布版 Compose 为显式选择 Hermes 的工作负载提供独立 Runner。请选择与 Core 兼容的 Runner 镜像。下列命令沿用 [第一次部署](../tutorials/first-deploy.md) 的 Core Compose 项目及其密钥配置。

```bash
SOHA_IMAGE=ghcr.io/opensoha/soha:v0.1.12 \
SOHA_HERMES_IMAGE=ghcr.io/opensoha/soha-hermes-agent:v0.1.12 \
SOHA_HERMES_BIND=127.0.0.1 \
  docker compose -f deploy/docker-compose.yaml --profile hermes up -d --no-build hermes-agent-runner
```

Runner 通过 Compose 网络访问 `http://soha:8080`，并使用 Core 配置的执行 Runner 令牌。保留存放状态和工作目录的 `soha-hermes-data` 和 `soha-hermes-runtime` 卷。需要初始化提供方凭据时，使用 `hermes-setup` profile。

```bash
docker compose -f deploy/docker-compose.yaml --profile hermes-setup run --rm hermes-agent-setup
docker compose -f deploy/docker-compose.yaml --profile hermes logs --tail 50 hermes-agent-runner
```

## PostgreSQL 18.4 and pgvector 0.8.5

New local volumes and fresh cluster installs use `pgvector/pgvector:0.8.5-pg18-trixie`, currently based on PostgreSQL 18.4 and the same Debian generation as the standard PostgreSQL 18.4 image. Application migrations enable `vector` and `pg_trgm`; bundled deployments also preload and create `pg_stat_statements`. External PostgreSQL 18 servers must provide pgvector and `pg_trgm` before startup. If the migration user cannot create extensions, an administrator must create them first. Keep the database image's libc collation version compatible with the image that initialized an existing data volume.

`pg_stat_statements` is optional for external PostgreSQL. To enable it, add `pg_stat_statements` to `shared_preload_libraries`, set `compute_query_id=on`, restart PostgreSQL, and create the extension in the Soha database. Leaving it disabled does not block Soha startup.

PostgreSQL 18 stores its default `PGDATA` below `/var/lib/postgresql/18/docker`, so compose, raw Kubernetes, and Helm mounts keep the persistent volume at `/var/lib/postgresql`. If an existing environment already has a PostgreSQL 16 data directory, do not point the PostgreSQL 18 pgvector image at the same volume directly. Use `pg_dump`/`pg_restore`, logical backup restore, or a controlled `pg_upgrade` path. For disposable local development data, remove the old PostgreSQL volume and recreate the stack. Current compose pins `soha-postgres-data`.

## Virtualization Runtime Notes

- Docker Desktop for macOS, especially Apple Silicon, is not a reliable validation path for local KubeVirt or nested Proxmox VE labs.
- Keep local k3s for platform control-plane and Kubernetes API-path testing.
- Validate KubeVirt and PVE features against real external servers or dedicated lab hosts, then register those endpoints in soha.
- 外部环境前置条件与验收清单请参阅 [KubeVirt / PVE 虚拟化实验环境 Runbook](./virtualization-lab-runbook.md)。

## CLI 会话与重启连续性

新 CLI v2 入口仍需匹配版本组合和管理员启用，见 [认证配置](./configuration.md#cli-v2-认证策略待发布组合)。保留 PostgreSQL、JWT 与凭据加密密钥；正常进程重启不应删除有效会话。先检查 `readyz`、版本、选中的 server/profile 和 `auth status`，再判断是访问过期、刷新被拒绝、环境覆盖还是会话撤销。不要为排查登录清空数据库或重新生成密钥。

### 候选 Web 部署在路径前缀下

以 `VITE_BASE_PATH=/team/` 构建 Web，将 CLI public URL 设为 `https://soha.example/team`，并将登录提供商的前端回调设为 `https://soha.example/team/login/callback`。反向代理除了剥除上游 API 请求的 `/team` 前缀，还必须改写响应 cookie 的 Path：`/api/v1/auth` 改为 `/team/api/v1/auth`，`/` 改为 `/team/`。否则第三方登录当时可以成功，刷新页面后却无法发送 refresh cookie。刷新和退出响应也要使用同样的改写规则。配置前缀后的 Vite 开发代理已执行这些改写；生产代理需要配置等效规则。
