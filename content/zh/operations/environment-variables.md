# Environment Overrides

## Backend

soha no longer uses `.env.example` as its primary configuration source.

Backend configuration lives in `configs/config.yaml`. Environment variables are only used for overrides when deployment environments need to change file defaults.

Typical overrides:

- `SOHA_CONFIG_FILE`
- `SOHA_HTTP_ADDR`
- `SOHA_LOGGER_LEVEL`
- `SOHA_LOGGER_FORMAT`（生产环境默认 `json`，本地调试可使用 `console`）
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
- `SOHA_SECURITY_SECRET_PROVIDER`
- `SOHA_SECURITY_VAULT_KV2_ADDRESS`
- `SOHA_SECURITY_VAULT_KV2_TOKEN`
- `SOHA_SECURITY_VAULT_KV2_NAMESPACE`
- `SOHA_SECURITY_VAULT_KV2_TIMEOUT`
- `SOHA_SECURITY_VAULT_KV2_MAX_RESPONSE_BYTES`
- `SOHA_REDIS_ADDR`
- `SOHA_AUTH_ENABLE_DEV_AUTH`

仓库配置与所有部署方式默认使用数据库密码 `pgsql`，初始化的 `opensoha` 管理员密码为 `opensoha`。Soha 不根据应用环境标签区分或拒绝这组标准初始凭据；两者仍可通过环境变量显式覆盖。

JWT 签名密钥、execution runner token、monitoring webhook token 和 credential encryption key 均默认使用 `soha-123456789012345678901234567890`。Soha 接受这个文档化默认值，启动时不要求 SecretStore 文件、writer lease 或 secret PVC。公网或正式部署应分别覆盖全部四项。修改 `SOHA_SECURITY_CREDENTIAL_ENCRYPTION_KEY` 前必须先迁移已有密文，否则之前保存的凭据将无法解密。

设置 `SOHA_SECURITY_SECRET_PROVIDER=vault_kv2` 可启用 Vault Secret 版本。`SOHA_SECURITY_VAULT_KV2_TOKEN` 是服务端凭据，应通过部署 Secret 注入，不能暴露给 CLI、Web、MCP、skills 或 OpenAPI 调用方。Vault Secret 版本会固定 KV v2 版本；Provider 不可用时请求保持 fail-closed。

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

- `VITE_API_BASE_URL` 覆盖 API 地址，默认同源 `/api/v1`
- 候选 `VITE_BASE_PATH=/team/` 构建为资源、Router 和默认 API 地址增加前缀；在构建或启动 Vite 时显式导出该变量
- `VITE_API_PROXY_TARGET` 选择开发代理上游，默认 `http://127.0.0.1:8080`，配置源为 `soha-web/vite.config.ts`
- the in-app docs page opens `/docs/`; the `soha` server redirects that path to the configured external docs URL by default

生产前缀部署还需配置请求与 cookie 路径改写，见 [部署说明](./deployment.md#候选-web-部署在路径前缀下)。Web 构建变量会公开到浏览器，不得包含凭据。优先使用同源反向代理，让浏览器会话 cookie 和授权校验归属预期实例。

## Docs

`soha-docs` has its own build-time configuration.

- `DOCS_SITE_URL`: published site origin, default `https://docs.opensoha.dev`
- `DOCS_BASE_URL`: published path prefix, default `/`
- `DOCS_SHOW_LAST_UPDATE_TIME`: retained for docs workflow compatibility; Nextra does not currently render it

For `https://docs.opensoha.dev/`, build with `DOCS_BASE_URL=/`. For `https://opensoha.dev/docs/`, build with `DOCS_BASE_URL=/docs/`.

## CLI 认证隔离（待发布组合）

- `SOHA_AUTH_CLI_ENABLED`、`SOHA_AUTH_CLI_PUBLIC_URL`、`SOHA_AUTH_CLI_ALLOW_PASSWORD`：控制 Core 新会话入口；默认关闭，见 [配置](./configuration.md)。其他 CLI TTL/限额沿用配置字段的 `SOHA_AUTH_CLI_*` 映射。
- CLI 的 `SOHA_CONFIG` 指定私有配置路径；不同工作组、实例或 CI 作业分别设置。
- CLI 的 `SOHA_SERVER` 与 `SOHA_TOKEN` 同时提供时启用无落盘环境认证，不读取或刷新所选 profile。环境 token 不会保存到配置。
- 仅覆盖 `SOHA_SERVER` 不能把已有 profile 凭据送到另一个 origin 或部署路径；不匹配会在联网前返回 `server_mismatch`。
- `SOHA_TOKEN` 优先于本地认证，不能靠 `logout` 自动取消；从 shell/作业环境中移除它。
