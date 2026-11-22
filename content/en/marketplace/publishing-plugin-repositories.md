# Publish a Plugin Repository

This guide is for authors who want users to preview and install a declarative plugin directly from a public GitHub repository. Repository installation is separate from official marketplace listing: publishing a repository does not make a plugin official or add it to the marketplace.

Choose **Use this template** in the [Soha plugin template](https://github.com/opensoha/soha-plugin-template) to create your own repository. Set your own plugin ID, publisher, and version in the root manifest. The template includes a validation workflow.

## Repository requirements

- Keep exactly one installable plugin at the repository root as `plugin.manifest.json`.
- Use a valid Soha plugin manifest and set `runtime.mode` to `manifest-only`. This flow reads only the root manifest; it does not clone the repository, fetch relative assets, or run repository scripts.
- Publish the manifest as raw JSON bytes. Soha records `sha256:<hex>` over those exact bytes, including whitespace and line endings. Formatting or reordering fields changes the digest.
- Treat each published plugin version as immutable. To change content, publish a new manifest version and a new Git commit; do not replace the content for an already published version.

The sample uses plugin ID `opensoha.example-skill-pack` and Git tag `v0.1.1`. [Soha Example Skill Pack](https://github.com/opensoha/soha-plugin-example-skill-pack/releases/tag/v0.1.1)

## Add an official catalog entry

Keep the plugin source in your own repository. Submit the plugin ID, display information, and canonical public GitHub repository URL to the official repository index. Publish a stable GitHub Release for each new manifest version, with a matching tag such as `v0.1.2` for manifest version `0.1.2`. Soha reads release history on demand and pins each installation to its commit and manifest digest. The catalog keeps the original snapshots at the frozen legacy entry point.

The repository index is available through the [official Soha marketplace](https://marketplace.opensoha.com/marketplace/repositories.json).

Catalog inclusion is controlled by the server's trusted source configuration. A manifest's publisher, signature text, or other self-declared fields cannot grant official status or verified-signature status.

## Validate before sharing

From a Soha source checkout, validate the distribution example with:

```bash
node contracts/scripts/verify-plugin-distribution-example.mjs
```

This checks the example manifest/catalog schemas, the catalog's relative snapshot reference, manifest equality, and the raw-byte SHA-256 checksum. Use the same checks in the publishing repository's validation workflow and reject attempts to overwrite a published version snapshot.

In the sample repository, run `npm ci --ignore-scripts` followed by `npm test`. To inspect the manifest's raw-byte digest locally, run `shasum -a 256 plugin.manifest.json` and compare its hexadecimal output with the `sha256:` digest in the installation preview.

## Limits

The first repository flow supports public GitHub repositories only. Private repositories, arbitrary Git hosts, pull request or issue URLs, `/blob/` file URLs, and subdirectory manifests are not supported. Do not put credentials in repository URLs. A valid digest proves that bytes match the reviewed preview; it does not establish who authored them or whether the plugin is safe.
