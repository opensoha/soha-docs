# Backend Structure

```text
.
  cmd/server
  configs/config.yaml
  internal/api
  internal/application
  internal/bootstrap
  internal/domain
  internal/infrastructure
  internal/policy
  internal/platform
  internal/repository
  migrations
```

## Module Responsibilities

- `api`: HTTP transport layer, middleware, request parsing, and response envelopes.
- `application`: use-case orchestration, authorization, scope semantics, auditing, operation logs, and frontend-facing view models.
- `bootstrap`: dependency graph assembly, database migrations, built-in seed data, and startup lifecycle.
- `domain`: domain contracts and platform view models.
- `infrastructure`: configuration, logger, PostgreSQL, Kubernetes, informers, Agent client, Swagger, MCP, and external system clients.
- `policy`: RBAC, ABAC, and scope evaluation.
- `repository`: persistence access for audit logs, business records, and runtime records.

## Modular Monolith Conventions

The backend maintains a modular monolith structure within a single repository and single `go.mod`. `cmd/server` is the primary management control plane entry point, while the remote cluster agent and runner live in the standalone `agent/` Go submodule inside the Root `github.com/opensoha/soha` repository. If internal network security workbenches or device telemetry capabilities are added, introduce dedicated entry points or repositories behind explicit API and contract boundaries rather than embedding high-frequency device reporting directly into Gin handlers in `cmd/server`.

New entry points must reuse stable capabilities from `internal/bootstrap`, `internal/infrastructure`, `internal/repository`, and `internal/application`. Only runtime-form differences—such as process lifecycle, listen addresses, authentication modes, and queue or worker loops—belong in `cmd/**` or dedicated bootstrap files.

## Route Registration Conventions

`internal/api/routes/router.go` is responsible only for the Gin engine, global middleware, base compatibility paths, static assets, and top-level route group assembly. Domain routes belong in domain-specific files within the same package, for example:

- `routes_public.go`: health checks, login, public webhooks, runner claim/callback endpoints, and other entry points that operate without user sessions via tokens or public protocols.
- `routes_protected.go`: top-level orchestration for session-protected routes.
- `routes_platform.go`: Kubernetes platform management resources.
- `routes_delivery.go`: application delivery, execution tasks, releases, and artifacts.
- `routes_monitoring.go`: monitoring, alerting, notifications, and on-call management.
- `routes_runtime.go`: virtualization, Docker, AI workbench, and other runtime workbenches.
- `routes_governance.go`: system, access, settings, AI Gateway, and audit/operation governance surfaces.

Do not expand `router.go` when adding new domains. Introduce a domain registration function such as `registerDomainRoutes` and wire it through `registerProtectedRoutes` or `registerPublicRoutes`. Keep clear boundaries between module feature flags, public callback paths, and authenticated user session paths.

## Splitting Large Go Files

When refactoring large files, perform mechanical splits within the same package first before making behavioral changes. Preserve receivers, private helpers, DTOs, error semantics, and audit/operation recording during mechanical splits.

- Platform handler REST methods are split by resource domain: `platform_inventory.go`, `platform_workloads.go`, `platform_configuration.go`, `platform_network.go`, `platform_storage.go`, `platform_rbac.go`, `platform_crd_helm.go`, `platform_generic.go`, and `platform_observability.go`. WebSocket stream handling lives in `platform_streams.go`, along with the shared `websocketStreamSession` lifecycle helper.
- Platform resource application services are split by resource family: `pods.go`/`pods_helpers.go`, `workloads.go`, `configuration.go`, `rbac.go`, `network.go`, `storage.go`, `crd.go`, `events.go`, and `resource_yaml.go`. Shared authorization and audit helpers live in `common.go`, while direct Kubernetes bundle and timeout helpers live in `direct_query.go`.
- When changing resource service behavior, preserve existing resource-family boundaries and run at least `go test ./internal/application/resource`. Do not mix mechanical file moves with agent/direct behavioral changes in the same patch.
- Execution-plane state machines require test coverage, including claim/callback/cancel/retry/timeout transitions, callback token rotation, late callbacks on terminal states, artifact persistence, and build/release status backfill.
- AI Gateway is split by behavioral concern: `manifest.go`, `tools.go`, `policies.go`, `rate_limit_budget.go`, `redaction.go`, `approval.go`, `tokens.go`, `audit.go`, and `governance.go`. `service.go` retains only wiring, interfaces, constructors, and setters.
- Add handler tests whenever transport behavior changes; pure file moves can rely on package compilation, the full Go test suite, and route registration comparisons.

## Bootstrap and Seed Conventions

`internal/bootstrap/app.go` owns top-level dependency assembly. Lifecycle methods belong in `lifecycle.go`, and narrow cross-module adapters live in dedicated files—for example, quick Docker host provisioning invokes the virtualization service exclusively through `docker_provisioner.go`.

Database bootstrap is similarly separated by concern. `database.go` retains seed orchestration and shared persistence helpers for roles, policies, users, and clusters; menu seeding, disabled-module filtering, menu-to-role bindings, and built-in menu upgrade logic live in `database_menus.go`. When adding domain menus or permissions, place them in the corresponding seed file and keep permission keys, menu visibility, frontend route metadata, and documentation synchronized.

## Network access workbench boundary

The network access workbench is split across three control entry points and a separate data plane:

- `/api/v1/network-access/**`: management, policy, and audit APIs in `cmd/server`.
- `/api/network-control/v1/**`: endpoint, NAS, and gateway control APIs in `cmd/network-control`.
- `/api/ingest/v1/**`: heartbeat, Accounting, and aggregate telemetry APIs in `cmd/ingest`, backed by a separate database.
- `cmd/network-gateway`: the separate WireGuard/nftables data plane with no management API.

Soha owns devices, sites, policy, leases, authorization, downgrade, and audit. FreeRADIUS owns EAP/RADIUS and mihomo executes endpoint proxy state; neither becomes part of the main Soha process or an authorization source. See [Network Access Workbench Operations](../operations/network-access.md) for deployment and acceptance.
