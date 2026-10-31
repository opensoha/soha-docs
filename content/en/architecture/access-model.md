# Access Model

Soha's access model has two independent questions:

- RBAC permission keys answer **what** action the principal may attempt.
- ABAC policies and scope grants answer **where** and **on which resource** the action is allowed.

The final service decision also intersects token caps, approval policy, module availability, provider or Agent capability, and resource state.

## Base Roles

`admin`, `ops`, `developer`, `tester`, `readonly`, and `auditor` are bootstrap defaults. Persisted role definitions are authoritative at runtime and may be customized.

## Exact Actions

Permissions are resource-owned keys such as `platform.pods.logs`, `platform.pods.exec`, `virtualization.vms.create`, or `virtualization.vms.delete`. A role can therefore allow creation or resizing without allowing deletion.

Menu groups and “full control” are editor batch operations only. They expand to exact child keys and do not create wildcard grants.

## Docker Volume Files (Candidate Combination)

The candidate Core authorizes mount metadata separately from file content. `docker.services.view` permits mount metadata; directory listing and file preview require the independent `docker.services.files` permission. The view key and legacy manage/actions keys do not expand to file access.

Default `ops` and `developer` roles explicitly include file access. Custom roles need a separate grant. PAT and service-account key permissions still intersect current role grants: a key capped at view or legacy manage does not gain file access when its role gains files. The Web volume-files entry requires both service inventory and file access; a caller with only file access may still use the authorized file APIs.

This describes the candidate Core with its matching permission catalog and has not been released. Older versions may enforce a different boundary. It does not imply that volume-file CLI commands are available.

## Scope Inputs

ABAC and scope grants can evaluate user, team, project, tenant/workspace, application, environment, cluster, namespace, resource identity, labels, ownership, request source, and approval state.

An exact RBAC grant without a matching scope remains denied. A matching scope without the exact RBAC grant also remains denied.

## Runtime Result

Resource APIs expose `allowedActions` when the client needs row-level controls. The owning service computes that list and repeats authorization before mutation. Frontend visibility never replaces server enforcement.

For the full pipeline, compatibility rules, and caller-surface guarantees, see [Authorization](./authorization.md).
