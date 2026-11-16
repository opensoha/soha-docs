# Self-hosted Soha

> **🚧 Translation in Progress**: This page is being translated from Chinese. Some sections may still contain Chinese text.

Self-hosted Soha is the default delivery model for the open-source distribution. The goal is to let users run a complete control plane in their own environment while maintaining a single-binary deployment experience.

## Runtime Model

- `soha` server provides HTTP API, authentication, RBAC, audit, AI Gateway, MCP / Skills registry, plugin installation records, and the Web console entry.
- The Root `soha/web` source is built as a Vite SPA; its versioned artifact is embedded in the `soha` release.
- `soha-docs` is published independently; `soha` links to documentation via a configured external docs URL.
- Root `soha/agent` and runners connect to the control plane through the public API / Agent protocol. Core, Web, Contracts, CLI, Agent, Connectors and Skills share the Root `soha` repository; the docs site, Operator and Helm charts remain independent repositories.

## Web Resource Modes

`soha` needs to support three Web resource modes:

- `embed`: Default release mode, the server embeds the `soha/web` dist artifact.
- `dir`: Read dist from a configured local directory, convenient for local or private builds.
- `proxy`: Development mode, proxy to the Vite dev server.

Ordinary users should not be required to start the frontend and backend separately to use self-hosted Soha.

## Recommended Entries

- [Deployment](../operations/deployment.md)
- [Configuration](../operations/configuration.md)
- [Environment Variable Overrides](../operations/environment-variables.md)
- [Agent Runtime](../operations/agent-runtime.md)
- [AI Gateway Examples](../operations/ai-gateway-examples.md)
- [MCP](../operations/mcp.md)
