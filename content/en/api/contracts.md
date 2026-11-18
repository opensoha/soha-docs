# API and Contracts

Root `soha/contracts` is the shared source of truth for cross-repository contracts. Any change that affects public behavior, wire shapes, the Agent protocol, MCP manifests, Skill manifests, Plugin manifests, event envelopes, or authentication claims must land in contracts first before updating consumer repositories.

The current docs CI pins a specific Root `soha` commit and reads `../soha/contracts`. This page maintains contract version details and key highlights; complete operation and JSON Schema coverage is validated through the generated [API reference](./reference/generated/index.md). When the sibling repository is missing, `npm test` fails and prompts you to check out Root `soha` first.

## Current Contract Version

- OpenAPI title: `Soha API`
- OpenAPI version: `0.2.0`
- Source artifact: `openapi/soha-api.yaml`
- Generated artifact: `openapi/soha-api.json`
- Go artifact package: `github.com/opensoha/soha/contracts/openapi`
- npm package: `@opensoha/contracts`

This page and the generated index use the published SDK tag `contracts/v0.2.0`, pinned to its exact Root source commit in docs CI. Install `@opensoha/contracts@0.2.0` from npm or `github.com/opensoha/soha/contracts@v0.2.0` from the official Go proxy. Legacy source and original release files are preserved in the Root unpublished archive; old repository URLs and import paths may stop resolving after legacy repository deletion.

## Contract Directory Layout

Representative public artifacts (refer to the generated [API reference](./reference/generated/index.md) and `soha/contracts/package.json` for the complete list):

```text
soha/contracts/
  openapi/
    soha-api.yaml
    soha-api.json
    spec_generated.go
  capabilities/
    cluster-capability-matrix.schema.json
  profiles/
    agent-profile.schema.json
  presets/
    mcp-preset.schema.json
  governance/
    approval-request.schema.json
    audit-log.schema.json
  agent/
    agent-protocol.schema.json
  runner/
    operation-lifecycle.schema.json
  mcp/
    gateway-capability-baseline.schema.json
    gateway-manifest.schema.json
  skills/
    skill-manifest.schema.json
  plugins/
    marketplace-catalog.schema.json
    plugin-manifest.schema.json
  events/
    event-envelope.schema.json
  auth/
    token-claims.schema.json
  connectors/
    connector-event-envelope.schema.json
```

The foundational npm exports include:

- `openapi/soha-api.yaml`
- `openapi/soha-api.json`
- `capabilities/cluster-capability-matrix.schema.json`
- `profiles/agent-profile.schema.json`
- `presets/mcp-preset.schema.json`
- `governance/approval-request.schema.json`
- `governance/audit-log.schema.json`
- `agent/agent-protocol.schema.json`
- `runner/operation-lifecycle.schema.json`
- `mcp/gateway-capability-baseline.schema.json`
- `mcp/gateway-manifest.schema.json`
- `skills/skill-manifest.schema.json`
- `plugins/marketplace-catalog.schema.json`
- `plugins/plugin-manifest.schema.json`
- `events/event-envelope.schema.json`
- `auth/token-claims.schema.json`
- `connectors/connector-event-envelope.schema.json`

## JSON Schema Artifact Highlights

### Cluster Capability Matrix

- File: `capabilities/cluster-capability-matrix.schema.json`
- Title: `OpenSoha Cluster Capability Matrix`
- `$id`: `https://contracts.opensoha.dev/capabilities/cluster-capability-matrix.schema.json`
- Required fields: `items`
- Scope: Direct/Agent runtime capability parity, degraded support states, risk levels, approval expectations, and required scopes consumed by Core, Web, CLI, Agent, Skills, Connectors, and external extension points.

### Agent Profile

- File: `profiles/agent-profile.schema.json`
- Title: `OpenSoha Agent Profile`
- `$id`: `https://contracts.opensoha.dev/profiles/agent-profile.schema.json`
- Required fields: `schemaVersion`, `id`, `name`, `version`, `description`, `mode`, `providerKind`, `skillRefs`, `mcpPresetRefs`, `capabilityRefs`, `platformCapabilityRefs`, `requiredScopes`, `enabledToolRefs`, `guardrails`
- Scope: agent runtime profile assets that bind skills, MCP presets, capabilities, scopes, tool refs, budgets, and guardrails.

### MCP Preset

- File: `presets/mcp-preset.schema.json`
- Title: `OpenSoha MCP Preset`
- `$id`: `https://contracts.opensoha.dev/presets/mcp-preset.schema.json`
- Required fields: `schemaVersion`, `id`, `name`, `version`, `description`, `riskLevel`, `skillRefs`, `platformCapabilityRefs`, `requiredScopes`, `tools`, `guardrails`
- Scope: MCP preset assets that package Gateway tools, resources, prompts, scopes, capabilities, risk level, and guardrails.

### Governance Approval Request

- File: `governance/approval-request.schema.json`
- Title: `OpenSoha Approval Request`
- `$id`: `https://contracts.opensoha.dev/governance/approval-request.schema.json`
- Required fields: `id`, `status`, `strategy`, `actorType`, `actorId`, `toolName`, `riskLevel`, `requiresApproval`, `summary`, `createdAt`, `updatedAt`
- Scope: high-risk operation approval requests, approval traces, decisions, stages, and timeline events shared by Gateway, platform, CLI, Web, and external extension points.

### Governance Audit Log

- File: `governance/audit-log.schema.json`
- Title: `OpenSoha Audit Log`
- `$id`: `https://contracts.opensoha.dev/governance/audit-log.schema.json`
- Required fields: `id`, `actorType`, `actorId`, `action`, `result`, `summary`, `createdAt`
- Scope: normalized audit log records for Gateway, platform, connector, plugin, skill, and external extension point actions.

### Agent Protocol

- File: `agent/agent-protocol.schema.json`
- Title: `Soha Agent Protocol`
- `$id`: `https://contracts.opensoha.dev/agent/agent-protocol.schema.json`
- Scope: runner-facing claim, callback, Docker operation, Agent Runtime callback, and Agent Runtime tool-call payloads.

### Runner Operation Lifecycle

- File: `runner/operation-lifecycle.schema.json`
- Title: `OpenSoha Runner Operation Lifecycle`
- `$id`: `https://contracts.opensoha.dev/runner/operation-lifecycle.schema.json`
- Required fields: `operationId`, `operationKind`, `runnerId`, `state`, `occurredAt`
- Scope: long-running operation lifecycle breadcrumbs across delivery, Docker, VM, AI provider, agent run, and connector action runners.

### AI Gateway Manifest

- File: `mcp/gateway-manifest.schema.json`
- Title: `Soha AI Gateway Manifest`
- `$id`: `https://contracts.opensoha.dev/mcp/gateway-manifest.schema.json`
- Required fields: `name`, `version`, `generatedAt`, `principal`, `caller`, `permissionKeys`, `tools`, `summary`
- Scope: permission-filtered tools, resources, prompts, skills, caller context, and manifest summary consumed by CLI, MCP clients, AI agents, and console surfaces.

### AI Gateway Capability Baseline

- File: `mcp/gateway-capability-baseline.schema.json`
- Title: `Soha AI Gateway Capability Baseline`
- `$id`: `https://contracts.opensoha.dev/mcp/gateway-capability-baseline.schema.json`
- Required fields: `schemaVersion`, `version`, `source`, `tools`
- Scope: versioned AI Gateway tool capability baseline shared by core, CLI, agents, skills, and compatibility checks.

### Skill Manifest

- File: `skills/skill-manifest.schema.json`
- Title: `Soha Skill Manifest`
- `$id`: `https://contracts.opensoha.dev/skills/skill-manifest.schema.json`
- Required fields: `id`, `name`, `category`
- Scope: official or third-party skill metadata, capability refs, permissions, install hints, and operating guidance.

### Plugin Manifest

- File: `plugins/plugin-manifest.schema.json`
- Title: `OpenSoha Plugin Manifest`
- `$id`: `https://contracts.opensoha.dev/plugins/plugin-manifest.schema.json`
- Required fields: `id`, `name`, `version`, `publisher`, `type`
- Scope: plugin identity, package source, permissions, dependencies, entry points, and optional skills.

### Marketplace Catalog

- File: `plugins/marketplace-catalog.schema.json`
- Title: `OpenSoha Marketplace Catalog`
- `$id`: `https://contracts.opensoha.dev/plugins/marketplace-catalog.schema.json`
- Required fields: `schemaVersion`, `generatedAt`, `sourceId`, `plugins`
- Scope: public marketplace catalog metadata and versioned plugin entries consumed by extension discovery clients.

### Event Envelope

- File: `events/event-envelope.schema.json`
- Title: `Soha Event Envelope`
- `$id`: `https://contracts.opensoha.dev/events/event-envelope.schema.json`
- Required fields: `id`, `source`, `category`, `severity`, `summary`
- Scope: normalized audit, delivery, monitoring, governance, and runtime event envelopes.

### Token Claims

- File: `auth/token-claims.schema.json`
- Title: `Soha Token Claims`
- `$id`: `https://contracts.opensoha.dev/auth/token-claims.schema.json`
- Required fields: `sub`, `exp`, `iat`, `tokenId`, `tokenKind`, `subjectType`, `subjectId`
- Scope: bearer-token subject identity, token kind, subject type, subject id, and optional permission/scope claims.

### Connector Event Envelope

- File: `connectors/connector-event-envelope.schema.json`
- Title: `OpenSoha Connector Event Batch Envelope`
- `$id`: `https://contracts.opensoha.dev/connectors/connector-event-envelope.schema.json`
- Required fields: `connectorId`, `events`
- Scope: provider-neutral connector runtime event batches before durable ingest by Soha core.

## AI Platform JSON Schema Artifacts

- `agent/agent-provider-definition.schema.json` - Agent Provider Definition; `$id`: `https://opensoha.dev/schemas/agent-provider-definition.schema.json`; Required fields: `schemaVersion`, `id`, `kind`, `providerVersion`, `adapterProtocol`, `runtime`, `capabilities`.
- `agent/agent-provider-registry.schema.json` - Agent Provider Registry Snapshot; `$id`: `https://opensoha.dev/schemas/agent-provider-registry.schema.json`; Required fields: `schemaVersion`, `revision`, `digest`, `issuedAt`, `providers`.
- `agent/agent-run-step.schema.json` - Agent Run Step; `$id`: `https://opensoha.dev/schemas/agent-run-step.schema.json`; Required fields: `schemaVersion`, `id`, `runId`, `sequence`, `attempt`, `state`, `contextRef`, `startedAt`.
- `agent/agent-observation.schema.json` - Agent Observation; `$id`: `https://opensoha.dev/schemas/agent-observation.schema.json`; Required fields: `schemaVersion`, `id`, `runId`, `stepId`, `kind`, `status`, `summary`, `redacted`, `observedAt`.
- `agent/agent-checkpoint.schema.json` - Agent Checkpoint; `$id`: `https://opensoha.dev/schemas/agent-checkpoint.schema.json`; Required fields: `schemaVersion`, `id`, `runId`, `stepId`, `attempt`, `sequence`, `stateHash`, `contextRef`, `createdAt`.
- `agent/environment-lease.schema.json` - Agent Environment Lease; `$id`: `https://opensoha.dev/schemas/environment-lease.schema.json`; Required fields: `schemaVersion`, `id`, `runId`, `ownerId`, `scopeHash`, `mode`, `quota`, `issuedAt`, `expiresAt`.
- `agent/environment-snapshot.schema.json` - Agent Environment Snapshot; `$id`: `https://opensoha.dev/schemas/environment-snapshot.schema.json`; Required fields: `schemaVersion`, `leaseId`, `runId`, `state`, `resourceUsage`, `observedAt`.
- `agent/agent-provider-runtime-event.schema.json` - Agent Provider Runtime Event; `$id`: `https://opensoha.dev/schemas/agent-provider-runtime-event.schema.json`; Required fields: `schemaVersion`, `eventType`, `runnerId`, `revision`, `observedAt`.
- `agent/fleet-target.schema.json` - Agent Fleet Target; `$id`: `https://opensoha.dev/schemas/agent/fleet-target.schema.json`; Required fields: `schemaVersion`.
- `agent/provider-rollout.schema.json` - Agent Provider Rollout; `$id`: `https://opensoha.dev/schemas/agent/provider-rollout.schema.json`; Required fields: `schemaVersion`, `id`, `desiredRevision`, `previousRevision`, `target`, `status`, `createdAt`.
- `agent/conformance-run.schema.json` - Agent Provider Conformance Run; `$id`: `https://opensoha.dev/schemas/agent/conformance-run.schema.json`; Required fields: `schemaVersion`, `id`, `providerRef`, `environmentRef`, `suiteVersion`, `status`, `results`, `startedAt`.
- `agent/environment-template.schema.json` - Agent Environment Template; `$id`: `https://opensoha.dev/schemas/agent/environment-template.schema.json`; Required fields: `schemaVersion`, `id`, `version`, `backend`, `isolationMode`, `quota`, `ttlSeconds`, `enabled`.
- `agent/multi-agent-plan.schema.json` - Bounded Multi-Agent Plan; `$id`: `https://opensoha.dev/schemas/agent/multi-agent-plan.schema.json`; Required fields: `schemaVersion`, `id`, `coordinatorRef`, `subtasks`, `sharedBudget`, `status`, `createdAt`.
- `evaluation/evaluation-dataset.schema.json` - Evaluation Dataset; `$id`: `https://opensoha.dev/schemas/evaluation-dataset.schema.json`; Required fields: `schemaVersion`, `id`, `name`, `version`, `samples`, `createdAt`.
- `evaluation/evaluation-run.schema.json` - Evaluation Run; `$id`: `https://opensoha.dev/schemas/evaluation-run.schema.json`; Required fields: `schemaVersion`, `id`, `datasetId`, `datasetVersion`, `candidateRefs`, `status`, `startedAt`.
- `evaluation/evaluation-result.schema.json` - Evaluation Result; `$id`: `https://opensoha.dev/schemas/evaluation-result.schema.json`; Required fields: `schemaVersion`, `sampleId`, `scores`, `passed`.
- `evaluation/executor-profile.schema.json` - Evaluation Executor Profile; `$id`: `https://opensoha.dev/schemas/evaluation/executor-profile.schema.json`; Required fields: `schemaVersion`, `id`, `environmentPolicy`, `isolationMode`, `timeoutSeconds`, `enabled`.
- `evaluation/sample-attempt.schema.json` - Evaluation Sample Attempt; `$id`: `https://opensoha.dev/schemas/evaluation/sample-attempt.schema.json`; Required fields: `schemaVersion`, `runId`, `sampleId`, `attempt`, `candidateRefs`, `status`, `latencyMillis`, `completedAt`.
- `evaluation/replay-plan.schema.json` - Evaluation Replay Plan; `$id`: `https://opensoha.dev/schemas/evaluation/replay-plan.schema.json`; Required fields: `schemaVersion`, `id`, `sourceTraceRefs`, `candidateRefs`, `executorProfileId`, `readOnly`, `createdAt`.
- `evaluation/gate-policy.schema.json` - Evaluation Gate Policy; `$id`: `https://opensoha.dev/schemas/evaluation/gate-policy.schema.json`; Required fields: `schemaVersion`, `id`, `version`, `minimumScores`, `enabled`.
- `evaluation/gate-decision.schema.json` - Evaluation Gate Decision; `$id`: `https://opensoha.dev/schemas/evaluation/gate-decision.schema.json`; Required fields: `schemaVersion`, `id`, `policyId`, `policyVersion`, `baselineRunId`, `candidateRunId`, `decision`, `reasons`, `evidenceRefs`, `evaluatedAt`.
- `evaluation/feedback-sample.schema.json` - Curated Evaluation Feedback Sample; `$id`: `https://opensoha.dev/schemas/evaluation/feedback-sample.schema.json`; Required fields: `schemaVersion`, `id`, `traceRef`, `scopeHash`, `redactedInput`, `redactedOutput`, `licenseRef`, `decision`, `createdAt`.
- `knowledge/knowledge-base.schema.json` - Knowledge Base; `$id`: `https://opensoha.dev/schemas/knowledge/knowledge-base.schema.json`; Required fields: `id`, `name`, `status`, `ownerId`, `scope`, `retrievalPolicy`, `createdAt`, `updatedAt`.
- `knowledge/knowledge-source.schema.json` - Knowledge Source; `$id`: `https://opensoha.dev/schemas/knowledge/knowledge-source.schema.json`; Required fields: `id`, `knowledgeBaseId`, `name`, `kind`, `syncPolicy`, `status`, `createdAt`, `updatedAt`.
- `knowledge/knowledge-search.schema.json` - Knowledge Search Request; `$id`: `https://opensoha.dev/schemas/knowledge/knowledge-search.schema.json`; Required fields: `knowledgeBaseIds`, `query`.
- `knowledge/context-envelope.schema.json` - Context Envelope; `$id`: `https://opensoha.dev/schemas/knowledge/context-envelope.schema.json`; Required fields: `version`, `id`, `requestId`, `principal`, `task`, `budgets`, `budgetUsage`, `policySnapshot`, `contentHash`, `createdAt`.
- `knowledge/connector-definition.schema.json` - Knowledge Connector Definition; `$id`: `https://opensoha.dev/schemas/knowledge/connector-definition.schema.json`; Required fields: `schemaVersion`, `id`, `kind`, `version`, `configRef`, `enabled`.
- `knowledge/connector-checkpoint.schema.json` - Knowledge Connector Checkpoint; `$id`: `https://opensoha.dev/schemas/knowledge/connector-checkpoint.schema.json`; Required fields: `schemaVersion`, `sourceId`, `connectorVersion`, `cursor`, `configHash`, `committedAt`.
- `knowledge/ingestion-job.schema.json` - Knowledge Ingestion Job; `$id`: `https://opensoha.dev/schemas/knowledge/ingestion-job.schema.json`; Required fields: `schemaVersion`, `id`, `sourceId`, `targetRevision`, `stage`, `status`, `attempt`, `createdAt`.
- `knowledge/ingestion-stage.schema.json` - Knowledge Ingestion Stage Completion; `$id`: `https://opensoha.dev/schemas/knowledge/ingestion-stage.schema.json`; Required fields: `schemaVersion`, `jobId`, `stage`, `attempt`, `status`, `completedAt`.
- `knowledge/index-publish.schema.json` - Knowledge Index Publish Decision; `$id`: `https://opensoha.dev/schemas/knowledge/index-publish.schema.json`; Required fields: `schemaVersion`, `knowledgeBaseId`, `revisionId`, `expectedActiveRevision`, `decision`, `decidedAt`.
- `knowledge/retrieval-trace.schema.json` - Production Retrieval Trace; `$id`: `https://opensoha.dev/schemas/knowledge/retrieval-trace.schema.json`; Required fields: `schemaVersion`, `traceId`, `queryHash`, `indexRevision`, `routeRef`, `candidateCount`, `hitCount`, `noAnswer`, `timingMs`.
- `knowledge/graph-revision.schema.json` - Knowledge Graph Revision; `$id`: `https://opensoha.dev/schemas/knowledge/graph-revision.schema.json`; Required fields: `schemaVersion`, `id`, `knowledgeBaseId`, `sourceIndexRef`, `extractorVersion`, `status`, `entityCount`, `relationCount`, `createdAt`.
- `memory/memory-record.schema.json` - Explicit Long-Term Memory Record; `$id`: `https://opensoha.dev/schemas/memory/memory-record.schema.json`; Required fields: `schemaVersion`, `id`, `ownerType`, `ownerId`, `scopeHash`, `fact`, `sourceType`, `confidence`, `validFrom`, `policyVersion`, `status`, `createdAt`.
- `memory/memory-policy.schema.json` - Long-Term Memory Policy; `$id`: `https://opensoha.dev/schemas/memory/memory-policy.schema.json`; Required fields: `schemaVersion`, `id`, `version`, `ownerTypes`, `defaultTtlSeconds`, `maximumTtlSeconds`, `minimumConfidence`, `explicitWriteOnly`, `enabled`.

## Generated API Reference

The generated API reference path is documented in [API Reference Generation Path](./reference.md). It consumes `../soha/contracts/openapi/soha-api.yaml`, public JSON Schemas, contract examples, and the docs-owned core route metadata overlay.

## Public OpenAPI Operation Index

This list mirrors `../soha/contracts/openapi/soha-api.yaml`. Paths use the docs convention `:param` for OpenAPI `{param}` placeholders.

- `GET /api/v1/healthz`
- `GET /api/v1/readyz`
- `GET /api/v1/auth/providers`
- `GET /api/v1/auth/login-options`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/oidc/login`
- `GET /api/v1/auth/oidc/callback`
- `POST /api/v1/auth/oidc/exchange`
- `GET /api/v1/auth/login/:providerID/start`
- `GET /api/v1/auth/login/:providerID/callback`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/profile`
- `GET /api/v1/auth/bootstrap`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/stream-ticket`
- `POST /api/v1/delivery/execution-tasks/claim`
- `GET /api/v1/delivery/execution-tasks/:taskID/runner-status`
- `POST /api/v1/delivery/execution-callbacks`
- `POST /api/v1/docker/operations/claim`
- `GET /api/v1/docker/operations/:operationID/runner-status`
- `POST /api/v1/docker/operation-callbacks`
- `POST /api/v1/copilot/agent-runs/claim`
- `POST /api/v1/copilot/agent-runs/callback`
- `POST /api/v1/copilot/agent-runs/tool-call`
- `GET /api/v1/copilot/agent-runs`
- `GET /api/v1/clusters/capabilities`
- `GET /api/v1/ai-gateway/capabilities`
- `POST /api/v1/ai-gateway/plans/validate`
- `POST /api/v1/ai-gateway/tasks`
- `GET /api/v1/ai-gateway/tasks`
- `GET /api/v1/ai-gateway/tasks/:taskId`
- `POST /api/v1/ai-gateway/tasks/:taskId/resume`
- `POST /api/v1/ai-gateway/tasks/:taskId/cancel`
- `POST /api/v1/ai-gateway/tools/:toolName/invoke`
- `POST /api/v1/ai-gateway/resources/read`
- `POST /api/v1/ai-gateway/prompts/get`
- `GET /api/v1/ai-gateway/personal-access-tokens`
- `POST /api/v1/ai-gateway/personal-access-tokens`
- `POST /api/v1/ai-gateway/personal-access-tokens/:tokenID/revoke`
- `POST /api/v1/ai-gateway/personal-access-tokens/:tokenID/rotate`
- `GET /api/v1/ai-gateway/service-accounts`
- `POST /api/v1/ai-gateway/service-accounts`
- `GET /api/v1/ai-gateway/service-account-tokens`
- `POST /api/v1/ai-gateway/service-accounts/:serviceAccountID/tokens`
- `POST /api/v1/ai-gateway/service-account-tokens/:tokenID/revoke`
- `POST /api/v1/ai-gateway/service-account-tokens/:tokenID/rotate`
- `GET /api/v1/ai-gateway/audit-logs`
- `GET /api/v1/ai-gateway/approval-requests`
- `GET /api/v1/ai-gateway/approval-requests/:requestID/timeline`
- `POST /api/v1/ai-gateway/approval-requests/:requestID/:action`
- `GET /api/v1/ai-gateway/governance/status`
- `GET /api/v1/mcp/capabilities`
- `GET /api/v1/plugins/marketplace`
- `GET /api/v1/plugins/marketplace/:pluginID`
- `GET /api/v1/plugins/installed`
- `POST /api/v1/plugins/install`
- `GET /api/v1/plugins/:pluginID`
- `DELETE /api/v1/plugins/:pluginID`
- `GET /api/v1/plugins/:pluginID/manifest`
- `POST /api/v1/plugins/:pluginID/enable`
- `POST /api/v1/plugins/:pluginID/disable`
- `POST /api/v1/plugins/:pluginID/upgrade`
- `PUT /api/v1/plugins/:pluginID/config`

## Stable Entry Points

Published SDK 0.2.0 import entries:

```text
github.com/opensoha/soha/contracts/gen/go/sohaapi
@opensoha/contracts/gen/ts/sohaapi
```

Consumers can migrate incrementally from local DTOs to the generated SDKs, without duplicating cross-repository business logic.

## Dependency Direction

- Root `soha/contracts` owns public contract sources; independently published SDKs are consumed through their public module and npm versions.
- Root `soha/web` accesses core through the TypeScript SDK and HTTP API.
- Root `soha/cli` accesses core through Go SDK DTOs/clients and the HTTP API.
- Root `soha/agent` accesses runner-facing APIs through the Agent protocol and generated SDK clients.
- External implementations compose core capabilities through public packages, APIs, SDKs, or build artifacts.

## Validation

The contracts package continuously validates:

- OpenAPI syntax.
- JSON Schema syntax.
- Operation ID uniqueness.
- Go SDK compilation and tests.
- TypeScript SDK typechecking.
- Public JSON wire-shape compatibility tests in `soha`.

The docs repository continuously validates:

- `api/core-endpoints.md` covers the AI Gateway and MCP endpoints defined in OpenAPI.
- This page covers the OpenAPI operation index.
- This page covers the OpenAPI and JSON Schema artifacts exported by the npm package.
- The release workflow checks out a pinned Root `soha` commit before running docs consistency tests.
