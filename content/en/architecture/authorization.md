# Authorization

Soha uses exact RBAC permission keys together with ABAC and scope grants. The same server-side decision applies to Web, OpenAPI, CLI, MCP, Skills, and AI Gateway callers.

## Permission Contract

Grantable permissions use the stable form `<domain>.<resource>.<action>`, for example:

- `virtualization.vms.view`
- `virtualization.vms.create`
- `virtualization.vms.resize`
- `virtualization.vms.delete`
- `platform.pods.logs`
- `platform.pods.exec`

The canonical definitions are published by `@opensoha/contracts` in `auth/permission-catalog.json` and served by `GET /api/v1/access/permissions`. Each definition includes its display name, risk level, supported scope kinds, approval posture, status, assignability, and compatibility aliases.

Roles persist exact keys in `permissionKeys`. The historical `capabilities` field and replaced coarse `*.manage` keys are migration inputs only. The role editor preserves them as read-only compatibility state, but new role changes select exact catalog keys.

## Decision Pipeline

The owning application service evaluates an action in this order:

1. Authenticate the principal and load persisted role permissions.
2. Intersect role permissions with PAT or service-account token caps.
3. Require the exact permission key. A declared legacy alias may satisfy it during migration.
4. Evaluate ABAC deny and allow policies against the subject, target resource, and request context.
5. Narrow the result with scope grants.
6. Return `approval_required` when the action's policy requires approval.
7. Intersect authorization with module availability, provider or Agent capability, and resource lifecycle state.
8. Recheck immediately before mutation and record the allow, deny, or approval hold.

ABAC or scope denial always wins. Provider support and resource state can remove an action; they never grant authority.

## Menus, Routes, And Actions

The role editor presents permissions as `workbench -> menu/page -> actions`. This hierarchy is for navigation and batch selection, not a security identifier.

- A page view key controls route access and menu derivation.
- Each button or API operation uses its page-owned exact action key.
- Selecting a parent expands to the currently listed exact child keys; no wildcard is stored.
- Unknown or legacy keys are preserved in a read-only compatibility group.
- The former global resource-action editor is not an assignable permission domain.

Backend-filtered `visibleMenuIds` controls navigation. Frontend route and button checks improve the experience, but the backend remains authoritative.

## Resource Actions

List and detail APIs may return `allowedActions`. This is the final action set after permission, scope, runtime capability, resource state, and approval posture are combined.

For example, a VM role may receive `view`, `create`, and `resize` without `delete`. A VM whose provider cannot resize will still omit `resize` from `allowedActions`. The mutation API repeats the same authorization check even when the button is visible.

## AI And Automation Callers

MCP and Skills manifests declare required permission keys and scopes for discovery and preflight. They do not authorize execution.

- The CLI sends only its server-issued token and requested resource scope.
- AI Gateway requires `ai.gateway.invoke` plus the owning business permission.
- Gateway tool grants, access policies, and skill bindings can only narrow access.
- High-risk calls may enter approval hold before the owning service executes them.
- Direct HTTP, CLI, and MCP calls use the same application-service permission check and audit path.

Gateway administration is split by resource, including `ai.gateway.clients.manage`, `ai.gateway.tokens.manage`, `ai.gateway.grants.manage`, `ai.gateway.policies.manage`, `ai.gateway.skills.manage`, and `ai.gateway.approvals.manage`. The old `ai.gateway.manage` key is compatibility state, not the target grant.

## Decision Shape

```json
{
  "status": "allow",
  "permissionKey": "virtualization.vms.resize",
  "action": "resize",
  "resource": {
    "type": "VirtualMachine",
    "id": "vm-42"
  },
  "allowedActions": ["view", "resize"],
  "reasonCode": "authorized",
  "policyVersion": "2026-08-05"
}
```

## Storage And Ownership

- `roles.permission_keys` stores exact grants.
- `policies` stores ABAC rules.
- `scope_grants` stores additional subject-to-resource narrowing.
- token permission caps restrict PATs and service accounts.
- operation and audit records capture mutation and authorization outcomes.

`soha-contracts` owns the public catalog and decision shapes. `internal/application/access` owns common permission, ABAC, and scope composition. Each domain service owns resource attributes, runtime state checks, approval context, and final mutation enforcement.

See [Role Authorization Assignment](../operations/role-authorization-assignment.md) for the operator workflow.
