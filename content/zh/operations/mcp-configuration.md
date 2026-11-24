# MCP 配置

Soha 通过 AI Gateway（`/api/v1/ai-gateway/mcp` 与 `/api/v1/ai-gateway/capabilities`）直接暴露内置 MCP 能力，不再使用独立的 `SOHA_ENABLE_MCP` 或 `SOHA_MCP_ADAPTER_*` 启动环境变量。

## 运行时与客户端接入

- Gateway 限流与运行时参数在 `configs/config.yaml` 的 `ai_gateway` 段配置（可通过 `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND`、`SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR` 等变量覆盖）。
- 客户端可通过 `soha mcp install <preset>` 安装官方 MCP 预设（如 `k8s-readonly`、`delivery-operator`、`cloud-governance`、`local-runtime-diagnosis`）。
- 调用范围按 AI Client、令牌（`soha_pat_` / `soha_sat_`）、工具授权（Tool Grants）与访问策略（Access Policies）逐层收敛。

## 边界规则

- 权限校验始终在 Soha 授权层与 AI Gateway 访问策略内部执行
- MCP 客户端仅使用带作用域的 Gateway 令牌，不直接接触原始浏览器会话
- 所有工具调用与高风险动作审批均写入 Gateway 审计日志
