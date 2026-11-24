# 配置说明

后端运行时默认配置位于 `configs/config.yaml`，本地联调与部署环境可按需通过 `SOHA_*` 环境变量覆盖。

## 本地基础覆盖项

- `SOHA_CONFIG_FILE=configs/config.yaml`
- `SOHA_DATABASE_HOST=localhost`
- `SOHA_DATABASE_PORT=5432`
- `SOHA_DATABASE_NAME=soha`
- `SOHA_DATABASE_USER=pgsql`
- `SOHA_DATABASE_PASSWORD=pgsql`
- `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND=memory`（若启用 Redis 限流，配合设置 `SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR=localhost:6379`）

## AI Gateway 与 MCP

- 内置 MCP 能力统一由 `/api/v1/ai-gateway/mcp` 提供，通过 AI Gateway 令牌、工具授权（Tool Grants）与访问策略控制，不使用旧版 `SOHA_ENABLE_MCP` 环境变量开关。
- 完整配置结构与覆盖项请参考 [配置说明](../operations/configuration.md) 与 [环境变量覆盖](../operations/environment-variables.md)。
