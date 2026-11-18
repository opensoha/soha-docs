# Agent Runtime

## dsh and Hindsight deployment

Core `v0.1.13` ships with `dsh_runtime` and `hindsight` disabled by default (Core `v0.1.12` and earlier used the legacy built-in runtime). Before deploying dsh, Hindsight, or runtime profiles, verify a matching combination of Core (`ghcr.io/opensoha/soha:v0.1.13` with its same-commit embedded Web), Contracts `v0.2.0`, and the dsh runtime image (`ghcr.io/opensoha/soha-dsh:v0.2.0`, published with `agent/v0.2.0`). For Kubernetes, use a compatible chart from the [Soha Helm repository](https://github.com/opensoha/soha-helm) (check each published chart's `appVersion` until chart updates targeting Core `v0.1.13` and Agent `v0.2.0` are published).

Building the dsh image from source requires Contracts `v0.2.0` or a newer compatible release containing `agent/dsh-runtime.schema.json` (absent from Contracts `v0.1.29` and earlier).

- New Chat and Heya require dsh. Deploy the dsh service on a private network, share its service-token file with Core and enable `dsh_runtime.enabled`. Enable `security.protected_durable_storage` only after all Core workers can read encrypted checkpoints. Keep the installation's active credential encryption key and protected storage while existing checkpoints need recovery.
- Hindsight is optional. Before enabling it, apply Core migrations through `0145`. Use its own PostgreSQL database and credentials, the matching protection gateway and a Gateway token scoped to the configured models.
- Before using runtime profiles and managed assets, apply Core migrations through `0147` and check that dsh reports `runtime-assembly-v1`. Mount the registry, Skill files and MCP credentials only in the dsh workload.
- Preserve the single-writer dsh journal during upgrades and rollback. If you installed an earlier candidate with an unprotected Helm PVC, first upgrade with dsh enabled and the original claim. Confirm the retention annotation is in the Helm release manifest before disabling dsh. On reinstall, use `dshRuntime.existingClaim` to reference the retained claim.
- Core `/readyz` checks PostgreSQL. Verify authenticated dsh health and a completed Chat and eligible Heya request with their corresponding Runs before opening traffic. When rotating a shared service token, pause admission, drain affected runs and restart Core replicas and the corresponding runtime together.

## Runtime cutover maintenance (operator)

Use the offline `runtime-upgrade` tool from the same Core revision. Its source build requires the matching released Contracts dependency. Use `GOWORK=off go build -o runtime-upgrade ./cmd/runtime-upgrade` after verifying that dependency. Run this tool during a maintenance window after draining legacy work and stopping its writers.

Back up the target PostgreSQL database before schema or application changes. The maintenance tool requires schema migrations `0143` and `0144` before dry-run or apply. Apply them using the installation's migration procedure while the old writers stay stopped.

Use a clean shell without other `PG*` variables. Prepare an operator-only `pg_service.conf` with a `[soha-upgrade]` section specifying the intended host, port, dbname, user and TLS settings; keep credentials in a separate mode `0600` pgpass file. Use these same files and environment for `psql`, `pg_dump` and the maintenance tool.

```bash
export PGSERVICEFILE=/YOUR_PRIVATE_PATH/pg_service.conf
export PGPASSFILE=/YOUR_PRIVATE_PATH/pgpass
export PGSERVICE=soha-upgrade
export SOHA_UPGRADE_DATABASE_URL="service=$PGSERVICE"
psql -X -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user, inet_server_addr(), inet_server_port()'
```

Compare the displayed database, user, server address and port with the intended maintenance target. Stop if they differ.

```bash
umask 077
BACKUP_PATH=$(mktemp /YOUR_PRIVATE_PATH/soha-before-dsh.XXXXXX)
pg_dump --format=custom --file "$BACKUP_PATH"
pg_restore --list "$BACKUP_PATH" >/dev/null
```

After applying the prerequisite schema migrations, generate the plan.

```bash
./runtime-upgrade -mode=dry-run > /YOUR_PRIVATE_PATH/runtime-upgrade-plan.json
```

Keep the service configuration and environment unchanged through backup, dry-run and apply. The tool checks only that the backup is a nonempty regular 0600 file and records its SHA-256; it does not verify its database identity or restorability.

Review the dry-run inventory and its SHA-256 `digest` before applying. `pg_restore --list` checks the archive format only; it is not a restore drill. Apply requires the reviewed plan digest and the backup file. If the reviewed inventory contains explicitly selected expired-lease legacy runs, list their exact IDs (up to 1000) using `-quarantine-runs`; otherwise omit that flag:

```bash
./runtime-upgrade -mode=apply -digest REVIEWED_PLAN_SHA256 -backup "$BACKUP_PATH"
./runtime-upgrade -mode=apply -digest REVIEWED_PLAN_SHA256 -backup "$BACKUP_PATH" -quarantine-runs RUN_ID_1,RUN_ID_2
```

The command rechecks that the inventory matches the digest and rejects live leases or other active writers. A quarantined run becomes read-only `unknown` and fenced for reconciliation; quarantine does not prove it stopped, retry it, or translate a Native checkpoint. If inventory or writers change, stop and produce a fresh dry-run for review.

Rollback is checkpoint-scoped and conditional. It only restores session metadata that has not changed since apply; it does not clear the cutover gate or restore runs, memory, or tombstones:

```bash
./runtime-upgrade -mode=rollback -digest APPLIED_CHECKPOINT_SHA256
```

Quarantined memory remains inspectable with its server-owned `quarantined` and `quarantineReason` fields, cannot be re-enabled by clients, and may be deleted by its owner. Do not relabel uncertain records as expired or infer a missing owner. This source-candidate procedure is not release or production qualification; dependency, image, and release acceptance remain pending.

With the candidate CLI, for uncertain chat submissions, inspect the original request rather than resending it: `soha ai chat request SESSION --request-id ID`. `native-request` is a compatibility alias. A missing lookup is not proof that the request cannot still commit; reconciliation remains server-authoritative.

## Positioning

The `soha` agent process serves two runtime responsibilities:

- Remote cluster agent: provides resource reads and bounded operational actions for Kubernetes clusters configured with `connectionMode=agent`.
- Control plane runner: claims delivery, Docker, and AI Agent Runtime tasks from the `soha` control plane and writes status and results back through callbacks.

AI Agent Runtime is Soha's unified execution abstraction for the AI workbench, automation policies, and operational diagnostics. Console pages and domain modules target Soha's capability contracts rather than coupling directly to Hermes, OpenClaw, or any specific agent implementation.

Core abstractions:

- `AgentProvider`: a pluggable executor such as `internal` or `hermes`, extensible to OpenClaw or other providers.
- `AgentCapability`: a platform capability such as `root_cause`, `performance`, `trace`, `inspection_review`, `delivery_failure`, or `docker_diagnosis`.
- `AgentToolBinding`: a binding from a capability to an MCP adapter, a read-only platform tool, or a provider-native tool.
- `AgentSkillBinding`: a mapping from a Soha skill to a Hermes skill, a prompt template, or a provider-native skill mechanism.
- `AgentRun`: a durable agent execution containing the provider, capability, skills, toolset, scope, status, callback token, tool execution records, and output artifacts.

Hermes Agent is the first external provider. It claims `ai_agent_runs` records through the Soha agent runner, executes Hermes CLI or Hermes Agent capabilities, and writes the normalized output back as an `AnalysisArtifact`.

Each `AgentRun` snapshots `toolBindings` and `skillBindings` at creation time. A runner claim receives a self-contained Soha capability contract—including scope, toolset, budget, platform playbook, provider skill mappings, and MCP/internal tool mappings. Adapters for OpenClaw, internal agents, or additional providers consume this snapshot rather than re-deriving Hermes- or OpenClaw-specific parameters inside UI pages or domain modules.

## Control Plane Contracts

Authenticated AI workbench catalog endpoints return Agent Runtime directory summaries:

- `GET /api/v1/copilot/workbench/catalog`
- `GET /api/v1/copilot/agent-providers`
- `GET /api/v1/copilot/agent-runs`

These endpoints serve authorized users and return summaries of providers, capabilities, tool bindings, skill bindings, MCP adapters, data sources, analysis profiles, and the skill registry. Full provider API keys and data source credentials remain managed under Settings > AI.

Runner endpoints for Agent execution authenticate with `runtime.execution_runner_token`:

- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`
- `POST /api/v1/copilot/agent-runs/tool-call`

`tool-call` is the governed gateway through which external providers invoke Soha tools. Every request must carry both the runner bearer token and the active `AgentRun.callbackToken`, and may invoke only the read-only tools snapshotted in `toolBindings` when that run was created. The control plane currently executes queries for logs, metrics, traces, platform events, delivery releases, delivery builds, execution tasks, platform resource snapshots, Docker operations/services, virtualization operations, alerts, and OnCall route resolution, recording each invocation as a `ToolExecution` for reuse in the final `AnalysisArtifact`. Provider adapters must not bypass this gateway to access Soha data sources or credentials directly.

Before running the provider command, the runner's Hermes/CLI provider POC prefetches up to three eligible read-only tool results—such as `events.query`, `logs.query`, `metrics.query`, `traces.query`, `delivery.releases.list`, `delivery.builds.list`, `delivery.execution_tasks.list`, `platform.resources.snapshot`, `docker.operations.list`, `docker.services.list`, `virtualization.operations.list`, `alerts.list`, and `oncall.routes.resolve`—and injects them as `prefetchedToolResults` into both the provider prompt and final output. The `traces.query` route is retained for compatibility and currently reports capability unavailable; generic `logs.query` queries persisted cluster logs only. This allows a provider to consume Soha's governed tool context even before integrating a native tool-call protocol. When Hermes or another agent connects as an MCP client, the runner adapter wraps this same `tool-call` gateway as an MCP/tool server without exposing Soha data source credentials.

The `AgentRun.toolBindings` snapshot is filtered at creation time against the runtime permission keys of the initiating user or system principal. Neither the runner token nor the callback token can expand access beyond that filtered snapshot to data sources, tools, or business contexts the caller was not authorized to read. Toolset adapter selection supports both exact adapter IDs (such as `logs.v1`) and source-kind aliases (such as `logs`, `metrics`, and `traces`), with explicit matching rules backed by test coverage.

All such tools remain read-only and bounded by the `AgentRun.toolBindings` snapshot. Additional providers or tools should integrate through a reader/adapter into `executeAgentToolBindingOutput` before joining the runner prefetch allowlist; high-risk write operations must never be exposed directly as chat tools.

`ai_agent_runs` is the durable queue table for AI Agent Runtime, with states:

- `queued`
- `running`
- `completed`
- `failed`
- `canceled`
- `callback_timeout`

## Platform Capability Matrix

Platform runtime capabilities are exposed as a stable contract at `GET /api/v1/clusters/capabilities`, describing each capability's availability across Direct and Agent cluster connection modes. Each entry includes:

- `key`, `label`, `category`: stable capability identifier, display name, and category.
- `direct.status`, `agent.status`: `available`, `partial`, or `unsupported`.
- `direct.reason`, `agent.reason`, `notes`: concrete product constraints explaining partial or unsupported states.
- `requiredScopes`, `riskLevel`, `requiresApproval`: required scopes, risk level, and approval expectations to surface or diagnose before invocation.
- `docsUrl`: link to the corresponding operational documentation or limitation notes.

The Web console, CLI, Skills, and external integrations must not infer Agent/Direct parity on their own; they consume this matrix to drive action availability, unsupported states, degradation messaging, and diagnostic output. `unsupported` and `partial` are authoritative capability boundaries reported by the control plane rather than frontend fallback states.

The CLI reads the same platform capability matrix directly:

```bash
soha capabilities --domain platform --output names
soha capabilities --domain platform --output json
soha diagnose --cluster-capability resource.yaml.apply
```

`diagnose --cluster-capability` displays Direct/Agent support status, risk level, approval requirements, required scopes, and documentation links for the target capability, explaining why YAML apply, CRD, Helm, logs, exec, port-forward, or Docker runtime actions are available, partially available, or unavailable in a given connection mode.

## Analysis Flows

Explicit AI workbench analysis flow:

1. A user selects a provider, analysis profile, toolset, and analysis mode in an `/ai-workbench` session.
2. The frontend calls `POST /api/v1/copilot/sessions/:sessionID/analyze`.
3. The `internal` provider runs synchronously through Soha's built-in analysis path.
4. External providers enqueue an `AgentRun`, writing an initial `queued` assistant message.
5. An agent runner claims the task via the claim endpoint.
6. The Hermes provider runner translates scope, toolset, skills, budget, and prompt into a Hermes invocation.
7. Whenever the provider needs logs, metrics, traces, events, delivery releases/builds, or alerts, the runner adapter invokes Soha's governed tools through `agent-runs/tool-call`.
8. The runner reports `running`, `completed`, or `failed` via callback.
9. The control plane normalizes the provider output into a Soha `AnalysisArtifact`, persisting evidence, hypotheses, recommendations, relationship graphs, tool executions, and data source snapshots.

Automation policy flow:

1. Soha automation policies remain the primary scheduler for continuous analysis.
2. Incoming `alert_webhook` alerts are matched, deduplicated, and rate-limited by cooldown windows in the automation policy.
3. Policies with `agentProviderId=internal` use the built-in analyzer.
4. Policies with `agentProviderId=hermes` or another external provider create an `AgentRun` for asynchronous runner execution.
5. Hermes cron is treated strictly as an experimental provider-native capability rather than Soha's primary platform scheduler.

## Hermes Runner Configuration

Configure the runner token on the server:

```yaml
runtime:
  execution_runner_token: demo-execution-runner-token
```

Enable AI Agent Runtime on the agent via `configs/agent.config.yaml`:

```yaml
control_plane:
  enabled: true
  base_url: http://127.0.0.1:8080
  bearer_token: demo-execution-runner-token
  agent_id: local-agent
  poll_interval: 5s
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

Start the agent:

```bash
cd ../soha/agent
go run ./cmd/agent
```

Start with a custom configuration file:

```bash
SOHA_AGENT_CONFIG_FILE=/abs/path/to/agent.config.yaml go run ./cmd/agent
```

Current Hermes provider runner POC conventions:

- The runner claims only `AgentRun` tasks whose provider ID or kind matches `hermes`.
- The default executable is `hermes`, overridable via `control_plane.agent_runtime.hermes_command`.
- The runner serializes the Soha run input, tool binding snapshot, and skill binding snapshot into the prompt, passing `AgentSkillBinding.providerSkillRef` as the Hermes skill CLI argument first and falling back to the Soha skill ID only when no provider skill ref is set.
- The runner provides an `agent-runs/tool-call` client helper so provider adapters can execute authorized read-only tools from the run snapshot; the default Hermes CLI POC prefetches a bounded batch of read-only tool results (logs, metrics, traces, events, delivery releases/builds, and alert context) into the prompt without assuming a proprietary Hermes tool-call protocol.
- While the provider command runs, the runner sends periodic `running` heartbeat callbacks to keep `lastHeartbeatAt` fresh on the control plane; if a callback response returns a terminal state (`canceled`, `callback_timeout`, `failed`, or `completed`), the runner cancels the local provider process and suppresses any subsequent `completed` callback.
- `soha/agent/internal/agent/runner` includes smoke test coverage without requiring a live Hermes installation: a fake control plane exercises the full protocol path from claim -> running callback -> tool-call prefetch -> CLI provider -> completed callback -> `AnalysisArtifact`. Production deployments should still point `hermes_command` at the real Hermes CLI for end-to-end verification.
- `analysisArtifacts` supplied in the runner callback take precedence as the final artifact; when omitted, the runner and control plane synthesize a baseline `AnalysisArtifact` from the provider output summary while preserving provider-returned `evidence`, `hypotheses`, `recommendations`, `graph`, `toolExecutions`, `dataSourceSnapshot`, and the runner's own tool execution records.

The runner dispatches executors by provider. Hermes is the built-in default executor; additional CLI-based providers can be wired through `control_plane.agent_runtime.providers.<providerKind>`, for example:

```yaml
control_plane:
  agent_runtime:
    provider_ids:
      - openclaw
    provider_kinds:
      - openclaw
    providers:
      openclaw:
        command: openclaw
        args:
          - run
        prompt_arg: --prompt
        skill_arg: ""
        provider_skill_arg: --skill
```

Such a provider executor still consumes only the Soha `AgentRun` contract: the prompt carries the scope, toolset, `toolBindings`, `skillBindings`, and output schema, while provider-native skill arguments come from `AgentSkillBinding.providerSkillRef`. If no matching provider executor is configured, the runner explicitly reports `failed` via callback rather than masquerading an unknown provider as Hermes.

## Extending With a New Provider

Adding a new provider extends only the adapter layer without rewriting the AI workbench or domain analysis workflows:

1. Register the `AgentProvider` in the copilot service provider catalog.
2. Declare the `AgentCapability` entries supported by the provider.
3. Add `AgentToolBinding` and `AgentSkillBinding` definitions for those capabilities.
4. Implement a provider-specific executor in the runner that translates `AgentRun` inputs into provider invocations.
5. Keep callback outputs formatted as a Soha `AnalysisArtifact` or a structure synthesizable into an `AnalysisArtifact`.

Hard boundaries:

- UI pages, HTTP handlers, and domain modules must never call Hermes directly.
- Budgets, permissions, menus, auditing, data source redaction, and operational boundaries remain governed by Soha.
- Agents operate strictly as pluggable executors and must not bypass Soha's MCP adapters, scopes, toolsets, `tool-call` gateway, or analysis profile contracts.
- High-risk write operations must never be attached directly to chat execution; they must flow through durable operations or approval workflows in their owning domain modules.

## Remote Cluster Agent And AI Agent Runtime Boundaries

The same `soha-agent` binary serves both as a remote cluster connector (`agent` mode) and as a control plane Runner executor, while strictly separating their protocols and authorization boundaries:

- **Remote Kubernetes cluster Agent**: establishes an outbound persistent reverse connection from a private cluster to Soha (see [Multi-Cluster Model](../architecture/multi-cluster-model.md) and [Kubernetes Workbench](./kubernetes-workbench.md)). Governed by installation presets (`read-only`, `workbench`, `legacy`), an explicit `security.allowed_actions` allowlist, and in-cluster RBAC, it provides resource reads and writes, bounded logs, YAML inspection and apply, events, workload operations, node drain, Pod exec, port forwarding, and optionally enabled Helm and CRD actions. Action readiness can be verified through the authenticated `GET /api/v1/diagnostics/actions` endpoint, while effective availability is defined by the platform capability matrix.
- **Docker host runtime agent**: when the corresponding actions (such as `docker.runtime.logs.v1`, `docker.runtime.files.v1`, and `docker.runtime.terminal.v1`) and `control_plane.docker.operation_kinds` are explicitly configured, provides governed log streaming, safe volume browsing, container terminal sessions, and Runner operation callbacks for registered hosts and projects.
- **AI Agent Runtime executor**: executes governed `AgentRun` tasks over the Runner polling and callback protocol. It cannot escalate privileges to invoke unauthorized cluster actions, nor mix the platform cluster Agent channel with the AI Provider execution pipeline.
