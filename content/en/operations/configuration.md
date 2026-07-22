# Configuration

## Source Of Truth

Startup configuration remains file-baselined; product settings and connection instances are persisted by the database-backed settings center.

- startup baseline: `configs/config.yaml`
- loader: `internal/infrastructure/config`
- override mechanism: environment variables through Viper when needed

Frontend runtime is currently code-first rather than env-first.

- API base path is fixed to `/api/v1` in `soha-web/src/services/api-client.ts`
- local development proxies `/api` to `http://127.0.0.1:8080` in `soha-web/vite.config.ts`
- the docs surface inside the console opens `/docs/`, which the `soha` server redirects to the configured external docs URL by default
- there are no checked-in `soha-web/.env.*` templates at the moment

Docs runtime is independent.

- docs source lives in `soha-docs`
- published docs should use an external URL, such as `https://docs.opensoha.dev/`
- `assets.docs.external_url` controls where `soha` redirects `/docs/`

## Configuration Ownership

`config.yaml` is not the write surface for every product setting. Configuration is split by lifecycle and scope:

| Layer | Owns | Typical entry point |
| --- | --- | --- |
| Deployment/startup | Listener, database, worker and queue topology, JWT/runner/webhook/encryption keys, bootstrap settings | `config.yaml`, environment variables, Docker/Kubernetes/Helm Secrets |
| Settings center | Login providers, the current global code-source integration, login policy, and safely reloadable product policy | Login settings, Code Sources, and Runtime Configuration pages |
| Cluster settings | kubeconfig/Agent connection plus that cluster's Prometheus, Grafana, and resource-query parameters | Cluster detail/edit page |
| Runtime configuration | Soha module switches and runtime parameters that can be validated and atomically reloaded | Settings-center Runtime Configuration page |

The Runtime Configuration page shows effective values; it is not an editor for every configuration value. Externally managed or cluster-scoped values should show their owner and a link to the owning page instead of creating a second write path.

### Code-source integration

The settings center currently exposes the system-integration backend through the Code Sources pages:

- The list and detail pages currently manage GitLab connections only. Identity providers remain under Login Settings, while alert integrations remain in the Monitoring Workbench.
- A GitLab detail page owns the endpoint, write-only credential, enablement, and connection test.
- GitLab is a global code source, not a delivery-workbench-only setting. Delivery, virtualization, container-runtime, and other features that read Dockerfiles, YAML, Helm charts, or scripts use the same connection.
- Workbenches store only a reference to the Provider (for example provider ID, project/repository, branch, and path); they do not copy GitLab tokens.

Integration credentials must be encrypted at rest and support connection testing. They are not ordinary flat runtime keys, and the browser must not call third-party systems directly.

## Backend Config Shape

```yaml
app:
http:
logger:
runtime:
database:
auth:
gitlab:
swagger:
mcp:
bootstrap:
kubernetes:
monitoring:
```

Key backend fields now used by the runtime:

- `http.cors_allowed_origins`: allowed browser origins for the frontend console
- `auth.jwt.secret`, `auth.jwt.access_ttl`, `auth.jwt.refresh_ttl`
- `auth.dev_principal.*`: bootstrap local account seed and, when enabled, the no-token development principal
- `auth.oidc.*`: legacy runtime OIDC fallback only; it does not create settings-center login sources
- `gitlab.*`: legacy startup-compatibility fields; the target source is the encrypted settings-center Code Source Provider
- `runtime.workflow_workers`, `runtime.workflow_queue_size`, `runtime.workflow_node_parallelism`
- `runtime.cluster_sync_parallelism`, `runtime.copilot_inspection_parallelism`, `runtime.alert_upsert_batch_size`
- `runtime.execution_runner_token`: shared bearer token for delivery, Docker, and AI Agent Runtime runner claim/callback APIs
- `database.migration_path`: migration root directory (runtime resolves `migrations/<driver>/0001_init.sql`)
- `database.migration_file`: explicit SQL bootstrap file override; the current repo baseline points at the consolidated PostgreSQL bootstrap file
- `kubernetes.clusters[*].kubeconfig`: direct cluster file path for bootstrapped clusters
- `kubernetes.clusters[*].kubeconfig_data`: inline kubeconfig support when file paths are not used
- `mcp.default_timeout`: default timeout reused by MCP and agent HTTP integrations
- `monitoring.enabled`: toggles monitoring ingress endpoints
- `monitoring.webhook_token`: shared token accepted by the alert webhook endpoint
- `security.credential_encryption_key`: key used to encrypt persisted integration and platform credentials

## Standard Initial Defaults

### PostgreSQL

- version: PostgreSQL 18.4 with pgvector 0.8.5
- host: `localhost`
- port: `5432`
- database: `soha`
- user: `pgsql`
- password: `pgsql`

## Identity Defaults

The standard bootstrap account comes from `auth.dev_principal` inside `config.yaml`.

- username: `opensoha`
- email: `opensoha@soha.local`
- password: `opensoha`

When `auth.enable_dev_auth` is `false`, this account is still seeded into PostgreSQL for real password login. The flag only controls whether the backend accepts an automatic development principal when no bearer token is present. Routine restarts preserve the initial password without overwriting a user-changed password. Soha does not apply an environment-specific credential policy; explicit overrides remain supported.

## System Secret Defaults

The project configuration keeps the four system secrets visible and gives all four the same standard default:

```yaml
auth:
  jwt:
    secret: soha-123456789012345678901234567890

runtime:
  execution_runner_token: soha-123456789012345678901234567890

monitoring:
  webhook_token: soha-123456789012345678901234567890

security:
  credential_encryption_key: soha-123456789012345678901234567890
```

These defaults let a local process, `docker run`, Docker Compose, Kubernetes, and Helm start without a generated SecretStore file, writer lock, or dedicated secret PVC. The backend does not reject the documented value or stop startup because the four fields reuse it. Each field can still be overridden independently in `config.yaml` or through its environment override.

This is a convenience default for an open-source installation, not a production secret. Any Internet-facing or formal deployment should replace all four values before it accepts traffic. Leaving the public value unchanged allows third parties to forge JWTs and runner/webhook requests and to decrypt credentials obtained from the database.

Treat `security.credential_encryption_key` differently from bearer and signing secrets during a change: migrate or re-encrypt every existing ciphertext with the old key before removing it. Replacing this value without a migration makes existing encrypted credentials unreadable. Keep the configured encryption key stable across application restarts and all replicas until that migration is complete.

## Login Provider Runtime

The active console login source is now settings-driven rather than file-only.

Operationally:

- settings-center login sources are stored only under `identity.login_providers`
- `auth.oidc.*` does not seed or backfill login sources
- operators can configure multiple concurrent providers from the console login-settings page

Supported provider types in the current settings model:

- `oidc`
- `feishu`
- `dingtalk`
- `wecom`
- `oauth2`
- `saml`

Current runtime expectations:

- `oidc`: full runtime supported
- `oauth2`: supported when authorize/token/userinfo URLs and field mappings are correct
- `feishu`: supported through configured Feishu auth endpoints and field mappings
- `dingtalk`: supported through configured DingTalk auth endpoints and field mappings
- `wecom`: supported through webpage authorization plus enterprise access-token and `getuserinfo` APIs
- `saml`: configuration-visible only; runtime assertion/ACS handling is not enabled yet

## Operational Conventions

- request ID header: `X-Request-Id`
- health check: `GET /healthz`
- readiness check: `GET /readyz`
- versioned API base path: `/api/v1`
- swagger route reservation: `/swagger/*any`
- config override file: `SOHA_CONFIG_FILE=/abs/path/to/config.yaml`
- frontend local dev port: `5173`
- docs local dev port: `3000`

## Database Bootstrap

On startup the backend can:

1. run SQL migration file
2. create schema only from the migration file
3. seed bootstrap user from `auth.dev_principal`
4. seed password hash and role bindings for the bootstrap account
5. seed default RBAC roles
6. seed default ABAC policies
7. seed configured clusters into `clusters`
8. seed file-configured direct cluster metadata into `cluster_credentials_meta`

## Cluster Registration API

The runtime now supports two persisted cluster connection modes:

- `direct_kubeconfig`
  - request payload includes `kubeconfig` and optional `context`
  - kubeconfig is validated before the cluster is registered into `cluster-manager`
  - informer/cache is started dynamically for the new cluster
- `agent`
  - request payload includes `agentEndpoint` and optional `agentToken`
  - Gin uses the stored endpoint and token to pull summary, list resources, and send execution actions

Relevant routes:

- `POST /api/v1/clusters`
- `POST /api/v1/clusters/:clusterID/workloads/deployments/restart`
- `POST /api/v1/clusters/:clusterID/workloads/deployments/scale`

### Cluster Resource-Monitoring Connections

Prometheus and Grafana connections belong to a cluster, not to Soha's global runtime configuration. A cluster record may store:

- Prometheus URL and bearer token
- Prometheus cluster label
- Grafana base URL

Resource and virtualization pages must send `clusterId`; the backend then selects that cluster's connection. The server currently uses a 60-minute query range and 60-second step as query defaults. This allows different clusters to use different monitoring stacks and lets the UI distinguish not configured, no data, and query failure. The global Runtime Configuration page must not display these connection fields.

The API does not return the bearer token after it is saved, but the current cluster implementation stores it in database-backed cluster connection metadata without field-level encryption. Protect database access, backups, replicas, and diagnostic exports accordingly. Do not assume `security.credential_encryption_key` protects this field.

## Monitoring Runtime

Alert ingestion and alert governance belong to the Monitoring Workbench. Alertmanager, Grafana Alerting, and Generic Webhook integrations, tokens, routing, notifications, silences, healing, and on-call settings are maintained under `/monitoring-workbench/integrations` and their detail pages.

Soha keeps only the system-level switch and secret required by its monitoring ingress in startup configuration:

```yaml
monitoring:
  enabled: true
  webhook_token: soha-123456789012345678901234567890
```

Prometheus/Grafana resource connections do not belong here. They are cluster-scoped because each cluster may use a different Prometheus/Grafana. Resource pages select the connection by `clusterId`; do not place cluster Prometheus URLs, bearer tokens, default query ranges, or Grafana URLs in the global Runtime Configuration page.

Current persistence layout:

- `alert_events`: normalized inbound alert inventory
- `notification_channels`: downstream channel definitions
- `event_stream`: normalized alert activity for the unified event center

Current public or protected routes:

- `POST /api/v1/integrations/alerts/webhook`
- `GET /api/v1/monitoring/summary`
- `GET /api/v1/alerts`
- `GET /api/v1/notification-channels`
- `POST /api/v1/notification-channels`
- `PUT /api/v1/notification-channels/:channelID`

## Application Registry And GitLab

Application management now uses one PostgreSQL-backed registry table:

- `applications`
- `build_records`
- `ai_sessions`
- `ai_messages`
- `ai_root_cause_runs`
- `ai_data_sources`
- `ai_analysis_profiles`
- `ai_automation_policies`
- `ai_agent_runs`

GitLab is a global code-source/system integration, not a delivery-workbench-only setting. The current settings model uses the Code Sources list and a GitLab detail page:

```yaml
gitlab:
  enabled: false
  base_url: https://gitlab.com/api/v4
  token: ""
  group_id: ""
  per_page: 50
  timeout: 10s
```

The YAML block above is only the current startup-compatibility baseline. New deployments should create a GitLab Provider in the settings center. When no GitLab connection exists, the server imports the legacy YAML into an encrypted integration record. After migration, Docker, Kubernetes, and Helm examples should no longer require a GitLab token.

An integration record includes a display name, GitLab URL, encrypted token, default group, timeout, enablement, connection-test status, and audit metadata. Delivery and other workbenches reference the Provider ID and repository coordinates.

When enabled, soha serves these routes from the backend:

- `GET /api/v1/applications`
- `POST /api/v1/applications`
- `GET /api/v1/applications/:applicationID`
- `PUT /api/v1/applications/:applicationID`
- `DELETE /api/v1/applications/:applicationID`
- `GET /api/v1/integrations/gitlab/projects`
- `GET /api/v1/integrations/gitlab/branches`
- `GET /api/v1/integrations/gitlab/tags`

Build and AI routes now also exist:

- `GET /api/v1/builds`
- `POST /api/v1/builds/trigger`
- `GET /api/v1/copilot/insights`
- `GET /api/v1/copilot/sessions`
- `GET /api/v1/copilot/sessions/:sessionID`
- `POST /api/v1/copilot/sessions`
- `PATCH /api/v1/copilot/sessions/:sessionID`
- `DELETE /api/v1/copilot/sessions/:sessionID`
- `GET /api/v1/copilot/sessions/:sessionID/messages`
- `POST /api/v1/copilot/sessions/:sessionID/messages`
- `POST /api/v1/copilot/sessions/:sessionID/analyze`
- `GET /api/v1/copilot/agent-providers`
- `GET /api/v1/copilot/agent-runs`
- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`
- `POST /api/v1/copilot/agent-runs/tool-call`

The browser never talks to GitLab directly. Tokens stay in encrypted backend-managed integration records.

## YAML Compatibility And Migration Boundary

Move configuration with an import, deprecation, then deletion sequence:

1. Legacy `auth.oidc.*` remains a YAML/runtime compatibility path where supported. It is not imported into the settings-center database and does not create a Login Settings provider; recreate the provider there before removing the YAML values.
2. Legacy `gitlab.*` is imported once when no GitLab connection exists. After import, use the Code Sources page as the write surface and retain YAML only as the documented startup fallback during the compatibility window.
3. Old global Prometheus/Grafana Helm values are no longer rendered. Before upgrading, record the non-secret connection settings through the existing secure operational process, then configure each target cluster through its cluster settings/API and enter credentials there. A global connection cannot be assigned automatically in a multi-cluster installation.
4. Do not add new features that depend on legacy YAML or Helm fields. Remove remaining compatibility fields only after their documented migration path has been verified.

Do not delete fields before migration records, encryption-key handling, and multi-replica consistency are in place. Startup topology, network trust boundaries, system secrets, and infrastructure backends remain deployment-managed.

## Agent Runner Config

The standalone `soha-agent` binary can also claim AI Agent Runtime work from the control plane. The server and agent must share the same `runtime.execution_runner_token` / `control_plane.bearer_token` value.

Minimal Hermes runner config:

```yaml
control_plane:
  enabled: true
  base_url: http://127.0.0.1:8080
  bearer_token: soha-123456789012345678901234567890
  agent_id: local-agent
  agent_runtime:
    enabled: true
    worker_id: local-hermes-runner
    provider_ids:
      - hermes
    provider_kinds:
      - hermes
    hermes_command: hermes
    providers:
      hermes:
        command: hermes
        args:
          - chat
          - -Q
        prompt_arg: -q
        skill_arg: ""
        provider_skill_arg: -s
    workspace_root: ./.soha/agent-runtime
    poll_interval: 5s
```

The AI workbench and automation policy choose `agentProviderId`; the runner only executes matching `AgentRun` rows. Provider-specific commands and workspaces belong in agent config, not in browser payloads. Hermes skill arguments should come from `AgentSkillBinding.providerSkillRef`, with soha skill ids used only as fallback. External providers should invoke soha read-only tools through `/api/v1/copilot/agent-runs/tool-call`, which validates the runner token, per-run callback token, and permission-filtered `AgentRun.toolBindings` snapshot before recording `ToolExecution`. The built-in Hermes/CLI POC prefetches a small read-only tool context into the provider prompt: events, logs, metrics, traces, delivery releases, delivery builds, execution tasks, platform resource snapshots, Docker operation/service context, virtualization operations, alerts, and OnCall route resolution are currently executable. Prefetch and provider-visible tools still depend on the run's toolset selection, including exact adapter ids such as `logs.v1` or source-kind aliases such as `logs`. Richer provider-native or MCP client tool protocols should still terminate at the same soha tool-call gateway.
