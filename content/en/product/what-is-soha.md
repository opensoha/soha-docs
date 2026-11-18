# What is Soha

**Soha helps small and medium-sized businesses solve everyday operations challenges.**

Soha helps teams with self-managed business systems and limited operations staff bring internal access, resource management, system maintenance, delivery, observability, and AI-assisted investigation into one workspace, making systems easier to manage, maintain, and keep running.

Kubernetes is one supported runtime. Soha also covers virtualization, Docker, identity, and internal access, with further capabilities driven by practical operations needs. Supported platforms, deployment requirements, and experimental limitations remain documented per capability.

Soha focuses on open-source, self-hosted, and private deployment. The open-source distribution runs independently of a hosted service; database and optional runtime prerequisites remain documented in the deployment guides.

## Naming Conventions

- OpenSoha: The open-source organization and community name.
- Soha: The product name.
- `soha`: The open-source core repository name, also the CLI command.
- `opensoha`: The GitHub organization name.

## Open Source Distribution

The open-source Soha distribution includes:

- Server API and Web console integration points.
- Agent protocol support.
- AI Gateway, MCP / Skills registry, and plugin installation records.
- Local deployment, private deployment, single-binary delivery.
- Local authentication, RBAC, audit, resource management, tokens, and service accounts.

## Extension Model

Soha supports assembling Skills, MCP presets, Connectors, AI provider adapters, Agent profiles, and Gateway policy packs through marketplace packages. Plugins only declare extension assets, required secrets, and requested permissions; availability is still determined collectively by Soha's RBAC, tool grants, access policies, skill bindings, approval, audit, and secret management.
