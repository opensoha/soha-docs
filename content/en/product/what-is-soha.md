# What is Soha

> **🚧 Translation in Progress**: This page is being translated from Chinese. Some sections may still contain Chinese text.

Soha is an open-source control plane for platform teams. It brings Kubernetes multi-cluster management, application delivery, observability, governance, AI Gateway, MCP / Skills, and Agent Runtime into one auditable operation surface.

Soha's early delivery model focuses on open-source, self-hosted, and private deployment. The open-source distribution must run independently, so users do not need additional services to use the product.

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
