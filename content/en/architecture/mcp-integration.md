# MCP Integration

## Placement

MCP belongs behind the integration boundary.

Flow:

1. API layer receives request
2. access service and policy engine validate permission
3. integration service resolves adapter and capability metadata
4. infrastructure mcp registry locates the adapter
5. audit service records invocation metadata
6. event service can emit integration events when needed

## Directory Placement

```text
internal/domain/mcp
internal/application/integration
internal/infrastructure/mcp
```

## Registration Model

Each MCP adapter should register:

- adapter id
- display name
- capability list
- required scopes
- transport configuration
- timeout and isolation policy

Built-in adapters currently include at least:

- `platform-native.v1`
- `logs.v1`
- `metrics.v1`
- `traces.v1`
- `delivery.v1`

The `traces.v1` identifier remains for compatibility, but Core trace execution is unavailable until
a future external provider integration. The generic external `logs.query` capability currently
queries durable cluster logs only.

## Permission Boundary

MCP must not bypass platform authorization. Every MCP capability maps to a platform action and target scope. The platform owns:

- user identity
- authorization decision
- invocation audit
- response filtering

`delivery.v1` currently exposes its Gateway tools to MCP clients using canonical tool names:

- `delivery.applications.list`
- `delivery.applications.detail`
- `delivery.applications.create`
- `delivery.application_environments.list`
- `delivery.application_services.list`
- `delivery.build_sources.list`
- `delivery.release_targets.list`
- `delivery.release_bundles.list`
- `delivery.execution_tasks.list`
- `delivery.execution_logs.list`
- `delivery.release_context.diff`
- `delivery.rollback.context`
- `delivery.actions.trigger`

These capabilities must still pass through platform permission, scope, audit, and operation-log boundaries; Gin handlers must never execute repository writes or long-running shell commands directly.

## Module Contract

To support enabling and disabling built-in modules in the single binary while reserving extension points for future external module protocols, the platform defines a module registration contract.

Minimum fields on a backend module descriptor:

- `id`
- `name`
- `defaultPath`
- `enabledConfigKey`
- `dependencies`
- `visiblePermissions`
- `seedMenus`

Current module status is exposed through `GET /api/v1/modules`.
