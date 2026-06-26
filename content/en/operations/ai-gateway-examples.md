---
title: AI Gateway Examples
description: MCP client configuration, CI service account setup, Console field mapping, delivery and Kubernetes workflows, and policy cookbooks for soha AI Gateway.
---

# AI Gateway Examples

This page gives copyable operating examples for `soha` and the AI Gateway. The examples assume the backend is reachable at `http://localhost:8080`, the bootstrap admin user can manage Gateway objects, and `soha` is available on the local `PATH`.

Do not paste real tokens, kubeconfig content, environment variables, or raw log bodies into tickets or AI conversations. The commands below use placeholders for all secret values.

## Bootstrap Profiles

Create one admin profile for Gateway management:

```bash
soha login \
  --server http://localhost:8080 \
  --login admin \
  --profile gateway-admin \
  --ai-client soha-admin \
  --ai-client-id soha-admin
```

Create local profiles for interactive clients. The AI client id and skill id become Gateway headers and are used by audit, tool grants, access policies, and skill bindings.

Register new team clients as pending when onboarding should require review:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/ai-clients" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "codex-local",
    "name": "Codex Local",
    "kind": "mcp_client",
    "status": "pending_approval",
    "metadata": {"owner":"platform"}
  }'
```

The create call writes a pending approval request. Approving it activates the client:

```bash
soha governance status --profile gateway-admin --json
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/approval-requests/$APPROVAL_REQUEST_ID/approve" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment":"approved for local development"}'
```

```bash
soha context set \
  --profile gateway-admin \
  --ai-client-id codex-local \
  --ai-client Codex \
  --skill-id delivery-developer \
  --source soha
```

## MCP Client Configuration

Generate the canonical JSON shape:

```bash
soha mcp install --profile gateway-admin --command /usr/local/bin/soha
```

Cursor and Claude Code use the `mcpServers` JSON shape:

```json
{
  "mcpServers": {
    "soha": {
      "command": "/usr/local/bin/soha",
      "args": ["mcp", "start", "--profile", "gateway-admin"]
    }
  }
}
```

Codex uses TOML in `~/.codex/config.toml`:

```toml
[mcp_servers.soha]
command = "/usr/local/bin/soha"
args = ["mcp", "start", "--profile", "gateway-admin"]
```

For project-local or team-managed setups, keep the `soha` profile in the user account that runs the editor. The MCP process reads `~/.soha/config.json` by default, or the path in `SOHA_CONFIG`.

## CI Service Account

Create a service account for CI and give it only the roles or scope grants required by the pipeline:

```bash
soha service-account create \
  --profile gateway-admin \
  --id ci-delivery \
  --name "CI Delivery" \
  --role-ids delivery-operator \
  --metadata-json '{"owner":"platform","purpose":"delivery-ci"}'
```

Create a short-lived token. The token value is printed once; store it in the CI secret store, not in repository files.

```bash
soha service-account token-create \
  --profile gateway-admin \
  --service-account-id ci-delivery \
  --name "github-actions" \
  --permission-keys ai.gateway.view,ai.gateway.invoke \
  --expires-at 2026-12-31T00:00:00Z
```

CI can then use an isolated profile file:

```bash
export SOHA_CONFIG="$RUNNER_TEMP/soha-config.json"
export SOHA_TOKEN="$SOHA_GATEWAY_TOKEN"
export SOHA_SERVER="https://soha.example.com"

soha context set \
  --profile ci \
  --ai-client-id ci-github-actions \
  --ai-client "GitHub Actions" \
  --skill-id delivery-developer \
  --source ci

soha capabilities --profile ci --output names
```

If the CI job only needs MCP, point the client at:

```bash
soha mcp start --profile ci --ai-client-id ci-github-actions --ai-client "GitHub Actions" --skill-id delivery-developer
```

## LLM Relay Examples

These examples target the relay OpenAPI contract. As of 2026-06-25, the backend domain models, permission keys, token metadata, repository interface, and config defaults are present, while relay HTTP handlers and routes are still being completed in parallel. Run the SDK and curl calls only after the relay routes are registered; before that point, use the OpenAPI `x-soha-implementation-status` markers as the source of truth.

Create a relay-scoped PAT or SAT instead of reusing an old MCP-only token. The important boundary is both permission and metadata: `ai.gateway.relay.invoke` allows relay invocation, while `metadata.purpose=llm-relay` or `metadata.scopes` containing `relay` prevents legacy Gateway keys from becoming relay keys by accident.

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/personal-access-tokens" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "local-relay-dev",
    "scopes": ["ai_gateway", "relay"],
    "permissionKeys": ["ai.gateway.relay.invoke"],
    "metadata": {
      "purpose": "llm-relay",
      "scopes": ["relay"],
      "allowedModels": ["gpt-4.1", "claude-sonnet-4-5"],
      "allowedProviderKinds": ["openai", "anthropic"],
      "allowedUpstreamIds": [],
      "allowedIPCIDRs": ["10.0.0.0/8"]
    },
    "expiresAt": "2026-12-31T00:00:00Z"
  }'
```

Configure upstreams with environment variables or a secret manager. Do not paste provider keys into tickets, shell transcripts, docs, or AI conversations.

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/relay/upstreams" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "openai-primary",
    "name": "OpenAI primary",
    "providerKind": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "'"$OPENAI_UPSTREAM_API_KEY"'",
    "status": "active",
    "priority": 10,
    "weight": 100,
    "timeoutSeconds": 120,
    "streamTimeoutSeconds": 300,
    "maxConcurrency": 20,
    "supportedModels": ["gpt-4.1"]
  }'

curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/relay/model-routes" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "route-gpt-4-1",
    "publicModel": "gpt-4.1",
    "providerKind": "openai",
    "upstreamId": "openai-primary",
    "upstreamModel": "gpt-4.1",
    "routeGroup": "default",
    "priority": 10,
    "weight": 100,
    "enabled": true
  }'
```

OpenAI SDK with the Responses API:

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.SOHA_RELAY_TOKEN,
  baseURL: `${process.env.SOHA_SERVER}/api/v1/ai-gateway/llm/openai/v1`,
});

const response = await client.responses.create({
  model: "gpt-4.1",
  input: "Return one sentence describing the relay smoke test.",
});

console.log(response.output_text);
```

OpenAI SDK with Chat Completions streaming:

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.SOHA_RELAY_TOKEN,
  baseURL: `${process.env.SOHA_SERVER}/api/v1/ai-gateway/llm/openai/v1`,
});

const stream = await client.chat.completions.create({
  model: "gpt-4.1",
  messages: [{ role: "user", content: "Stream three short words." }],
  stream: true,
  stream_options: { include_usage: true },
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```

Anthropic SDK with Messages:

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.SOHA_RELAY_TOKEN,
  baseURL: `${process.env.SOHA_SERVER}/api/v1/ai-gateway/llm/anthropic`,
});

const message = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 256,
  messages: [{ role: "user", content: "Return one sentence describing the relay smoke test." }],
});

console.log(message.content);
```

curl against native compatible endpoints:

```bash
curl -sS "$SOHA_SERVER/api/v1/ai-gateway/llm/openai/v1/models" \
  -H "Authorization: Bearer $SOHA_RELAY_TOKEN"

curl -sS "$SOHA_SERVER/api/v1/ai-gateway/llm/openai/v1/responses" \
  -H "Authorization: Bearer $SOHA_RELAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4.1","input":"Say ok."}'

curl -sS "$SOHA_SERVER/api/v1/ai-gateway/llm/anthropic/v1/messages" \
  -H "x-api-key: $SOHA_RELAY_TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":64,"messages":[{"role":"user","content":"Say ok."}]}'
```

Relay security checklist:

- Upstream keys are encrypted at rest and read APIs return only `apiKeyPrefix`.
- PAT/SAT plaintext values are shown once; logs, audits, model-call metadata, errors, and frontend state use token prefixes only.
- `ai.gateway.relay.invoke` is required for native model traffic, and token metadata must explicitly identify relay purpose or scope.
- `metadata.allowedModels`, `allowedProviderKinds`, `allowedUpstreamIds`, `allowedIPCIDRs`, and rate-limit profile ids narrow relay use.
- Model-call logs keep model, upstream, endpoint, status, latency, usage counts, cache-token counts, and redacted metadata; they do not store prompt bodies, full headers, Authorization values, provider keys, or raw provider payloads.
- Operators must configure only upstream accounts they are authorized to use and must follow provider and internal data-handling requirements.

## P0 Relay Smoke Checklist

Use this checklist after the backend relay route worker lands the HTTP handlers:

- OpenAPI parses and contains relay upstream, model-route, model-call, metrics, cache, OpenAI-compatible, and Anthropic-compatible paths.
- A relay PAT or SAT with `ai.gateway.relay.invoke` and `metadata.purpose=llm-relay` can call OpenAI SDK non-streaming and streaming requests through the Soha base URL.
- The same relay token can call Anthropic SDK non-streaming and streaming Messages requests through the Soha base URL.
- A token without `ai.gateway.relay.invoke` or relay metadata receives `403`.
- Disabled, expired, or revoked PAT/SAT credentials cannot invoke relay endpoints.
- Upstream API keys do not appear in Console/API read responses, model-call logs, audit logs, application logs, or error responses.
- `GET /api/v1/ai-gateway/relay/model-calls` shows model, upstream, status, TTFB, duration, prompt/completion/total tokens, and cache-token fields after successful calls.
- Streaming client disconnect cancels the upstream request and records `client_cancelled`.
- Updating an upstream or model route invalidates relay config cache before the next routed request.
- Existing MCP `POST /api/v1/ai-gateway/tools/:toolName/invoke` behavior still works with a normal Gateway token.

## Console Field Mapping

The Console management page is `/ai-gateway`. It is the operator surface for the same Gateway API objects used by `soha` and MCP. `ai.gateway.view` can inspect the page, `ai.gateway.invoke` can create personal tokens, and `ai.gateway.manage` is required for AI clients, service accounts, grants, policies, bindings, and approval decisions.

Use this mapping when translating an operational change request into Console input fields:

- **Manifest** maps to `GET /api/v1/ai-gateway/capabilities`. Filters are `AI client`, `Skill`, and `source`. The tool table is a preview of visible capabilities only; every invocation still re-checks permission keys, scopes, grants, access policies, skill bindings, and owning-service authorization.
- **AI clients** maps to `ai_clients`. The form fields are `Client ID`, `name`, `kind`, `status`, `redirectUris`, and `allowedOrigins`. Console creates and edits active or disabled clients; registration-review onboarding can still use the API path with `pending` or `pending_approval`, then approve it from the approval tab.
- **Personal access tokens** maps to `personal_access_tokens`. The create form fields are `name`, `permissionKeys`, `scopes`, and `expiresAt`. The plaintext token is shown once after creation or rotation and is not stored in browser state; rotation copies the old token boundary and revokes the old token.
- **Service accounts** maps to `service_accounts` and `service_account_tokens`. Service account fields are optional `id`, `name`, `description`, `status`, `roleIds`, `teamIds`, and `scopeGrantIds`. Service token fields are `name`, `permissionKeys`, `scopes`, and `expiresAt`; the token table shows id, owner service account, prefix, permissions, scopes, expiration, last-used, revocation/expiration state, rotate, and revoke actions.
- **MCP tool grants** maps to `mcp_tool_grants`. The form fields are `subjectType`, `subjectId`, optional `aiClientId`, `toolName`, `effect`, optional `riskLevel`, extra `permissionKeys`, `requiresApproval`, and resource scope fields for business line, application, application environment, environment, cluster, namespace, release bundle, and execution task.
- **Access policies** maps to `ai_access_policies`. Console covers the policy envelope: `name`, `description`, `enabled`, `subjectType`, `subjectId`, optional `aiClientId`, `effect`, `toolPatterns`, `skillIds`, `riskLevels`, `approvalMode`, and the same resource scope fields. It also provides structured controls for common approval routing (`approvalPolicyRef`, candidate users/roles/teams, `onCallRef`, `approvalMode=all|any`, `requiredApprovals`, and change-window bounds) plus common governance conditions: `rateLimit` fixed-window, sliding-window, or GCRA/token-bucket limits, daily invocation/token/cost `budget`, input `redactionPolicy` with field, regex, and secret-classifier selectors, and `outputRedactionPolicy` with output field, regex, secret-classifier, replacement, and preserve-format controls. Staged approval and per-tool redaction `rules[]` remain API/cookbook fields.
- **Skill bindings** maps to `ai_gateway_skill_bindings`. The form fields are `subjectType`, `subjectId`, optional `aiClientId`, `skillId`, `capabilityRefs`, and `enabled`. Bindings narrow the manifest for a skill; they do not grant business permissions.
- **Governance** maps to `GET /api/v1/ai-gateway/governance/status`. The window selector sends `windowHours` values for 1h, 6h, 24h, 48h, or 7d. The tab shows health status and checks, recent calls, token/client/approval summaries, policy coverage rows, redaction hit summary, token findings, approval queues, top tools, top AI clients, top actors, anomaly findings, string recommendations, and structured `recommendationActions`. The redaction hit summary is aggregated from Gateway audit metadata and includes total matches, redacted audit count, input/output targets, match types, classifiers, field paths, policies, and top tools. Token findings can filter the Personal access token table, filter the service-account token table, or prefill service-token revocation by token id; redaction policy/tool rows can jump to the matching policy or audit filter view; approval queues, anomaly findings, and recommendation actions can jump to the matching approval, AI client, policy, grant, or audit filter view. Coverage gaps and high-risk findings/actions can open a prefilled access policy draft for budget, rate-limit, redaction, resource-scope, or approval guardrails. Policy coverage treats active input `redactionPolicy`, `outputRedactionPolicy`, and response/output redaction aliases as redaction coverage. It requires `ai.gateway.manage` and only exposes redacted summaries, request ids, and token prefixes.
- **Approval requests** maps to `ai_gateway_approval_requests`. Filters are `approvalRequestId`, `status`, `actorId`, `AI client`, `Tool`, `Risk`, `Strategy`, and created-time range. Rows expose status, actor, client/skill, tool, risk, strategy, expiry, summary, and a trace column. The expanded trace shows Gateway approval id, workflow run link, application, application environment, execution task, release bundle, decision comment, resource scope, redacted tool input, related ids, and output. Approve, reject, and cancel actions accept a comment.
- **Audit** maps to `ai_gateway_audit_logs`. Filters are `actorId`, `AI client`, `Tool`, `Risk`, `Result`, and created-time range. Expanded rows show only resource scope, request id, and source IP; raw tool input, token values, kubeconfig, environment variables, and raw log bodies are not exposed.

Runtime configuration is not edited from this page. For example, the Redis rate-limit backend is configured with `ai_gateway.rate_limit.backend=redis` and `ai_gateway.rate_limit.redis.addr` or the matching environment variables, while policies in Console or API decide which invocations use rate limits.

## Delivery Developer Flow

Use the `delivery-developer` skill for self-service application delivery work. The recommended flow is read context first, then request a controlled action.

Inspect the application and environment context:

```bash
soha tool call delivery.applications.detail \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1"}'

soha tool call delivery.application_services.list \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1"}'

soha tool call delivery.build_sources.list \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","includeBindings":true}'
```

Inspect release targets and current execution state:

```bash
soha tool call delivery.release_targets.list \
  --profile gateway-admin \
  --input-json '{"applicationEnvironmentId":"binding-1"}'

soha tool call delivery.release_context.diff \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","sourceReleaseBundleId":"bundle-old","targetReleaseBundleId":"bundle-new"}'
```

Trigger a controlled build or deploy action. Mutating tools still go through access policy risk strategy and the owning delivery application service.

```bash
soha tool call delivery.actions.trigger \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","action":"build_deploy"}'
```

For rollback, collect read-only context first, then trigger the controlled rollback action. The bound workflow template must include a `rollback_to_previous` DAG node; Gateway approval replay keeps `releaseBundleId` and `workflowRunId` linked.

```bash
soha tool call delivery.rollback.context \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","releaseBundleId":"bundle-prev"}'

soha tool call delivery.actions.trigger \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","action":"rollback","releaseBundleId":"bundle-prev"}'
```

If the matching policy requires approval, the result is `pending_approval` or `pending_human_confirm` with an approval request id. The caller should not retry by bypassing Gateway.

## K8s SRE Release Failure Diagnosis

Use `k8s-sre` for bounded runtime diagnosis. Start with rollout and event context:

```bash
soha tool call k8s.deployments.rollout_status \
  --profile gateway-admin \
  --input-json '{"clusterId":"cluster-a","namespace":"prod","deploymentName":"api"}'

soha tool call k8s.deployments.events \
  --profile gateway-admin \
  --input-json '{"clusterId":"cluster-a","namespace":"prod","deploymentName":"api","limit":50}'
```

Inspect pod and service context:

```bash
soha tool call k8s.pods.describe \
  --profile gateway-admin \
  --input-json '{"clusterId":"cluster-a","namespace":"prod","podName":"api-7d9f"}'

soha tool call k8s.services.backends \
  --profile gateway-admin \
  --input-json '{"clusterId":"cluster-a","namespace":"prod","serviceName":"api"}'
```

Run the release-failure analyzer. The Gateway stores a redacted `AnalysisArtifact` through the Copilot application service and does not persist raw log bodies. In AI Workbench, artifact history exposes any stored `sessionId`, `rootCauseRunId`, `inspectionRunId`, and `agentRunId` / `agentRuntimeId` as context links; inspection-review artifacts can open the inspection runs view directly with `view=runs&inspectionRunId=...`.

```bash
soha tool call diagnosis.release_failure.analyze \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","releaseBundleId":"bundle-new","executionTaskId":"task-1","clusterId":"cluster-a","namespace":"prod","workloadName":"api","podName":"api-7d9f"}'
```

For deeper reasoning through an external Agent Runtime provider, request asynchronous analysis. Gateway still only collects and redacts context; it creates a `queued` AgentRun and returns `agentRunId`, `agentProviderId`, and `agentRunStatus`. A configured agent runner must later claim the run and callback with normalized `analysisArtifacts`.

```bash
soha tool call diagnosis.release_failure.analyze \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","releaseBundleId":"bundle-new","executionTaskId":"task-1","clusterId":"cluster-a","namespace":"prod","workloadName":"api","podName":"api-7d9f","deepAnalysis":true,"agentProviderId":"hermes","timeoutSeconds":900}'
```

## Access Policy Cookbook

Create policies with `POST /api/v1/ai-gateway/access-policies`. Handlers stay thin; runtime enforcement happens in the AI Gateway application service before any owning application service is called.

Read-only delivery policy for local Codex:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Codex read-only delivery",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "aiClientId": "codex-local",
    "effect": "allow",
    "toolPatterns": ["delivery.*.list", "delivery.applications.detail", "delivery.release_context.diff"],
    "riskLevels": ["read", "analyze"],
    "conditions": {
      "rateLimit": {"maxCallsPerMinute": 60, "scope": "actor_client", "mode": "gcra", "burst": 20},
      "budget": {"maxCallsPerDay": 500, "scope": "actor_client"},
      "redactionPolicy": {"mode": "sanitize"}
    }
  }'
```

Require approval for delivery mutations:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivery mutation approval",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "aiClientId": "codex-local",
    "effect": "allow",
    "toolPatterns": ["delivery.actions.trigger"],
    "riskLevels": ["execute", "high"],
    "approvalPolicy": {
      "strategy": "require_approval",
      "approvalPolicyRef": "delivery-standard",
      "approvalMode": "all",
      "approverRoles": ["release-manager"],
      "approverTeams": ["platform-ops"],
      "requiredApprovals": 2,
      "requiredRoleApprovals": {"release-manager": 1},
      "requiredTeamApprovals": {"platform-ops": 1},
      "approvalStages": [
        {
          "name": "release",
          "approverRoles": ["release-manager"],
          "requiredApprovals": 1
        },
        {
          "name": "security",
          "approverRoles": ["security-reviewer"],
          "requiredApprovals": 1
        }
      ],
      "onCallRef": "prod-release-oncall",
      "changeWindow": {
        "startsAt": "2026-05-29T10:00:00Z",
        "endsAt": "2026-05-29T12:00:00Z",
        "timezone": "UTC"
      }
    },
    "conditions": {
      "rateLimit": {"maxCallsPerHour": 10, "scope": "actor_client_tool"},
      "redactionPolicy": {"mode": "strict"}
    }
  }'
```

Deny a shared client from high-risk tools:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shared client high-risk deny",
    "enabled": true,
    "subjectType": "ai_client",
    "subjectId": "shared-agent",
    "effect": "deny",
    "riskLevels": ["high", "execute", "mutate"]
  }'
```

Scope an SRE policy to one cluster and namespace:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SRE prod runtime read",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "sre",
    "effect": "allow",
    "toolPatterns": ["k8s.*", "diagnosis.release_failure.analyze"],
    "riskLevels": ["read", "analyze"],
    "resourceScopes": {"clusterId": "cluster-a", "namespace": "prod"},
    "conditions": {
      "rateLimit": {"maxCallsPerMinute": 120, "scope": "actor_client", "mode": "token_bucket", "burst": 30},
      "budget": {"maxCallsPerDay": 1000, "scope": "actor_client"}
    }
  }'
```

Condition notes:

- `rateLimit` defaults to the Gateway fixed-window counter table for atomic enforcement. Set `mode` / `algorithm` / `strategy` to `sliding_window`, `rolling_window`, or `audit_window` to use the Gateway audit log as a true rolling window. Set it to `gcra`, `token_bucket`, `leaky_bucket`, or `strict` to use GCRA/TAT semantics, with `burst` / `burstSize` / `capacity` controlling burst capacity. By default this uses PostgreSQL-backed rate-limit tables; set `ai_gateway.rate_limit.backend=redis` plus `ai_gateway.rate_limit.redis.addr` to use Redis INCR/EXPIRE and Lua GCRA as the high-throughput shared limiter. Redis failures fall back to PostgreSQL, and older databases without the matching migration still temporarily fall back to the audit-window count.
- Docker Compose can start the optional Redis limiter with `docker compose --profile redis-rate-limit up`; set `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND=redis` and leave `SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR=redis:6379` or point it at an external Redis endpoint.
- `approvalPolicy.approvalPolicyRef` records the Gateway approval policy reference. Gateway approval timeout and routing come from the same inline `approvalPolicy` object, including `slaMinutes`, `approvalMode`, required approval counts, approver users/roles/teams, change windows, and staged routing.
- `approvalPolicy.approverUsers`, `approverRoles`, `approverTeams`, `onCallRef`, `approvalMode`, `approvalStages`, `requiredApprovals` / `minApprovals`, `requiredRoleApprovals` / `requiredTeamApprovals`, and `changeWindow.startsAt/endsAt` are persisted as approval routing metadata. `onCallRef` is resolved through the monitoring on-call resolver; the current participant is appended to `candidateUserIds`, and Gateway stores `onCallCandidateUserIds` plus a redacted `onCallResolution` summary. Decision APIs reject non-candidate approvers; approve also requires the current time to be inside the change window. Multi-approval quorum counts unique approving `userId`s and replaces the same approver's prior decision instead of double-counting it. `approvalMode=all` is the default joint approval mode and keeps the request `pending` until the total count and all role/team quotas are reached; `approvalMode=any` is the alternate approval mode and executes when any explicit total, role, or team quota is satisfied. Pending requests record `pendingRequirements`; satisfied paths record `satisfiedRequirements`. Staged approval uses `approvalStages[]`; only the current stage candidates can approve, stage completion advances `currentStageIndex` and records `stageHistory`, and only the final stage replays the tool.
- When an approved Gateway request replays `delivery.actions.trigger`, the replay injects `aiGatewayApprovalRequestId` and related policy/tool/skill/client fields into delivery workflow variables. Workflow run metadata keeps those values, workflow `manual_approval` decisions persist them in `workflow_approvals.metadata`, and Gateway/delivery related IDs include `workflowRunId` for traceability. Opening `/workflows?workflowRunId=...&gatewayApprovalRequestId=...` auto-expands the workflow row with Gateway linkage, manual approval node detail, workflow node timeline, and raw trace.
- `budget.maxCalls*` is an invocation-count budget. `budget.maxTokens*` and `budget.maxCost*` are usage budgets based on redacted Gateway audit metadata such as `usage`, `tokenUsage`, or `providerUsage`.
- On successful tool calls and approval replay, Gateway extracts numeric token/cost summaries from owning-service output or related IDs when they contain `usage`, `tokenUsage`, `aiUsage`, `providerUsage`, `llmUsage`, `metering`, `billing`, or `costUsage`. It also maps native fields such as Gemini/Vertex `usageMetadata.promptTokenCount/candidatesTokenCount/totalTokenCount`, cached content, tool-use prompt, and thoughts token fields, Ollama `prompt_eval_count/eval_count`, Anthropic cache input tokens, OpenAI cached/audio/reasoning/prediction token details, Bedrock text/image/audio token fields, Cohere billed units with same-container `billed_units` preferred over `tokens` to avoid double counting, search/classification/embedding/rerank/request/response usage units, Brave Search / SerpAPI query and search-credit aliases, Browserbase session/minute/page-load aliases, Exa/Jina/Unstructured/LlamaCloud document-page/parse-page/character/chunk aliases, Helicone request-count aliases, billable/billed/usage token aliases, multimodal text/image/audio/video input/output aliases, cache read/write/hit/miss input token variants, DashScope/Moonshot/Zhipu/Qianfan-style `*_tokens_count` / `*_token_usage` variants, generic `promptCost` / `inputCost` / `completionCost` / `outputCost`, and common cost / costMicros / costCents fields. It writes only numeric `providerUsage` / `usage` summaries to audit metadata; raw provider payloads, model strings, and other non-numeric details are not stored.
- `redactionPolicy.mode=strict` rejects sensitive keys such as `token`, `password`, `secret`, `authorization`, `kubeconfig`, and secret-like text before the tool reaches the owning service.
- `redactionPolicy.mode=sanitize|mask|redact` rewrites sensitive input values to `[REDACTED]` before the owning service sees them.
- `redactionPolicy.fields` / `redactFields` narrows replacement to field paths. `allowFields` exempts trusted field paths. `replacement` customizes the replacement string. `preserveFormat=true` masks a value while keeping the last four characters.
- `redactionPolicy.valuePatterns` adds custom regex-based value matching. `secretTypes` enables built-in classifiers such as `github`, `gitlab`, `openai`, `anthropic`, `google_api_key`, `huggingface`, `cohere`, `mistral`, `deepseek`, `groq`, `together`, `replicate`, `langsmith`, `pinecone`, `xai`, `perplexity`, `tavily`, `langfuse`, `qdrant`, `wandb`, `linear`, `openrouter`, `fireworks`, `voyage`, `brave_search`, `serpapi`, `browserbase`, `exa`, `jina`, `unstructured`, `llama_cloud`, `helicone`, `dashscope`, `moonshot`, `zhipu`, `siliconflow`, `hunyuan`, `qianfan`, `volcengine`, `grafana`, `sentry`, `newrelic`, `azure_openai`, `azure_devops`, `datadog`, `pagerduty`, `posthog`, `splunk`, `elastic`, `terraform`, `npm`, `stripe`, `slack`, `jwt`, `aws`, `private_key`, `kubernetes_secret`, `kubeconfig`, `docker_config`, `gcp_service_account`, and `aws_credentials`.
- Redaction hits are written to Gateway audit metadata as a `redaction` summary with target, field paths, match types, classifier names, and counts only; the matched secret value is not stored. Governance status aggregates the same metadata into an operating summary so operators can see where redaction is happening without inspecting raw tool input or output.
- `redactionPolicy.rules[]` can bind field rules to `toolPatterns`, so one policy can sanitize different inputs for delivery, k8s, and diagnosis tools.
- Input redaction is the default. Use `outputRedactionPolicy`, or set a rule `target` to `output` / `both`, to redact owning-service output before Gateway returns or persists it.
- `scope` can be `actor`, `client`, `actor_client`, `actor_tool`, `client_tool`, `actor_client_tool`, or `global`.

Token and cost budget example:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Codex daily usage budget",
    "enabled": true,
    "subjectType": "ai_client",
    "subjectId": "codex-local",
    "effect": "allow",
    "toolPatterns": ["delivery.*", "k8s.*", "diagnosis.*"],
    "conditions": {
      "budget": {
        "maxTokensPerDay": 200000,
        "maxCostPerDay": 15.0,
        "scope": "actor_client"
      }
    }
  }'
```

Field-level redaction with an allow-list and format-preserving mask:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivery field redaction",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "effect": "allow",
    "toolPatterns": ["delivery.*"],
    "riskLevels": ["read", "analyze", "mutate"],
    "conditions": {
      "redactionPolicy": {
        "mode": "mask",
        "fields": ["metadata.apiToken", "buildSources.*.config.password"],
        "allowFields": ["search"],
        "preserveFormat": true,
        "rules": [
          {
            "toolPatterns": ["delivery.applications.create"],
            "fields": ["metadata.apiToken"],
            "replacement": "[MASKED]",
            "preserveFormat": true
          },
          {
            "toolPatterns": ["diagnosis.*"],
            "fields": ["context.rawLogs", "context.env"],
            "mode": "redact"
          }
        ]
      }
    }
  }'
```

Regex and structured secret classification:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Secret classifier redaction",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "effect": "allow",
    "toolPatterns": ["delivery.*", "k8s.*", "diagnosis.*"],
    "conditions": {
      "redactionPolicy": {
        "mode": "sanitize",
        "valuePatterns": ["APP-[0-9]{4}", "ticket-[A-F0-9]{8}"],
        "secretTypes": ["github", "openai", "anthropic", "google_api_key", "huggingface", "cohere", "mistral", "deepseek", "groq", "together", "replicate", "langsmith", "pinecone", "xai", "perplexity", "tavily", "langfuse", "qdrant", "wandb", "linear", "openrouter", "fireworks", "voyage", "brave_search", "serpapi", "browserbase", "exa", "jina", "unstructured", "llama_cloud", "helicone", "dashscope", "moonshot", "zhipu", "siliconflow", "hunyuan", "qianfan", "volcengine", "grafana", "sentry", "newrelic", "azure_openai", "azure_devops", "datadog", "pagerduty", "posthog", "splunk", "elastic", "terraform", "npm", "stripe", "jwt", "aws", "private_key", "kubernetes_secret", "kubeconfig", "docker_config", "gcp_service_account"],
        "replacement": "[CLASSIFIED]",
        "preserveFormat": false
      }
    }
  }'
```

Output redaction for tool responses and approval replay:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/access-policies" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivery output redaction",
    "enabled": true,
    "subjectType": "role",
    "subjectId": "developer",
    "effect": "allow",
    "toolPatterns": ["delivery.*"],
    "riskLevels": ["read", "analyze", "mutate", "execute"],
    "conditions": {
      "outputRedactionPolicy": {
        "mode": "sanitize",
        "fields": [
          "application.buildSources.*.config.token",
          "build.metadata.token",
          "release.metadata.secret"
        ]
      }
    }
  }'
```

## Skill Binding Cookbook

Skill bindings narrow which capabilities a subject or AI client can use under a skill. They do not grant business permissions by themselves.

Bind Codex to the delivery developer skill:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/skill-bindings" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectType": "ai_client",
    "subjectId": "codex-local",
    "skillId": "delivery-developer",
    "enabled": true,
    "capabilityRefs": [
      "delivery.applications.*",
      "delivery.application_services.list",
      "delivery.build_sources.list",
      "delivery.release_targets.list",
      "delivery.release_bundles.list",
      "delivery.execution_tasks.list",
      "delivery.execution_logs.list",
      "delivery.release_context.diff",
      "delivery.rollback.context",
      "delivery.actions.trigger"
    ],
    "metadata": {"owner":"platform"}
  }'
```

Bind the SRE role to bounded runtime diagnosis:

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/ai-gateway/skill-bindings" \
  -H "Authorization: Bearer $SOHA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectType": "role",
    "subjectId": "sre",
    "skillId": "k8s-sre",
    "enabled": true,
    "capabilityRefs": [
      "k8s.pods.*",
      "k8s.deployments.*",
      "k8s.services.backends",
      "k8s.routes.context",
      "k8s.storage.context",
      "k8s.nodes.detail",
      "diagnosis.release_failure.analyze"
    ]
  }'
```

Use `diagnose` to inspect what the current profile can see:

```bash
soha diagnose --profile gateway-admin --tool diagnosis.release_failure.analyze
soha capabilities --profile gateway-admin --json
```

When an MCP client can list capabilities but resource or prompt context looks wrong, compare the backend-proxied resource and prompt paths directly:

```bash
soha resource read soha://delivery/applications \
  --profile gateway-admin \
  --skill-id delivery-developer \
  --context-json '{"applicationId":"app-1"}'

soha prompt get soha.delivery.plan_release \
  --profile gateway-admin \
  --skill-id delivery-developer \
  --arguments-json '{"applicationId":"app-1","applicationEnvironmentId":"dev"}' \
  --context-json '{"environmentId":"dev"}'

soha diagnose --profile gateway-admin --resource soha://k8s/runtime
soha diagnose --profile gateway-admin --prompt soha.k8s.diagnose_workload
```

These commands still proxy through Gateway `resources/read` and `prompts/get`, so failures should be debugged with the same runtime permissions, skill bindings, AI client context, and resource scopes used by the MCP server.

## Operational Checks

Review audit and governance after onboarding a client:

```bash
soha audit list --profile gateway-admin --ai-client-id codex-local --limit 20
soha governance status --profile gateway-admin --window-hours 24
```

Governance status should be clean before widening access: warnings for `approval_sla_due_soon` or `stale_gateway_approvals` mean pending Gateway approvals need operator attention before their SLA or queue age becomes a release blocker. Warnings for `high_risk_allow_without_approval` or `high_risk_grant_without_approval` mean an active allow policy or unexpired grant can reach high-risk tools without an approval, human-confirmation, or dry-run guard. Warnings for `high_risk_allow_without_resource_scope` or `high_risk_grant_without_resource_scope` mean the high-risk allow path has no concrete `resourceScopes` constraint, or only a wildcard scope such as `"*"`.

If an expected tool is missing, check in this order:

- runtime permission keys such as `ai.gateway.invoke` and the owning business permission;
- `mcp_tool_grants` deny/allow matching;
- `ai_access_policies` deny/allow, resource scope, risk strategy, and conditions;
- `ai_gateway_skill_bindings` for the current `skillId`;
- resource scope fields in the tool input, especially `clusterId`, `namespace`, `applicationId`, and `applicationEnvironmentId`.
