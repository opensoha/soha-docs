# KubeVirt and PVE Virtualization Lab Runbook

Use this runbook to validate the virtualization workbench against disposable external lab resources. It is an acceptance procedure, not proof that an untested provider or connection is production ready.

## Supported Validation Boundary

| Provider | Connection mode | Current boundary |
| --- | --- | --- |
| Proxmox VE | Direct PVE API | Validate connection, discovery, VM create, live allowed actions, metrics, console metadata, task logs, audit, and cleanup. |
| KubeVirt | Direct Kubernetes client | Validate discovery and only the actions reported by the live VM. CPU and memory resize are currently advertised. |
| KubeVirt | Agent-connected Kubernetes | Unsupported. The adapter requires a direct Kubernetes client and must return an explicit unsupported result. |

Do not infer provider parity. The UI, API client, and automation must use each connection's capabilities and each VM's `allowedActions`.

## Preconditions

- Soha Server and PostgreSQL are healthy and migrations are complete.
- The operator has the exact virtualization view, create, action, operations, and audit permissions required by the test.
- The Soha control plane can reach the external PVE API or Kubernetes API.
- Credentials are stored through the supported secret or connection flow and are never placed in commands, screenshots, task logs, or audit metadata.
- The target is a dedicated lab resource pool, storage pool, namespace, and VM identifier range.
- The disposable VM name has a unique `soha-lab-` prefix.
- The exact cleanup action is approved before creation. VM deletion is a typed VM action; there is no generic `DELETE /virtualization/vms/{id}` route.

Record the Soha version, provider version, connection ID, test VM name, actor, start time, and expected cleanup action. Do not record endpoints containing credentials or token values.

## PVE Preparation

Prepare a least-privilege API token that can access only the lab node, pool, and storage. Confirm that the selected node and storage are visible from Soha. Prepare one of:

- a stopped template with cloud-init support for clone-based creation;
- a lab ISO for raw VM creation;
- an approved image source supported by the live connection.

Reserve a lab VMID range and verify that the planned VMID is unused. A certificate or authorization failure must be returned as an explicit error, not an empty inventory.

## KubeVirt Preparation

Use a Linux Kubernetes cluster with KVM available and KubeVirt installed. Install CDI when the test uses DataVolumes or DataSources. Prepare a dedicated namespace and StorageClass.

```bash
kubectl get kubevirt -A
kubectl get storageclass
kubectl auth can-i list virtualmachines.kubevirt.io -n virt-lab
kubectl auth can-i create datavolumes.cdi.kubevirt.io -n virt-lab
```

For image-backed creation, verify the referenced PVC, DataSource, DataVolume, or container disk before running the plan. Docker Desktop on macOS is not an acceptance environment for KubeVirt or nested PVE.

## Read-Only Acceptance

Run these checks before any mutation:

1. List virtualization connections and identify the intended provider by ID.
2. Run connection test only after confirming it is an approved lab connection.
3. List VMs, images, flavors, and recent operations with provider or connection filters.
4. Open one existing lab VM detail and verify provider, connection, status, resources, and `allowedActions`.
5. Read metrics and console metadata only when the live capability allows them.
6. Compare PVE inventory with the PVE lab, or KubeVirt inventory with `kubectl get vm,vmi -n virt-lab`.

Any empty result must be distinguished from authorization failure, unsupported mode, provider failure, and a genuinely empty provider inventory.

## Mutation Acceptance

### Plan

Call `POST /api/v1/virtualization/vms/plan` with the selected connection, image or source, flavor or explicit resources, and unique VM name.

The plan must identify the target, risk, approval requirement, warnings, readiness, and input hash without exposing credentials or cloud-init secret material. Stop when the plan is not ready or the live provider capabilities do not cover the request.

### Create

After approval, call `POST /api/v1/virtualization/vms` with the same request and a stable `Idempotency-Key`. Repeating the identical request with the same key must not create a second VM.

Poll `GET /api/v1/virtualization/operations/{taskID}` and read `/logs` until a terminal state. Confirm the created VM appears in Soha and the provider inventory.

PVE creation is not transactional after the provider VM exists. A later disk resize, cloud-init configuration, or automatic start failure can leave the operation failed while the VM remains in PVE. Record the intended VMID before creation, reconcile it after any failure, and remove only the disposable VM and disks created by that attempt.

### Action

Choose one reversible action from the VM's current `allowedActions`. Send it through `POST /api/v1/virtualization/vms/{vmID}/actions` or the documented `/power` compatibility route. Poll the returned operation and confirm provider state.

For KubeVirt, do not test disk, network, power, or delete parity unless the live VM advertises that action. The current adapter advertises CPU and memory resize only.

### Cancel and Retry

Use only an operation designed to remain in a cancellable or failed state. Verify:

- cancel produces a durable canceled state and does not leave a provider-side mutation running;
- retry is rejected for an ineligible state;
- an eligible retry starts a new attempt without allowing an old worker result to overwrite it;
- operation logs preserve attempt and terminal evidence.

Do not use retry acceptance for Docker operations until the runner callback protocol includes required attempt or token fencing.

## Audit and Operation Evidence

For every non-query request, verify both evidence streams:

- `/api/v1/virtualization/operations` and task logs contain the durable operation result;
- `/api/v1/audit/logs` contains actor, action, resource kind and ID, result, request context, and sanitized error classification;
- denied, validation, unsupported-provider, repository, success, failure, timeout, cancel, and retry outcomes are distinguishable;
- neither stream contains passwords, API tokens, kubeconfig material, console tokens, cloud-init secrets, or raw provider payloads.

Export or retain the evidence IDs in the acceptance record. Do not paste sensitive payloads into the record.

## MCP and Skills

The official `virtualization-operator` skill and `local-environment-provisioning` preset expose only:

- `virtualization.vms.create.plan`;
- `virtualization.vms.create.trigger`;
- `virtualization.vms.action.trigger`.

Discover these tools from the live Gateway manifest. Inventory, detail, metrics, console, and operation reads remain in the public HTTP API and workbench until corresponding runtime MCP tools exist. MCP does not bypass backend permissions, scope grants, approval, idempotency, audit, or operation persistence.

## Cleanup

1. Confirm the disposable VM ID and provider object before deletion.
2. Use the typed `delete` VM action only when it appears in `allowedActions` and is approved.
3. Poll the cleanup operation to a terminal state.
4. Confirm the VM and temporary disk or DataVolume are removed from Soha and the provider.
5. Remove only lab-created image, flavor, or connection records whose dependency preview is empty.
6. Verify cleanup operation and audit evidence.

KubeVirt deletion submits deletion of the `VirtualMachine` object. DataVolume and PVC cleanup depends on the live cluster's ownership and garbage-collection policy; verify both explicitly and remove only disposable child volumes from this test if they remain.

Never delete a shared template, golden PVC, DataSource, storage pool, namespace, or connection as implicit cleanup.

## Release Verdict

Mark each provider separately:

| Gate | Pass condition |
| --- | --- |
| Connection | Test and discovery succeed with least privilege. |
| Inventory | Soha and provider objects match. |
| Plan | Ready plan is redacted and capability aware. |
| Create | One durable operation creates one disposable VM. |
| Action | A live allowed action reaches the expected provider state. |
| Evidence | Success and failure paths have operation and audit records. |
| Cleanup | Disposable resources are removed without shared-resource damage. |

A provider is not production ready when any required gate is untested, blocked by access, or dependent on an unsupported connection mode.
