# MCP Configuration

Phase 1 reserves MCP configuration and adapter registration only.

## Planned Config Shape

- `SOHA_ENABLE_MCP=true`
- `SOHA_MCP_DEFAULT_TIMEOUT=10s`
- `SOHA_MCP_ADAPTERS=<adapter list>`
- `SOHA_MCP_ADAPTER_ENDPOINT=...` for each adapter name
- `SOHA_MCP_ADAPTER_TOKEN=...` for each adapter name

## Boundary Rules

- permissions remain inside soha access-service
- adapters receive scoped calls, not raw user sessions
- all invocations must be auditable
