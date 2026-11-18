# AI Copilot

## Goal

The AI layer in soha has evolved from a single chat page into an AIOps assistant workbench built for platform operations.

Its design centers on two layers:

1. A unified entry point at `/ai-workbench`
2. A set of workbench subpages covering investigation, inspection automation, and tool assembly

The AI layer supports:

- Alert-driven root-cause analysis
- Performance jitter and capacity anomaly analysis
- Trace latency bottleneck and error hotspot analysis (planned; external trace-provider integration is not currently available)
- Multi-source evidence correlation across logs, events, audit trails, releases, and builds
- Closed-loop handoff from inspection findings into investigation sessions
- Session-scoped assembly of tools, skills, and data sources

## Current Implemented Surface

Implemented frontend and backend routes:

- Overview entry:
  - `/ai-workbench`
- Investigation workbench:
  - `/ai-workbench/chat`
  - `/ai-workbench/root-cause`
  - `/ai-workbench/performance`
- Inspection and automation:
  - `/ai-workbench/inspection`
- Tools and skills:
  - `/ai-workbench/tool-settings`
  - `/ai-workbench/model-settings`

Legacy routes retained as compatibility redirects:

- `/ai-observe`
- `/ai-observe/workbench`
- `/ai-observe/operations`
- `/ai-observe/tools`
- `/ai-observe/root-cause`
- `/ai-observe/performance`
- `/ai-observe/chat`
- `/ai-observe/inspection`
- `/chat`
- `/ai-workbench/investigation`
- `/ai-workbench/automation`
- `/ai-workbench/tools`

## Session Model

AI investigations treat sessions as first-class durable objects rather than ephemeral chat transcripts.

Core persistence tables remain:

- `ai_sessions`
- `ai_messages`

While `ai_sessions.metadata` now carries structured workbench metadata:

- `mode`
- `status`
- `scope`
- `pinnedContext`
- `toolset`
- `agentProviderId`
- `analysisRunRefs`
- `summary`
- `tags`
- `archivedAt`

Within metadata, `scope` serves as the standard handoff payload from the monitoring workbench into the AI workbench, carrying:

- `alertId`
- `clusterId`
- `namespace`
- `workload`
- `timeRangeMinutes`

And `toolset` is enforced in the backend execution path:

- `enabledAdapterIds` restricts which MCP adapters are available in the session
- `disabledToolNames` blocks specific tool names or qualified `adapter.tool` identifiers
- `budgetOverrides.maxEvidenceItems` caps the number of evidence items collected per analysis
- `budgetOverrides.timeoutSeconds` bounds the execution timeout for individual analysis tool runs
- `scopeOverrides` merges over the session scope before root-cause, performance, or trace analysis runs

Session tool assembly reads `/api/v1/copilot/workbench/catalog`, which returns a safe catalog summary to users holding `observe.ai.chat` / `observe.ai.view` / `settings.ai.view`: adapter metadata, data-source enablement status, analysis profile summaries, skill summaries, agent providers, capabilities, tool bindings, and skill bindings. Full AI Provider configurations and secrets remain restricted to `settings.ai.view`.

Supported session modes:

- `general`
- `root_cause`
- `performance`
- `trace`
- `inspection_review`

The `trace` session mode is retained in the session model, but Core currently has no built-in Trace
Explore, trace-provider execution, or service-topology view. Related routes and query DTOs report the
capability as unavailable until a future external provider integration is delivered.

## API Surface

Implemented and extended session endpoints:

- `GET /api/v1/copilot/sessions`
- `GET /api/v1/copilot/sessions/:sessionID`
- `POST /api/v1/copilot/sessions`
- `PATCH /api/v1/copilot/sessions/:sessionID`
- `DELETE /api/v1/copilot/sessions/:sessionID`
- `GET /api/v1/copilot/sessions/:sessionID/messages`
- `POST /api/v1/copilot/sessions/:sessionID/messages`

Sending a message returns an envelope rather than a bare message list:

- `messages`
- `toolCalls`
- `analysisArtifacts`
- `sessionPatch`

Analysis and agent-execution endpoints built around the unified artifact model:

- `GET /api/v1/copilot/root-cause/runs`
- `POST /api/v1/copilot/root-cause/runs`
- `GET /api/v1/copilot/root-cause/runs/:runID`
- `POST /api/v1/copilot/sessions/:sessionID/analyze`
- `GET /api/v1/copilot/agent-providers`
- `GET /api/v1/copilot/agent-runs`
- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`

`ai_root_cause_runs` currently stores:

- `kind`
- `session_id`
- `tool_executions`
- Existing root-cause evidence, hypotheses, recommendations, and data-source snapshot fields

## Data Sources And MCP

AIOps tool capabilities continue to be exposed through the MCP adapter abstraction.

Registered adapters:

- `platform-native.v1`
- `logs.v1`
- `metrics.v1`
- `traces.v1`
- `delivery.v1`

Current status:

- `platform-native.v1`
  - Reads aggregated platform evidence.
- `logs.v1`
  - The generic `logs.query` capability currently queries durable cluster logs only.
- `metrics.v1`
  - Uses the Prometheus-backed execution path.
- `traces.v1`
  - The adapter identifier is retained for compatibility, but trace execution is unavailable in Core.

The control plane has three entry points:

1. Settings > AI
   - Global provider, data source, analysis profile, and automation policy configuration.
2. `/ai-workbench/tools`
   - Legacy compatibility route that redirects to `/ai-workbench/tool-settings`.
3. `/ai-workbench/tool-settings`
   - Entry point for session-scoped toolset overrides and skill assembly.

The global skill registry uses structured enterprise skill definitions rather than display-only entries:

- `id`
- `name`
- `category`
- `ownerModule`
- `capabilityRefs`
- `blueprintRefs`
- `inputSchema`
- `outputSchema`
- `scopeRules`
- `enabled`

## Agent Runtime

Core `v0.1.12` and earlier used the legacy built-in runtime. Starting in Core `v0.1.13`, `dsh_runtime` is disabled by default; once enabled alongside the matching `soha-dsh:v0.2.0` service, Core sends ordinary Chat and Heya requests directly to the separate Node dsh service. Requests fail explicitly when dsh is disabled or unavailable rather than falling back to Native. The `internal` and `native` provider identifiers are compatibility aliases for dsh on new requests.

Core objects:

- `AgentProvider`: executor catalog. With dsh enabled, `dsh` is the built-in default for Chat and Heya. Explicit external Hermes/CLI providers remain available for their configured protocols.
- `AgentCapability`: soha platform capabilities, including `root_cause`, `performance`, `trace`, `inspection_review`, `delivery_failure`, `post_deploy_observation`, `platform_resource_diagnosis`, `docker_diagnosis`, `virtualization_diagnosis`, and `oncall_brief`
- `AgentToolBinding`: maps a capability to MCP adapters, read-only platform tools, or native provider tools
- `AgentSkillBinding`: maps a soha skill to a Hermes skill, prompt template, or future provider skill
- `AgentRun`: durable asynchronous execution record for external providers, storing status, scope, toolset, skills, callback token, tool executions, and output artifacts

Core keeps session and Run facts, authorization, Heya eligibility and environment gates, approvals, budgets, audit, and domain analysis responsibilities. The dsh runtime owns the model/tool loop and calls Core through its authenticated runtime interface and authorized tool bridge. Explicit Hermes or other CLI providers remain separate external integrations; they are not implicit defaults or failure fallbacks for Chat/Heya.

Historical Native runs remain readable as history. In-flight legacy runs must be drained or explicitly quarantined through the offline maintenance procedure before cutover; do not translate Native checkpoints or approvals into a live dsh run. See [Agent Runtime operations](../operations/agent-runtime).

Agent Runtime outputs normalize back into soha `AnalysisArtifact` records, reusing evidence, hypotheses, recommendations, relationship graphs, tool invocation logs, and data-source snapshots. Permissions, menus, budgets, data-source redaction, auditing, and high-risk operation boundaries remain governed by soha.

## Frontend Shape

### `/ai-workbench`

The overview entry provides:

- Assistant welcome view
- Recent investigations
- Recent analyses
- Risk radar
- Quick links to investigation, inspection automation, and tool/skill settings

### `/ai-workbench/chat`

The investigation workbench combines Ant Design X and `antd`:

- Left pane: `Conversations`
- Center pane: `Bubble.List` + `Sender` + `Prompts`
- Right pane: context / evidence / hypotheses / recommendations panel
- `ThoughtChain` drawer displaying the tool invocation chain and analysis steps
- When the current session scope carries `alertId`, the workbench supports jumping back to the originating monitoring alert detail
- Supports switching into trace analysis and inspection review within the same session canvas via `mode=trace` and `mode=inspection_review`
- The Session Toolset drawer displays the effective execution policy directly and allows editing adapter selection, `adapter.tool` blocklists, budget overrides, and scope overrides
- Running an explicit analysis opens a confirmation modal first so the user can choose the provider, analysis profile, and runnable analysis mode, edit the analysis objective for the round, and preview the session scope and toolset source before calling the session analysis API; runnable modes are `root_cause`, `performance`, `trace`, and `inspection_review` (`general` is rejected by the backend), and upon success the chosen mode and `agentProviderId` are written back to session metadata
- In the dsh candidate, ordinary Chat and Heya use dsh by default and retain Core-owned authorization, Heya gates, approvals, budgets, audit, and domain analysis. Explicitly selected external Hermes/CLI providers use their own configured protocols; they are not fallback paths.
- All `analysisArtifacts` attached to assistant messages in the session aggregate into an Analysis Artifact History view, allowing users to switch graphs, evidence, and recommendations across root-cause, performance, trace, and inspection-review artifacts

### `/ai-workbench/root-cause` and `/ai-workbench/performance`

Root-cause and performance modes reuse the same session canvas while expressing the active analysis type directly in the route path rather than relying on legacy `investigation?mode=*` redirect parameters as the primary information architecture.

### `/ai-workbench/inspection`

Unified entry point for inspection tasks, run records, and automation policies.

`/ai-workbench/inspection` is an interactive workspace rather than a read-only list:

- Supports creating and editing inspection tasks directly inside the AI workbench
- The inspection task form scopes inputs across platform, cluster, and namespace levels
- Inspection tasks can select an `mode=inspection` analysis profile stored in task metadata as `analysisProfileId`, allowing backend execution to override inspection playbooks and data-source constraints
- Inspection tasks support deletion; the delete action in the workbench requires `observe.ai.inspection.manage`, isolates tasks by creator on the backend, and cascades cleanup to associated inspection runs in PostgreSQL
- Creating, editing, immediately executing tasks, and converting an inspection run into an investigation session all happen within the same workspace under `observe.ai.inspection.manage`, `observe.ai.inspection.run`, and `observe.ai.chat`; converting an inspection run into an investigation session additionally requires `observe.ai.view`, and generating an inspection task from an investigation session requires `observe.ai.chat`
- When generating an inspection task from an investigation session, the workbench attaches the active inspection profile when available so profile-driven check contracts are preserved
- The Automation Policies tab supports creating and editing trigger types, analysis types, analysis profiles, remediation policies, deduplication windows, cooldown intervals, and enablement status
- Reading, creating, editing, and deleting automation policies continue to use `/api/v1/copilot/automation-policies` gated by `settings.ai.manage`; without that permission, the workbench does not fetch the policy list proactively and instead renders an explicit permission boundary
- The automation policy form selects `analysisProfileId` from analysis profile summaries in the safe workbench catalog and `agentProviderId` from the agent provider catalog; the executor currently supports only the `alert_webhook` trigger type, and unimplemented trigger types are not exposed as runnable options
- Runnable analysis types for automation policies include `root_cause`, `performance`, `trace`, and `inspection_review`; external providers can also extend via Agent Runtime to capabilities such as delivery failure, post-deploy observation, platform resource diagnosis, Docker/virtualization diagnosis, and on-call briefs
- Alert severity, status, minimum duration, label matchers, analysis time window, and approval roles are persisted into structured `triggerConditions` / `approvalPolicy` fields so policies created in the workbench are actionable rather than empty shells
- The automation executor writes a policy-prefixed `dedupKey` on built-in root-cause, performance, and trace analysis runs, while external providers receive the same deduplication context in `AgentRun.input`. `dedupWindowSeconds` deduplicates identical alert fingerprints, and `cooldownSeconds > 0` enforces policy-level cooldowns so distinct alerts do not re-trigger repeatedly during the cooldown window

Promoting inspection results into a session initializes rich investigation context rather than an empty chat:

- The backend writes the inspection task's `clusterId` / `namespace` into the session scope
- Session `pinnedContext` retains `inspectionRunId`, `inspectionTaskId`, severity, and status
- The initial assistant message carries an `inspection_review` analysis artifact
- That artifact converts findings into evidence, recommendations, and a left-to-right relationship graph rendered directly in the right-hand evidence panel

### `/ai-workbench/tool-settings`

Displays:

- MCP adapters
- Mirrored global data-source status
- Session-scoped toolset assembly controls
- Enterprise skill registry
- Safe catalog of Agent Providers / Capabilities / Tool Bindings / Skill Bindings

Tool assembly controls stay aligned with the backend execution contract:

- Disabled tools are stored in qualified `adapter.tool` form so identically named tools on other adapters are unaffected
- An empty adapter list denotes automatic selection; recommended presets preferentially enable registered adapters backed by active data sources
- Budget overrides persist positive values only so `0` is never misinterpreted as an active cap
- Scope overrides write structured `clusterId`, `namespace`, `workload`, `service`, `alertId`, and `timeRangeMinutes` fields

### `/ai-workbench/model-settings`

Embeds global AI settings inside the AI workbench, continuing to enforce `settings.ai.view` / `settings.ai.manage`.

## Safety And Execution Model

The AI layer maintains an analysis-and-recommendation-first safety posture.

Current priorities:

- Aggregate operational context
- Invoke read-only tools
- Produce evidence, hypotheses, and recommendations
- Persist tool invocations and analysis artifacts into sessions
- Normalize external agent outputs into soha `AnalysisArtifact` records

High-risk mutating actions are not wired into unguarded chat auto-execution chains.

Application onboarding spec generation and platform delivery orchestration belong to the application delivery workbench rather than the AI workbench; the AI workbench only exposes MCP/skills capabilities discoverable and invokable by enterprise AI coding clients and Agent Runtime.

## Near-Term Expectations

Ongoing AI functionality follows these engineering rules:

- New AI surfaces integrate into the AI workbench rather than adding standalone legacy table pages
- Session-related enhancements extend `metadata` first before splitting out separate investigation entity tables
- Every new data source or tool capability accounts for:
  - Global configuration
  - Session-scoped assembly
  - Durable analysis artifact persistence
- Root-cause, performance, trace, inspection-review, and external agent analyses share the unified artifact model rather than inventing per-page protocols
- Adding a new agent provider extends only the provider adapter, tool bindings, skill bindings, and runner executor; UI pages and domain analysis flows never depend directly on a provider SDK or CLI
- Handoffs from the monitoring workbench into the AI workbench preserve the standard `scope` contract rather than defining ad-hoc per-page redirect parameters

## Knowledge source import permissions

External HTTP, Git and Object connectors can store a versioned importPolicy in
config to define the users, roles, teams and projects a source may grant. Omission
defaults to the stable knowledge-base owner; an explicitly empty private scope
grants nobody. Core clips fetched ACLs before storing documents and chunks, so a
remote public ACL cannot exceed this ceiling. Shared sources can declare scoped
grants. Finite grants intersect within the same identity category, without
inferring membership across categories. Inline imports retain their existing behavior.

Source credentials use `soha://secrets/<id>` (optionally `/versions/<n>`) and the
`SOURCE` alias through Gateway secretRefs authorization, pinning and
resolution rather than ordinary plugin input or documents. Runtimes without
per-call credential delivery reject the invocation. Import permission checks do
not establish availability of the three fetch plugins. Existing indexes are not
automatically rewritten; policy editing, revocation of previously indexed data
and real source fetching still require their own acceptance evidence.

Legacy `secret:` references remain readable configuration. Fetching rejects them
until an authorized edit selects the intended canonical secret reference; it does
not guess a secret identity from a legacy name or path.
