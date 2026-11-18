# MCP 配置

第一阶段仅预留 MCP 配置与适配器注册能力。

## 规划配置结构

- `SOHA_ENABLE_MCP=true`
- `SOHA_MCP_DEFAULT_TIMEOUT=10s`
- `SOHA_MCP_ADAPTERS=<adapter list>`
- `SOHA_MCP_ADAPTER_ENDPOINT=...`，按具体适配器名称展开
- `SOHA_MCP_ADAPTER_TOKEN=...`，按具体适配器名称展开

## 边界规则

- 权限校验始终保留在 `soha` 的 `access-service` 内部
- 适配器仅接收带作用域的调用，不直接接触原始用户会话
- 所有调用均须具备可审计性
