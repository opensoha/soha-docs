# Local Development

## Dependencies

### PostgreSQL

- version: PostgreSQL 18.4 with pgvector 0.8.5
- host: `localhost`
- port: `5432`
- database: `soha`
- username: `pgsql`
- password: `pgsql`

### Initial Administrator

- username: `opensoha`
- email: `opensoha@soha.local`
- password: `opensoha`

These are Soha's standard initial credentials in every deployment form. Override either value only when the installation needs different credentials.

### System Secrets

JWT, runner, webhook, and credential encryption all use `soha-123456789012345678901234567890` by default. Local startup does not create or lock a SecretStore file. Use config or environment overrides when testing custom values. Do not change the credential encryption key after encrypted test data exists unless that data is migrated or can be discarded.

## Initialize Local Development Dependencies

```bash
npm ci
make init
```

Run the Make commands from the Root `soha` checkout.

`npm ci` installs the Node dependencies from the Root lockfile. `make init` checks Go module hygiene against the same-checkout SDK and initializes the selected database mode. `DEV_DB_MODE` defaults to `external`, so initialization uses the database configured in `configs/config.yaml` without starting a local database. To start the Compose PostgreSQL service instead, run `make DEV_DB_MODE=local init`.

## Start Backend and Frontend

```bash
make
```

当前前端本地开发不依赖仓库内的前端 env 模板文件。默认行为是：

- `web/src/services/api-client.ts` 使用同源 `/api/v1`
- `web/vite.config.ts` 把 `/api` 代理到 `http://127.0.0.1:8080`
- `soha` 默认把 `/docs/` 重定向到配置的外部文档地址
- 本地需要联调文档时，可以启动 `soha-docs` dev server，并让前端或后端使用 docs proxy 模式

可选快捷命令：

```bash
make init
make dev-api
make dev-web
```

## Start Docs

```bash
cd ../soha-docs
npm install
npm run dev
```

`soha-docs` 是独立 Next.js/Nextra 站点。官方 i18n 路由使用 `/zh`、`/zh/docs/...`、`/en` 和 `/en/docs/...`；未带 locale 的 `/` 与 `/docs/...` 会通过 `nextra/locales` 代理按 `NEXT_LOCALE` 或浏览器语言跳转。发布到 `https://docs.opensoha.dev/` 时应按发布目标设置 `DOCS_BASE_URL`。

## Historical MVP Runtime Notes

The following describes the earlier MVP development setup; the current Make targets do not bootstrap a local Kubernetes cluster.

The backend bootstraps a local development cluster from `configs/config.yaml` and reads the generated kubeconfig from `./.dev/k3s/kubeconfig.yaml`.

The minimal MVP exposes:

- cluster list
- namespace list
- pod list
- deployment list
- audit write for read APIs
