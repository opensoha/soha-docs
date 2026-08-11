# Operator Runbooks

This page is the entry point for OpenSoha operators troubleshooting managed runtime surfaces. Prefer public APIs, the `soha` CLI, runner callbacks, audit records, and governance views. Do not routinely bypass the Gateway by reading private database, Kubernetes, Docker, or runner state directly.

## General Triage

First confirm the CLI profile, current identity, and Gateway-visible capabilities:

```bash
soha profile show local
soha context show --profile local
soha capabilities --profile local --output names
soha diagnose --profile local --tool k8s.pods.logs
```

Record the request ID, actor, AI client, skill, tool, cluster, namespace, application, and approval request ID for each request. Subsequent investigation should correlate these fields across audit records, approval timelines, runner callbacks, and operation evidence.

## Agent Fleet

Use this runbook when a managed or self-hosted Agent cannot read a cluster, the capability matrix reports `unsupported` or `partial`, a runner heartbeat expires, or the Agent version does not meet a capability requirement.

Check in this order:

1. Read the platform capability matrix:

   ```bash
   soha capabilities --profile local --domain platform --output json
   soha diagnose --profile local --cluster-capability logs.runtime.stream
   ```

2. Compare `direct.status` and `agent.status` to determine whether the result is a real product boundary rather than a frontend disabled state.
3. Inspect `requiredAgentVersion`, `requiredScopes`, `riskLevel`, and `requiresApproval`.
4. For runner task problems, correlate Agent Runtime claim/callback logs and operation lifecycle evidence by `agentId`, `runnerId`, and `operationId`.
5. If the Agent is offline or outdated, reduce the surface to read-only diagnosis. Do not route writes through Direct mode to bypass approval.

Recovery:

- After re-registering or upgrading the Agent, read the capability matrix again.
- Run `soha diagnose` for high-risk capabilities and confirm that approval and scope warnings remain present.
- Add the request ID and remediation evidence to the related audit or incident record.

## Connector Runtime

Use this runbook when an external message or webhook reaches the provider but Soha has no event, an action has no callback, the connector delivers duplicates, or the dead-letter queue grows.

Check in this order:

1. Confirm that the connector manifest declares its event types, actions, and secret references.
2. Validate events against `connectors/connector-event-envelope.schema.json`; every batch must contain `connectorId` and `events`.
3. Check the idempotency key using the connector event ID or provider message ID. A duplicate must be classified as a replay rather than persisted as a second business event.
4. Inspect retry count, dead-letter count, action latency, and last successful delivery.
5. Search Gateway audit records by connector ID, action, subject, or request ID.

Recovery:

- Use retry and backoff for transient provider failures. Do not manually replay a payload before confirming its idempotency key.
- Before redelivering a dead-letter event, export the redacted payload, failure reason, and last response status.
- If a `secretRef` is invalid, rotate only the secret. Never place plaintext in a manifest, log, or issue.

## Delivery Runner

Use this runbook when a release remains queued or running, a callback times out, a runner cannot claim work, rollback evidence is missing, or an artifact is absent.

Check in this order:

1. Confirm the runner token configuration:

   ```yaml
   runtime:
     execution_runner_token: demo-execution-runner-token
   ```

2. Check claim, runner status, and callback behavior through the runner-facing API:

   ```http
   POST /api/v1/delivery/execution-tasks/claim
   GET  /api/v1/delivery/execution-tasks/:taskID/runner-status
   POST /api/v1/delivery/execution-callbacks
   ```

3. Inspect the operation lifecycle: `claimed`, `heartbeat`, `cancel_requested`, `cancelled`, `timed_out`, `succeeded`, `failed`, and `late_callback_ignored`.
4. Correlate provider logs, events, artifacts, callback payloads, approvals, and user actions.
5. After callback timeout, a late callback may add evidence but must not overwrite the persisted terminal state.

Recovery:

- When the runner recovers, verify that it cannot reclaim a terminal task.
- Rollback must use the delivery workflow or an approved business action; a runner-local script must not modify production independently.
- If an artifact is missing, add a redacted evidence summary rather than raw provider logs.

## AI Gateway Approval And Governance

Use this runbook when a high-risk tool is denied, an approval stalls, governance health degrades, or rate-limit, budget, or redaction alerts fire.

Start here:

```bash
soha governance status --profile local --window-hours 24
soha audit list --profile local --tool-name delivery.actions.trigger --limit 20
soha approval list --profile local --status pending
soha approval timeline approval-123 --profile local
```

Check in this order:

1. Read governance health and identify `approval_sla_due_soon`, `stale_gateway_approvals`, `high_risk_allow_without_approval`, `high_risk_grant_without_resource_scope`, or redaction findings.
2. Open the approval timeline and inspect the current stage, candidates, role/team quorum, change window, on-call routing, and pending requirements.
3. Find audit records for the same `approvalRequestId` and confirm the actor, AI client, skill, tool, risk level, resource scope, and request ID.
4. Replay after approval must still pass Gateway policy and owning-service authorization. Approval is not permanent authorization.
5. Denial, cancellation, and timeout must write audit evidence and retain a reason in the incident or change record.

Recovery:

- If a Gateway approval control is missing, add a require-approval, human-confirm, or dry-run guardrail before retrying.
- If resource scope is missing, constrain the policy or grant by cluster, namespace, application, or environment.
- For a redaction false positive, narrow the rule or allow specific fields. Do not disable global redaction.
