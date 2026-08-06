# Role Authorization Assignment

Use the role editor to grant exact page-owned actions. Do not maintain a second global action list.

## Assignment Workflow

1. Identify the page and the real actions the user needs.
2. In Access Control > Roles, open the target role.
3. Navigate through `workbench -> menu/page -> actions`.
4. Select only the required exact actions.
5. Add ABAC policies or scope grants for the target applications, environments, clusters, namespaces, projects, or resources.
6. Assign the role to the user or service identity.
7. Refresh the session or token and verify both an allowed and a denied action.

The parent checkboxes are batch selectors. Selecting a page or workbench expands to the currently visible exact keys; no wildcard or menu grant is persisted.

## Least-Privilege Example

To let a developer inspect, create, and resize VMs without deleting them, grant:

- `workspace.resource.view`
- `virtualization.vms.view`
- `virtualization.vms.create`
- `virtualization.vms.resize`

Do not grant `virtualization.vms.delete`. Add the required workspace or resource scope grant. Confirm that create and resize succeed while delete returns 403 through both the console and API or MCP path.

## Compatibility Entries

Historical role `capabilities`, unknown permission keys, and replaced coarse keys such as `virtualization.vms.manage` appear as read-only compatibility entries. Saving a role preserves them, but they cannot be newly selected. Migrate them by assigning the replacement exact keys shown by the canonical catalog.

## Verification

Check the permission snapshot for exact `permissionKeys` and backend-filtered `visibleMenuIds`. For resource rows, inspect `allowedActions`; absence can be caused by RBAC, ABAC/scope, approval, provider capability, or resource state.

Validate every change with:

- the intended page is visible;
- the intended action succeeds;
- a deliberately excluded action is hidden and receives 403 when called directly;
- access outside the assigned scope is denied;
- an audit entry contains the request and decision outcome.

CLI, MCP, and Skills do not receive separate grants. Their server-issued token and requested scope reach the same owning application service used by Web and OpenAPI.

See [Authorization](../architecture/authorization.md) for the decision pipeline.
