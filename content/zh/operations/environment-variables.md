# Environment Overrides

## Backend

soha no longer uses `.env.example` as its primary configuration source.

Backend configuration lives in `configs/config.yaml`. Environment variables are only used for overrides when deployment environments need to change file defaults.

Typical overrides:

- `SOHA_CONFIG_FILE`
- `SOHA_HTTP_ADDR`
- `SOHA_LOGGER_LEVEL`
- `SOHA_DATABASE_HOST`
- `SOHA_DATABASE_PORT`
- `SOHA_DATABASE_NAME`
- `SOHA_DATABASE_USER`
- `SOHA_DATABASE_PASSWORD`
- `SOHA_AUTH_DEV_PRINCIPAL_PASSWORD`
- `SOHA_AUTH_JWT_SECRET`
- `SOHA_RUNTIME_EXECUTION_RUNNER_TOKEN`
- `SOHA_MONITORING_WEBHOOK_TOKEN`
- `SOHA_SECURITY_CREDENTIAL_ENCRYPTION_KEY`
- `SOHA_REDIS_ADDR`
- `SOHA_AUTH_ENABLE_DEV_AUTH`

仓库配置与所有部署方式默认使用数据库密码 `pgsql`，初始化的 `opensoha` 管理员密码为 `opensoha`。Soha 不根据应用环境标签区分或拒绝这组标准初始凭据；两者仍可通过环境变量显式覆盖。

JWT 签名密钥、execution runner token、monitoring webhook token 和 credential encryption key 均默认使用 `soha-123456789012345678901234567890`。Soha 接受这个文档化默认值，启动时不要求 SecretStore 文件、writer lease 或 secret PVC。公网或正式部署应分别覆盖全部四项。修改 `SOHA_SECURITY_CREDENTIAL_ENCRYPTION_KEY` 前必须先迁移已有密文，否则之前保存的凭据将无法解密。

Runner and Gateway examples also use these operational variables:

- `SOHA_EXECUTION_RUNNER_TOKEN`：runner 或 Helm 命令示例用于传递 bearer token 的 shell 辅助变量；后端 Viper 覆盖名是 `SOHA_RUNTIME_EXECUTION_RUNNER_TOKEN`。
- `HERMES_CONTROL_PLANE_URL`: optional override for the Hermes runner control-plane URL in local compose examples.
- `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND`: optional AI Gateway rate-limit backend, for example `redis`.
- `SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR`: Redis address used by the AI Gateway rate limiter when Redis is selected.

CLI and tutorial examples use these client-side variables:

- `SOHA_CONFIG`: alternate local CLI profile file path.
- `SOHA_TOKEN`: bearer token used by direct curl examples.
- `SOHA_SERVER`: base URL used by direct curl examples.
- `SOHA_SKILLS_SOURCE`: alternate source directory for local skill installation.
- `SOHA_SKILLS_DIR`: alternate local skill installation directory.

## Frontend

The current SPA does not expose a documented public env contract.

- API requests always target same-origin `/api/v1`
- local development relies on the Vite proxy in `web/vite.config.ts`
- the in-app docs page opens `/docs/`; the `soha` server redirects that path to the configured external docs URL by default

If you deploy the frontend and API on separate origins, use a reverse proxy or update `web/src/services/api-client.ts` accordingly.

## Docs

`soha-docs` has its own build-time configuration.

- `DOCS_SITE_URL`: published site origin, default `https://docs.opensoha.dev`
- `DOCS_BASE_URL`: published path prefix, default `/`
- `DOCS_SHOW_LAST_UPDATE_TIME`: retained for docs workflow compatibility; Nextra does not currently render it

For `https://docs.opensoha.dev/`, build with `DOCS_BASE_URL=/`. For `https://opensoha.dev/docs/`, build with `DOCS_BASE_URL=/docs/`.
