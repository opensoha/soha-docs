# MCP Configuration

Soha exposes built-in MCP capabilities directly through AI Gateway (`/api/v1/ai-gateway/mcp` and `/api/v1/ai-gateway/capabilities`) without separate `SOHA_ENABLE_MCP` or `SOHA_MCP_ADAPTER_*` startup flags.

## Runtime & Client Setup

- Gateway rate limiting and runtime behavior are configured in `configs/config.yaml` under `ai_gateway` (for example `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND` and `SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR`).
- Client presets are installed through `soha mcp install <preset>` using published MCP presets from `skills` (`k8s-readonly`, `delivery-operator`, `cloud-governance`, `local-runtime-diagnosis`).
- Access is scoped per AI client, token (`soha_pat_` / `soha_sat_`), tool grant, and Gateway access policy.

## Boundary Rules

- permissions remain enforced inside Soha authorization and Gateway policy checks
- MCP callers use scoped Gateway tokens rather than raw browser user sessions
- all tool invocations and high-risk approvals are recorded in Gateway audit logs
