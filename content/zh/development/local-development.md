# 本地开发

## 依赖组件

### PostgreSQL

- 版本：PostgreSQL 18.4（含 `pgvector` 0.8.5）
- 主机：`localhost`
- 端口：`5432`
- 数据库：`soha`
- 用户名：`pgsql`
- 密码：`pgsql`

### 初始化管理员

- 用户名：`opensoha`
- 邮箱：`opensoha@soha.local`
- 密码：`opensoha`

这是 Soha 在所有部署方式中的标准初始凭据。仅在安装环境明确要求自定义初始凭据时覆盖对应配置。

### 系统密钥

JWT、运行器、Webhook 与凭据加密密钥默认均使用 `soha-123456789012345678901234567890`。本地启动不会创建或锁定 `SecretStore` 文件；需要测试自定义密钥时可通过配置文件或环境变量覆盖。数据库中已存在加密测试数据后，请勿直接更换凭据加密密钥，除非已完成存量密文迁移或确认测试数据可以直接丢弃。

## 初始化本地开发依赖

```bash
npm ci
make init
```

以下 `make` 命令均在主仓 `soha` 根目录下执行。

`npm ci` 根据根锁文件安装前端与工具链 Node 依赖。`make init` 会针对同一源码树中的 SDK 检查 Go 模块依赖整洁度，并按所选数据库模式完成初始化。`DEV_DB_MODE` 默认为 `external`，因此初始化流程会直接连接 `configs/config.yaml` 中配置的外部数据库，不会自动拉起本地数据库容器；如需启动 Docker Compose PostgreSQL 服务，请运行 `make DEV_DB_MODE=local init`。

## 启动后端与前端

```bash
make
```

当前前端本地开发不依赖仓库内的环境变量模板文件，默认约定如下：

- `web/src/services/api-client.ts` 访问同源 `/api/v1`
- `web/vite.config.ts` 将 `/api` 代理转发至 `http://127.0.0.1:8080`
- `soha` 默认将 `/docs/` 重定向到配置的外部公开文档站点地址
- 本地联调文档站时，可启动 `soha-docs` 开发服务器，并将前端或后端切换至文档代理模式

常用分步启动命令：

```bash
make init
make dev-api
make dev-web
```

## 启动文档站

```bash
cd ../soha-docs
npm install
npm run dev
```

`soha-docs` 是独立的 Next.js 与 Nextra 文档站点。官方多语言路由使用 `/zh`、`/zh/docs/...`、`/en` 和 `/en/docs/...`；不带语言前缀的 `/` 与 `/docs/...` 会通过 `nextra/locales` 代理根据 `NEXT_LOCALE` Cookie 或浏览器语言偏好跳转。发布到 `https://docs.opensoha.com/` 时应按实际挂载路径配置 `DOCS_BASE_URL`。

## 历史 MVP 运行背景

以下说明仅记录早期最小可行版本（MVP）开发阶段的运行背景；当前 `Makefile` 目标不会自动创建本地 Kubernetes 集群。

在早期 MVP 环境里，后端曾根据 `configs/config.yaml` 初始化本地开发集群，并从 `./.dev/k3s/kubeconfig.yaml` 读取生成的集群连接配置，提供以下最简基线能力：

- 集群列表读取
- 命名空间列表读取
- Pod 列表读取
- Deployment 列表读取
- 只读接口的访问审计写入
