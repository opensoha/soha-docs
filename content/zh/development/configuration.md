# 配置说明

首阶段运行时配置可通过环境变量统一注入与覆盖。

## 本地基础配置项

- `SOHA_POSTGRES_HOST=localhost`
- `SOHA_POSTGRES_PORT=5432`
- `SOHA_POSTGRES_DB=soha`
- `SOHA_POSTGRES_USER=pgsql`
- `SOHA_POSTGRES_PASSWORD=pgsql`
- `SOHA_REDIS_ADDR=localhost:6379`
- `SOHA_CLUSTER_LOCAL_KUBECONFIG=$HOME/.kube/config`

## MCP 配置开关

- `SOHA_ENABLE_MCP=true`
- 扩展适配器配置统一收敛在 `SOHA_MCP_*` 命名空间前缀下
