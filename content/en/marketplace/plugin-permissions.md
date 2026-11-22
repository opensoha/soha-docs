# Plugin Permissions

The core rule of the plugin permission model is that a plugin can only declare requested permissions and secret requirements; it cannot grant authorization to itself.

## Management Permissions

Plugin administration uses the following permission keys:

```text
plugin.view
plugin.install
plugin.upgrade
plugin.manage
plugin.configure_secrets
plugin.publish
```

`plugin.view` allows viewing the marketplace and installed plugins. Installing, enabling, disabling, upgrading, removing, and configuring secrets are each gated by elevated permissions.

## Declaration Does Not Equal Authorization

Permission declarations in a manifest express only the capabilities a plugin intends to request. For example:

```yaml
permissions:
  required:
    - ai.gateway.view
    - ai.gateway.invoke
  domain:
    - workspace.resource.view
secrets:
  required:
    - name: provider_api_key
      description: External provider API key
```

Effective capabilities are evaluated jointly across:

- RBAC permissions of the current user or service account.
- Tool grants.
- Access policies.
- Skill bindings.
- Gateway approval guardrails.
- Resource scopes.
- Secret references.
- Audit and redaction policies.

## High-Risk Capabilities

The Web installation flow provides a confirmation step showing declared permissions, required secrets, and risks. Legacy snapshot-catalog and local-manifest installs through `soha plugin install` submit directly without an interactive administrator review. Repository installs (`--repository`) first show a preview and ask for confirmation; in non-interactive use, `--yes` skips the confirmation prompt for the current invocation. Review the manifest and requested capabilities before confirming either flow; see [Install from a GitHub Repository](./installing-from-repositories.md).

Installation remains subject to server-side authorization and installation auditing. An installation audit event is not a separate human approval or CLI confirmation record. Review plugins declaring mutations, execution, privileged connectors, external provider keys, or high-cost model calls before installation; actual invocations remain governed by runtime authorization and policy.

Plugins cannot bypass Soha Gateway to access protected resources directly. Every call must terminate at Soha Gateway, a governed connector API, an MCP server, or a declared external process boundary.
