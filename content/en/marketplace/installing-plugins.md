# Installing Plugins

Installing a plugin is a governed administrative operation. Before installation, Soha surfaces the plugin type, publisher, version, compatibility, declared permissions, required secrets, capability references, risk level, and manifest contents.

## Installation Workflow

1. Search for the plugin in the marketplace.
2. Inspect the plugin details and manifest.
3. Have an administrator review and confirm the requested permissions, secret requirements, and risk warnings.
4. Call the install API so Soha records the manifest snapshot, source, version, checksum/signature status, and audit event.
5. Configure secret references as needed.
6. Enable the plugin.

## CLI

```bash
soha plugin search
soha plugin show <id>
soha plugin install <id>
soha plugin list
soha plugin enable <id>
soha plugin disable <id>
soha plugin upgrade <id>
soha plugin remove <id>
```

## Web

The Web console provides:

- Marketplace plugin listings and detail views.
- Installed plugin listings and detail views.
- Install, enable, disable, and remove actions.
- Manifest JSON inspection.
- A pre-install confirmation modal clarifying that plugin declarations do not automatically grant permissions.

Plugin status and metadata remain visible wherever permitted; when a user lacks operational permissions, action buttons are disabled with an explanation rather than hiding plugin state.

## Upgrading and Removing Plugins

Upgrading a plugin re-reads and snapshots the target version's manifest so subsequent marketplace changes cannot silently alter an installed instance. Removing a plugin retains required audit records while cleaning up or unbinding plugin-owned assets, without bypassing existing approval, audit, or secret management workflows.
