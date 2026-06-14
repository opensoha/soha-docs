---
title: First Delivery
description: Create the first delivery application path, trigger a build or deploy action, and inspect execution task state.
---

# First Delivery

This tutorial defines the first delivery path at the control-plane boundary. It is intentionally conservative: the API can record applications, release bundles, workflow runs, and execution tasks, while real build/deploy execution still depends on configured runners and providers.

## Prerequisites

- A running Soha control plane from [First Deploy](./first-deploy.md).
- A registered cluster from [First Cluster](./first-cluster.md) when the deploy target is Kubernetes.
- An access token with delivery permissions.
- A configured runner/provider if you expect the execution task to move beyond queued or disabled status.

## Create An Application

Create the application record first:

```bash
export SOHA_SERVER=http://localhost:8080
export SOHA_TOKEN=replace-with-access-token

curl -sS -X POST "$SOHA_SERVER/api/v1/applications" \
  -H "Authorization: Bearer $SOHA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "billing-api",
    "ownerTeam": "platform",
    "repositoryUrl": "https://git.example.com/platform/billing-api"
  }'
```

The API reference name is `POST /api/v1/applications`.

## Trigger A Build

Use the build trigger endpoint when the application has a build source or template.

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/builds/trigger" \
  -H "Authorization: Bearer $SOHA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-1",
    "sourceRef": "main"
  }'
```

The API reference name is `POST /api/v1/builds/trigger`.

## Trigger Through AI Gateway

When AI Gateway is enabled for delivery, the controlled action tool is `delivery.actions.trigger`. It still re-enters the delivery application service and may return `pending_approval`, `pending_human_confirm`, `dry_run`, disabled, or queued execution state.

```bash
soha tool call delivery.actions.trigger \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","action":"build_deploy"}'
```

## Inspect Execution Tasks

```bash
curl -sS "$SOHA_SERVER/api/v1/delivery/execution-tasks?applicationId=app-1&limit=20" \
  -H "Authorization: Bearer $SOHA_TOKEN"
```

The API reference name is `GET /api/v1/delivery/execution-tasks`.

## Expected Output Shape

The runner/provider state may be disabled, queued, or pending approval in a
fresh environment. The durable API response should still include application and
task identity:

Fixture artifact: [`first-delivery.expected.txt`](/tutorial-fixtures/first-delivery.expected.txt)

```bash
POST "$SOHA_SERVER/api/v1/applications"
POST "$SOHA_SERVER/api/v1/builds/trigger"
GET "$SOHA_SERVER/api/v1/delivery/execution-tasks?applicationId=app-1&limit=20"
```

```json
{"item": {"id": "app-1", "name": "billing-api", "ownerTeam": "platform"}}
{"item": {"id": "task-1", "applicationId": "app-1", "status": "queued"}}
{"items": [{"id": "task-1", "taskKind": "build", "status": "queued"}]}
```

## Exit Criteria

- The application record is visible from the application list or detail API.
- Build/deploy trigger returns a durable record, a queued execution task, or a clear disabled/unsupported state.
- Execution task state can be inspected without reading runner-local files.

## Known Gaps

This tutorial does not claim the delivery runner is fully production-ready. The route to a completed build/deploy requires configured providers, runner claim/callback, artifact metadata, and cluster target credentials.
