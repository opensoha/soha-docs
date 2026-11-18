# Soha Marketplace

The Soha Marketplace is used to discover and install extension assets. Rather than injecting arbitrary third-party code into the `soha` core process, it assembles Skills, MCP presets, Connectors, AI provider adapters, Agent profiles, and Gateway policy packs into the control plane through declarative manifests, external processes, and governed APIs.

## Plugin Types

- `skill`: AI workflows, operational contracts, guardrails, and capability references.
- `mcp-preset`: assembly definitions for MCP servers, tools, resources, and prompts.
- `connector`: integrations with external systems such as Feishu/Lark, WeCom, GitLab, Jira, Slack, PagerDuty, and Sentry.
- `ai-provider-adapter`: OpenAI-compatible, Anthropic, Gemini, OpenRouter, local model gateways, or internal enterprise model gateways.
- `agent-profile`: templates for Agent Runtime providers, toolsets, and skill bindings.
- `gateway-policy-pack`: reusable access policies, approval rules, redaction policies, and rate/budget presets.

## Core Responsibilities

Soha core owns:

- Marketplace metadata queries for plugins.
- Installation records, versions, and enabled/disabled state.
- Manifest snapshots and checksum/signature verification status.
- Declared permissions, secret references, and installed assets.
- RBAC, tool grants, access policies, skill bindings, approvals, auditing, and secret management.

A plugin declares what it requires; it never grants permissions to itself.

## API Surface

Plugin management exposes the following public APIs:

```text
GET    /api/v1/plugins/marketplace
GET    /api/v1/plugins/marketplace/{pluginID}
GET    /api/v1/plugins/installed
GET    /api/v1/plugins/{pluginID}
GET    /api/v1/plugins/{pluginID}/manifest
POST   /api/v1/plugins/install
POST   /api/v1/plugins/{pluginID}/enable
POST   /api/v1/plugins/{pluginID}/disable
POST   /api/v1/plugins/{pluginID}/upgrade
PUT    /api/v1/plugins/{pluginID}/config
DELETE /api/v1/plugins/{pluginID}
```

## Further Reading

- [Installing Plugins](./installing-plugins.md)
- [Plugin Permissions](./plugin-permissions.md)
- [API and Contracts](../api/contracts.md)
