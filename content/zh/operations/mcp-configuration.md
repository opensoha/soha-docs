# MCP Configuration

Phase 1 reserves MCP configuration and adapter registration only.

## Planned Config Shape

- `SOHA_ENABLE_MCP=true`
- `SOHA_MCP_DEFAULT_TIMEOUT=10s`
- `SOHA_MCP_ADAPTERS=<adapter list>`
- `SOHA_MCP_ADAPTER_ENDPOINT=...`，按具体 adapter 名称展开
- `SOHA_MCP_ADAPTER_TOKEN=...`，按具体 adapter 名称展开

## Boundary Rules

- permissions remain inside soha access-service
- adapters receive scoped calls, not raw user sessions
- all invocations must be auditable
