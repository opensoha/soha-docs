# 环境变量覆盖

## 后端

`soha` 已不再使用 `.env.example` 作为主配置源。

后端主配置位于 `configs/config.yaml`，环境变量仅用于在部署环境中按需覆盖文件默认值。

常用覆盖变量：

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
- `SOHA_AUTH_ENABLE_DEV_AUTH`

仓库配置与所有部署方式默认使用数据库密码 `pgsql`，初始化的 `opensoha` 管理员密码为 `opensoha`。Soha 不根据应用环境标签区分或拒绝这组标准初始凭据；两者仍可通过环境变量显式覆盖。

JWT 签名密钥、执行 Runner 令牌、监控 Webhook 令牌和凭据加密密钥均默认使用 `soha-123456789012345678901234567890`。Soha 接受这个文档化默认值，启动时不要求 SecretStore 文件、写入租约或专用 Secret PVC。公网或正式部署应分别覆盖全部四项。修改 `SOHA_SECURITY_CREDENTIAL_ENCRYPTION_KEY` 前必须先迁移已有密文，否则之前保存的凭据将无法解密。

设置 `SOHA_SECURITY_SECRET_PROVIDER=vault_kv2` 可启用 Vault Secret 版本。`SOHA_SECURITY_VAULT_KV2_TOKEN` 是服务端凭据，应通过部署 Secret 注入，不能暴露给 CLI、Web、MCP、Skills 或 OpenAPI 调用方。Vault Secret 版本会固定 KV v2 版本；后端不可用时请求保持故障关闭（fail-closed）。

Runner 与 AI Gateway 运行示例还会用到以下运维变量：

- `SOHA_EXECUTION_RUNNER_TOKEN`：Runner 或 Helm 命令示例中用于传递 Bearer Token 的 Shell 辅助变量；后端 Viper 实际读取的覆盖变量名为 `SOHA_RUNTIME_EXECUTION_RUNNER_TOKEN`。
- `SOHA_CONTROL_PLANE_URL`：本地 Compose 示例中用于覆盖 Hermes Runner 控制平面地址（`SOHA_AGENT_CONTROL_PLANE_BASE_URL`）的可选变量。
- `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND`：可选的 AI Gateway 限流后端（例如 `redis`）。
- `SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR`：当限流后端选择 Redis 时，AI Gateway 限流器连接的 Redis 地址。

CLI 与教程示例使用以下客户端环境变量：

- `SOHA_CONFIG`：备选的本地 CLI 配置文件路径。
- `SOHA_TOKEN`：直接使用 `curl` 调用示例时携带的 Bearer Token。
- `SOHA_SERVER`：直接使用 `curl` 调用示例时请求的服务端根地址。
- `SOHA_SKILLS_SOURCE`：本地安装 Skill 时使用的备选源目录。
- `SOHA_SKILLS_DIR`：本地安装 Skill 时的备选目标目录。

## 前端

- `VITE_API_BASE_URL`：覆盖 API 地址，默认使用同源 `/api/v1`
- 候选 `VITE_BASE_PATH=/team/` 构建为静态资源、前端路由和默认 API 地址增加前缀；在构建或启动 Vite 时需显式导出该变量
- `VITE_API_PROXY_TARGET`：选择开发代理上游地址，默认值为 `http://127.0.0.1:8080`，配置源为 `../soha/web/vite.config.ts`
- 控制台内的文档入口会打开 `/docs/`，`soha` 服务端默认将该路径重定向至已配置的外部文档站地址

生产前缀部署还需配置请求与 Cookie 路径改写，见 [部署说明](./deployment.md#候选-web-部署在路径前缀下)。Web 构建变量会公开到浏览器，不得包含凭据。优先使用同源反向代理，让浏览器会话 Cookie 和授权校验归属预期实例。

## 文档站

`soha-docs` 拥有独立的构建期环境变量配置：

- `DOCS_SITE_URL`：已发布站点的源地址，默认值为 `https://docs.opensoha.com`
- `DOCS_BASE_URL`：已发布站点的路径前缀，默认值为 `/`
- `DOCS_SHOW_LAST_UPDATE_TIME`：为兼容文档发布工作流保留，当前 Nextra 暂不渲染该字段

发布至 `https://docs.opensoha.com/` 时使用 `DOCS_BASE_URL=/` 构建；发布至 `https://docs.opensoha.com/docs/` 时使用 `DOCS_BASE_URL=/docs/` 构建。

## CLI 认证隔离（待发布组合）

- `SOHA_AUTH_CLI_ENABLED`、`SOHA_AUTH_CLI_PUBLIC_URL`、`SOHA_AUTH_CLI_ALLOW_PASSWORD`：控制 Core 新会话入口；默认关闭，见 [配置](./configuration.md)。其他 CLI TTL/限额沿用配置字段的 `SOHA_AUTH_CLI_*` 映射。
- CLI 的 `SOHA_CONFIG` 指定私有配置路径；不同工作组、实例或 CI 作业应分别设置。
- CLI 的 `SOHA_SERVER` 与 `SOHA_TOKEN` 同时提供时启用无落盘环境认证，不读取或刷新所选 profile。环境令牌不会保存到配置文件。
- 仅覆盖 `SOHA_SERVER` 不能把已有 profile 凭据发送到另一个源地址或部署路径；地址不匹配会在联网前返回 `server_mismatch`。
- `SOHA_TOKEN` 优先于本地认证，不能靠 `logout` 自动取消；需从 Shell 或作业环境中移除该变量。
