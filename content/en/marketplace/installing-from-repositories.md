# Install from a GitHub Repository

Repository installation lets an authorized operator preview a declarative plugin from a public GitHub repository without waiting for marketplace listing. The repository is not thereby trusted or official.

These steps apply to [Soha Core and embedded Web v0.1.15](https://github.com/opensoha/soha/releases/tag/v0.1.15) and [Soha CLI v0.2.2](https://github.com/opensoha/soha/releases/tag/cli/v0.2.2).

## Supported repository references

Enter a public repository URL such as `https://github.com/owner/repository` to select the latest stable GitHub Release. If the repository has no stable Release, select a branch explicitly. Use `/releases/tag/<tag>` for a published release, or use `/tree/<ref>` or `--ref` for a specific branch, tag, or commit. Soha pins the preview to the full 40-character commit SHA.

Soha reads only the repository-root `plugin.manifest.json`. Private repositories, arbitrary Git hosts, subdirectory manifests, `/blob/` file links, pull request links, and issue links are unsupported. The manifest must declare `runtime.mode: manifest-only`; this path does not clone the repository, fetch other files, or execute its scripts.

## Web installation

1. Open the marketplace under **Settings → Extensions** and choose **Install from repository**.
2. Enter the public GitHub repository URL and, optionally, a branch, tag, or commit. Start the preview.
3. Review the plugin identity, compatibility, requested permissions, repository, pinned commit, raw manifest digest, and source/integrity status. A repository install is not an official listing; digest matching does not mean signature verification or a safety review.
4. Confirm installation. A new repository installation is disabled by default. Enable it separately after reviewing its declarations and configuring any required secrets.

The preview is short-lived and bound to the operator, source, pinned commit, and raw manifest bytes. If it expires or the content no longer matches, preview again. An existing plugin with the same ID from another source is not silently replaced; inspect the installed plugin and resolve the source conflict deliberately.

## CLI installation

```bash
soha plugin install --profile local --repository https://github.com/owner/repository
```

The CLI generates a preview before asking for confirmation. If there is no stable release, an interactive session lets you choose a branch. In non-interactive mode, specify a ref such as `--ref refs/heads/main`. Each invocation generates a fresh preview, and `--yes` skips that invocation’s confirmation prompt. When you rerun non-interactively, use the repository’s base URL with `--ref <full-commit-sha> --yes` to pin the reviewed commit and confirm. Repository installs remain disabled unless `--enable` is explicitly supplied.

To install version 0.1.1 of the sample:

```bash
soha plugin install --profile local --repository https://github.com/opensoha/soha-plugin-example-skill-pack --ref v0.1.1
```

## View release history

In the marketplace, open the details for a plugin registered with a GitHub repository and choose **View release history**. Soha loads published GitHub releases from the author’s repository on demand. For a plugin you have yet to install, select a release to preview it. Pasting a repository URL still selects the latest stable release by default.

The [official repository index](https://marketplace.opensoha.com/marketplace/repositories.json) lists repository addresses. The [legacy catalog](https://marketplace.opensoha.com/marketplace/index.json) preserves older snapshots. The sample’s `v0.1.0` snapshot remains available as a record, and the legacy catalog marks that version as suspended for installation.

## Upgrade from the same source

Open **Installed** in the marketplace to see available updates from the same repository, then choose **Upgrade**. For a plugin installed directly from a repository, you can also begin the upgrade on its installed details page. Each upgrade uses the repository and marketplace source recorded at installation and requires preview and confirmation.

This CLI example uses the sample plugin and an explicit release ref:

```bash
soha plugin upgrade --profile local --repository --ref refs/tags/v0.1.1 opensoha.example-skill-pack
```

Optionally pass `--ref <branch-or-tag>` to select the target. Review the new pinned commit, digest, version, and any added permissions before confirming. Added permissions require explicit acknowledgment; in non-interactive use, pin the reviewed full commit SHA and pass `--yes`. If the upgrade adds permissions, also pass `--confirm-permission-increase` after reviewing them. If the installed record changes during preview, start again. A repository endpoint failure does not fall back to the legacy marketplace upgrade route.

Viewing plugins requires `plugin.view`. Repository preview and installation require `plugin.install`. Confirming an upgrade requires `plugin.upgrade`. Installation records the plugin but does not grant its declared runtime permissions. See [Plugin Permissions](./plugin-permissions.md) and [Publish a Plugin Repository](./publishing-plugin-repositories.md).
