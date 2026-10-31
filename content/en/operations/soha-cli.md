# soha

`soha` provides native workbench commands and an AI Gateway entry point. It manages login and local profiles, with support for scripts, MCP stdio, and capability discovery.

Workbench commands use Soha APIs for registered resources. MCP tool calls pass through the Gateway to the owning application service. The server checks resource permissions, scopes, and audit requirements:

```text
soha mcp
  -> GET /api/v1/ai-gateway/capabilities
  -> POST /api/v1/ai-gateway/tools/:toolName/invoke
  -> POST /api/v1/ai-gateway/resources/read
  -> POST /api/v1/ai-gateway/prompts/get
  -> backend permissionKeys / scope grants / MCP tool grants / access policies / skill bindings / audit
  -> owning application service
```

## Installation, npx, and local builds

`@opensoha/cli` is a lightweight npm launcher for the native Go CLI. It downloads the platform binary matching the npm package version, verifies it against `checksums.txt`, and caches it by version. The package will be published by the first tagged release that includes the npm publishing step. Until it appears in the registry, npx returns `E404`; use the native GitHub Release binary instead. After publication, use `@latest` interactively and pin the npm version in CI:

```bash
npx -y @opensoha/cli@latest mcp
npx -y @opensoha/cli@latest setup --client codex --mode both
npx -y @opensoha/cli@0.1.0 version --json
```

`setup` writes the verified cached binary path into the MCP configuration, so starting the Agent does not download the binary again. Run the latest `setup` again to upgrade. For development, build the binary from the `soha-cli` source and add it to `PATH`:

```bash
cd ../soha-cli
go run ./cmd/soha help
go build -o ./bin/soha ./cmd/soha
mkdir -p ~/.local/bin
install -m 0755 ./bin/soha ~/.local/bin/soha
soha help
```

If `~/.local/bin` is not already in `PATH`, add it to your shell configuration:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Current Gateway commands:

- `login`
- `auth status|sessions|revoke-session`
- `whoami`
- `logout`
- `profile list|show|use|remove`
- `context show|set`
- `capabilities`
- `tool call`
- `resource read`
- `prompt get`
- `token list|create|revoke|rotate|rotation-status`
- `service-account list|create|token-list|token-create|token-revoke|token-rotate|rotation-status`
- `audit list`
- `approval list|timeline|approve|reject|cancel`
- `governance status`
- `mcp`
- `mcp install`
- `setup`
- `skill list|install|status|update|remove|rollback`
- `diagnose`
- `completion bash|zsh`

`skill install` installs AI-readable workflows and methods only. It grants no additional permissions. Authorization still comes from the Gateway manifest, permission keys, scope grants, and MCP tool grants.

See [AI Gateway Examples](./ai-gateway-examples.md) for end-to-end MCP client, CI service account, delivery/Kubernetes workflow, access policy, and skill binding examples.

## Native Docker inventory (candidate versions)

The candidate CLI provides paginated, read-only discovery through existing Core APIs:

```bash
soha docker hosts list --search development --page 1 --page-size 20 --profile local
soha docker projects list --host-id host-1 --profile local
soha docker services list --host-id host-1 --project-id project-1 --profile local --output yaml
```

Each command requests one page. Inspect `data.total`, `data.page`, and `data.pageSize` before requesting another page. Filters depend on the resource type; use the command's help for supported options. The server applies the current role, Key permission ceiling, and configured resource scopes. A saved login does not grant additional workbench permissions.

Results contain a small inventory projection with `configurationHidden: true`. They omit configuration, environment values, Agent endpoints, and runtime container details. These lists do not implement conditional updates, full Docker CRUD, or container ownership verification. This section describes candidate behavior; it does not announce a release.

## Native Docker terminal (candidate versions)

Matching candidate Core, Agent and CLI versions can open a real PTY in a registered service. Review its full 64-character container ID from service inventory first:

```bash
soha docker projects terminal project-1 --service api --expected-container-id FULL_CONTAINER_ID --yes --profile local
soha docker projects terminal-session project-1 --session-id UUID --profile local
soha docker projects terminal-close project-1 --session-id UUID --yes --profile local
```

The interactive command requires terminal stdin and stdout and rejects `--output`. The user or Key needs current `docker.services.terminal` permission; Key permission ceilings still apply. Governed AI Keys continue through Gateway/MCP. The session freezes the project, service, full container ID and original login session or Key. Another credential cannot resume it. An unsupported Agent returns an error without falling back to the legacy Compose terminal.

An administrator must also explicitly add `docker.runtime.terminal.v1` to the matching Agent's `security.allowed_actions`. The older `docker.runtime.terminal` action and bound-identity configuration do not enable this protocol. The default installer still pins an older Agent; use the matching candidate Agent and its explicit configuration for this feature.

The daemon adapter accepts Linux `unix` and `tcp` endpoints, with mTLS available for TCP. Live daemon acceptance covers Linux rootless Docker. Windows daemon and `npipe` endpoints are unsupported; Windows CLI console tests use a loopback protocol fixture and do not establish Windows daemon support.

The default lease is 300 seconds; `--session-timeout-seconds` accepts 1–900 seconds, capped by original credential expiry. Input is limited to 1 MiB and merged output to 32 MiB. The one-use connection ticket stays out of URLs, and the CLI never reconnects automatically. `Ctrl-]` detaches locally and requests closure. Disconnection, revocation or an unknown result does not prove remote process termination: query the original `--session-id` and verify remote effects. Success or failure requires the original container identity and an observed process exit code.

## Native Kubernetes commands (candidate versions)

This section requires a candidate Core, Agent, and CLI combination containing the conditional resource APIs. It does not describe an available release. Check `soha k8s --help` locally first. An older server or Agent returns an error for unsupported conditional paths; the CLI retains the caller's UID/version protection.

```bash
soha k8s clusters list --profile local
soha k8s namespaces list --cluster-id cluster-1 --profile local
soha k8s resources list Deployment --cluster-id cluster-1 --namespace default --profile local
soha k8s resources get Deployment api --cluster-id cluster-1 --namespace default --profile local
soha k8s events list --cluster-id cluster-1 --namespace default --limit 100 --profile local
soha k8s logs query --cluster-id cluster-1 --namespace default --pods api-1 --tail 100 --profile local
soha k8s logs tail --cluster-id cluster-1 --namespace default --pods api-1 --profile local
```

`resources` currently supports 19 core kinds covering workloads, Pods, Nodes, configuration, network, storage, and namespaced RBAC. Check command help for the exact kinds. The server limits lists to authorized scopes. `--all-namespaces` applies only to lists; named operations use one namespace. Log queries are bounded, and tail polls for incremental results. Ctrl+C ends local following.

Read the identity and review the target before writing. Replace `UID` and `RV` below with that response's `uid` and `resourceVersion`, retaining those values until a new review:

```bash
soha k8s resources identity Deployment api --cluster-id cluster-1 --namespace default --profile local
soha k8s resources apply Deployment api --cluster-id cluster-1 --namespace default --file reviewed.yaml --expected-uid UID --expected-resource-version RV --dry-run --profile local
soha k8s resources apply Deployment api --cluster-id cluster-1 --namespace default --file reviewed.yaml --expected-uid UID --expected-resource-version RV --profile local
soha k8s workloads scale Deployment api --cluster-id cluster-1 --namespace default --replicas 2 --expected-uid UID --expected-resource-version RV --dry-run --profile local
soha k8s rollout status Deployment api --cluster-id cluster-1 --namespace default --profile local
soha k8s rollout history Deployment api --cluster-id cluster-1 --namespace default --profile local
```

Apply, restart, scale, and rollback use real Kubernetes dry-run. Deployment supports restart/scale/rollback, StatefulSet supports restart/scale, and DaemonSet supports restart. Rollback requires an explicit `--revision`. A changed UID/version, external resource ownership, or field conflict blocks mutation. Review again before a new intent; the CLI does not replace the reviewed version automatically or force field ownership. A workload receipt confirms an API update; inspect rollout or resource details for actual readiness.

`resources delete` also requires an explicit UID/version. A `deletion_requested` receipt acknowledges the request and preserves finalizers. Read again to confirm that the object disappeared. `--yes` only skips CLI confirmation and does not change server permissions.

Creation uses preflight and a stable request Key:

```bash
soha k8s create preflight --cluster-id cluster-1 --file reviewed.yaml --profile local
soha k8s create execute --cluster-id cluster-1 --file reviewed.yaml --idempotency-key create-1 --profile local
```

Retain the original file, Key, and operationId. After an unknown response, use the same file/Key with `--retry-original`. The server recovers an existing receipt first, or processes the first submission if the original request never arrived. Partial/failed batches still print the original receipt and return a nonzero exit code. Inspect completed items before deciding the next action.

Secret get/identity reads metadata by default. Secret YAML requires explicit `--show-secret-data` and separate server data permission. `--output raw` exports the authorized original content; protect exported files as sensitive data. Interactive TTY and TUI acceptance remain separate from the non-interactive argv path below.

Native commands serve authorized users and service accounts. Governed AI Keys use granted Gateway capabilities; the read-only `k8s-sre` remains read-only. `--yes`, client source fields, and Skill text do not grant write permissions. Switching to a broad profile must not bypass Gateway controls.

For governed Native scale goals, discover the candidate `k8s.workloads.scale` / `k8s.workloads.scale.assess` pair in the live manifest. The write requires independent approval and the original UID/version. Retain its original `mutationRequestId`, approved replicas and preconditions: verification requires a known applied receipt, the same credential and current permissions, and those desired replicas on the original UID. Later controller status revisions are allowed; rollout readiness and uninterrupted state are not assessed. The existing generic action and exact-revision assessment keep their original checks. Missing support does not authorize fallback or replay.

### Pod argv execution and original receipts

The candidate CLI executes the exact arguments after `--`, with no implicit
shell. Use a reviewed Pod UID and a stable key for this one intent:

```sh
soha k8s resources identity Pod api-1 --cluster-id cluster-1 --namespace default --profile local
soha k8s pods exec api-1 --cluster-id cluster-1 --namespace default --expected-uid UID --container app --idempotency-key exec-1 --yes --profile local -- printf '%s\n' 'literal $(value)'
soha k8s pods execution api-1 --cluster-id cluster-1 --namespace default --idempotency-key exec-1 --profile local
```

`--exec-timeout-seconds` defaults to 10 and is capped at 300. The combined retained
stdout/stderr budget defaults to 65,536 bytes and is capped at 1 MiB with
`--max-output-bytes`. `--stdin-file FILE|-` accepts at most 65,536 bytes; stdin
piping requires `--yes`. JSON/YAML preserve bounded process output and its encoding;
invalid UTF-8 uses base64. Text output escapes terminal control characters.
Known nonzero process exit codes from 1 through 255 become CLI exit codes; other
process codes remain in the structured receipt with a nonzero CLI result.

After a lost HTTP reply, query the original key or `--execution-id`. A repeated
original request returns its receipt; changing the target or input under the
same key conflicts. Running, timed-out, canceled, transport-lost and unknown
outcomes return a nonzero CLI status. Output and input are encrypted for seven
days, then removed; a minimal key tombstone prevents expired requests from
executing again. Audit records exclude command input and output.

Pod exec checks the UID before connecting and after normal completion. Kubernetes
does not support an atomic UID precondition on exec; a changed target or uncertain
result never authorizes automatic replay. Canceling a transport does not prove the
remote process stopped. Current identity, original credential expiry, permission
ceiling and resource scope remain enforced. Old Agents are unsupported without
a legacy shell fallback.

### Governed Pod execution through CLI tools and MCP

The matching candidate server exposes version 1 of `k8s.pods.exec` and
`k8s.pods.exec.receipt`. Use the dedicated `k8s-pod-executor` Skill and a credential
with Gateway invocation and Pod exec permission, scoped to the authorized
cluster, namespace and Pod. Capability discovery also requires Gateway view
permission. The read-only `k8s-sre` Skill does not include execution.

Save the reviewed request in `pod-exec.json`:

```json
{
  "clusterId": "cluster-1",
  "namespace": "default",
  "podName": "api-1",
  "idempotencyKey": "pod-check-1",
  "execution": {
    "expectedUid": "REVIEWED_POD_UID",
    "container": "app",
    "argv": ["printf", "%s", "hello"],
    "timeoutSeconds": 10,
    "maxOutputBytes": 65536
  }
}
```

```sh
soha tool call k8s.pods.exec --profile ai-pod --capability-version 1 --input pod-exec.json --yes
soha approval approve APPROVAL_ID --profile local --comment reviewed
soha tool call k8s.pods.exec.receipt --profile ai-pod --capability-version 1 --input-json '{"clusterId":"cluster-1","namespace":"default","podName":"api-1","idempotencyKey":"pod-check-1"}'
```

`ai-pod` represents the restricted credential; approval uses an authorized human
profile. `--yes` only confirms the submission. Execution requires independent
server approval even under an allow policy. MCP exposes the same tools, schemas,
approval and original receipt; a governed Key cannot use the native REST path
to bypass those controls. Both Direct and Agent connections are supported by
the matching candidate versions.

The receipt contains execution metadata. Separate `outputState` reports `text`,
`redacted`, `binary_withheld` or `unavailable`; Gateway text is redacted and
non-UTF-8 output is withheld rather than forwarded as base64. Original byte
counts describe the retained source bytes. Process success comes from the
receipt status and exit code. An unknown result does not authorize replay; query
the original key or execution ID. Approval views show input digests, not raw
argv or stdin. Matching candidate versions also support governed durable tasks
when protected persistence is explicitly enabled and the capability declares
original-call recovery and receipt verification. Missing prerequisites still
cause rejection. Recovery observes the original call and never replays an unknown
effect. `k8s.pods.exec.assess` proves only that the original process finished with
exit code zero, not business success or workload health. Interactive TTY remains
a separate native command.

### Explicit interactive terminals and session queries

The candidate command requires terminal stdin and stdout; piping and JSON output
cannot start it. Native TTY platform acceptance is recorded separately from argv
acceptance. The candidate TUI is described below.

```sh
soha k8s pods terminal api-1 --cluster-id cluster-1 --namespace default --expected-uid UID --container app --profile local
soha k8s pods terminal-session api-1 --cluster-id cluster-1 --namespace default --session-id UUID --profile local
soha k8s pods terminal-close api-1 --cluster-id cluster-1 --namespace default --session-id UUID --yes --profile local
```

The default shell is `/bin/sh`; explicitly selecting `/bin/bash` requires that
program in the container. `--session-timeout-seconds` defaults to 300 and is capped
at 900 and the original access expiry. The lease freezes Pod UID, container and
shell under current exec permission, resource scope and Kubernetes RBAC. A
60-second ticket travels only in a dedicated header, is bound to the original
credential and can be consumed once. Agents without the versioned TTY protocol
are unsupported.

PTY stdout/stderr are merged and support resize. Aggregate input is limited to
1 MiB and output to 32 MiB; keystrokes and terminal output are not stored. Startup
prints the session UUID. Ctrl-] disconnects and requests closure, and the CLI
restores local terminal state on exit. Disconnection does not prove the remote
process stopped. Closure may first report `closing`; query the original session.
Only a verified final result yields a known process exit code. Disconnection or
unknown results return nonzero without reconnecting or starting another shell.
Metadata and the encrypted authorization snapshot are retained for 24 hours
after closure or expiry.

## Native Delivery workbench commands (candidate versions)

These commands require the matching candidate CLI/Core/contracts combination. They operate through Soha HTTP APIs with the selected principal's domain permissions and application/environment scope. `--yes` confirms the local request; server approval and generation checks still apply. Governed AI keys continue to use Gateway/MCP and cannot bypass that policy through a native command.

```bash
soha delivery applications list --search api --limit 20 --profile local
soha delivery applications detail app-1 --profile local
soha delivery applications runtime app-1 --profile local
soha delivery services list --application-id app-1 --profile local
soha delivery environments list --application-id app-1 --environment-id env-dev --profile local
soha delivery environment-catalog list --profile local
soha delivery blueprints usage blueprint-1 --profile local
soha delivery manifests revisions package-1 --profile local
soha delivery manifests bindings package-1 --profile local
soha delivery manifest-deployments list --application-id app-1 --profile local
```

Applications, services and application environment bindings support `create/update/delete`. Pass typed JSON with `--input FILE` or `--input -`. Creation requires a stable `id` in the input; application/service updates require the reviewed `expectedVersion`, and environment updates require `expectedUpdatedAt`. A stale value produces a conflict. After an uncertain response, inspect the original ID before choosing another action: a stable resource ID is not a replayable idempotency key. Service commands always require `--application-id`.

```bash
soha delivery applications create --input application.json --yes --profile local
soha delivery services update service-1 --application-id app-1 --input reviewed-service.json --yes --profile local
soha delivery environments update binding-1 --input reviewed-environment.json --yes --profile local
soha delivery plans create --input reviewed-plan.json --yes --profile local
soha delivery plans get plan-1 --profile local
soha delivery plans confirm plan-1 --yes --profile local
soha delivery tasks get task-1 --profile local
soha delivery tasks logs task-1 --limit 200 --profile local
soha delivery tasks artifacts task-1 --profile local
soha delivery tasks wait task-1 --wait-timeout 10m --profile local
soha delivery tasks cancel task-1 --reason reviewed --yes --profile local
```

A plan can remain `waiting_approval`, and a `202` task response can still be queued or failed. `tasks wait` succeeds only after the server reports `completed`; failure, cancellation, timeout and unknown status return nonzero. Detaching or pressing Ctrl+C does not cancel the durable task. Logs are a bounded persisted query (1–1000 rows), not a runtime stream. `tasks cancel/retry` require the action-scoped `/control` protocol; an old server without it is unsupported and receives no legacy fallback or redirected POST.

Manifest configuration reads include package pages, revisions, bindings and desired/observed deployments. Binding writes use `manifest-bindings create/update/delete/set-revision`; creation requires `--package-id`, updates require `expectedVersion`, and revision selection requires `expectedGeneration`. Reconcile/repair/adopt/rollback use the existing server policy and reviewed generation. Rollback input selects exactly one of `targetRevision` or `useLastKnownGood`. Native rollout controls require the reviewed `uid` and `resourceVersion`. These commands do not replace runner capability, deployment health verification or approval. For a binding creation with an uncertain response, inspect the original package's bindings before another request.

## Native AI workbench commands (candidate versions)

The candidate CLI reads ordinary chats, personal assistants, and runs as JSON or YAML through the public Copilot API. Ordinary chat does not implicitly enable a personal assistant or provision compute. Personal features remain subject to server approval, current permissions, and session ownership.

```bash
soha ai chat sessions list --profile local
soha ai chat sessions main --yes --profile local
soha ai chat sessions create --input chat.json --yes --profile local
soha ai chat sessions get SESSION_ID --profile local
soha ai chat messages window SESSION_ID --limit 40 --profile local
soha ai assistant access get --profile local
soha ai assistant access request --yes --profile local
soha ai assistant ensure --yes --profile local
soha ai assistant sessions list --profile local
soha ai assistant tasks list --profile local
soha ai assistant artifacts list --profile local
soha ai runs list --session-id SESSION_ID --profile local
soha ai runs events RUN_ID --after-sequence 0 --profile local
soha ai runs cancel RUN_ID --yes --profile local
soha ai runs resume RUN_ID --input resume.json --yes --profile local
soha ai chat native-request SESSION_ID --request-id original-turn-1 --profile local
```

Use a public session input such as `{"title":"Incident follow-up","mode":"general"}` in `chat.json`, and `{"input":"Additional user information"}` in `resume.json`. Keep sensitive content in a file or `--input -`, rather than command arguments. Message-window cursors `--around`, `--before`, and `--after` are mutually exclusive; `--limit` is 3–100.

An access request does not approve itself. Explicit `ensure` creates or retrieves the approved user's assistant identity and main session. HTTP 202 from cancel means accepted; read the actual run state afterward. The CLI does not report it as stopped. `native-request` only looks up the original session and requestId, without resending or resuming a message. A 404 does not prove an in-flight submission cannot commit later. The opaque requestId is preserved and bounded to 128 Unicode code points.

Native commands do not grant Gateway tool, Skill, budget, or approval permissions. Governed keys must use supported Gateway/MCP paths; a native denial never falls back to a broader profile. The candidate `soha tui` uses the same server permissions and durable receipts. JSON and streaming checks alone do not establish TUI or real-model acceptance.

### Streaming submission and durable events

Review `turn.json`, for example `{"content":"Check the current task status","requestId":"original-turn-1"}`, before explicitly submitting:

```bash
soha ai chat messages stream SESSION_ID --input turn.json --yes --stream-timeout 10m --profile local
soha ai runs events RUN_ID --follow --session-id SESSION_ID --after-sequence 0 --wait-timeout 10m --profile local
```

Streaming commands emit NDJSON only. Each `source=submission` line carries a POST SSE event. A final `receipt.status=accepted` acknowledges submission; Native and external queues have not thereby completed. An explicit terminal receipt ends this stream. Damaged HTTP/frames, empty EOF or wait expiry return nonzero with an unknown-outcome warning. Preserve the original session/requestId and inspect it; never automatically resend. POST redirects are refused. Only an explicit authentication rejection before handler execution allows one refresh and retry.

`source=run-events` is a separate durable channel. Save each page's `nextSequence` and page while `hasMore`; never seed it from a submission connection's sequence. Following also reads the original session's authoritative run status. Completed exits successfully; failed/canceled/callback_timeout exit nonzero. Paused or waiting for input is not terminal. `resyncRequired` is printed before stopping: inspect the original run and explicitly choose a valid cursor, without automatically resetting or creating a replacement task.

Streaming defaults to a ten-minute wait, with a 2 MiB frame and 32 MiB total POST-response bound. An explicit global `--timeout` still limits each HTTP request. Ctrl+C or wait expiry detaches the viewer and does not cancel a durable task. To stop a task, explicitly use `ai runs cancel RUN_ID --yes`, then read its actual terminal state. Unsupported event APIs fail without a resend fallback.

## Interactive workbenches (candidate versions)

```bash
soha tui --profile local --cluster-id cluster-1 --namespace default
```

The TUI requires a real terminal. Keys 1–6 select workbenches, Tab changes views, and Enter opens details. Writes first show a review and require explicit `y`; current server permissions, scope and approval still apply. While following events, `q` detaches the viewer without canceling the durable task. Use its explicit cancel action and inspect the original run to confirm termination. Capability discovery determines available actions; the TUI does not provision personal compute or bypass Gateway restrictions.

## Directory synchronization and original requests (candidate versions)

Matching candidate CLI/Core versions provide organization preview, explicit synchronization and durable run queries. Preview does not write local directory projections. The server retains connector configuration and the people gate; the CLI does not export connector credentials.

```bash
soha directory sync preview --connection-id CONNECTION_ID --profile local
soha directory sync start --connection-id CONNECTION_ID --yes --profile local
soha directory sync request ORIGINAL_UUID --connection-id CONNECTION_ID --profile local
soha directory runs list --connection-id CONNECTION_ID --profile local
soha directory runs get RUN_ID --profile local
soha directory runs cancel RUN_ID --connection-id CONNECTION_ID --yes --profile local
soha directory runtime get --connection-id CONNECTION_ID --profile local
soha directory events list --connection-id CONNECTION_ID --limit 50 --profile local
```

Before sending, `sync start` prints a generated request UUID to stderr. Scripts may supply and retain a nonzero UUID with `--idempotency-key UUID`; use a fresh UUID for each new intent. Repeating the same UUID for its connection, original actor and credential only observes the original run, without another provider pull or projection. After a lost response, use `sync request`. Repeating the default `start` would generate a new UUID. Older Core versions without this protocol fail explicitly; the CLI does not fall back to legacy synchronization.

Preview and execution require `access.directory.sync`. Original-request lookup also requires `access.directory.view` and the original login session or Key. Current roles and the credential permission ceiling apply on every request. Canceling a running original request first returns `cancelRequested: true`; its state may remain `running` until execution stops. A later `canceled` state does not promise rollback of earlier committed changes. `queued/running` are not completion; `failed/partial/canceled` return a nonzero exit status. Preserve the UUID for diagnosis without automatic replay. Run lists remain capped at 50; the event list's `--limit` does not change that cap.

## Network operations and same-session MFA (candidate versions)

These commands require matching candidate Core/CLI versions and do not announce a release. Before issuing an access grant that requires MFA, verify an existing factor in the same login session. Another profile, session, or key does not inherit that session's MFA.

```bash
soha auth mfa status --profile local
soha auth mfa totp --profile local
soha auth mfa verify --challenge-id CHALLENGE_UUID --response-stdin --profile local
```

For an existing factor, `totp` starts step-up verification. Initial enrollment exposes an authenticator URI only with explicit `--show-enrollment`; view it in a private terminal. `verify` hides input on a real terminal and also accepts bounded stdin. Codes are never positional arguments. Verification does not expand domain permissions, and a key cannot borrow a user's session MFA.

```bash
soha network-access sessions plan SESSION_ID --input action.json --profile local
soha network-access sessions execute SESSION_ID --input reviewed-command.json --yes --profile local
soha network-access sessions command COMMAND_ID --session-id SESSION_ID --profile local
soha network-access sessions request ORIGINAL_PLAN_HASH --session-id SESSION_ID --profile local
```

Keep the server plan's `planHash` in the reviewed execution input. The CLI prints the original hash to stderr before submission. After an unknown response, query that hash or original command ID before another action. `pending/delivered` does not prove NAS execution. Reads recheck current permission and the parent session; unsupported older servers fail explicitly.

## Alert healing and original workflows (candidate versions)

```bash
soha observe events heal EVENT_ID --policy-id POLICY_ID --idempotency-key ORIGINAL_UUID --yes --profile local
soha observe healing-runs request ORIGINAL_UUID --event-id EVENT_ID --profile local
soha observe healing-runs get HEALING_RUN_ID --profile local
soha observe healing-runs approve HEALING_RUN_ID --input-json '{"comment":"Reviewed"}' --yes --profile local
soha observe healing-runs retry HEALING_RUN_ID --yes --profile local
```

`heal` prints the original UUID and creates a pending approval run. Recover an unknown response with the same actor and original login session or key; there is no legacy `/heal` fallback. Deleting a run never frees its UUID for recreation. When policy requires on-call approval, approval and rejection use the current on-call configuration; historical candidates cannot authorize a decision.

Approval persists a stable workflow ID and an `unknown` dispatch fence before invoking the existing executor. Duplicate approval only observes that workflow. Running or unknown outcomes cannot be retried or overwritten by rejection. Explicit retry accepts a rejected run or a known failed original workflow and opens a new pending approval generation. Earlier steps may have partial effects, so inspect them first. `completed` is the actual workflow state; verify the business goal against its resources. This protocol does not promise automatic completion after arbitrary process interruption.

## Login

> CLI v2 authentication is being prepared for release. The device, credential-store and rotation-recovery behavior below requires a matching Core/Web/CLI combination. Enable `auth.cli.enabled` only after compatibility verification. Older instances require explicit `--method legacy-password`; the new CLI never silently falls back to passwords.

Browser device authorization is the default, so third-party users do not need a local password:

```bash
soha login --server http://127.0.0.1:8080 --profile local
# Remote terminals or manual browser opening
soha login --server https://soha.example.com --profile local --device-code --no-browser
```

Open the complete URL printed by the terminal, sign in to the same Soha instance, and enter its six-digit code, including leading zeroes. Review the account, instance, terminal, permissions and expiry before explicitly approving or denying. A six-digit code alone cannot locate arbitrary requests. The request locator is a high-entropy, unguessable handle in the URL fragment; Web removes it before third-party login and retains it briefly in the current tab. Do not forward login links or approve requests initiated by someone else.

Accounts with MFA must verify an existing authenticator, Passkey or recovery code. Enrolling a new factor cannot replace verification with an existing factor. Requests expire after five minutes by default. Ctrl+C attempts cancellation. After a lost response, repeating login for the same server/profile resumes the original request. Use `--restart` to abandon it and review CLI sessions in your profile.

Local passwords remain an explicit compatibility path, subject to account and instance policy:

```bash
soha login --server http://127.0.0.1:8080 --profile local --method password --login admin
# Supply a password on stdin rather than in arguments or shell history
soha login --server http://127.0.0.1:8080 --profile local --method password --login admin --password-stdin
```

Instances requiring additional verification direct users to browser device login. SSO/MFA is not bypassed. Use `--method legacy-password` for the original endpoint on an older instance.

Key import accepts personal access tokens (PATs) and service-account tokens:

```bash
# Feed a Key from a secret manager or controlled stdin; never put it in arguments
soha login --server https://soha.example.com --profile local --with-token
soha whoami --profile local --json
```

Import validates the identity and stores the original Key without creating a refreshable user session. PATs retain their selected permissions; service-account tokens retain their service identity. An LLM Key does not automatically gain platform permissions. CI can inject `SOHA_SERVER` and `SOHA_TOKEN` for stateless authentication without a profile. Environment tokens are never refreshed or persisted. Logging out or removing a profile does not unset environment variables.

### Credential storage and isolation

Configuration defaults to `~/.soha/config.json`; isolate it with `SOHA_CONFIG=/abs/private/config.json`. New configuration stores references and metadata. The separate token envelope is bound to the server, deployment path and profile. Parent directories use `0700`, files use `0600`, and Windows uses a private ACL for the current user.

New login defaults to `--credential-store auto`, using the system credential store. Failure is explicit and never silently falls back. For a headless environment, choose `--credential-store file`; its private credential files contain plaintext secrets and must be protected accordingly. `ephemeral` only verifies credentials: it revokes a newly created password/device session before normal exit and leaves an imported shared Key active. It preserves existing profiles and returns `verified: true`, `authenticated: false`, `persisted: false` in JSON; session validation also returns `temporarySessionRevoked: true`. A failed revocation returns `ephemeral_cleanup_unconfirmed` and requires reviewing the session in Web. Use environment Key authentication for subsequent stateless commands. A legacy plaintext v1 profile migrates into a separate file envelope after its first successful refresh, retaining its existing storage choice. Sign in again to select the system credential store.

Concurrent refreshes of one profile use process locks and durable request IDs. New v2 CLI sessions default to fifteen-minute access, seven-day idle and thirty-day absolute expiry. Natural access expiry can refresh; revoked sessions, disabled accounts or absolute expiry require a new login. Existing Web/App/CLI refresh semantics remain compatible.

When rolling back to an older CLI, keep the new CLI available to recover or revoke v2 sessions, or revoke them in Web. An older CLI cannot read v2 credentials and may overwrite configuration fields it does not recognize. Run it with a new, separate `SOHA_CONFIG` path and sign in again; never point it at your migrated configuration or copy token values between files.

### Identity, logout and revocation

```bash
soha auth status --profile local --json
soha auth status --profile local --offline --json
soha whoami --profile local --json
soha auth sessions --profile local
soha auth revoke-session --profile local --id SESSION_ID
soha logout --profile local
soha logout --profile local --local-only
soha profile remove local
```

Online status and `whoami` query the server. Offline status describes local metadata and does not prove authentication. Default logout revokes a CLI user session before clearing its local reference; temporary server failure preserves recovery credentials. `--local-only` clears local authentication only. Key logout also removes only the local copy by default; explicit `--revoke` affects every client sharing the Key. `profile remove` deletes only local configuration. The profile's CLI sessions tab can revoke a terminal session from Web.

`profile show` displays metadata only. Never place credential files, full tokens, kubeconfigs or environment variables in logs, issues, AI conversations or diagnostic attachments.

## Profiles and context

```bash
soha profile list
soha profile show local
soha profile use local
```

AI client context is sent to the Gateway as request headers for auditing and tool-grant filtering:

```bash
soha context set \
  --profile local \
  --ai-client-id codex-local \
  --ai-client Codex \
  --skill-id delivery-developer \
  --source soha
```

The corresponding headers are:

- `X-Soha-AI-Client-ID`
- `X-Soha-AI-Client`
- `X-Soha-Skill-ID`
- `X-Soha-Source`

## Capability inspection

```bash
soha capabilities --profile local
soha capabilities --profile local --json
soha capabilities --profile local --output names
soha capabilities --profile local --output inputs
soha capabilities --profile local --domain platform --output names
soha capabilities --profile local --domain platform --output json
```

`capabilities` calls `GET /api/v1/ai-gateway/capabilities` and prints the tools, resources, prompts, skills, permission keys, and manifest summary available to the current identity. `--output inputs` summarizes required fields and properties from each tool's manifest `inputSchema` and `outputSchema`.

`--domain platform` calls `GET /api/v1/clusters/capabilities` instead and prints the runtime capability matrix for Direct and Agent connection modes. It reports YAML apply/delete, CRD, Helm, logs, exec, port-forward, Docker runtime, and related capabilities as `available`, `partial`, or `unsupported`. Platform capabilities support `json`, `yaml`, and `names`; `inputs` applies only to the default Gateway manifest.

If a capability is missing, check:

- The active profile points to the intended server.
- The user or token has `ai.gateway.view`.
- The business tool's domain permissions, such as `delivery.*`, are granted.
- `mcp_tool_grants` has not narrowed the tool set.
- `ai_access_policies` or `ai_gateway_skill_bindings` has not narrowed the current AI client, role, or subject.

## Tool calls

Call a Gateway tool manually as a fallback:

```bash
soha tool call k8s.pods.list \
  --profile local \
  --input ./pod-list-input.json
```

`--input -` reads JSON from standard input. You can also use `--input-json '{"clusterId":"cluster-a","namespace":"prod"}'`. The CLI calls only `POST /api/v1/ai-gateway/tools/:toolName/invoke`; it does not access the database, Kubernetes, or runners directly.

## Resources and prompts

Read a Gateway MCP resource or prompt when diagnosing the context visible to an MCP client:

```bash
soha resource read soha://delivery/applications \
  --profile local \
  --context-json '{"applicationId":"app-1"}'

soha prompt get soha.delivery.plan_release \
  --profile local \
  --arguments-json '{"applicationId":"app-1"}' \
  --context-json '{"environmentId":"dev"}'
```

`resource read` calls only `POST /api/v1/ai-gateway/resources/read`; `prompt get` calls only `POST /api/v1/ai-gateway/prompts/get`. `--context -` and `--arguments -` read JSON from standard input, but only one argument source may use standard input in a single command. Output follows the CLI redaction rules.

## Tokens and service accounts

Personal tokens:

```bash
soha token list --profile local
soha token create --profile local --name codex-local --permission-keys ai.gateway.view,ai.gateway.invoke
soha token revoke --profile local pat-123
```

Service accounts:

```bash
soha service-account list --profile local
soha service-account create --profile local --name ci-runner --role-ids delivery-operator
soha service-account token-list --profile local
soha service-account token-create --profile local --service-account-id sa-123 --name ci-token
soha service-account token-revoke --profile local sat-123
```

The backend returns a newly created plaintext token once. `token-list` returns only the token ID, owning service account, prefix, permissions, scopes, expiry, last-used time, and revocation state. List, audit, and diagnostic output is redacted by default and does not expose token hashes, kubeconfigs, environment variables, or secret-like fields.


### Key expiry and rotation recovery

New Keys created or rotated by the new CLI or Web default to ninety days, with an explicit future expiry also supported. Legacy API omission semantics remain unchanged; existing unlimited Keys are not rewritten.

```bash
soha token rotate --profile local --id PAT_ID --auth-profile manager
soha token rotation-status --profile local --request-id REQUEST_UUID --auth-profile manager
soha service-account token-rotate --profile local --id SAT_ID --auth-profile manager
soha service-account rotation-status --profile local --request-id REQUEST_UUID --auth-profile manager
```

Successful rotation immediately revokes the old Key. For a shared Key, create a replacement, update and verify every client, then revoke the old Key to arrange a smooth transition. Rotation requires a different valid session or management Key. `--auth-profile` must use the same instance and ignores ambient `SOHA_TOKEN`.

Before sending, the CLI saves a non-secret request ID and prints it to stderr. Query that original ID after a lost response. The server creates the replacement, revokes the old Key and records the outcome in one transaction. Recovery returns only the replacement ID and completion status, never the new plaintext again. If it was not saved, revoke the replacement and create another Key. Web also retains a rotation recovery record in the current tab. Do not generate another request ID to guess whether the previous rotation completed.

## Audit

Query Gateway audit records:

```bash
soha audit list --profile local --tool-name diagnosis.release_failure.analyze --limit 20
soha audit list --profile local --actor user-1 --from 2026-05-29T00:00:00Z
```

Filters include actor, actor type, AI client, skill, tool, risk level, result, action, from/to, and limit. Times use RFC3339.

## Governance

Inspect Gateway governance health and operational metrics:

```bash
soha governance status --profile local
soha governance status --profile local --window-hours 48 --json
```

`governance status` calls `GET /api/v1/ai-gateway/governance/status`. It uses the last 24 hours of audit records by default; explicit `--window-hours` values are limited to 1 through 168. Output covers health checks, successful/denied/failed calls, pending approvals, approval SLA, PAT and service-token usage, AI client registration status, budget/rate-limit/redaction/resource-scope coverage, and anomalous findings. Text output is redacted and includes structured recommendation actions. `--json` preserves the complete redacted DTO. Configured rate limits, budgets, redaction policies, and resource scopes are enforced by the backend before invocation; the CLI only displays the governance summary.

## Approval requests

Use the CLI to inspect and decide approval requests found in governance output or the Console:

```bash
soha approval list --profile local --status pending --tool-name delivery.actions.trigger
soha approval timeline approval-123 --profile local
soha approval approve approval-123 --profile local --comment "approved in change window"
soha approval reject approval-123 --profile local --comment "missing rollback plan"
soha approval cancel approval-123 --profile local --comment "duplicate request"
```

`approval list` proxies `GET /api/v1/ai-gateway/approval-requests` and supports ID, status, actor, actor type, AI client, skill, tool, risk level, strategy, time, and limit filters. `approval timeline` proxies `GET /api/v1/ai-gateway/approval-requests/:requestID/timeline`. Approval commands proxy the existing approval APIs; candidate approvers, change windows, multi-stage quorum, AI client activation, and tool replay remain backend responsibilities. CLI output redacts tool input, decision comments, execution output, and related metadata.

## MCP stdio server and Agent configuration

Start the local server:

```bash
soha mcp --profile local
soha mcp --profile local --base-url https://soha.internal.example
```

The official hosted endpoint `https://mcp.opensoha.com` is the default. Self-hosted deployments must pass `--base-url` explicitly. Configure an Agent's MCP and Skills together with:

```bash
soha setup --client codex --mode both --profile local
soha setup --client codex --scope project --mode both --profile local
soha setup --client claude --mode mcp --base-url https://soha.internal.example
soha setup --client codex --check
```

The default `--scope user` writes user-level configuration. `--scope project` writes repository-local client configuration, the Agent skill, and the `.soha/skills` runtime. Explicit `--config`, `--dest`, and `--runtime-skill-dest` values override the scope. Supported clients are `codex`, `claude`, `cursor`, `kiro`, `gemini`, `antigravity`, `antigravity-ide`, and `trae`.

To print generic MCP JSON manually, use:

```bash
soha mcp install --profile local --command /usr/local/bin/soha
```

The generated command arguments use the direct `mcp` entry point:

```json
{
  "mcpServers": {
    "soha": {
      "command": "/usr/local/bin/soha",
      "args": ["mcp", "--profile", "local"]
    }
  }
}
```

Without `--profile`, `mcp install` uses the current profile. `--ai-client-id`, `--ai-client`, and `--skill-id` are written into the generated `mcp` arguments to pin the audit source, AI client context, and skill binding. `mcp start` remains a compatibility form.

The MCP server supports:

- `initialize`
- `tools/list`
- `tools/call`
- `resources/list`
- `resources/read`
- `prompts/list`
- `prompts/get`

The local process is an AI Gateway proxy. It does not directly access PostgreSQL, Kubernetes, Docker, runner workspaces, or the local kubeconfig, and it cannot bypass backend permissions. Tool, resource, and prompt lists are generated dynamically from the Gateway manifest. Schemas and `_meta.soha` metadata describe inputs, outputs, permission keys, scopes, adapters, risk, and approval requirements. Tool calls, resource reads, and prompt requests are always proxied through the corresponding backend endpoints.

Resources use manifest URIs such as `soha://delivery/applications`, `soha://delivery/execution-tasks`, and `soha://k8s/runtime`. Prompts include `soha.delivery.plan_release` and `soha.k8s.diagnose_workload`. Skill bindings can further narrow the resources and prompts visible to a client.

## Skills

The initial built-in Skills are:

- `delivery-developer`
- `delivery-tester`
- `k8s-sre`
- `security-change`

List Skills from the latest stable GitHub Release:

```bash
soha skill list
```

Install one Skill:

```bash
soha skill install \
  --dest ~/.soha/skills \
  delivery-developer
```

Install all Skills:

```bash
soha skill install --all
```

The default source is the latest stable `opensoha/soha-skills` GitHub Release, never a branch. Pin a release for reproducible installs or rollback with `--source github:opensoha/soha-skills@v0.1.0`. Local checkouts, release tarballs, and HTTPS release URLs remain supported through `--source`. The default destination is `~/.soha/skills`; `--scope project` uses `.soha/skills` in the current repository, while explicit `--dest` or `SOHA_SKILLS_DIR` values override the default.

Install and update stage a complete generation before activation. The previous verified generation remains available for rollback, and operations append to the local JSONL installation audit:

```bash
soha skill status
soha skill update
soha skill remove k8s-sre
soha skill rollback
```

Skills describe workflows; they are not a security boundary. An AI client must still use MCP tools visible to its current identity.

## Diagnostics

```bash
soha diagnose --profile local
soha diagnose --profile local --tool k8s.pods.logs
soha diagnose --profile local --resource soha://k8s/runtime
soha diagnose --profile local --prompt soha.k8s.diagnose_workload
soha diagnose --profile local --cluster-capability resource.yaml.apply
soha diagnose --profile local --tool k8s.pods.logs --ai-client-id codex-local --skill-id k8s-sre --source codex-mcp
```

`diagnose` validates the profile, server, token, and Gateway capability path, then prints tool/resource/prompt/skill/permission-key counts. Tool diagnostics include risk, approval requirements, permission keys, scopes, and summarized input/output schemas. Resource and prompt diagnostics identify the relevant permissions and binding context. AI client flags override only the current diagnostic request and do not modify the profile. Tokens are never printed.

`--cluster-capability` reads the platform capability matrix and explains the selected capability's Direct/Agent support, required scopes, risk, approval requirement, and documentation URL.

## Completion

```bash
soha completion bash
soha completion zsh
```
