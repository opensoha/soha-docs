---
title: First Delivery
description: Create or onboard an application, bind an environment, confirm a delivery plan, and inspect execution task state.
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

The API reference name is `POST /api/v1/applications`. In the console, use **Application Delivery → Applications → Create / Onboard Application**. Add later services only from the application's **Services** tab.

## Bind An Environment

Open the application detail **Environments** tab and bind one item from **Platform Configuration → Environment Directory**. The directory is reusable platform inventory; the application binding owns this application's targets and release policy.

Keep the returned application-environment binding ID for the delivery plan below.

## Build and update in the console

Open **Build and update** on an application service and choose build-and-deploy, build-only, existing-artifact deployment, or configuration-only update. Saving service configuration does not execute; running creates a batch. For repeated or cross-service delivery, save targets and order in **Workflow center → Workflows**, then run the definition separately.

After the build produces a verified image digest, inspect the final deployment plan, environment, rendered resources, and approval. The server resumes the batch after approval; do not separately confirm batch-owned plans. Deployment and configuration updates also require authorization, preflight, and approval. The API example below is for a standalone DeliveryPlan.

## Create And Confirm A Delivery Plan

`DeliveryPlan` is the canonical user-visible delivery intent for build, deploy, workflow, verification, and rollback actions.

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/delivery/plans" \
  -H "Authorization: Bearer $SOHA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-1",
    "applicationEnvironmentId": "binding-1",
    "action": "build_deploy",
    "source": "manual",
    "refType": "branch",
    "refName": "main"
  }'

curl -sS -X POST "$SOHA_SERVER/api/v1/delivery/plans/plan-1/confirm" \
  -H "Authorization: Bearer $SOHA_TOKEN"
```

The API reference names are `POST /api/v1/delivery/plans` and `POST /api/v1/delivery/plans/{planID}/confirm`. The older build, workflow, and release trigger endpoints remain compatibility APIs, not additional console write paths.

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
POST "$SOHA_SERVER/api/v1/delivery/plans"
POST "$SOHA_SERVER/api/v1/delivery/plans/plan-1/confirm"
GET "$SOHA_SERVER/api/v1/delivery/execution-tasks?applicationId=app-1&limit=20"
```

```json
{"item": {"id": "app-1", "name": "billing-api", "ownerTeam": "platform"}}
{"item": {"id": "plan-1", "applicationId": "app-1", "applicationEnvironmentId": "binding-1", "status": "draft"}}
{"item": {"plan": {"id": "plan-1", "status": "confirmed"}, "result": {"executionTaskId": "task-1", "status": "queued"}}}
{"items": [{"id": "task-1", "taskKind": "build", "status": "queued"}]}
```

## Import a reusable definition

Save this as `node-image.soha.yaml`. It only defines build commands; actual delivery still needs service, build environment, and artifact configuration:

```yaml
apiVersion: delivery.soha.io/v1alpha1
kind: BuildTemplate
metadata:
  name: node-image
spec:
  buildCommands:
    - npm ci
    - npm run build
```

Validate offline, then preview using an authenticated local profile:

```bash
soha delivery documents validate --file node-image.soha.yaml
soha delivery documents preview --profile local --file node-image.soha.yaml
```

Review file diagnostics and changes. Use `data.id` and `data.candidateDigest` from this response, with one stable idempotency key for this import:

```bash
soha delivery documents import --profile local \
  --preview-id PREVIEW_ID --candidate-digest CANDIDATE_DIGEST \
  --idempotency-key IMPORT_KEY
```

Import only creates a draft. Review and publish it in Templates before explicitly binding its returned ID and published version. Export a published version for inspection or migration; the output file must not already exist:

```bash
soha delivery documents export BuildTemplate TEMPLATE_ID \
  --profile local --version 1 --format yaml --out exported.soha.yaml
```

To update an existing draft, use `preview --input request.json` and pair `targetId` with the current `expectedRevision` on its `files` entry; never rely on name-based overwrite. Template pages also offer YAML/JSON editing, import previews, and exports.

In **Git sources** on a template page, select a registered repository, ref, and directory. Save, synchronize, review the fixed commit and changes, then apply that SyncRun. The CLI provides the same flow through `soha delivery template-sources create|sync|run|apply`, with `get|runs|objects` for inspection. Publishing, adopting a service version, and running a workflow remain separate steps. See [Application Delivery](../architecture/application-delivery.md) for triggers, removed files, and supported limits.

## Exit Criteria

- The application record is visible from the application list or detail API.
- Delivery-plan confirmation returns a durable record, a queued execution task, or a clear disabled/unsupported state.
- Execution task state can be inspected without reading runner-local files.

## Known Gaps

This tutorial does not claim the delivery runner is fully production-ready. The route to a completed build/deploy requires configured providers, runner claim/callback, artifact metadata, and cluster target credentials.
