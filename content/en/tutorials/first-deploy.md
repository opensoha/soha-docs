---
title: First Deploy
description: Bring up the first self-hosted Soha control plane and verify health, readiness, login providers, and docs linkage.
---

# First Deploy

This tutorial is the first cold-start path for a self-hosted Soha control plane. Run the commands from the sibling `soha` repository, not from `soha-docs`.

## Prerequisites

- Docker with Compose support.
- The `soha` repository checked out next to `soha-docs`.
- No production secrets in the local shell history.

## Start The Stack

```bash
cd ../soha
docker compose -f deploy/docker-compose.yaml up -d --build
```

The compose stack owns PostgreSQL and the API container. Fresh local installs use the repository config under `configs/` and seed the bootstrap account documented in [Configuration](../operations/configuration.md).

## Verify The Control Plane

Health and readiness must both return successful responses:

```bash
curl -sS http://localhost:8080/healthz
curl -sS http://localhost:8080/readyz
```

Check that the login-provider boundary is reachable:

```bash
curl -sS http://localhost:8080/api/v1/auth/providers
```

The API reference name for that check is `GET /api/v1/auth/providers`.

## Expected Output Shape

The exact values depend on local configuration. A healthy local stack should
produce output with this shape:

Fixture artifact: [`first-deploy.expected.txt`](/tutorial-fixtures/first-deploy.expected.txt)

```bash
curl -sS http://localhost:8080/healthz
curl -sS http://localhost:8080/readyz
curl -sS http://localhost:8080/api/v1/auth/providers
```

```json
{"status": "ok"}
{"ready": true}
{"providers": [{"id": "password", "type": "password", "enabled": true}]}
```

## Verify The Console And Docs Link

Open the console at `http://localhost:8080/`. The default local bootstrap account is:

```text
username: admin
password: soha
```

The in-console docs entry opens `/docs/`. In release mode, `soha` redirects that path to the configured external docs URL, where Nextra's locale proxy routes users to `/zh/docs/...` or `/en/docs/...`. The docs site itself is published independently by the hosting process described in [Docs Publishing](../operations/docs-publishing.md).

## Exit Criteria

- `curl -sS http://localhost:8080/healthz` returns healthy status.
- `curl -sS http://localhost:8080/readyz` returns ready status.
- `GET /api/v1/auth/providers` returns at least one enabled provider.
- The console loads without needing a separate frontend dev server.

## Known Gaps

This tutorial verifies a local control plane. It does not yet prove a signed release artifact, Helm install, Docker image smoke in CI, or production rollback path.
