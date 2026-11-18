# Local Development

## Dependencies

### PostgreSQL

- version: PostgreSQL 18.4 with pgvector 0.8.5
- host: `localhost`
- port: `5432`
- database: `soha`
- username: `pgsql`
- password: `pgsql`

### Initial Administrator

- username: `opensoha`
- email: `opensoha@soha.local`
- password: `opensoha`

These are Soha's standard initial credentials in every deployment form. Override either value only when the installation needs different credentials.

### System Secrets

JWT, runner, webhook, and credential encryption all use `soha-123456789012345678901234567890` by default. Local startup does not create or lock a SecretStore file. Use config or environment overrides when testing custom values. Do not change the credential encryption key after encrypted test data exists unless that data is migrated or can be discarded.

## Initialize Local Development Dependencies

```bash
npm ci
make init
```

Run the Make commands from the Root `soha` checkout.

`npm ci` installs the Node dependencies from the Root lockfile. `make init` checks Go module hygiene against the same-checkout SDK and initializes the selected database mode. `DEV_DB_MODE` defaults to `external`, so initialization uses the database configured in `configs/config.yaml` without starting a local database. To start the Compose PostgreSQL service instead, run `make DEV_DB_MODE=local init`.

## Start Backend and Frontend

```bash
make
```

Local frontend development does not rely on an in-repository frontend `.env` template file. By default:

- `web/src/services/api-client.ts` requests same-origin `/api/v1`
- `web/vite.config.ts` proxies `/api` to `http://127.0.0.1:8080`
- `soha` redirects `/docs/` to the configured external documentation URL by default
- To test documentation integration locally, start the `soha-docs` dev server and configure the frontend or backend to use docs proxy mode

Optional shortcut commands:

```bash
make init
make dev-api
make dev-web
```

## Start Docs

```bash
cd ../soha-docs
npm install
npm run dev
```

`soha-docs` is a standalone Next.js/Nextra site. Official i18n routes use `/zh`, `/zh/docs/...`, `/en`, and `/en/docs/...`; unprefixed `/` and `/docs/...` requests redirect through the `nextra/locales` proxy based on `NEXT_LOCALE` or browser language preferences. When publishing to `https://docs.opensoha.dev/`, set `DOCS_BASE_URL` to match the target deployment path.

## Historical MVP Runtime Notes

The following describes the earlier MVP development setup; the current Make targets do not bootstrap a local Kubernetes cluster.

The backend bootstraps a local development cluster from `configs/config.yaml` and reads the generated kubeconfig from `./.dev/k3s/kubeconfig.yaml`.

The minimal MVP exposes:

- cluster list
- namespace list
- pod list
- deployment list
- audit write for read APIs
