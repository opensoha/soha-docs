# Deployment

## Install a published release

The Core image embeds the Web console and serves it alongside the API. PostgreSQL stores application data. The docs site, the remote cluster Agent and the optional Operator have their own release cycles.

Recommended delivery boundaries:

- **Docker Compose**: local development and single-host trials; follow [First Deploy](../tutorials/first-deploy.md) for Core `v0.1.13` rather than treating Compose as the primary production orchestrator.
- **Standalone `docker run`**: single-container host deployment when an external PostgreSQL server is already reachable.
- **Helm (primary Kubernetes path)**: the [Soha Helm repository](https://github.com/opensoha/soha-helm) publishes `soha`, `soha-agent`, `soha-operator`, and compatible `soha-hermes-agent` charts (check each published chart's `appVersion` before upgrading).
- **Raw Kubernetes / Kustomize**: lightweight manifest customization entrypoint under `deploy/deployment.yaml` and `deploy/kustomization.yaml`.
- **Native Linux archive**: self-contained tarball bundling the binary, SQL migrations, and configuration template.
- **Image roles**: Core uses `ghcr.io/opensoha/soha`; Agent and runtime workloads use `ghcr.io/opensoha/soha-agent`, `ghcr.io/opensoha/soha-dsh`, and Buildpacks variants; the CLI tool image `ghcr.io/opensoha/soha-cli` is an artifact for multi-stage builds and operational containers (for example, `COPY --from=ghcr.io/opensoha/soha-cli:v0.2.1 /usr/local/bin/soha /usr/local/bin/soha`), not a long-running workload.

Keep the manifest or chart and the image versions aligned when you upgrade. Replace the initial credentials and all four public system keys before exposing the installation; see [Configuration](./configuration.md).

Core `v0.1.13` ships with `dsh_runtime` and `hindsight` disabled by default. Enabling new Chat and Heya requires deploying the matching `ghcr.io/opensoha/soha-dsh:v0.2.0` service and completing the setup in [Agent Runtime](./agent-runtime.md) (Core `v0.1.12` and earlier used the legacy built-in runtime).

## Standalone Docker Container (External PostgreSQL)

Run the application container directly without Compose when an external PostgreSQL 18 instance with `vector` and `pg_trgm` is reachable. This example binds to loopback for local use.

Set `SOHA_DOCKER_ENV_FILE` to the path of a private Docker environment file. Populate it with the database password (`SOHA_DATABASE_PASSWORD`), a unique bootstrap password (`SOHA_AUTH_DEV_PRINCIPAL_PASSWORD`), and fresh values for `SOHA_AUTH_JWT_SECRET`, `SOHA_RUNTIME_EXECUTION_RUNNER_TOKEN`, `SOHA_MONITORING_WEBHOOK_TOKEN`, and `SOHA_SECURITY_CREDENTIAL_ENCRYPTION_KEY`. Set file permissions to `0600`. Before exposing the service, use these custom credentials and keys and terminate TLS at the external ingress.

```bash
docker run -d \
  --name soha \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  --mount source=soha-data,target=/app/data \
  --add-host host.docker.internal:host-gateway \
  -e SOHA_DATABASE_HOST=host.docker.internal \
  --env-file "${SOHA_DOCKER_ENV_FILE:?set the path to a private environment file}" \
  ghcr.io/opensoha/soha:v0.1.13
```

Soha does not require a `SecretStore` volume, secret bundle, or single-writer lease. Multiple API replicas may connect to the same PostgreSQL database behind a load balancer when they share identical configuration and system keys.

### Software Library Object Storage And Legacy Migration

The `soha-data` volume persists companion runtime data only; Software Library packages require an enabled S3-compatible integration (**Internal Workbench -> Software Library**) rather than local container storage. Supported endpoints include AWS S3, MinIO, Alibaba Cloud OSS, Tencent Cloud COS, and custom S3-compatible stores (private endpoints require **Allow private endpoint**; plain HTTP additionally requires **Allow HTTP**). Endpoint and bucket settings are immutable after creation; rotate credentials in place or add a new integration when migrating storage.

Upgrades stop with a migration error if `data/software/index.json` (or `SOHA_SOFTWARE_STORAGE_DIR`) is still present. Before upgrading, stop the previous release and move the legacy directory to a backup location; start the new release, configure and test S3-compatible storage, re-upload each indexed package with its original metadata and file name, and verify counts, byte totals, SHA-256 digests, and downloads before removing the backup.

## Kubernetes Deployment (Helm And Kustomize)

Install Core and the remote cluster Agent from the public Helm repository:

```bash
helm repo add opensoha https://opensoha.github.io/soha-helm
helm repo update
helm install soha opensoha/soha --namespace soha --create-namespace
helm install soha-agent opensoha/soha-agent \
  --namespace soha \
  --set-string config.controlPlane.baseUrl="https://soha.example.com"
```

The `soha-agent` chart reads only `soha-config/execution-runner-token` by default and generates its own inbound agent token when needed. When deploying the agent in a separate namespace, sync only that runner key with an External Secrets controller and set `secrets.controlPlaneExistingSecret.name` and `key`.

Identity Outpost can be deployed from `soha/agent` or via the `soha-agent` Helm chart with `mode=outpost` (pin a released agent image supporting Identity Outpost protocol `v1`; NGINX Ingress and Traefik ForwardAuth examples live under `agent/deploy/kubernetes/outpost/examples` in the Core repository).

Without Helm, customize and apply the raw Kustomize baseline under `deploy/`:

```bash
cd deploy
kustomize edit set image ghcr.io/opensoha/soha=ghcr.io/opensoha/soha:v0.1.13
cd ..
kubectl apply -k deploy
```

Raw Kubernetes manifests and Helm charts use TCP liveness and `/readyz` startup/readiness probes. A database outage removes readiness without restarting Core for that dependency failure alone; startup allows five minutes for migrations and can be extended for large existing databases.

## Native Linux Archive

Download `soha-linux-amd64.tar.gz` from a release that provides the installation archive, verify its `.sha256` checksum, and extract it into a new empty directory. The archive includes the `soha` binary, all `migrations/postgres/` SQL files, and `configs/config.example.yaml`; follow [`deploy/native/README.md`](https://github.com/opensoha/soha/blob/main/deploy/native/README.md). The standalone `soha-linux-amd64` binary asset is retained only for existing installations that already hold matching migration files and is not sufficient for a fresh install by itself.

## Build from source

Use Docker with BuildKit, Compose, Make and the Node version declared in Web CI. Check out the matching Root `soha` revision; it contains Core, Web (`web/`) and Contracts (`contracts/`) in one source tree. Tagged builds use the Web artifact for the corresponding release.

Run from the `soha` checkout:

```bash
npm ci
make deploy-image
docker compose -f deploy/docker-compose.yaml up -d --no-build --wait soha
```

`make deploy-image` builds Web, stages its output in `internal/staticassets/web/dist` and builds the local Core image. Compose mounts `configs/config.example.yaml` and sets the database host to `postgres`. Set `SOHA_COMPOSE_CONFIG_FILE=../configs/config.yaml` to use an existing private configuration. Relative paths are resolved from `deploy/`.

For a local chart checkout, render with `helm template soha ../soha-helm/charts/soha`. Use the image versions listed for that chart.

## Soha Operator

The Soha Operator is an optional, independently versioned component for cluster-local `WorkloadCronJob` automation. Install its public Helm chart from the OpenSoha chart repository:

```bash
helm repo add opensoha https://opensoha.github.io/soha-helm
helm repo update
helm install soha-operator opensoha/soha-operator \
  --namespace soha-operator \
  --create-namespace
```

To install the release manifests directly with Kustomize instead, pin the operator tag:

```bash
kubectl apply -k "https://github.com/opensoha/soha-operator//config/default?ref=v0.1.1"
```

Operator `v0.1.1` uses the public multi-architecture image `ghcr.io/opensoha/soha-operator:0.1.1` for `linux/amd64` and `linux/arm64`. The Helm chart and operator runtime have independent version numbers; use the chart `appVersion` as the default runtime image version (the published `soha-operator` chart `0.1.2` targets `appVersion` `0.1.1`).

## Local Run Assumptions

- PostgreSQL at `localhost:5432`, database `soha`, user `pgsql`, password `pgsql`
- kubeconfig available at `$HOME/.kube/config` unless overridden
- frontend dev server at `http://localhost:5173`
- docs dev server at `http://localhost:3000/`

## Hermes Agent Runner with Docker

The released Compose file retains a separate Hermes runner profile for explicitly configured Hermes workloads. `soha-hermes-agent` stopped publishing new images after `v0.1.12`, while existing `v0.1.12` and earlier images remain available for compatible integrations. The command below assumes the Core Compose stack from [First Deploy](../tutorials/first-deploy.md) and the same secret configuration used to start it.

```bash
SOHA_IMAGE=ghcr.io/opensoha/soha:v0.1.13 \
SOHA_HERMES_IMAGE=ghcr.io/opensoha/soha-hermes-agent:v0.1.12 \
SOHA_HERMES_BIND=127.0.0.1 \
  docker compose -f deploy/docker-compose.yaml --profile hermes up -d --no-build hermes-agent-runner
```

The runner uses `http://soha:8080` on the Compose network and shares the configured Core execution runner token. Keep the `soha-hermes-data` and `soha-hermes-runtime` volumes for state and workspaces. Use the `hermes-setup` profile if provider credentials need initialization.

```bash
docker compose -f deploy/docker-compose.yaml --profile hermes-setup run --rm hermes-agent-setup
docker compose -f deploy/docker-compose.yaml --profile hermes logs --tail 50 hermes-agent-runner
```

## PostgreSQL 18.4 and pgvector 0.8.5

New local volumes and fresh cluster installs use `pgvector/pgvector:0.8.5-pg18-trixie`, currently based on PostgreSQL 18.4 and the same Debian generation as the standard PostgreSQL 18.4 image. Application migrations enable `vector` and `pg_trgm`; bundled deployments also preload and create `pg_stat_statements`. External PostgreSQL 18 servers must provide pgvector and `pg_trgm` before startup. If the migration user cannot create extensions, an administrator must create them first. Keep the database image's libc collation version compatible with the image that initialized an existing data volume.

`pg_stat_statements` is optional for external PostgreSQL. To enable it, add `pg_stat_statements` to `shared_preload_libraries`, set `compute_query_id=on`, restart PostgreSQL, and create the extension in the Soha database. Leaving it disabled does not block Soha startup.

PostgreSQL 18 stores its default `PGDATA` below `/var/lib/postgresql/18/docker`, so compose, raw Kubernetes, and Helm mounts keep the persistent volume at `/var/lib/postgresql`. If an existing environment already has a PostgreSQL 16 data directory, do not point the PostgreSQL 18 pgvector image at the same volume directly. Use `pg_dump`/`pg_restore`, logical backup restore, or a controlled `pg_upgrade` path. For disposable local development data, remove the old PostgreSQL volume and recreate the stack. Current compose pins `soha-postgres-data`.

## Virtualization Runtime Notes

- Docker Desktop for macOS, especially Apple Silicon, is not a reliable validation path for local KubeVirt or nested Proxmox VE labs.
- Keep local k3s for platform control-plane and Kubernetes API-path testing.
- Validate KubeVirt and PVE features against real external servers or dedicated lab hosts, then register those endpoints in soha.
- See the [KubeVirt and PVE Virtualization Lab Runbook](./virtualization-lab-runbook.md) for external environment prerequisites and the acceptance checklist.

## CLI sessions across restarts

New CLI v2 endpoints require matching versions and administrator opt-in; see [authentication configuration](./configuration.md#cli-v2-authentication-policy-pending-release-combination). Retain PostgreSQL and the JWT and credential-encryption keys. A normal process restart should not delete valid sessions. Check `readyz`, versions, server/profile selection and `auth status` before distinguishing access expiry, rejected refresh, environment overrides or revocation. Do not clear the database or regenerate keys to troubleshoot login.

### Deploying the candidate Web under a path prefix

Build Web with `VITE_BASE_PATH=/team/`, set the CLI public URL to `https://soha.example/team`, and configure each login provider's frontend callback as `https://soha.example/team/login/callback`. The reverse proxy must strip `/team` from upstream API requests **and rewrite response cookie paths**: `/api/v1/auth` becomes `/team/api/v1/auth`, and `/` becomes `/team/`. Otherwise third-party login can initially succeed while a page reload loses the refresh cookie. Apply the same rules to refresh and logout responses. The Vite development proxy performs these rewrites when a prefix is configured; a production proxy needs its own equivalent configuration.
