# Configuration

Backend runtime defaults live in `configs/config.yaml` and can be overridden through `SOHA_*` environment variables.

## Local Override Examples

- `SOHA_CONFIG_FILE=configs/config.yaml`
- `SOHA_DATABASE_HOST=localhost`
- `SOHA_DATABASE_PORT=5432`
- `SOHA_DATABASE_NAME=soha`
- `SOHA_DATABASE_USER=pgsql`
- `SOHA_DATABASE_PASSWORD=pgsql`
- `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND=memory` (or `redis` with `SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR=localhost:6379`)

## AI Gateway & MCP

- Built-in MCP capabilities are served under `/api/v1/ai-gateway/mcp` and governed by Gateway tokens, tool grants, and access policies rather than global `SOHA_ENABLE_MCP` flags.
- See [Runtime Configuration](../operations/configuration.md) and [Environment Overrides](../operations/environment-variables.md) for the complete override reference.
