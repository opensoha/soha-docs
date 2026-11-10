# Deployment

## Install a published release

The Core image embeds the Web console and serves it alongside the API. PostgreSQL stores application data. The docs site, the remote cluster Agent and the optional Operator have their own release cycles.

For a local Compose install with Core `v0.1.12`, follow [First Deploy](../tutorials/first-deploy.md). For Kubernetes, use the released `deploy/deployment.yaml` or a compatible chart version from the [Soha Helm repository](https://github.com/opensoha/soha-helm). Keep the manifest or chart and the image versions together when you upgrade. Replace the initial credentials and system keys before exposing the installation. [Configuration](./configuration.md)

Core `v0.1.12` uses the runtime shipped with that release. The dsh and Hindsight deployment instructions apply to the separate [dsh candidate](./agent-runtime.md).

## Build from source

Use Docker with BuildKit, Compose, Make and the Node version declared in Web CI. Check out matching Core and Web revisions in sibling directories. Check out Contracts at the version pinned in Core's `go.mod` for the build context. Tagged builds use the Web artifact for the corresponding release.

Run from the `soha` checkout:

```bash
npm --prefix ../soha-web ci
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
kubectl apply -k "https://github.com/opensoha/soha-operator//config/default?ref=v0.1.0"
```

Operator `v0.1.0` uses the public multi-architecture image `ghcr.io/opensoha/soha-operator:0.1.0` for `linux/amd64` and `linux/arm64`. The Helm chart and operator runtime have independent version numbers; use the chart `appVersion` as the default runtime image version.

## Local Run Assumptions

- PostgreSQL at `localhost:5432`, database `soha`, user `pgsql`, password `pgsql`
- kubeconfig available at `$HOME/.kube/config` unless overridden
- frontend dev server at `http://localhost:5173`
- docs dev server at `http://localhost:3000/`

## Hermes Agent Runner with Docker

The released Compose file includes a separate Hermes runner for explicitly configured Hermes workloads. Use the runner image compatible with your Core release. The command below assumes the Core Compose stack from [First Deploy](../tutorials/first-deploy.md) and the same secret configuration used to start it.

```bash
SOHA_IMAGE=ghcr.io/opensoha/soha:v0.1.12 \
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
