# soha

`soha` is the local entry point for the Soha AI Gateway. It handles login, stores local profiles, declares AI client context, starts the MCP stdio server, and inspects the Gateway capabilities available to the current identity.

The CLI does not perform platform actions directly. Every MCP tool call is proxied through the Soha backend:

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
- `profile list|show|use`
- `context show|set`
- `capabilities`
- `tool call`
- `resource read`
- `prompt get`
- `token list|create|revoke`
- `service-account list|create|token-list|token-create|token-revoke`
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

## Login

```bash
soha login \
  --server http://localhost:8080 \
  --login admin \
  --profile local \
  --ai-client codex \
  --ai-client-id codex-local
```

If `--password` is omitted, the CLI reads the password from standard input.

The local configuration defaults to:

```text
~/.soha/config.json
```

Set `SOHA_CONFIG=/abs/path/config.json` to use another path. The CLI writes the configuration file with `0600` permissions and creates parent directories with `0700` permissions.

`profile show` displays redacted tokens only. Never put full tokens, kubeconfigs, environment variables, or service account secrets in logs, issues, AI conversations, or diagnostic attachments.

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
