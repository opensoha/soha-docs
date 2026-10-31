# Environment Overrides

## Backend

soha no longer uses `.env.example` as its primary configuration source.

Backend configuration lives in `configs/config.yaml`. Environment variables are only used for overrides when deployment environments need to change file defaults.

Typical overrides:

- `SOHA_CONFIG_FILE`
- `SOHA_HTTP_ADDR`
- `SOHA_LOGGER_LEVEL`
- `SOHA_LOGGER_FORMAT` (defaults to `json` in production; use `console` for local debugging)
- `SOHA_DATABASE_HOST`
- `SOHA_DATABASE_PORT`
- `SOHA_DATABASE_NAME`
- `SOHA_DATABASE_USER`
- `SOHA_DATABASE_PASSWORD`
- `SOHA_AUTH_DEV_PRINCIPAL_PASSWORD`
- `SOHA_AUTH_JWT_SECRET`
- `SOHA_RUNTIME_EXECUTION_RUNNER_TOKEN`
- `SOHA_MONITORING_WEBHOOK_TOKEN`
- `SOHA_SECURITY_CREDENTIAL_ENCRYPTION_KEY`
- `SOHA_SECURITY_SECRET_PROVIDER`
- `SOHA_SECURITY_VAULT_KV2_ADDRESS`
- `SOHA_SECURITY_VAULT_KV2_TOKEN`
- `SOHA_SECURITY_VAULT_KV2_NAMESPACE`
- `SOHA_SECURITY_VAULT_KV2_TIMEOUT`
- `SOHA_SECURITY_VAULT_KV2_MAX_RESPONSE_BYTES`
- `SOHA_REDIS_ADDR`
- `SOHA_AUTH_ENABLE_DEV_AUTH`

The repository config and all deployment forms default the database password to `pgsql` and the initial `opensoha` administrator password to `opensoha`. Soha does not vary or reject these standard initial credentials based on an application environment label; both remain explicitly overridable.

The JWT signing secret, execution runner token, monitoring webhook token, and credential encryption key all default to `soha-123456789012345678901234567890`. Soha accepts that documented value and does not require a SecretStore file, writer lease, or secret PVC at startup. Public or formal deployments should override all four variables independently. Changing `SOHA_SECURITY_CREDENTIAL_ENCRYPTION_KEY` requires migrating existing ciphertext first; otherwise previously stored credentials cannot be decrypted.

Set `SOHA_SECURITY_SECRET_PROVIDER=vault_kv2` to enable Vault-backed Secret versions. `SOHA_SECURITY_VAULT_KV2_TOKEN` is a server credential: inject it through the deployment secret mechanism and do not expose it to CLI, Web, MCP, skills, or OpenAPI callers. Vault-backed versions pin a KV v2 version; an unavailable provider fails closed.

Runner and Gateway examples also use these operational variables:

- `SOHA_EXECUTION_RUNNER_TOKEN`: shell/example helper used to pass the bearer token to runner or Helm commands; the backend Viper override is `SOHA_RUNTIME_EXECUTION_RUNNER_TOKEN`.
- `HERMES_CONTROL_PLANE_URL`: optional override for the Hermes runner control-plane URL in local compose examples.
- `SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND`: optional AI Gateway rate-limit backend, for example `redis`.
- `SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR`: Redis address used by the AI Gateway rate limiter when Redis is selected.

CLI and tutorial examples use these client-side variables:

- `SOHA_CONFIG`: alternate local CLI profile file path.
- `SOHA_TOKEN`: bearer token used by direct curl examples.
- `SOHA_SERVER`: base URL used by direct curl examples.
- `SOHA_SKILLS_SOURCE`: alternate source directory for local skill installation.
- `SOHA_SKILLS_DIR`: alternate local skill installation directory.

## Frontend

- `VITE_API_BASE_URL` overrides the API base; its default is same-origin `/api/v1`
- the candidate `VITE_BASE_PATH=/team/` build prefixes assets, Router paths and the default API base; export it when building or starting Vite
- `VITE_API_PROXY_TARGET` selects the development upstream, default `http://127.0.0.1:8080`, in `soha-web/vite.config.ts`
- the in-app docs page opens `/docs/`; the `soha` server redirects that path to the configured external docs URL by default

For a prefixed production deployment, configure request and cookie-path rewrites as described in [deployment](./deployment.md#deploying-the-candidate-web-under-a-path-prefix). Build-time Web variables are public and must never contain credentials. Prefer a same-origin reverse proxy so browser session cookies and authorization checks use the intended instance.

## Docs

`soha-docs` has its own build-time configuration.

- `DOCS_SITE_URL`: published site origin, default `https://docs.opensoha.dev`
- `DOCS_BASE_URL`: published path prefix, default `/`
- `DOCS_SHOW_LAST_UPDATE_TIME`: retained for docs workflow compatibility; Nextra does not currently render it

For `https://docs.opensoha.dev/`, build with `DOCS_BASE_URL=/`. For `https://opensoha.dev/docs/`, build with `DOCS_BASE_URL=/docs/`.

## CLI authentication isolation (pending release combination)

- `SOHA_AUTH_CLI_ENABLED`, `SOHA_AUTH_CLI_PUBLIC_URL` and `SOHA_AUTH_CLI_ALLOW_PASSWORD` control new Core session endpoints, disabled by default; see [configuration](./configuration.md). Other CLI TTL/budget fields use the corresponding `SOHA_AUTH_CLI_*` mapping.
- CLI `SOHA_CONFIG` selects a private configuration path. Use separate paths for worktrees, instances and CI jobs.
- Providing CLI `SOHA_SERVER` and `SOHA_TOKEN` together enables stateless environment authentication without reading or refreshing a profile. The token is never persisted.
- Overriding only `SOHA_SERVER` cannot send stored credentials to another origin or deployment path; mismatches return `server_mismatch` before network access.
- `SOHA_TOKEN` overrides local authentication and is not unset by logout. Remove it from the shell/job environment.
