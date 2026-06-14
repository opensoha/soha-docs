---
title: First AI Gateway MCP Connection
description: Log in with the Soha CLI, inspect Gateway capabilities, generate MCP client configuration, and verify the backend manifest boundary.
---

# First AI Gateway MCP Connection

The local `soha` CLI and MCP server are Gateway clients. They do not read PostgreSQL, kubeconfig, Docker, or runner workspaces directly. Every tool call, resource read, and prompt read returns to the backend AI Gateway boundary.

## Prerequisites

- A running Soha control plane from [First Deploy](./first-deploy.md).
- The `soha` CLI installed on the local `PATH`.
- A user or service account with `ai.gateway.view` and, for tool calls, `ai.gateway.invoke`.

## Log In

```bash
soha login \
  --server http://localhost:8080 \
  --login admin \
  --profile gateway-admin \
  --ai-client soha-admin \
  --ai-client-id soha-admin
```

## Read Capabilities

```bash
soha capabilities --profile gateway-admin
soha capabilities --profile gateway-admin --output names
```

The backend API reference name is `GET /api/v1/ai-gateway/capabilities`.

## Generate MCP Configuration

```bash
soha mcp install --profile gateway-admin --command /usr/local/bin/soha
```

The generated config points clients at:

```bash
soha mcp start --profile gateway-admin
```

For Codex, Cursor, and Claude Code examples, see [AI Gateway Examples](../operations/ai-gateway-examples.md).

## Verify Resource And Prompt Reads

```bash
soha resource read soha://delivery/applications --profile gateway-admin
soha prompt get soha.delivery.plan_release --profile gateway-admin
```

These commands still proxy through `POST /api/v1/ai-gateway/resources/read` and `POST /api/v1/ai-gateway/prompts/get`.

## Expected Output Shape

The capability list is permission-filtered. A correctly configured profile and
MCP command should produce shape-compatible output without exposing access
tokens:

Fixture artifact: [`first-ai-gateway-mcp.expected.txt`](/tutorial-fixtures/first-ai-gateway-mcp.expected.txt)

```bash
soha login
soha capabilities --profile gateway-admin --output names
soha resource read soha://delivery/applications --profile gateway-admin
soha prompt get soha.delivery.plan_release --profile gateway-admin
```

```text
profile: gateway-admin
delivery.actions.trigger
k8s.pods.list
resource: soha://delivery/applications
prompt: soha.delivery.plan_release
```

## Exit Criteria

- `soha login` stores a local profile without printing the token back in later profile output.
- `soha capabilities` returns the permission-filtered manifest.
- The MCP client config starts `soha mcp start` rather than a direct database or cluster process.
- Resource and prompt reads either return redacted content or a clear permission/binding error.

## Known Gaps

Gateway management endpoints for AI clients, grants, access policies, and skill bindings are implemented in the control plane and console, but several management endpoints are still marked as pending public OpenAPI contract additions in [Core Endpoints](../api/core-endpoints.md).
