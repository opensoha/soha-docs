# soha AI Gateway

## Goal

`soha AI Gateway` is the AI-native operations entry point in soha for external AI coding tools, IDE agents, CI automation, and enterprise agent platforms.

Rather than duplicating web UI features in a CLI or letting MCP clients mutate databases or Kubernetes clusters directly, AI Gateway brings external AI requests inside soha's security boundary and reuses owning application-layer services for queries, releases, diagnostics, and evidence write-back.

## Boundary With the AI Workbench

Existing `AI Workbench`, MCP adapters, Agent Runtime, and the execution plane serve as the capability foundation beneath AI Gateway, while operating at distinct layers:

- `AI Workbench`: soha's internal interactive AI workspace for investigation sessions, tool assembly, inspections, RCA, and analysis artifacts.
- `Agent Runtime`: soha's execution runtime for scheduling internal or external agent providers, handling claim/callback lifecycles, tool bindings, skill bindings, and artifact normalization.
- `MCP adapter`: capability catalog bridging internal soha tools and external data sources.
- `execution plane`: durable runner and callback infrastructure for long-running build, release, Docker, and virtualization tasks.
- `AI Gateway`: unified security boundary and capability manifest for external AI clients entering soha.

Standard request flow:

```text
AI Client / soha / MCP
  -> AI Gateway
  -> permissionKeys / scope grants / AI grants / risk policy / audit
  -> delivery, resource, copilot, docker, virtualization services
  -> execution plane or Agent Runtime when needed
```

## CLI, MCP, and Skills

`soha` provides the unified local CLI entry point:

- `login`
- `profile list|show|use`
- `context show|set`
- `capabilities`
- `tool call`
- `resource read`
- `prompt get`
- `token list|create|revoke`
- `service-account list|create|token-list|token-create|token-revoke`
- `audit list`
- `governance status`
- `approval list|timeline|approve|reject|cancel`
- `mcp start|install`
- `skill list|install`
- `diagnose`
- `completion bash|zsh`

The CLI source lives in the standalone `cli/` Go submodule of `github.com/opensoha/soha` with its entrypoint at `cli/cmd/soha`. The implemented command surface covers profile and context management, capability manifest inspection, manual Gateway tool invocation, resource and prompt debugging, PAT and service-account token management, Gateway audit queries, governance status, approval timelines and decisions, MCP client configuration generation, skill installation, `diagnose`, and shell completion.

The CLI handles authentication, local configuration, MCP server startup, and manual operator fallback commands only. Every real platform action calls the soha API. Local profiles are stored by default in `~/.soha/config.json` with `0600` file permissions, and `profile show` displays redacted tokens only.

`soha MCP Server` dynamically fetches the tools, resources, prompts, and skills available to the caller identity via `GET /api/v1/ai-gateway/capabilities`. While MCP may hide unauthorized tools from discovery, hiding a tool is never treated as a security boundary; backend application services re-verify permissions, scopes, grants, and risk policies on every tool invocation.

`soha Skills` instruct AI agents on how to operate within soha conventions, such as developer application onboarding, test release verification, SRE read-only troubleshooting, and safe change workflows. Official Skills live under `skills/` in `github.com/opensoha/soha`. Skills never grant permissions.

## Identity Model

AI Gateway models identity across three layers:

1. Personal identity
   - `soha login` acquires a local CLI/MCP token.
   - Inherits the user's roles, permission keys, teams, and scope grants.
   - Gateway personal access tokens use the `soha_pat_` opaque prefix; PostgreSQL stores only the token hash and display prefix.
2. Service identity
   - `service_accounts` and `service_account_tokens` authenticate CI pipelines, webhooks, shared runners, and automation systems.
   - Service identities require explicit roles, scope grants, expiration timestamps, and revocation paths.
   - Service account tokens use the `soha_sat_` opaque prefix and resolve to a `service_account:<id>` principal.
3. AI client identity
   - `ai_clients` records caller origins such as Cursor, Codex, Claude Code, CI agents, and enterprise agent platforms.
   - Audit records capture the user or service account, AI client, skill, and tool together.

## Authorization Model

AI Gateway enforces layered authorization controls:

1. `permissionKeys`
   - Reuses the platform role-permission model.
   - `ai.gateway.view` permits reading the Gateway manifest.
   - `ai.gateway.invoke` permits invoking authorized tools through the Gateway proxy.
   - `ai.gateway.manage` permits managing AI clients, service accounts, tool grants, skill bindings, and access policies.
2. resource scopes
   - Reuses scope grants across applications, application environments, environment tags, scope keys (compatible with `businessLineId`), clusters, and namespaces.
3. MCP tool grants
   - `mcp_tool_grants` constrains which tools a subject and AI client may invoke.
   - Tool grants can only narrow access; they never bypass `permissionKeys`.
   - When no grants are configured, capabilities follow `permissionKeys`; once an allow grant exists, it forms an allowlist, and deny grants always take precedence.
4. risk policy
   - `ai_access_policies` governs risk boundaries inside the Gateway across subjects, roles, and AI clients.
   - Deny policies always win; when allow policies are present, they form an allowlist.
   - Policies can narrow access by tool pattern, skill, risk level, and resource scope, and can mark matching tools as requiring approval.
   - Risk levels are classified into `read`, `analyze`, `mutate`, `execute`, and `high`.
   - `approval_policy.strategy` supports `allow`, `deny`, `require_approval`, `require_human_confirm`, and `dry_run_only`. When a `mutate`, `execute`, or `high` risk tool matches an approval, human-confirmation, or dry-run strategy, execution stops before entering the owning application service.
   - For `require_approval` and `require_human_confirm`, Gateway persists a durable approval request, returns `pending_approval` or `pending_human_confirm` with the request ID, and writes both Gateway audit and operation logs.
   - Once approved, `internal/application/aigateway` re-validates active grants, policies, skill bindings, and domain permissions before dispatching to the owning application service or durable task; HTTP handlers and repositories never execute domain mutations directly.
   - `approval_policy.approvalPolicyRef` is recorded solely as a Gateway policy reference; approval routing is driven directly by the inline `approval_policy` configuration on the Gateway access policy.
   - `approval_policy.slaMinutes`, `approverUsers` / `approverRoles` / `approverTeams`, `onCallRef`, `approvalMode`, `approvalStages`, `requiredApprovals` / `minApprovals`, `requiredRoleApprovals` / `requiredTeamApprovals`, and `changeWindow.startsAt/endsAt` are persisted into `relatedIds.approvalRouting` on the approval request; `onCallRef` resolves the active on-call responder through the monitoring on-call resolver, appends the active on-call `userId` to `candidateUserIds`, and records `onCallCandidateUserIds` and `onCallResolution`. Approve, reject, and cancel actions verify that the acting operator matches candidate users, roles, or teams, and approvals additionally enforce the change window. When multi-approver quorum is configured, Gateway tracks unique approver `decisions`, `approvedCount`, per-role/per-team counts, `pendingRequirements`, and `satisfiedRequirements`; default `approvalMode=all` requires unanimous satisfaction of total and group quotas before replaying the tool, whereas `approvalMode=any` replays the tool once any explicit total, role, or team quota is met. When `approvalStages` are configured, only candidates in the current stage may approve; satisfying a stage advances `currentStageIndex` and appends to `stageHistory`, replaying the tool only after the final stage completes.
   - When approval replays `delivery.actions.trigger`, Gateway injects `aiGatewayApprovalRequestId`, policy, tool, skill, and AI client linkage into delivery workflow variables; workflow run metadata and `workflow_approvals.metadata` retain these cross-domain references, and Gateway/delivery related IDs backfill `workflowRunId` to trace from a Gateway approval to a workflow manual-approval node. In the console, `/ai-gateway` and `/workflows` support bidirectional drilldown via the `approvalRequestId`, `workflowRunId`, and `gatewayApprovalRequestId` query parameters; navigating to `/workflows` with `workflowRunId` automatically expands inline run details showing Gateway linkage, manual-approval node details, the workflow node timeline, and raw trace data. The backend also exposes `GET /api/v1/ai-gateway/approval-requests/:requestID/timeline`, aggregating the approval request, decision/stage traces derived from `approvalRouting`, workflow/task links, and Gateway audit events for the request into a read-only troubleshooting view.
5. skill bindings
   - `ai_gateway_skill_bindings` controls which soha Skills subjects, roles, and AI clients may use, along with the capability refs each skill is permitted to reference.
   - Skill bindings can only narrow manifest visibility and tool invocation; they never grant new permissions.

## LLM Relay Boundary

The LLM relay is part of AI Gateway, not AI Workbench. AI Workbench remains the internal investigation and chat surface; relay owns external OpenAI/Anthropic-compatible traffic, upstream accounts, model routes, model-call logs, runtime metrics, cache statistics, and relay-specific policy checks. Existing AI provider settings may be used as an import source, but relay runtime state should live under AI Gateway upstream and model-route objects.

Current repository state on 2026-06-25: relay permission constants, token metadata shape, domain models, repository interface, runtime config defaults, HTTP handlers, and route registration are present in `soha` for the P0 relay surface. OpenAPI marks each operation with `x-soha-implementation-status` so SDK and docs consumers can distinguish implemented routes from planned cache and embeddings follow-up work.

Relay management APIs keep the normal OpenSoha response style:

```http
GET  /api/v1/ai-gateway/relay/upstreams
POST /api/v1/ai-gateway/relay/upstreams
PUT  /api/v1/ai-gateway/relay/upstreams/:upstreamID
POST /api/v1/ai-gateway/relay/upstreams/:upstreamID/test

GET    /api/v1/ai-gateway/relay/model-routes
POST   /api/v1/ai-gateway/relay/model-routes
PUT    /api/v1/ai-gateway/relay/model-routes/:routeID
DELETE /api/v1/ai-gateway/relay/model-routes/:routeID

GET  /api/v1/ai-gateway/relay/model-calls
GET  /api/v1/ai-gateway/relay/metrics
GET  /api/v1/ai-gateway/relay/cache/stats
POST /api/v1/ai-gateway/relay/cache/purge
```

Native SDK-compatible endpoints intentionally do not use the OpenSoha `data` envelope. Unknown request and response fields are preserved whenever possible:

```http
GET  /api/v1/ai-gateway/llm/openai/v1/models
POST /api/v1/ai-gateway/llm/openai/v1/chat/completions
POST /api/v1/ai-gateway/llm/openai/v1/responses
POST /api/v1/ai-gateway/llm/openai/v1/embeddings

GET  /api/v1/ai-gateway/llm/anthropic/v1/models
POST /api/v1/ai-gateway/llm/anthropic/v1/messages
```

Relay invocation uses existing opaque `soha_pat_` and `soha_sat_` credentials. The target permission keys are `ai.gateway.relay.view`, `ai.gateway.relay.invoke`, and `ai.gateway.relay.manage`; transition builds may map management to `ai.gateway.manage`, but model invocation must still require explicit relay enablement in token metadata. A token intended for relay should carry `metadata.purpose=llm-relay` or `metadata.scopes` containing `relay`, plus optional `allowedModels`, `allowedProviderKinds`, `allowedUpstreamIds`, `allowedIPCIDRs`, and `rateLimitProfileId`. Token metadata can narrow access, never expand role-derived permission keys.

Security requirements for relay:

- Upstream provider keys are accepted only through write APIs, encrypted at rest, and represented in reads by `apiKeyPrefix` only.
- PAT/SAT values are returned once, stored only as hashes plus display prefixes, and must never appear in logs, audit records, model-call metadata, errors, or frontend state.
- OpenAI-style clients use `Authorization: Bearer soha_pat_...`; Anthropic-style clients may use `x-api-key: soha_pat_...`. Both resolve through the same Gateway principal parser and permission context.
- Relay logs record model, upstream, endpoint, status, latency, token usage, cache-token counts, source, and redacted metadata. Prompt bodies, full request headers, upstream keys, Authorization headers, and raw provider payloads are not stored.
- Upstream base URLs should reject insecure or private-network targets by default unless a deployment explicitly enables a development allowlist.
- Operators must only configure upstream accounts they are authorized to use under the upstream provider terms and internal data-handling policy. Account pooling is only for legitimate provider accounts and must not be used to bypass provider restrictions.
- Cache entries must not contain credentials or sensitive headers, and response cache remains opt-in by route, token, or header.

## Current API

```http
GET /api/v1/ai-gateway/capabilities
POST /api/v1/ai-gateway/tools/:toolName/invoke
POST /api/v1/ai-gateway/resources/read
POST /api/v1/ai-gateway/prompts/get
GET /api/v1/ai-gateway/governance/status
```

`capabilities` returns the capability manifest visible to the current identity. `tools/:toolName/invoke` serves as the unified tool invocation entry point for MCP, the CLI, and external AI agents. Every call re-validates `ai.gateway.invoke`, the tool's own domain permissions, resource scopes, AI grants, and risk policies before routing into the owning application service.

The Gateway manifest is generated by the capability registry and providers in `internal/application/aigateway`. By default, `delivery`, `k8s`, and `diagnosis` capabilities register as static providers; manifest filtering on live requests, tool/resource/prompt/skill lookups, resource-to-tool/prompt/skill associations, optional provider tool invokers, grant and binding resolution, access-policy skill matching, high-risk governance scans, and related metadata on resource documents all read from the same registry. Future module capabilities register as providers, and custom tool execution routes back to the owning application service through provider invokers while reusing the standard Gateway authentication, risk policy, redaction, and audit pipeline rather than duplicating static catalogs in handlers, repositories, or the local MCP process.

`resources/read` reads `soha://...` resource documents from the manifest, returning JSON resource descriptions, associated tools/prompts/skills, required scopes, and Gateway-redacted request context. `prompts/get` returns soha prompt template messages and can combine `X-Soha-Skill-ID` or request `skillId` with the supplied arguments and context to render prompts. Skill bindings constrain tools, resources, and prompts together: resource and prompt visibility depends on whether their associated tools fall within bound capability refs, reads re-verify those bindings, and returned resource documents and prompt skill contexts expose bound capabilities only. MCP `initialize` returns stable `instructions` declaring that the local MCP process is purely a Gateway proxy without direct access to PostgreSQL, Kubernetes, runner workspaces, kubeconfigs, Docker, or privileged prompt/resource payloads. MCP `tools/list` emits manifest `inputSchema` plus `outputSchema` when an output contract is declared; `resources/list` exposes resource `contextSchema`, and `prompts/list` exposes prompt `argumentSchema`, `contextSchema`, and MCP `arguments[]` summaries alongside standard `annotations` (`read` tools are marked read-only/idempotent, `mutate` / `execute` / `high` tools are marked destructive, and soha tools default to `openWorldHint=true`). `tools/list`, `resources/list`, and `prompts/list` also surface manifest `permissionKeys` and `requiredScopes` under `_meta.soha`, while tool metadata additionally exposes `domain`, `action`, `mcpAdapterId`, `mcpToolName`, `riskLevel`, and `requiresApproval`. These metadata fields help clients preview expected permissions, scopes, adapter mappings, input/output contracts, and risk levels before invocation, while actual tool calls, resource reads, and prompt reads are still enforced and audited by the backend application layer; empty `tools/call.name`, `resources/read.uri/name`, or `prompts/get.name` values fail immediately with a JSON-RPC invalid-params error without sending invalid backend requests.

`governance/status` is the read-only operational posture endpoint for AI Gateway and requires `ai.gateway.manage`. Drawing from tokens, AI clients, access policies, tool grants, skill bindings, Gateway audit logs, and pending approval requests, it aggregates health checks, recent call metrics, anomalous invocation signals, token expiration and unused-token reminders, `last-used` tracking state, AI client registration approval state, pending approval SLAs, and configuration coverage for budgets, rate limits, redaction policies, and resource scopes. Coverage reports both `total` and `active` counts: `budgetState`, `rateLimitState`, `redactionPolicyState`, and `resourceScopeState` count only enabled access policies, non-expired tool grants, and enabled skill bindings; `redactionPolicyState` counts input `redactionPolicy`, `sensitiveDataRedaction`, output `outputRedactionPolicy`, and response/output redaction aliases as active coverage, while disabled or expired records never mark a control `configured`. When no active access policy or tool grant defines concrete `resourceScopes`, the `resource_scope_coverage` health check degrades with a recommendation to scope cross-environment Gateway access. Using the live capability registry, it also detects active allow access policies and non-expired allow tool grants that permit high-risk tools without `require_approval`, `require_human_confirm`, or `dry_run_only` guardrails, surfacing warning findings, a degraded `high_risk_guardrails` health check, and remediation guidance; high-risk allows lacking concrete `resourceScopes` similarly surface `high_risk_allow_without_resource_scope` / `high_risk_grant_without_resource_scope` findings and degrade `high_risk_resource_scopes`. Pending approvals summarize `dueSoon`, `stalePending`, `oldestPendingHours`, and `nextDueAt`, surfacing queue pressure through `approval_sla_due_soon`, `stale_gateway_approvals`, or `overdue_gateway_approvals` findings. AI clients in `pending` / `pending_approval` state create durable `ai_gateway_approval_requests` rows that transition to `active` on approval, `rejected` on rejection, or `disabled` on cancellation. The endpoint returns redacted summaries, request IDs, and token prefixes only—never token hashes, plaintext tokens, raw tool inputs, or raw log bodies.

The Governance tab under `/ai-gateway` in the console consumes this endpoint directly, supporting 1h, 6h, 24h, 48h, and 7d windows across health checks, recent calls, token/client/approval summaries, policy coverage, top tools / AI clients / actors, anomaly findings, and recommendations.

Currently invokable tools cover application delivery, delivery context analysis, and read-only Kubernetes diagnostics:

- `delivery.applications.list`
- `delivery.applications.detail`
- `delivery.applications.create`
- `delivery.application_environments.list`
- `delivery.application_services.list`
- `delivery.build_sources.list`
- `delivery.release_targets.list`
- `delivery.actions.trigger`
- `delivery.release_bundles.list`
- `delivery.execution_tasks.list`
- `delivery.execution_logs.list`
- `delivery.workflow_templates.list`
- `delivery.release_context.diff`
- `delivery.rollback.context`
- `k8s.pods.list`
- `k8s.pods.logs`
- `k8s.pods.describe`
- `k8s.deployments.list`
- `k8s.deployments.rollout_status`
- `k8s.deployments.events`
- `k8s.services.list`
- `k8s.services.backends`
- `k8s.routes.context`
- `k8s.storage.context`
- `k8s.nodes.detail`
- `k8s.events.list`
- `diagnosis.release_failure.analyze`

Kubernetes tools read aggregated platform views through `internal/application/resource`, honoring direct/agent cluster capability boundaries, cluster/namespace scopes, and resource permissions. The release-failure diagnosis tool correlates delivery executions, release bundles, Pods, Deployments, Services, Events, and log context; log-like outputs undergo baseline sensitive-field redaction at the Gateway layer before normalizing results into a Copilot/Agent Runtime `AnalysisArtifact`.

Enhanced Kubernetes diagnostic tools return soha platform view models only—never raw Kubernetes API objects. Pod describe aggregates containers, conditions, volumes, and related resources; Deployment tools read rollout status and bounded event context; Service tools aggregate selectors, backend pods, and ingress hints; Route context aggregates Ingress and Gateway API typed route views, returning `capabilityWarnings` when optional Gateway API CRDs are unavailable; Storage context aggregates PVCs, PVs, StorageClasses, and unbound PVCs; and Node detail returns conditions, taints, resource summaries, and scheduled pods.

Delivery tools read or trigger capabilities strictly through their owning application services: application and service/container metadata comes from the application/delivery service, workflow templates come from the catalog service, and release bundles, execution tasks, and execution logs come from the delivery service. `delivery.release_context.diff` and `delivery.rollback.context` generate candidate release, promotion, and rollback context without executing a rollback; actual build, deploy, and rollback mutations must go through `delivery.actions.trigger` under risk policy, approval, and execution/workflow-plane controls. Invoking `action=rollback` enters delivery workflow rollback mode, executing only `rollback_to_previous` DAG nodes in the bound workflow template while recording `releaseBundleId` in workflow variables and run metadata.

Artifact persistence for `diagnosis.release_failure.analyze` runs through the Copilot application service and writes into `ai_agent_runs.analysis_artifacts`. Gateway only collects, redacts, and summarizes evidence before calling the application service; persisted artifacts store linked IDs (application, environment, release bundle, execution task, cluster, namespace, workload, pod) along with evidence summaries, hypotheses, recommendations, next checks, tool executions, and data-source snapshots—never raw log bodies, secrets, kubeconfigs, or environment variables. When deep reasoning from an external provider is requested via `agentProviderId` / `providerId` or `deepAnalysis` / `externalAnalysis`, Gateway hands the same redacted context to the Copilot application service to create a `queued` AgentRun and returns `agentRunId`, the provider, and the `agent_runtime_claim_callback` runtime marker; Agent Runtime runners asynchronously claim and callback with artifacts rather than Gateway blocking synchronously on external providers. Incremental Agent Runtime callbacks merge artifacts by the stable key `runId + kind + title`, preserving existing ordering while replacing same-key entries so subsequent callbacks do not clobber earlier outputs. When a provider command fails or times out, the Agent Runtime runner proactively submits a synthesized artifact on the `failed` / `callback_timeout` callback—retaining run, provider, capability, scope, tool execution, error status, and troubleshooting hints after redacting error messages, logs, tool outputs, and artifact snapshots—so the control plane does not rely solely on server-side fallback synthesis. The Copilot application service populates stable links (`sessionId`, `rootCauseRunId`, `inspectionRunId`, `agentRunId` / `agentRuntimeId`) in data-source snapshots across root-cause, performance, trace, inspection-review, and Agent Runtime artifacts; AI Workbench artifact history renders these as navigation links to sessions, root-cause runs, inspection runs (`/ai-workbench/inspection?view=runs&inspectionRunId=...`), and Agent Runs. When external Agent Runtime callback payloads carry `usage`, `tokenUsage`, `aiUsage`, `providerUsage`, `llmUsage`, `metering`, `billing`, or `costUsage`, the Copilot application service normalizes numeric token and cost summaries into `providerUsage` / `usage` on both the agent run output and artifact data-source snapshot—recognizing Gemini/Vertex `usageMetadata.promptTokenCount/candidatesTokenCount/totalTokenCount`, Ollama `prompt_eval_count/eval_count`, Anthropic cache input token fields, Cohere `billed_units`-first semantics, search/classification/embedding/rerank/request/response usage units, Brave Search / SerpAPI query and search credits, Browserbase session/minute/page-load units, Exa/Jina/Unstructured/LlamaCloud document pages/parsed pages/characters/chunks, Helicone request metering aliases, generic `promptCost` / `inputCost` / `completionCost` / `outputCost`, and common cost fields, while excluding raw provider payloads, model strings, and non-numeric fields.

Credential management endpoints:

```http
GET  /api/v1/ai-gateway/personal-access-tokens
POST /api/v1/ai-gateway/personal-access-tokens
POST /api/v1/ai-gateway/personal-access-tokens/:tokenID/revoke
POST /api/v1/ai-gateway/personal-access-tokens/:tokenID/rotate
GET  /api/v1/ai-gateway/service-accounts
POST /api/v1/ai-gateway/service-accounts
POST /api/v1/ai-gateway/service-accounts/:serviceAccountID/tokens
POST /api/v1/ai-gateway/service-account-tokens/:tokenID/revoke
POST /api/v1/ai-gateway/service-account-tokens/:tokenID/rotate
```

PATs and SATs store only hashes and display prefixes; creation and rotation return plaintext token values once. Revocation and expiration take effect in the identity token resolution layer. Rotation copies the previous token's scopes, `permissionKeys`, and metadata, re-validates `permissionKeys` against the user's or service account's current roles, issues a replacement token, and revokes the old token. An optional `expiresAt` in the request body overrides the new expiration timestamp; when omitted, a future expiration on the old token is preserved, or a 90-day window is assigned if the old token had already expired.

AI client and tool authorization management endpoints:

```http
GET    /api/v1/ai-gateway/ai-clients
POST   /api/v1/ai-gateway/ai-clients
PUT    /api/v1/ai-gateway/ai-clients/:clientID
GET    /api/v1/ai-gateway/tool-grants
POST   /api/v1/ai-gateway/tool-grants
DELETE /api/v1/ai-gateway/tool-grants/:grantID
GET    /api/v1/ai-gateway/access-policies
POST   /api/v1/ai-gateway/access-policies
PUT    /api/v1/ai-gateway/access-policies/:policyID
DELETE /api/v1/ai-gateway/access-policies/:policyID
GET    /api/v1/ai-gateway/skill-bindings
POST   /api/v1/ai-gateway/skill-bindings
PUT    /api/v1/ai-gateway/skill-bindings/:bindingID
DELETE /api/v1/ai-gateway/skill-bindings/:bindingID
GET    /api/v1/ai-gateway/audit-logs
GET    /api/v1/ai-gateway/governance/status
GET    /api/v1/ai-gateway/approval-requests
GET    /api/v1/ai-gateway/approval-requests/:requestID/timeline
POST   /api/v1/ai-gateway/approval-requests/:requestID/approve
POST   /api/v1/ai-gateway/approval-requests/:requestID/reject
POST   /api/v1/ai-gateway/approval-requests/:requestID/cancel
```

`tool-grants` supports `user`, `service_account`, `role`, and `ai_client` subjects. At runtime, grants across the caller principal, roles, and AI client merge together: deny takes precedence, and any allow grant establishes an allowlist.

`access-policies` and `skill-bindings` likewise support `user`, `service_account`, `role`, and `ai_client` subjects. At runtime, Gateway merges enabled records across the caller principal, roles, and AI client: access policies narrow tools and skills via deny/allow evaluation first, and skill bindings further narrow manifest visibility and invocation to bound skill and capability refs. Because all of these checks run after `permissionKeys`, they never expand underlying RBAC or scope grants.

Tool invocation extracts standard resource scopes from input arguments—including compatibility scope `businessLineId`, application and delivery identifiers `applicationId`, `applicationEnvironmentId`, and `environmentId`, and runtime identifiers `clusterId`, `namespace`, `releaseBundleId`, and `executionTaskId`. In the current model, `businessLineId` and global `environmentId` remain primarily for historical scope compatibility, while active control-plane flows prefer application groups, application-environment bindings, and environment tags. Both `mcp_tool_grants.resource_scopes` and `ai_access_policies.resource_scopes` are enforced prior to invocation; although the manifest may conservatively list potential capabilities, actual execution must pass both scoped grant/policy checks and the owning domain service's authorization checks.

Risk policies for high-risk tools run before entering domain services. Strategy `deny` rejects immediately; `require_approval` returns `pending_approval` and `approvalRequestId`; `require_human_confirm` returns `pending_human_confirm` and `confirmationRequestId`; and `dry_run_only` returns `dry_run` and `dryRunId` without mutating state. Strategy `allow` explicitly permits a matched risk scope to proceed into the owning application service, where domain permissions, scopes, and durable task boundaries still apply. Policies requiring durable approval can configure `slaMinutes`, candidate users, candidate roles, candidate teams, `onCallRef`, change windows, `approvalMode=all|any`, `approvalStages`, `requiredApprovals` / `minApprovals` headcount quorums, and `requiredRoleApprovals` / `requiredTeamApprovals` group quotas; Gateway persists this routing as redacted metadata and blocks non-candidate operators or out-of-window approvals at decision time. When `onCallRef` is configured, Gateway resolves `currentParticipant` through the monitoring on-call resolver, appends that `userId` to approval candidates, and records schedule, rotation, route, window, or unresolved status metadata. Multi-approver quorum counts distinct `userId` decisions only—repeated approvals by the same user update their existing decision without advancing quorum; `all` mode requires total, role, and team quotas to be satisfied together, whereas `any` mode transitions to approved/executed replay once any explicit quota is met. Staged approvals treat each stage's candidates, role/team quotas, approval mode, `onCallRef`, and change window as the active routing, keeping the request `pending` as stages advance until the final stage completes.

`ai_access_policies.conditions` are enforced prior to invocation. `rateLimit.maxCallsPerMinute`, `rateLimit.maxCallsPerHour`, and generic `rateLimit.maxCalls + windowSeconds/windowMinutes/windowHours` default to atomic PostgreSQL upserts against standalone fixed-window counters in `ai_gateway_rate_limit_counters`; setting `rateLimit.mode` / `algorithm` / `strategy` to `sliding_window`, `rolling_window`, or `audit_window` evaluates a true rolling window over Gateway audit records, while `gcra`, `token_bucket`, `leaky_bucket`, or `strict` switches to GCRA/TAT semantics where `burst` / `burstSize` / `capacity` controls burst tolerance and rejected calls return `retry-after` without advancing future emission time. PostgreSQL tables `ai_gateway_rate_limit_counters` / `ai_gateway_rate_limit_states` serve as the default backend; when `ai_gateway.rate_limit.backend=redis` and `ai_gateway.rate_limit.redis.addr` are configured, Gateway prefers atomic Redis `INCR`/`EXPIRE` operations and Lua GCRA scripts for high-throughput shared rate limiting, falling back to PostgreSQL if Redis is unreachable and to recent Gateway audit counts if legacy schemas lack the rate-limit tables. Call budgets (`budget.maxCallsPerHour`, `budget.maxCallsPerDay`, `budget.maxCallsPerMonth`, and generic `budget.maxBudgetCalls + window...`) account against `success`, `failure`, and `dry_run` entries in Gateway audit logs; `budget.maxTokens*` / `maxBudgetTokens` sum `usage`, `tokenUsage`, or `providerUsage` token counts in audit metadata, and `budget.maxCost*` / `maxBudgetCost` sum corresponding cost fields. After successful tool invocations or approval replays, Gateway extracts numeric token and cost summaries from `usage`, `tokenUsage`, `aiUsage`, `providerUsage`, `llmUsage`, `metering`, `billing`, and `costUsage` containers in owning-service outputs or related IDs—recognizing Gemini/Vertex `usageMetadata.promptTokenCount/candidatesTokenCount/totalTokenCount`, cached content, tool-use prompt, and thoughts token fields, Ollama `prompt_eval_count/eval_count`, Anthropic cache input token fields, OpenAI cached/audio/reasoning/prediction token details, Bedrock text/image/audio token fields, Cohere billed units (preferring `billed_units` over `tokens` when both appear in the same container to avoid double counting), search/classification/embedding/rerank/request/response usage units, Brave Search / SerpAPI query and search credits, Browserbase session/minute/page-load units, Exa/Jina/Unstructured/LlamaCloud document pages/parsed pages/characters/chunks, Helicone request metering aliases, billable/billed/usage token aliases, multimodal text/image/audio/video input and output aliases, cache read/write/hit/miss input token variants, common DashScope, Moonshot, Zhipu, and Qianfan `*_tokens_count` / `*_token_usage` variants, generic `promptCost` / `inputCost` / `completionCost` / `outputCost`, and standard `cost` / `costMicros` / `costCents` fields—writing numeric `total/input/output tokens` and `total/input/output cost` summaries back to `providerUsage` and `usage` in audit metadata without storing raw provider payloads or model strings, and never fabricating consumption when usage metadata is absent. `redactionPolicy.mode=strict|deny_sensitive|block_sensitive` or `denySensitiveInput=true` rejects inputs containing sensitive keys or token/password/secret-like values, while `redactionPolicy.mode=sanitize|mask|redact` or `sanitizeInput=true` rewrites sensitive keys and values to `[REDACTED]` before calling the owning service. Redaction policies also support `fields` / `redactFields` path selectors, `allowFields` exceptions, custom `replacement` strings, `preserveFormat` suffix-preserving masks, `valuePatterns` regex matchers, `secretTypes` structured secret classifiers, and `rules[]` per-`toolPatterns` field rules. Built-in `secretTypes` cover GitHub, GitLab, OpenAI, Anthropic, Google API keys, Hugging Face, Cohere, Mistral, DeepSeek, Groq, Together AI, Replicate, LangSmith, Pinecone, xAI, Perplexity, Tavily, Langfuse, Qdrant, Weights & Biases, Linear, OpenRouter, Fireworks AI, Voyage AI, Brave Search, SerpAPI, Browserbase, Exa, Jina AI, Unstructured, LlamaCloud, Helicone, DashScope, Moonshot, Zhipu AI, SiliconFlow, Tencent Hunyuan, Baidu Qianfan, Volcano Engine Ark, Grafana, Sentry, New Relic, Azure OpenAI, Azure DevOps PATs, Datadog, PagerDuty, PostHog, Splunk, Elastic, Terraform Cloud, npm, Stripe, Slack, JWTs, AWS access keys, PEM private keys, Kubernetes Secrets, kubeconfigs, Docker configs, GCP service-account JSON, and AWS credential structures. By default, redaction rules apply to tool inputs; configure `outputRedactionPolicy` or `target=output|both` on rules to redact outputs returned by owning services before Gateway responses and approval execution results are persisted. Field, regex, classifier, and structured-secret matches write a `redaction` summary into Gateway audit metadata containing target, field path, match kind, classifier name, and hit count only—never raw secret values. Policy conditions count per `actor+AI client+tool` by default and can be scoped via `scope` / `limitScope` to `actor`, `client`, `actor_client`, `client_tool`, or `global`; every blocked invocation writes a deny audit entry whose error summary omits raw sensitive inputs.

`GET /api/v1/ai-gateway/approval-requests` filters by ID, status, actor, AI client, skill, tool, risk level, strategy, and time range, attaching backend-derived `approvalTrace` summaries from `relatedIds.approvalRouting`. Approve, reject, and cancel endpoints accept only the request ID and a comment. Approving a tool-invocation request records the approver's vote first; if stage or global `approvalRouting.requiredApprovals`, `requiredRoleApprovals`, or `requiredTeamApprovals` remain unsatisfied under `approvalMode`, the request stays `pending` with updated `pendingRequirements` and `satisfiedRequirements`. Under `approvalStages`, completing a stage appends to `stageHistory` and advances to the next stage; once the final stage (or a single-stage quorum) is satisfied, the request transitions from `pending` to `approved` and re-enters Gateway tool dispatch under the original actor, ending in `executed` on success or `failed` on error. `GET /api/v1/ai-gateway/approval-requests/:requestID/timeline` returns the request, trace, decision/stage nodes, and matching Gateway audit events, while `GET /api/v1/ai-gateway/audit-logs` also supports `approvalRequestId` filtering. When replay triggers a delivery workflow, the Gateway approval ID propagates into workflow run metadata and subsequent workflow `manual_approval` approve/reject actions record the same link in `workflow_approvals.metadata`. AI client registration approvals share the same table without replaying tools—approval simply activates the client. Rejections, cancellations, and expirations transition to `rejected`, `canceled`, and `timeout`, with every state change recorded in both audit and operation logs.

`GET /api/v1/ai-gateway/audit-logs` serves Gateway operations views with filtering by actor, AI client, skill, tool, approval request, risk level, result, and time window. Returned DTOs expose dedicated redacted audit columns only—never raw tool inputs, tokens, kubeconfigs, environment variables, or raw log bodies.

`GET /api/v1/ai-gateway/governance/status?windowHours=24` serves Gateway administrators, summarizing the past 24 hours of audit activity by default (up to 168 hours). It turns `last_used_at` timestamps maintained on authentication paths into stale or never-used token reminders, flags unrevoked expired or expiring-soon PATs and SATs as governance findings, and identifies actors, AI clients, and tools with repeated denies or failures in the recent window. Scanning pending approval requests flags requests due within 1 hour as `approval_sla_due_soon`, requests pending over 24 hours as `stale_gateway_approvals`, and anomalously unclosed expired requests as `overdue_gateway_approvals`, exposing `pending`, `dueSoon`, `stalePending`, `overdue`, `oldestPendingHours`, and `nextDueAt` on the `approvals` DTO. Scanning active allow access policies and non-expired allow tool grants degrades `high_risk_guardrails` with remediation advice whenever `mutate`, `execute`, or `high` risk tools in the capability registry lack approval, human-confirmation, or dry-run protection, and degrades `high_risk_resource_scopes` whenever high-risk allows omit concrete `resourceScopes` or use wildcard `*` only—recording the policy/grant, subject, AI client, and peak risk level in findings. Coverage for budgets, rate limits, input/output redaction policies, and resource scopes counts active controls only: disabled access policies, expired tool grants, and disabled skill bindings remain in total inventory counts without incrementing active counts or marking controls `configured`; `redactionPolicyState` counts both input redaction conditions and `outputRedactionPolicy` / response redaction aliases as configured; and zero active `resourceScopes` coverage degrades `resource_scope_coverage` with a general recommendation. Configured controls enforce call budgets, token/cost budgets, standalone fixed-window counters, GCRA/token-bucket rate limits, optional high-throughput Redis rate limits, strict/sanitize input redaction, field-level redaction, regex/classifier redaction, output redaction, resource-scope matching, and redaction hit summaries prior to invocation, while unconfigured controls surface as recommendations.

In the console, the access-policy drawer under `/ai-gateway` provides structured editing for common approval routing and `conditions`: `approvalPolicyRef`, candidate users/roles/teams, `onCallRef`, `approvalMode=all|any`, `requiredApprovals`, change windows, fixed-window / sliding-window / GCRA token-bucket `rateLimit`, daily call/token/cost `budget`, input `redactionPolicy`, and `outputRedactionPolicy` field lists. Multi-stage `approvalStages` and per-tool redaction `rules[]` remain configurable via the API or JSON cookbook payloads.

Recommended request headers:

- `Authorization: Bearer <token>`
- `X-Soha-AI-Client-ID`
- `X-Soha-AI-Client`
- `X-Soha-Skill-ID`
- `X-Soha-Source`

Capabilities response fields for the caller identity:

- `tools`
- `resources`
- `prompts`
- `skills`
- `permissionKeys`
- caller context
- manifest summary

The current manifest baseline covers application delivery and read-only Kubernetes diagnostics:

- Application listing and creation
- Application-environment binding queries
- `build` / `deploy` / `build_deploy` / `workflow` / `verify` / `rollback` trigger entry points
- Release bundle and execution task queries
- Read-only diagnostics across Pods, Deployments, Services, Ingress/Gateway routes, Storage, Nodes, Events, and logs
- Release-failure diagnostic context generation

## Data Objects

AI Gateway introduces the following control-plane tables through incremental migrations `0015_ai_gateway.sql`, `0016_ai_gateway_approval_requests.sql`, `0017_ai_gateway_rate_limit_counters.sql`, and `0018_ai_gateway_rate_limit_states.sql`, while `0019_workflow_approval_metadata.sql` adds cross-domain Gateway linkage metadata to workflow manual-approval records:

- `personal_access_tokens`
- `service_accounts`
- `service_account_tokens`
- `ai_clients`
- `ai_access_policies`
- `mcp_tool_grants`
- `ai_gateway_skill_bindings`
- `ai_gateway_audit_logs`
- `ai_gateway_approval_requests`
- `ai_gateway_rate_limit_counters`
- `ai_gateway_rate_limit_states`

These tables back enterprise-grade access control for the CLI, MCP clients, service accounts, and AI clients. The Redis rate-limit backend acts strictly as a high-throughput runtime limiter—it neither replaces audit or approval tables nor persists tool inputs. Existing AI Workbench `ai_agent_runs`, tool bindings, skill bindings, and analysis artifacts remain owned by Copilot/Agent Runtime.

Every Gateway tool invocation writes to both the platform-wide audit log and the dedicated `ai_gateway_audit_logs` table. The dedicated table records actor type and ID, AI client, skill, tool, risk level, resource scope, request/result status, and redacted correlation metadata, while omitting tokens, kubeconfigs, environment variables, raw log bodies, and unredacted tool inputs. Approval requests persist redacted tool inputs to support post-approval replay; future tools carrying sensitive payloads must pass durable domain-task references rather than storing secrets inside Gateway approval requests.

## Engineering Rules

- Gateway HTTP handlers parse requests and return DTOs only.
- `internal/application/aigateway` owns manifest assembly, authorization, auditing, and tool invocation orchestration.
- Real domain operations always route into their owning application service.
- Long-running build, release, Docker, and virtualization tasks reuse durable execution/operation/task models.
- AI analyses reuse Copilot/Agent Runtime `AgentRun` and `AnalysisArtifact` models.
- Tokens, secrets, kubeconfigs, and environment variables must never be written into logs, audit metadata, or AI artifacts.
