---
id: index
slug: /
title: soha Docs
description: Architecture, development, API, and operations documentation for the soha platform console.
---

# soha Docs

soha is a multi-cluster Kubernetes platform console. It is not a thin wrapper around the upstream Kubernetes Dashboard. The product is meant to act as a unified control surface for platform teams across cluster access, workload operations, delivery workflows, authorization, alert collaboration, and AI-assisted analysis.

## Site Baseline

- The docs site is built with Docusaurus and lives in the independent `soha-docs` repository
- Chinese is the default docs set; English docs are not part of the current published sidebar
- Published docs should be hosted externally, for example at `https://docs.opensoha.dev/`
- `soha` must not import docs source and should link to docs through its configured external docs URL

## Start Here

- [Architecture Entry](./architecture/index.md)
- [Local Development](./development/local-development.md)
- [API Overview](./api/overview.md)
- [Operations Configuration](./operations/configuration.md)
- [Roadmap](./roadmap/index.md)

## Current Product Surface

- Platform management: clusters, nodes, namespaces, workloads, network, storage, extensions, and Helm
- Delivery: applications, environments, workflows, releases, and registries
- Observability: monitoring, alerts, notifications, events, and AI observation workflows
- Access and system management: users, roles, groups, policies, menus, audit, and settings

## Repository Layout

- `cmd`: server and agent entrypoints
- `internal`: backend API, application, policy, infrastructure, and repository layers
- `web`: React 18 + Vite 6 + TypeScript 5 console
- `docs`: Docusaurus documentation site
- `configs`: server and agent configuration
- `migrations`: schema bootstrap and migration SQL

## Quick Start

### Backend

```bash
docker compose -f deploy/docker-compose.yaml up -d postgres
go run ./cmd/server
```

### Frontend

```bash
cd web
npm install
npm run dev
```

### Docs

```bash
cd docs
npm install
npm run dev
```

When local docs integration is needed, run the `soha-docs` dev server and use the frontend or backend docs proxy mode. This is a development convenience, not the release deployment model.

## Recommended Reading

- Repository engineering spec: root `agents.md`
- [Architecture Entry](./architecture/index.md)
- [Application Delivery](./architecture/application-delivery.md)
- [Monitoring And Alerting](./architecture/monitoring-and-alerting.md)
- [Authorization](./architecture/authorization.md)
- [AI Copilot](./architecture/ai-copilot.md)
- [MCP Integration](./architecture/mcp-integration.md)
