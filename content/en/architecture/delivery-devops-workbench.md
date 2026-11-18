# Delivery DevOps Workbench

## Goal

The application delivery workbench provides developers and testers with an application-centric DevOps operating surface.

Rather than acting as a flat pipeline list or a thin wrapper around raw Kubernetes resource pages, it organizes applications, environments, services, containers, builds, tests, releases, deliverables, and runtime evidence inside one unified application context.

Its product organization draws inspiration from Zadig:

- Projects/applications serve as the business unit of engineering delivery, aggregating services, environments, builds, tests, workflows, and versions.
- Environments host a set of services and their configurations as target spaces for developer integration, test verification, and production release.
- Workflows consist of stages and jobs; stages typically advance sequentially, while jobs within a stage can run sequentially or in parallel.
- Builds, deployments, tests, releases, notifications, and configuration changes are all first-class orchestratable capabilities.

References:

- [Zadig Core Concepts](https://docs.koderover.com/zadig/cn/Zadig%20v3.4/quick-start/concepts/)
- [Zadig Project Manual](https://docs.koderover.com/zadig/en/Zadig%20v3.4/project-manual/)
- [Zadig Environment Service Overview](https://docs.koderover.com/zadig/en/Zadig%20v4.0/env/overview/)
- [Zadig Workflow Jobs](https://docs.koderover.com/zadig/cn/Zadig%20v4.1/project/workflow-jobs/)
- [Zadig Build Configuration](https://docs.koderover.com/zadig/en/Zadig%20v4.2/project/build/)

soha does not copy Zadig's object naming verbatim. Because the control plane already owns `applications`, `application_build_sources`, `application_environments`, `release_targets`, `workflow_templates`, `release_bundles`, `execution_tasks`, and `execution_logs`, this design reuses those objects first and extends them with application services, container components, test runs, and artifact policies.

## Design Principles

- Application-first: developers and testers enter from applications rather than clusters, namespaces, or standalone pipelines.
- Layered environments: development, test, pre-production, and production share one binding model while differing in UI semantics, approvals, permissions, and default actions.
- Service visibility: an application can contain multiple services, each with multiple containers, ports, configurations, build sources, and deployment targets.
- Immutable deliverables: images, packages, SBOMs, test reports, and deployment evidence produced by a build or composite release are captured as traceable deliverables.
- Explicit DAG orchestration: CI/CD flows use explicit DAG definitions for dependencies, concurrency, failure branches, approvals, and rollbacks rather than implicit frontend step stitching.
- Developer self-service: developers can trigger builds, deploy to development environments, inspect logs, and roll back around their own services.
- Closed-loop testing: testers can inspect candidate changes by environment and version, trigger test suites, review reports, and drive promotion decisions.
- Clear platform boundary: the API server performs control-plane orchestration only; real build, test, and release work runs in the execution plane or dedicated runners, never inline inside Gin handlers.

## User Perspectives

### Developer Perspective

Primary developer workflow:

1. Open the Application Center and select an owned application.
2. Select a service component inside application detail, such as `api`, `worker`, or `frontend`.
3. Choose a Git branch, commit, build source, and image tag strategy.
4. Trigger CI: check out source code, build images, run unit tests, run scans, and produce deliverables.
5. Deploy produced artifacts to a development or shared integration environment.
6. Inspect service runtime health, Pods, logs, events, recent execution tasks, and failure reasons.
7. Retry, roll back, restart a service, or update an individual container image when needed.

Developer-facing views emphasize:

- Owned applications and services.
- Recent commits, recent builds, and active environment versions.
- Fast builds, fast deployments, log access, and failure diagnostics.
- Environment differences—such as feature branches in `dev` versus release candidates in `test`.

### Tester Perspective

Primary tester workflow:

1. Open the test environment matrix to inspect active versions of each application across environments such as `test`, `sit`, and `uat`.
2. Select an application environment under test to review which services, images, commits, configurations, and database changes are included.
3. Trigger test workflows covering API tests, UI automation, smoke checks, performance baselines, or manual verification tasks.
4. Inspect test reports, failed cases, correlated logs, environment health, and blockers.
5. Mark a verified Release Bundle as promotable, or return it to engineering for fixes.
6. File defects, attach verification notes, or freeze an environment when needed.

Tester-facing views emphasize:

- Environment dimension first, followed by individual services.
- Which Release Bundle an environment is currently validating.
- End-to-end traceability from test tasks, test reports, and environment health back to services and container images.
- Treating a passing test result as a quality-gate input for subsequent pre-production or production release rather than a substitute for release completion.

## Information Architecture

The application delivery workbench converges onto the following primary and secondary surfaces.

| Surface | Target Roles | Purpose |
| --- | --- | --- |
| Application Center | Developers, Testers, Release Engineers | Enter delivery context through application cards and lists |
| Application Detail | Developers, Testers | Application overview, services, environments, pipelines, deliverables, and test reports |
| Service Components | Developers | Manage services, containers, ports, build sources, and deployment targets under an application |
| Environment Matrix | Testers, Release Engineers | Inspect application versions, service health, test status, and promotion gates by environment |
| CI/CD Workflows | Developers, Testers, Platform Engineers | Maintain reusable DAG templates and workflows bound to application environments |
| Deliverable Center | Developers, Testers, Release Engineers | Inspect Release Bundles, images, packages, reports, SBOMs, and deployment evidence |
| Execution Tasks | Platform Engineers, Developers | Inspect runner/job execution status, logs, heartbeats, cancellations, and retries |
| Workflow Approval Nodes | Release Engineers, Platform Engineers | Manage test-promotion, pre-production, and production release gates inside workflow templates |

Existing routes align as follows:

- `/applications` remains the Application Center.
- `/applications/:applicationId` expands into the Application Detail workbench.
- `/delivery/environments` serves as the read-only platform environment catalog; application-environment bindings are maintained inside Application Detail, while `/application-environments` remains a read-only compatibility index.
- `/workflow-templates` continues as the DAG template management surface.
- `/delivery/release-bundles` serves as the control-plane list for the Deliverable Center.
- `/delivery/execution-tasks` serves as the execution task and log inspection surface.
- `/release-board` evolves into the Environment Matrix / Release Matrix.

## Core Object Model

### Existing Objects

| Object | Current Responsibility | Role in This Design |
| --- | --- | --- |
| `applications` | Application registration, repository metadata, and build-source aggregation | Application-level entry point and ownership/permission boundary |
| `application_build_sources` | Multiple build sources per application | Service-level or application-level CI input sources |
| `application_environments` | Binding between an application and an environment | Environment-scoped delivery policy, workflow template, and target set |
| `release_targets` | Cluster, namespace, workload, and container targets | Service container deployment targets, extensible with group/wave/region |
| `workflow_templates` | DAG template definitions | CI/CD orchestration templates |
| `release_bundles` | Immutable delivery version bundles | Composite version of an application or service set |
| `execution_tasks` | Execution-plane task records | Task instances for build, test, deploy, scan, notification, and related steps |
| `execution_logs` | Execution log entries | Evidence stream for workflows and tasks |
| `workflow_approvals` | Workflow approval records | Approval decisions and correlation metadata for `manual_approval` nodes |

### Proposed Objects

#### Application Services (`application_services`)

An application service is the smallest business component inside an application that can be built, tested, deployed, and observed independently.

Proposed fields:

- `id`
- `application_id`
- `key`
- `name`
- `description`
- `service_kind`: `kubernetes_workload`, `helm_release`, `external_service`, `job`
- `owner_team`
- `repository_provider`
- `repository_project_id`
- `repository_path`
- `default_branch`
- `build_source_id`
- `enabled`
- `metadata`

Notes:

- A monolithic application can contain a single service.
- A microservice application can contain multiple services.
- A service can inherit the application-level repository or override its own repository and build source.
- A service is not 1:1 with a Kubernetes Deployment; a Deployment is a runtime target inside a specific environment.

#### Service Containers (`application_service_containers`)

Service containers describe individual container units within a service that are built, released, or observed.

Proposed fields:

- `id`
- `service_id`
- `name`
- `image_repository`
- `default_tag_template`
- `dockerfile_path`
- `build_context_dir`
- `runtime_ports`
- `env_schema`
- `resource_profile`
- `health_check`
- `metadata`

Notes:

- A service may include `main`, `sidecar`, `init`, and other containers.
- Images produced by CI tasks bind to a specific container rather than only to the parent application.
- Releases can update a single container on a single service selectively.

#### Environment Service Instances (`application_environment_services`)

An environment service instance represents the configuration and version state of a service inside a specific application environment.

Proposed fields:

- `id`
- `application_environment_id`
- `service_id`
- `desired_version`
- `current_version`
- `config_profile_id`
- `variable_set`
- `deploy_order`
- `enabled`
- `metadata`

Notes:

- The same application service can carry distinct variables, targets, resource profiles, and rollout policies across `dev`, `test`, and `prod`.
- Environment service instances give testers a clear view of which service versions currently make up an environment.

#### Service Deployment Targets (`application_service_targets`)

Can evolve incrementally from or alongside `release_targets` without requiring an immediate table replacement.

Proposed semantics:

- Binds `application_environment_service_id`
- Points to `cluster_id`, `namespace`, `workload_kind`, `workload_name`, and `container_name`
- Preserves `targetKind`, `executorKind`, `groupKey`, `waveKey`, `regionKey`, and `configRef`

Notes:

- `release_targets` already expresses Deployment container targets.
- The new object refines target binding from the application-environment level down to the environment-service-instance level.
- Backend compatibility is preserved initially by falling back to `release_targets` when no service instance is present.

#### Test Plans (`test_plans`)

Test plans define reusable test definitions.

Proposed fields:

- `id`
- `application_id`
- `service_id`
- `key`
- `name`
- `test_kind`: `unit`, `api`, `ui`, `smoke`, `performance`, `security`
- `runner_kind`: `ci_agent_runner`, `k8s_job_runner`, `external`
- `command`
- `repository_ref`
- `variable_schema`
- `report_pattern`
- `enabled`

#### Test Runs (`test_runs`)

Test runs record individual test executions and their reports.

Proposed fields:

- `id`
- `application_id`
- `application_environment_id`
- `service_id`
- `release_bundle_id`
- `execution_task_id`
- `test_plan_id`
- `status`
- `summary`
- `report_artifact_id`
- `started_at`
- `finished_at`

Notes:

- Every test run correlates back to its Release Bundle, service, environment, and execution task.
- Test reports enter the unified Deliverable Center as first-class artifacts.

#### Artifact Policies (`artifact_policies`)

Artifact policies govern deliverable naming, retention, promotion, and admission gates.

Proposed fields:

- `id`
- `key`
- `name`
- `versioning_mode`
- `retention_days`
- `required_artifact_kinds`
- `promotion_gates`
- `signing_required`
- `sbom_required`
- `metadata`

## Environment Model

Environments are organized from within the Application Center without depending on a standalone mutable global environment master-data editor. Each application organizes delivery policies and runtime bindings around environment labels.

| Layer | Object | Description |
| --- | --- | --- |
| Application environment label | `application_environments.environment_id` / `environment_key` | Defines labels such as `dev`, `test`, `sit`, `uat`, `pre`, and `prod` within an application without requiring pre-created mutable global records |
| Application-environment binding | `application_environments` | Delivery policy, workflow template, build policy, release policy, and target set for an application in an environment label |
| Environment service instance | `application_environment_services` | Enablement state, variables, current version, and target set of a service in an application environment |
| Service deployment target | `release_targets` or `application_service_targets` | Points to concrete Kubernetes workloads, containers, or other execution targets |

Recommended environment semantics:

| Environment | Default Action | Approval | Typical Users | Version Source |
| --- | --- | --- | --- | --- |
| `dev` | Build and deploy | Not required by default | Developers | Branch, commit, or ephemeral image |
| `test` / `sit` | Deploy and test | Optional | Testers | Candidate Release Bundle |
| `uat` | Acceptance verification | Typically required | Testers, Business Stakeholders | Test-verified Release Bundle |
| `pre` | Pre-production rollout | Required | Release Engineers, Operations | Release-candidate Release Bundle |
| `prod` | Production release | Mandatory | Release Engineers, Operations | Approved Release Bundle |

Frontend terminology rules:

- `dev`, `test`, and `pre` use "Deploy" terminology in the UI even though they share the same underlying orchestration model.
- `prod` uses "Release" terminology and highlights approvals, change windows, rollbacks, and audit trails.
- Test environment views lead with the candidate version under test and test verdict rather than raw Pod status alone.

## Multi-Service and Container Design

Application Detail introduces a dedicated Service Components view.

Recommended fields on each service component card:

- Service name, owner, language/runtime, repository, and default branch.
- Active version per environment (`dev`, `test`, `uat`, `prod`).
- Container list: container name, image repository, active image, latest build, and health check.
- Runtime targets: cluster, namespace, workload, and container name.
- Quick actions: build, deploy to `dev`, deploy to `test`, view logs, view events, and roll back.

Recommended sections in Service Detail:

- Overview: latest builds, latest deployments, and current environment health.
- Containers: images, Dockerfile path, build context, ports, and environment-variable schema.
- Builds: build sources, build templates, build parameters, and recent build history.
- Environments: per-environment variables, targets, active versions, and deployment strategies.
- Tests: associated test plans, recent test runs, and reports.
- Runtime: Deployments, Pods, Services, Ingresses, events, and logs.

Container update rules:

- CI build outputs bind to `service + container`.
- CD deployment nodes select target container images from a Release Bundle.
- When a service contains multiple containers, DAG workflows allow building or updating a subset of containers selectively.
- Sidecar and init containers are modeled as container entries under a service rather than standalone services by default.

## CI/CD DAG Orchestration

`workflow_templates.definition` already supports `release_dag`, and the frontend already includes a DAG editor. The next evolution generalizes DAG definitions from release-only templates into full CI/CD workflow templates.

### DAG Structure

Recommended schema:

```json
{
  "schemaVersion": 3,
  "mode": "delivery_dag",
  "inputs": [],
  "nodes": [],
  "edges": []
}
```

Common node fields:

- `id`
- `type`
- `name`
- `timeoutSeconds`
- `continueOnFailure`
- `dependsOn`
- `runPolicy`: `always`, `on_success`, `on_failure`
- `serviceSelector`
- `environmentSelector`
- `config`

Common edge fields:

- `source`
- `target`
- `condition`: `success`, `failure`, `always`

### Node Types

Proposed node catalog:

| Type | Purpose | Output |
| --- | --- | --- |
| `checkout` | Check out source code or a pinned commit | Source snapshot |
| `build_image` | Build a service container image | Image artifact |
| `build_package` | Build a binary, frontend bundle, or Helm package | File artifact |
| `unit_test` | Run unit tests | Test report |
| `code_scan` | Run static analysis or security scanning | Scan report |
| `package_bundle` | Assemble multi-service artifacts into a Release Bundle | Release Bundle |
| `deploy_service` | Deploy one or more services | Deployment record |
| `deploy_environment` | Orchestrate service deployments across an environment | Set of deployment records |
| `wait_rollout` | Wait for Kubernetes rollout completion | Rollout evidence |
| `smoke_test` | Run smoke verification | Test run |
| `api_test` | Run automated API tests | Test report |
| `performance_test` | Run performance tests | Performance report |
| `manual_approval` | Require human approval | Approval record |
| `promote_bundle` | Promote a Release Bundle | Promotion record |
| `rollback` | Roll back a service or environment | Rollback record |
| `notify` | Send IM, email, or webhook notifications | Notification record |
| `http_callback` | Invoke an external HTTP endpoint | External callback receipt |

Compatibility mapping for existing node types:

- `build` maps compatibly to `build_image`.
- `deploy_update_image` maps compatibly to `deploy_service`.
- `check_http`, `smoke_test`, `manual_approval`, `notify`, and `rollback_to_previous` retain their existing semantics.

### Typical Development Pipeline

Designed for feature-branch development and shared integration environments.

1. `checkout`
2. `build_image` (can run in parallel across multiple services)
3. `unit_test`
4. `deploy_service` to `dev`
5. `wait_rollout`
6. `smoke_test`
7. `notify`

Characteristics:

- Requires no manual approval by default.
- Allows developers to target a single service.
- May produce an ephemeral Bundle while still recording images, commits, and task logs.

### Typical Testing Pipeline

Designed for test-environment validation.

1. `package_bundle`
2. `deploy_environment` to `test`
3. `wait_rollout`
4. `api_test` and `ui_test` in parallel
5. `performance_test` (optional)
6. `manual_approval` or tester sign-off
7. `promote_bundle` to `uat` or `pre`

Characteristics:

- Takes a Release Bundle as input rather than deploying arbitrary ad-hoc branches directly.
- Uses test reports as quality-gate inputs.
- Routes failures into `rollback` or `notify` branches.

### Typical Production Release Pipeline

Designed for production changes.

1. `manual_approval`
2. `promote_bundle`
3. `deploy_environment` to `prod`, staged across `groupKey`, `waveKey`, and `regionKey`
4. `wait_rollout`
5. `smoke_test`
6. `create_silence` or alert-silence teardown
7. `notify`
8. Failure branch transitions into `rollback`

Characteristics:

- Enforces approvals, audit trails, operation logs, and release windows.
- Uses `groupKey`, `waveKey`, and `regionKey` on `release_targets` for group, wave, and regional rollout orchestration.
- Never permits ad-hoc target assembly from the browser during production releases.

## Deliverable Design

A Release Bundle is the primary versioned deliverable object.

A Release Bundle can contain:

- Container images (`image`) with registry, repository, tag, and digest.
- File packages (`package`) such as `tar`, `zip`, `jar`, or static frontend bundles.
- Helm Charts or Kustomize outputs.
- Rendered Kubernetes manifests.
- SBOM documents.
- Cryptographic signatures and digests.
- Test reports.
- Security/code scan reports.
- Deployment evidence: rollout status, Pod health, and event summaries.

Proposed Bundle payload structure:

```json
{
  "applicationId": "app-1",
  "version": "2026.05.23-001",
  "services": [
    {
      "serviceId": "svc-api",
      "containers": [
        {
          "name": "api",
          "image": "registry.example.com/app/api:20260523-abc",
          "digest": "sha256:..."
        }
      ],
      "source": {
        "repo": "group/app",
        "branch": "feature/demo",
        "commit": "abc123"
      }
    }
  ],
  "artifacts": [],
  "quality": {
    "testRunIds": [],
    "scanRunIds": []
  }
}
```

The Deliverable Center supports:

- Filtering by application, environment, service, and status.
- Inspecting container images for every service and container in a Bundle.
- Tracing back to the originating DAG workflow, execution tasks, and logs.
- Reviewing test, scan, approval, and deployment evidence.
- Promoting or releasing Bundles that have passed quality gates.

## API Design Direction

Proposed new and extended API routes.

### Application Services

- `GET /api/v1/applications/:applicationID/services`
- `POST /api/v1/applications/:applicationID/services`
- `GET /api/v1/applications/:applicationID/services/:serviceID`
- `PUT /api/v1/applications/:applicationID/services/:serviceID`
- `DELETE /api/v1/applications/:applicationID/services/:serviceID`
- `GET /api/v1/applications/:applicationID/services/:serviceID/runtime`

### Environment Services

- `GET /api/v1/application-environments/:applicationEnvironmentID/services`
- `PUT /api/v1/application-environments/:applicationEnvironmentID/services`
- `GET /api/v1/application-environments/:applicationEnvironmentID/services/:serviceID/detail`

### Testing

- `GET /api/v1/delivery/test-plans`
- `POST /api/v1/delivery/test-plans`
- `PUT /api/v1/delivery/test-plans/:testPlanID`
- `DELETE /api/v1/delivery/test-plans/:testPlanID`
- `GET /api/v1/delivery/test-runs`
- `GET /api/v1/delivery/test-runs/:testRunID`
- `POST /api/v1/delivery/test-runs`

### Deliverables

Existing `release_bundles` and `execution_tasks.artifacts[]` provide the initial baseline, extensible with:

- `GET /api/v1/delivery/artifacts`
- `GET /api/v1/delivery/artifacts/:artifactID`
- `POST /api/v1/delivery/release-bundles/:bundleID/promote`

### Workflows

`workflow_templates.definition` remains backward-compatible with the new schema, supplemented by:

- `POST /api/v1/workflows/preview-dag`
- `POST /api/v1/workflows/:workflowTemplateID/validate`
- `POST /api/v1/workflows/:workflowTemplateID/run`
- `POST /api/v1/workflow-runs/:workflowRunID/cancel`
- `POST /api/v1/workflow-runs/:workflowRunID/retry-node`

## Backend Layering

Recommended module ownership:

- `internal/application/app`
  - Application and application-service orchestration.
  - Validation of service repositories, build sources, and container definitions.
- `internal/application/delivery`
  - Application detail aggregation.
  - Environment matrix aggregation.
  - Service runtime aggregation.
- `internal/application/workflow`
  - DAG validation, execution, and node state progression.
  - Translation from DAG nodes into execution tasks.
- `internal/application/build`
  - Entry point for build node execution.
  - Image and package artifact metadata backfill.
- `internal/application/release`
  - Entry point for deploy, release, and rollback node execution.
  - Kubernetes target updates and release record persistence.
- `internal/application/execution`
  - Runner claim, callback, heartbeat, cancellation, retry, log, and artifact normalization.
- `internal/application/test`
  - Test plan management, test run orchestration, and test report archiving.
- `internal/repository/application`
  - Persistence for application services and service containers.
- `internal/repository/delivery`
  - Persistence for Bundles, execution tasks, and artifacts.
- `internal/repository/test`
  - Persistence for test plans and test runs.

Control-plane engineering rules:

- HTTP handlers perform request/response binding and principal resolution only.
- Application-service, environment-service, and DAG execution semantics live in the application layer.
- Long-running build, test, scan, and deployment work always dispatches to the execution plane.
- All runner callbacks route through `internal/application/execution` rather than bypassing unified task state synchronization.

## Frontend Page Design

### Application Center

List columns:

- Application name, application group, owner, service count, environment count, latest Bundle, and latest execution status.
- Development status, test status, and active production version.
- Quick links: Detail, Build, Environment Matrix, and Deliverables.

Filters:

- My applications.
- Application group.
- Language / tech stack.
- Environment health.
- Recent failures.

### Application Detail

Recommended tabs:

- Overview: application health, environment versions, recent executions, and quality gates.
- Services: multi-service list and entry into Service Detail.
- Environments: per-application environment matrix.
- Pipelines: bound DAG templates and recent runs.
- Deliverables: Release Bundles and artifacts.
- Tests: test plans, test runs, and reports.
- Changes: commits, deployments, approvals, audit records, and operation logs.

### Service Detail

Recommended layout:

- Left column: service metadata and environment switcher.
- Center column: containers, builds, deployment targets, and test configurations.
- Right column: recent tasks, logs, events, and failure diagnostics.

### Environment Matrix

Displays environments as columns and applications/services as rows:

- Current version.
- Target version.
- Deployment status.
- Test status.
- Quality-gate status.
- Most recent failed node.

Testers can drill down from the matrix into a specific application environment to inspect the candidate Bundle's service inventory and test reports.

### DAG Editor

Retains the React Flow editor while adding:

- Node palette categorized into CI, CD, Testing, Quality, Security, and Notification.
- Node output declarations such as `image`, `package`, `testReport`, and `bundle`.
- Node input bindings from upstream nodes, runtime inputs, or environment bindings.
- Service selectors supporting all services, explicit services, or runtime selection.
- Environment selectors supporting bound environments, runtime selection, or fixed environments.
- Branch conditions and failure handling.
- DAG validation diagnostics panel.

## Permissions and Scopes

Proposed permission keys:

- `delivery.applications.view`
- `delivery.applications.manage`
- `delivery.application-services.view`
- `delivery.application-services.manage`
- `delivery.application-environments.view`
- `delivery.application-environments.manage`
- `delivery.workflow-templates.view`
- `delivery.workflow-templates.manage`
- `delivery.workflow-runs.execute`
- `delivery.workflow-runs.cancel`
- `delivery.release-bundles.view`
- `delivery.release-bundles.promote`
- `delivery.test-plans.view`
- `delivery.test-plans.manage`
- `delivery.test-runs.execute`
- `delivery.test-runs.view`

Scope rules:

- Applications are scoped by application group, owning team, and environment labels.
- Developers default to operating `dev` and authorized personal/team environments.
- Testers default to test-related actions in `test`, `sit`, and `uat` without holding production release privileges directly.
- Production releases, rollbacks, and changes to workflow approval gates require separate explicit authorization.

## Iteration Roadmap

### Phase 1: Application Service Modeling

- Introduce application service and service container models.
- Add the Services tab to Application Detail.
- Map services to existing build sources and release targets.
- Surface service-level and container-level artifacts on Release Bundles.

### Phase 2: Environment Services and Test Closed Loop

- Introduce environment service instances.
- Evolve the release board into the Environment Matrix.
- Add `test_plans` and `test_runs`.
- Surface test reports inside artifact views.

### Phase 3: CI/CD DAG Upgrade

- Upgrade `workflow_templates.definition` to the `delivery_dag` schema.
- Add node input and output declarations.
- Support service selection, environment selection, and per-node retry on workflow runs.
- Unify build, test, and deployment nodes on `execution_tasks`.

### Phase 4: Deliverable Promotion and Production Release

- Add the Release Bundle promote API.
- Enforce environment promotion gates.
- Orchestrate production rollouts across `groupKey`, `waveKey`, and `regionKey`.
- Close the loop across production rollback, auditing, operation logs, and notifications.

### Phase 5: Intelligent Diagnostics and Delivery Efficiency

- Feed execution logs, test reports, Kubernetes events, and monitoring metrics into the AI Workbench.
- Generate failure root-cause summaries, bottleneck-node analyses, service quality trends, and environment stability reports.
- Provide analytics on test-environment utilization, build duration, and release success rates.

## Compatibility Strategy With Existing Implementation

- `applications` remains the top-level application entry without splitting into a separate project entity.
- `application_build_sources` retains application-level build sources while allowing per-service overrides.
- `application_environments` remains the primary binding between applications and environments.
- `release_targets` continues serving existing Deployment container targets with compatible mapping as service targets are introduced.
- `workflow_templates.definition` preserves backward-compatible parsing for `release_dag` alongside `delivery_dag`.
- `release_bundles` remains the immutable version bundle while normalizing artifact details out of execution-task results.
- `execution_tasks` remains the unified execution-plane task model rather than creating separate state machines for builds, tests, and deployments.

## Non-Goals

- Do not turn soha into a GitOps-only platform.
- Do not make raw Kubernetes manifest editing in the browser the primary release path.
- Do not run long-lived build, test, scan, or deployment tasks inline inside API handlers.
- Do not store test reports solely as unstructured plain text in `execution_logs`.
- Do not reduce production releases to an unguarded dev-style deploy button.
- Do not attempt to ship every rollout strategy in Phase 1 before stabilizing the core spine of applications, environments, services, containers, DAG workflows, and deliverables.
