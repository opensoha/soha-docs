---
title: First Deploy
description: Bring up the first self-hosted Soha control plane and verify health, readiness, login providers, and docs linkage.
---

# First Deploy

Start a local Soha control plane with the published Core image. The image serves the API and its embedded Web console. For building from source or installing on Kubernetes, see [Deployment](../operations/deployment.md).

## Prerequisites

Install Docker with the Compose plugin. Run the commands below from the directory where you want to clone the Core repository.

## Start The Stack

```bash
git clone --branch v0.1.12 --depth 1 https://github.com/opensoha/soha.git
cd soha
SOHA_IMAGE=ghcr.io/opensoha/soha:v0.1.12 \
  docker compose -f deploy/docker-compose.yaml up -d --no-build --wait soha
```

Compose starts PostgreSQL and Core. It mounts `configs/config.example.yaml` and binds Core to loopback by default. Before making it reachable outside your machine, replace the initial credentials and system keys described in [Configuration](../operations/configuration.md).

## Verify The Control Plane

Health and readiness must both return successful responses:

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
```

Check that the login-provider boundary is reachable:

```bash
curl -fsS http://localhost:8080/api/v1/auth/providers
```

The API reference name for that check is `GET /api/v1/auth/providers`.

## Expected Output Shape

The exact values depend on local configuration. A healthy local stack should
produce output with this shape:

Fixture artifact: [`first-deploy.expected.txt`](/tutorial-fixtures/first-deploy.expected.txt)

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
curl -fsS http://localhost:8080/api/v1/auth/providers
```

```json
{"postgres": "ok", "status": "ok"}
{"status": "ready"}
{"items": [{"type": "password", "id": "password", "name": "Password", "enabled": true}]}
```

## Verify The Console And Docs Link

Open the console at `http://localhost:8080/`. The default local bootstrap account is:

```text
username: opensoha
password: opensoha
```

The in-console docs entry opens `/docs/`. In release mode, `soha` redirects that path to the configured external docs URL, where Nextra's locale proxy routes users to `/zh/docs/...` or `/en/docs/...`. The docs site itself is published independently by the hosting process described in [Docs Publishing](../operations/docs-publishing.md).

## Exit Criteria

- `curl -fsS http://localhost:8080/healthz` returns healthy status.
- `curl -fsS http://localhost:8080/readyz` returns ready status.
- `GET /api/v1/auth/providers` returns at least one enabled provider.
- The console loads without needing a separate frontend dev server.

## Verification Scope

These checks cover Core, PostgreSQL, login-provider discovery and the Web console. Check any additional runtimes required by your installation before accepting traffic.
