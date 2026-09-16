# Application Delivery

## Goal

soha now owns application registration, multi-source build configuration, environment-scoped delivery orchestration, image replacement deployment, and deploy/release records.

The developer/tester-facing DevOps workbench design is documented separately in [应用交付 DevOps 工作台方案](./delivery-devops-workbench.md). This file remains the implemented application-delivery baseline and compatibility contract.

## Current Implemented Surface

The repository now has a delivery control-plane baseline centered on six stable objects:

- applications
- application services
- platform environments
- build templates
- application-environment bindings
- execution records
- delivery blueprints

- application CRUD and detail APIs:
  - `GET /api/v1/applications`
  - `POST /api/v1/applications`
  - `GET /api/v1/applications/:applicationID`
  - `GET /api/v1/applications/:applicationID/detail`
  - `PUT /api/v1/applications/:applicationID`
  - `DELETE /api/v1/applications/:applicationID`
- application service and container APIs:
  - `GET /api/v1/applications/:applicationID/services`
  - `POST /api/v1/applications/:applicationID/services`
  - `GET /api/v1/applications/:applicationID/services/:serviceID`
  - `PUT /api/v1/applications/:applicationID/services/:serviceID`
  - `DELETE /api/v1/applications/:applicationID/services/:serviceID`
- build-template APIs:
  - `GET /api/v1/build-templates`
  - `POST /api/v1/build-templates`
  - `PUT /api/v1/build-templates/:buildTemplateID`
  - `DELETE /api/v1/build-templates/:buildTemplateID`
- delivery blueprint APIs:
  - `GET /api/v1/delivery/blueprints`
  - `POST /api/v1/delivery/blueprints`
  - `PUT /api/v1/delivery/blueprints/:blueprintID`
  - `POST /api/v1/delivery/blueprints/:blueprintID/render-spec`
  - `POST /api/v1/delivery/blueprints/:blueprintID/bootstrap-application`
- execution-plane APIs:
  - `GET /api/v1/delivery/release-bundles`
  - `GET /api/v1/delivery/release-bundles/:bundleID`
  - `GET /api/v1/delivery/execution-tasks`
  - `GET /api/v1/delivery/execution-tasks/:taskID`
  - `POST /api/v1/delivery/execution-tasks/:taskID/cancel`
  - `POST /api/v1/delivery/execution-tasks/:taskID/retry`
  - `GET /api/v1/delivery/execution-tasks/:taskID/runner-status`
  - `POST /api/v1/delivery/execution-callbacks`
- application-environment detail and target-candidate APIs:
  - `GET /api/v1/delivery/environments`
  - `GET /api/v1/application-environments/:applicationEnvironmentID/detail`
  - `GET /api/v1/application-environments/target-candidates`
- delivery aggregate API:
  - `GET /api/v1/delivery/release-board`
- workflow approval APIs:
  - `POST /api/v1/workflows/:workflowRunID/approve`
  - `POST /api/v1/workflows/:workflowRunID/reject`
- GitLab browse APIs:
  - `GET /api/v1/integrations/gitlab/projects`
  - `GET /api/v1/integrations/gitlab/branches`
  - `GET /api/v1/integrations/gitlab/tags`
- current frontend routes:
  - `/applications`
  - `/delivery/blueprints`
  - `/applications/:applicationId`
  - `/delivery/environments`
  - `/build-templates`
  - `/delivery/release-bundles`
  - `/delivery/execution-tasks`
  - `/application-environments` (read-only compatibility index)
  - `/application-environments/:applicationEnvironmentId` (compatibility adapter into application detail)
  - `/workflow-templates`
  - `/release-board`
  - `/workflows`
  - `/releases`
  - `/registries`
- PostgreSQL tables:
- `applications`
- `application_build_sources`
- `application_services`
- `application_service_containers`
- `build_templates`
- `delivery_blueprints`
- `release_bundles`
- `execution_tasks`
- `execution_logs`
- `execution_callbacks`
- `application_environments`
- `release_targets`
- `workflow_templates`
- `workflow_approvals`
- `build_records`
- `workflow_runs`
- `deploy_records`

Application model now keeps:

- name
- repository metadata
- buildSources
- latest execution state via aggregate detail
- environment coverage via release-board aggregate

Application services now keep:

- service key and display name
- service kind such as Kubernetes workload, Helm release, external service, or job
- optional service-level repository and build-source override
- service-owned container definitions with image repository, tag template, Dockerfile path, build context, runtime ports, and metadata

The backend still accepts legacy top-level application build fields for compatibility and migration, but the active web application center now edits delivery build configuration through `buildSources` only.

Build-source types:

- `repo_dockerfile`
- `platform_build_template`
- `repo_buildpacks`
- `external_pipeline`

DAG templates remain environment-scoped delivery orchestration templates and are not treated as build-source variants.

Current delivery write surface:

- `POST /api/v1/delivery/plans`
- `POST /api/v1/delivery/plans/:planID/confirm`
- `GET /api/v1/builds`
- `POST /api/v1/builds/trigger` remains a compatibility API; the console does not expose it as a parallel write path
- `build_records` now stores manual build requests plus worker-completed artifact metadata
- each accepted trigger also emits a unified build event into `event_stream`
- DAG `build` nodes now reuse the same build service path and can emit artifact metadata for downstream `deploy_update_image` nodes

The current model is not GitOps-only and not a fake mock pipeline. It is a real platform workflow where:

1. an application is created or onboarded in the application center
2. services and build sources are maintained inside that application
3. an application-environment binding selects an item from the reusable platform environment directory, then owns application-specific policy and targets
4. the user creates and confirms one `DeliveryPlan`
5. the plan creates a release bundle and execution task in the execution plane
6. the produced artifact image is recorded on both the build record and the release bundle metadata
7. deployment replaces the target Deployment image in Kubernetes while execution task state is advanced in parallel
8. soha records workflow, execution-task, deploy, and release outcomes

The platform environment directory is read-only inventory in the delivery workbench. Application-environment bindings are written only from application detail or the delivery flow. Manifest packages are authored under an application or service; the Kubernetes workbench consumes rendered revisions for observation, diff, sync, repair, and rollback.

企业 AI coding 场景下，`delivery_blueprints` 作为控制平面模板对象存在，而不是仓库文件本身：

- 蓝图组合应用草稿、build sources、环境绑定模板、目标模板与文件模板
- `render-spec` 返回 `RenderedDeliverySpec`
- `bootstrap-application` 只负责创建或更新平台控制面对象
- v1 不在 API 服务端直接改 Git 仓库文件

## Templates, Build and update, and Workflow center

Start in application settings with an HTTP, worker, static-site, or job preset. Associate Git, a build source, a deployment template, and environment configuration. Platform defaults can supply the connection, runner, and registry; monorepos need a project directory. Repository analysis reads bounded metadata at an authorized, resolved commit and suggests build options without executing repository scripts or replacing manual choices.

Build, deployment, and workflow templates use immutable published versions. The server validates parameters, defaults, and permitted environment overrides. System variables cannot be overridden, and sensitive inputs use Secret references. Existing services and started deliveries retain their pinned versions. Review the changes before explicitly adopting a newer version, or copy a template into independent configuration. Saving and previewing do not build or deploy.

The service's Build and update action supports build-and-deploy, build-only, existing-artifact deployment, and configuration-only updates. Workflow center brings definitions, delivery history, and templates together and saves targets across applications, services, and environments; each execution creates a separate batch. Existing workflow deep links and history remain accessible. Ordering and groups control sequencing and concurrency, while business dependencies require success. Identical inputs for one service can share a build across dev/prod and promote the same image digest. Service count, environment-target count, and created build-record count are separate. Builds that remain uncreated when waiting or canceled are excluded from the actual build count.

Stop on any service failure is enabled by default. It stops new dispatch and cancels unfinished execution while retaining completed results. When disabled, failed targets and their business dependents are skipped, independent successors continue, and history reports partial completion. Serial mode completes each service's full flow before the next; build-all mode completes the build barrier before deploying in the configured order.

A final deployment plan is created after the build produces a verifiable digest. Environment approval covers that plan and its actual manifests; authorization or configuration changes require another check. Cancellation remains pending until the executor confirms it stopped and does not roll back completed writes. Retrying checks the environment again and creates a new batch linked to the original attempt. History exposes stages, logs, artifacts, plans, approvals, and resource results, filtered to targets the caller can view.

Use `soha delivery workflows` to save workflows, `soha delivery batches` to run or cancel delivery, and `soha delivery plans get|approve|reject` to inspect and decide final approvals. Pass `--profile local` for a local environment. The server dispatches a batch after approval; clients do not separately confirm batch-owned plans. Standalone plan creation and confirmation use the public DeliveryPlan API or Gateway tools `delivery.plans.create` and `delivery.plans.confirm`.

### Build and deployment capabilities

| Method | Available path and requirements |
| --- | --- |
| Dockerfile / platform build template | A dedicated runner builds, pushes, and verifies the image digest; repository, template version, and build parameters are frozen per delivery |
| Buildpacks | A dedicated runner uses pinned builder, run image, and lifecycle versions; execution requires a ready capability with matching version and architecture. Go, Node, Java, and Python builds from private Git to a private registry, SBOM collection, and deployment have been verified |
| YAML / Kustomize | Fixed package, deployment commit, environment entry, and image digest; Direct or Agent performs preflight, apply, and health checks for the current generation |
| Helm | Fixed public/private HTTPS or OCI Chart; defaults/schema inspection, environment values, image-path mapping, install, upgrade, and historical-revision rollback; both Direct and Agent use native Helm history |

Buildpacks supports dedicated `pack` and daemonless Podman runners. Administrators pin builder/run image/lifecycle digests, tool versions, architecture, allowed applications, and timeouts. Podman uses exclusive storage on an isolated Linux host or VM without a Docker daemon; `pack` still requires its container backend. Verified tools are pack 0.40.9 and Podman 5.7.0: Go, Node, Java, and Python execute natively on arm64; amd64 coverage on Apple Silicon uses emulation and is not native performance evidence. Private HTTPS/SSH, pinned-gitlink submodules, private registries, digests, and SBOMs are covered. Source credentials use temporary Secret leases, not ordinary build variables. Cancellation waits for process/container cleanup; unknown cleanup blocks the next task. A cache limit is not a peak-process resource quota. See the [Agent Buildpacks runner](https://github.com/opensoha/soha-agent#buildpacks-runner) for installation, permissions, and crash recovery.

Helm preflight does not install resources. Confirmation executes the frozen Chart and values. Chart packages and sensitive values stay out of ordinary history responses. Service delivery is limited to the bound namespace; Chart CRDs, resources outside that scope, external schema references, and template lookup are rejected. Cluster extensions use a separate installation flow. Legacy Helm mutation APIs cannot bypass plans for an application-managed release. Lost confirmation responses or callbacks are reconciled against the native revision and original task; an unknown outcome is not reported as success.

GitLab is the supported `external_pipeline` provider. Delivery freezes the authorized project, protected ref, pipeline commit, and build-source commit, tracks parent/child pipelines, downloads the agreed artifact report, and verifies the registry digest before producing a deployable Bundle. An uncertain dispatch result is reconciled using persisted identity without blindly repeating POST; cancellation also waits for parent and child pipelines to stop. Saving configuration, accepting a trigger, or a successful external job without its report/digest does not permit deployment. Legacy command configurations remain readable; providers without this evidence do not enter new batches.

### YAML/JSON definitions and Git template sources

Delivery documents use `apiVersion: delivery.soha.io/v1alpha1` and four `kind` values: `BuildTemplate`, `DeploymentTemplate`, `WorkflowTemplate`, and `Workflow`. The first three represent build, deployment, and workflow templates; `Workflow.spec.definition` holds an executable definition. `metadata.name` identifies the file object, while a Workflow's display name is `definition.name`. Blueprints retain their existing API and are outside this document protocol. YAML and JSON share one schema; legacy `release_dag` definitions round-trip inside WorkflowTemplate.

Each file contains one UTF-8 document, at most 1 MiB; a request allows 100 files, 2 MiB total, and 64 nesting levels. YAML aliases/tags, duplicate keys, unknown fields/versions, non-string keys, and unsafe numbers are rejected. See [First Delivery](../tutorials/first-delivery.md) for a document and CLI walkthrough.

Import first creates a preview, then applies its preview ID, candidateDigest, and idempotency key. All files, references, permissions, and conditional versions are checked together; success only creates drafts. Updates explicitly pair `targetId` with `expectedRevision`; a matching name never silently overwrites an object. Preview again after expiry, draft edits, or permission changes. Publishing is separate, and services bind explicit published ID/version pairs. Source synchronization neither upgrades services nor runs workflows. Template exports require a published version; Workflow exports use the current definition.

A Git template source selects an authorized repository, branch/tag/commit, relative directory, and kinds. Default recursive patterns are `*.soha.yaml`, `*.soha.yml`, and `*.soha.json`. Saving a source does not fetch or execute. Synchronization fixes a commit and creates a SyncRun with additions, changes, removals, diagnostics, and candidate digest; explicitly apply that SyncRun after review. Source generation, draft revision, and candidate digest prevent concurrent overwrites. Apply does not reread a moved branch. Private HTTPS/SSH uses repository connection credentials without putting tokens in files or history. Removed files mark source differences without deleting templates. Detaching can retain objects; templates can also be deprecated. Published versions preserve their commit, path, and digest provenance.

### Automatic triggers and release calendar

Source webhooks/polling only produce synchronization drafts. Workflow webhooks/schedules request new batches; configure these purposes separately. Triggers use a dedicated service account, and both the configuring actor and execution identity require authorization. Revoked credentials or narrowed permissions are rechecked; automatic execution cannot bypass application/environment scope or approval policies. Webhook secrets are encrypted, and rotation immediately invalidates the old secret.

GitLab webhooks require Standard Webhooks signatures, timestamps, and stable event IDs; use polling for older GitLab installations without that signing scheme. Duplicate or out-of-order events neither revert sources nor duplicate execution. The calendar uses five-field cron and IANA time zones: missed minutes and nonexistent daylight-saving minutes are skipped; a repeated local minute runs once. An active batch for the same trigger skips the next occurrence. An accepted trigger means its batch was accepted; inspect delivery history for the final outcome.

### GitOps, progressive delivery, and Operators

The following bounded combinations have been verified. Administrators first install the controllers, CRDs, and network entry points; service templates do not install cluster components:

| Method | Controller and health evidence |
| --- | --- |
| GitOps | Argo CD 3.5.2; Application pins project, commit, namespace, and image, with frozen child inventory and actual Deployment verification |
| Blue-green | Argo Rollouts 1.10.0; Rollout, stable/preview Services, and AnalysisTemplate, with actual Service revisions and the full metric window |
| Canary | Argo Rollouts 1.10.0 + Traefik 3.6.17; additionally freezes TraefikService/IngressRoute and verifies native weights, actual traffic, and metrics |
| Operator | WorkloadCronJob from `workloads.soha.io/v1alpha1`; source Deployment, current generation, and owned CronJob verification, without guessing from arbitrary Ready fields on unknown CRs |

These combinations share Plan/Task, approval, and ownership handling across Direct and Agent. GitOps disallows automatic sync/prune and competing Soha writes. Managed child Deployments cannot bypass their plan through ordinary restart, scale, or YAML actions. Operator and GitOps children must match the frozen inventory; health or failure from an earlier generation cannot terminate a new operation.

Execution task details show pause reasons, stable/preview revisions, weights, metric counts, and time windows. Pause, promote, and abort require a current task and approved plan plus resource UID/resourceVersion checks. Promotion only releases a manual pause; it does not skip analysis or timed waits. Metric failure and cancellation require stable-traffic confirmation. Canceling does not mean stopped and does not automatically restore desired configuration. Recovery selects known configuration in a new plan with approval and health verification.

Built-in `soha-bluegreen` and `soha-canary` templates take an explicit metric URL within the frozen Service/namespace. `${system.previewServiceName}` replaces a whole YAML value with a server-generated resource identity that users cannot override; it is not a string-concatenation expression. Other controllers, traffic plugins, and custom health protocols do not automatically inherit these capabilities.

### Upgrades and mixed versions

Existing build/workflow templates migrate to an initial published version. Application workflows and historical runs retain their semantics; new batches freeze their own templates, configuration, sources, and artifacts. Compatibility writes from older clients that omit conditional versions still lack a global lost-update guarantee.

A new Server rejects Helm preparation on an older Agent without the Helm prepare RPC. Missing Buildpacks capability or an unconfigured dedicated runner also prevents execution. Kustomize renders on the Server and uses the existing Manifest execution protocol. Back up the database and deploy matching Server, contracts, and Agent artifacts during an upgrade. Downgrading does not convert new templates or batches into legacy workflows; finish or confirm cancellation of active new tasks first.

GitOps/progressive delivery requires an Agent advertising `manifest.execution.v3`. Native mutations use `ownership-v2` routes and reject missing capability without falling back to older APIs. The new document format only applies to explicit imports; existing templates need no bulk conversion. Git-managed, UI-managed, and built-in objects retain their provenance. Upgrading does not attach sources, adopt latest versions, or replay history automatically.

## Service configuration and Kustomize delivery

Create or edit services inside the application settings drawer, progressing through source, build method, and artifact configuration. Connect repositories inline and reuse or copy shared build definitions. Existing images and configuration-only services do not require a build definition. Saving only persists configuration; partial failures retain confirmed resources so saving can continue.

Application and shared-build edits include the configuration version read when editing starts. If another editor or a repository association changes the configuration, stale saves return a conflict and preserve the local draft. Reload the current configuration before merging the changes. The API keeps `expectedVersion` optional for older clients; external clients that omit it can still overwrite configuration. Saving repositories, builds, and services is not one atomic transaction.

Kustomize delivery uses a package owned by the application and service:

1. Create a package with `renderer=kustomize`. Its Git synchronization root must contain the base, overlays, and generator dependencies together, such as `base/` and `overlays/prod/`.
2. Set the environment entry to `overlays/prod`, containing `kustomization.yaml`, `kustomization.yml`, or `Kustomization`. Existing overlay parameters continue to provide string variable substitution.
3. Map each original image name to a target repository and `sha256:` digest. Configure multiple containers separately. Configuration-only updates can skip image builds.
4. Synchronize and publish a package revision, then associate it with the application environment. The service's deployment configuration action creates a delivery plan, runs Kubernetes dry-run, and shows the fixed revision, source commit, rendered digest, and resource inventory.
5. Confirm after preflight succeeds and satisfy the environment approval policy. Execution uses the same rendered snapshot. Changes to the entry, images, binding, or revision require a new plan.

Both Direct and Agent apply fixed manifests with Server-Side Apply and distinguish applied, progressing, healthy, failed, and unknown states. Application runtime pages expose Deployment Pods from managed inventory; packages without Deployments retain their configuration state. Unknown custom resources are not healthy without evidence for the current generation.

Application plans currently allow 1–50 resources in the binding's single namespace. Package-local bases, overlays, components, patches, replacements, and ordinary ConfigMap generator files are supported. Path escape, symbolic links, remote dependencies, exec/alpha plugins, Helm-in-Kustomize, and plaintext Secret generators are rejected. Cluster-level extensions require a separate platform installation flow. Package automatic deployment and application plans cannot manage the same target concurrently.

Historical `kustomize_overlay` targets remain readable, but new releases no longer generate shell apply commands. Associate a service package and environment binding, then execute through an application delivery plan. Historical fields are not converted automatically.

Rollback selects an older revision through a new delivery plan. Partial failures retain successful resource inventory. Cancellation does not undo completed cluster writes, and removing a resource from a manifest does not automatically delete it. PVCs, database data, immutable fields, and external state are outside automatic recovery.

## Recommended Modules

### Backend

- `internal/application/app`
  - application registry
  - ownership and environment binding
  - GitLab repository selection orchestration
- `internal/application/build`
  - build request orchestration
  - manual run execution
  - build record lifecycle
- `internal/application/execution`
  - release bundle lifecycle
  - execution task lifecycle
  - callback and approval-policy control plane
- `internal/application/release`
  - deploy/release image rollout orchestration
  - deploy record lifecycle
- `internal/application/delivery`
  - aggregate detail/read models for application detail, application-environment detail, release board, and target candidates
- `internal/infrastructure/integration/scm`
  - source repository adapters
- `internal/infrastructure/integration/runner`
  - docker/buildx/kaniko/custom worker connector
- `internal/repository/app`
- `internal/repository/build`
- `internal/repository/release`

### Frontend

- `web/src/features/delivery/delivery-app-pages.tsx`
  - application list
  - application detail
  - build-template management
  - release-bundle list
  - execution-task list and log inspection
  - approval-policy management
  - workflow approval/trigger surface
- `web/src/features/delivery/delivery-catalog-pages.tsx`
  - structured application-environment binding form
  - aggregated release board
  - application-environment delivery workspace
- `web/src/features/delivery/delivery-blueprint-pages.tsx`
  - blueprint CRUD
  - rendered spec preview
  - platform bootstrap result inspection

## Data Model Direction

PostgreSQL now holds:

- applications
- application_build_sources
- application_services
- application_service_containers
- build_templates
- release_bundles
- execution_tasks
- execution_logs
- execution_callbacks
- application_environments
- release_targets
- workflow_templates
- workflow_approvals
- build_records
- deploy_records
- registry_credentials_meta

Runtime execution state should be represented by durable rows plus runner callbacks:

- running build heartbeat in `execution_tasks`
- terminal status and retry ownership in `execution_tasks`
- live and retained log evidence in `execution_logs` and artifacts

## Execution Direction

The platform should reserve two runtime layers:

- control plane in the API server
- execution plane in background workers or runners

The API server should never run long Docker builds inline in Gin handlers.

## Kubernetes Delivery Direction

Release execution operates on platform views such as:

- target cluster
- target namespace
- workload kind
- workload name
- target container
- new image reference

Image replacement uses explicit Deployment targets; declarative delivery uses `manifest_ssa` targets associated with a package. The browser is not the source of truth for actual workload identity.

This keeps frontend and application service code from dealing with raw manifest mutation everywhere.

## Execution Semantics

- `dev/test/pre` use deploy semantics in the UI even when they run the same orchestration model
- `prod` uses release semantics in the UI
- `manual_approval` nodes now suspend a workflow run with status `waiting_approval`
- approval resolution uses explicit approve/reject APIs and persists `workflow_approvals`; when a workflow was started by AI Gateway approval replay, the approval row metadata keeps the Gateway approval request linkage
- build and release actions now start creating `releaseBundleId` and `executionTaskId` metadata so the execution plane can evolve without breaking the current UI flow
- execution tasks now expose a minimal provider lifecycle: `queued`, `dispatching` or `running`, then callback-driven or direct completion, and task logs are queryable from the delivery control plane
- `ci_agent_runner` now has a first runnable path: the control plane exposes task claim and callback endpoints, the agent can poll for `ci_agent_runner` tasks, execute command payloads locally, and push logs/results back through execution callbacks
- execution-task claim and callback handling now route through the dedicated execution application service, so heartbeat timestamps, release-bundle status, and build/deploy record status stay synchronized from one orchestration path
- `execution_tasks.last_heartbeat_at` is now persisted and reflected in the execution-task page, and callback-driven task updates backfill `build_records` and `deploy_records` with the current execution-task status
- `ci_agent_runner` payloads are now workspace-aware: build/release tasks may carry `workspace.path`, `workspace.commandDir`, `workspace.checkout`, and `workspace.artifactFiles`, and the agent can prepare a local workspace, perform git fetch or checkout, run commands in that directory, and report structured artifact summaries back through callbacks
- asynchronous build callbacks now normalize bundle status to `ready` and update `release_bundles.artifact_ref` or `artifact_digest` from the callback payload instead of leaving build bundles stuck at generic task status values
- the execution application service now runs a background timeout sweep: `dispatching` or `running` tasks whose heartbeat exceeds `timeout_seconds` are marked `callback_timeout`, emit execution logs, and backfill bundle, build-record, and deploy-record failure state automatically
- execution tasks now expose `cancel` and `retry` control-plane actions; retry rotates the callback token before re-queueing, and `ci_agent_runner` now inspects callback responses during heartbeat so a server-side cancel can stop the local shell process instead of only changing task status in the database
- the agent process now keeps an in-memory active-task registry and exposes agent-local runtime APIs for listing active execution tasks, fetching a single active task, and canceling it with the agent bearer token; this is the local runtime surface that later control-plane initiated stop flows can reuse
- execution-task claim now carries a runner runtime endpoint, and the control plane will attempt a direct runtime cancel call before falling back to runner-side status polling; this makes `ci_agent_runner` cancellation proactive instead of heartbeat-only
- `k8s_job_runner` is now wired to server runtime execution-cluster settings (`runtime.execution_job_cluster_id`, `runtime.execution_job_namespace`, `runtime.execution_job_image`, `runtime.execution_job_git_image`, `runtime.execution_job_ttl_seconds`) and the build path can dispatch an isolated Kubernetes Job when that execution cluster is configured
- execution-task DTOs now normalize artifact payloads into a first-class `artifacts[]` view so image outputs, workspace files, and Kubernetes Job evidence are inspectable without manually parsing `result` JSON
- `release_targets` now carry enterprise contract fields such as `targetKind`, `executorKind`, `groupKey`, `waveKey`, `regionKey`, and `configRef`, even though the active UI still defaults to Kubernetes Deployment targets
- arbitrary build commands are only allowed inside the dedicated build worker path, never inline in the Gin request lifecycle
