# Governance

> **🚧 Translation in Progress**: This page is being translated from Chinese. Some sections may still contain Chinese text.

Soha's governance capabilities cover RBAC, tokens, service accounts, AI Gateway policies, approval, audit, secret handling, and plugin extension control.

## Principles

- All public APIs should complete authentication on the server side.
- Read and write operations are written to audit based on risk.
- AI Gateway calls must be controlled by access policies, tool grants, skill bindings, approval, rate / budget limits, and redaction.
- Plugin declarations do not equal authorization.
- Secrets can only be used through controlled references and must not be scattered directly into manifests, audit logs, or frontend state.

## Plugin Governance

Plugin installation, enabling, disabling, upgrading, configuration, and removal are governance operations. Soha core must record manifest snapshots, sources, versions, checksum / signature status, declared permissions, and audit trails.

If a plugin exposes mutate, execute, or high-risk capabilities, it should require explicit administrator confirmation and create traceable records through approval / audit.

## Continue Reading

- [Authorization Model](../architecture/authorization.md)
- [Access Model](../architecture/access-model.md)
- [Audit Model](../architecture/audit-model.md)
- [Role Authorization Assignment](../operations/role-authorization-assignment.md)
