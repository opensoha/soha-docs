---
title: First Plugin Install
description: Inspect a marketplace plugin manifest, install it through the controlled plugin API, and verify permissions before enabling it.
---

# First Plugin Install

Plugin install is an administrative operation. A plugin manifest declares identity, package source, permissions, dependencies, entry points, and optional skills; it does not grant itself access. Soha still applies RBAC, Gateway grants, access policies, approvals, audit, and secret management.

## Prerequisites

- A running Soha control plane from [First Deploy](./first-deploy.md).
- An administrator profile with plugin-management permission.
- A marketplace source configured by the control plane.

## Inspect Marketplace Entries

```bash
soha plugin search
soha plugin show <id>
```

The API reference names are:

- `GET /api/v1/plugins/marketplace`
- `GET /api/v1/plugins/marketplace/:pluginID`

Before installing, review the plugin manifest fields for:

- publisher
- version
- checksum or signature status
- requested permissions
- required secrets
- capability refs
- entry points

## Install And Enable

```bash
soha plugin install <id>
soha plugin list
soha plugin enable <id>
```

The install path snapshots the manifest and source metadata so later marketplace changes do not silently alter the installed instance.

## Verify Installed State

```bash
soha plugin show <id>
```

For direct API verification, inspect:

- `GET /api/v1/plugins/installed`
- `GET /api/v1/plugins/:pluginID`
- `GET /api/v1/plugins/:pluginID/manifest`

## Expected Output Shape

Plugin output depends on the configured marketplace. The install path should
separate discovery, install, and enablement:

Fixture artifact: [`first-plugin-install.expected.txt`](/tutorial-fixtures/first-plugin-install.expected.txt)

```bash
soha plugin search
soha plugin show <id>
soha plugin install <id>
soha plugin enable <id>
```

```text
id       name              version
demo     Demo Plugin       0.1.0
manifest: reviewed
installed: demo
enabled: demo
GET /api/v1/plugins/installed
```

## Exit Criteria

- The marketplace entry is visible before install.
- The plugin manifest is reviewed before install.
- Install records version and source metadata.
- Enablement is separate from installation.
- Permission-denied users see disabled actions rather than ambiguous plugin state.

## Known Gaps

Plugin signing, provenance, compatibility matrices, and rollback governance remain roadmap items. Do not treat a successful install as proof that a plugin package is production-trusted.
