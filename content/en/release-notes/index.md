---
title: Release Notes And Versioning Policy
description: Maintenance rules for OpenSoha documentation versions, release notes, compatibility matrices, upgrades, and rollbacks.
---

# Release Notes And Versioning Policy

OpenSoha release notes are part of the release verification loop. Every public release set must answer four questions:

- Which repositories, tags, packages, binaries, images, charts, or docs artifacts were published.
- Which Contracts, SDK, Core (with same-commit embedded Web), CLI, Agent, Skills, Connectors, and Operator artifacts form a compatible set.
- What operators must verify before upgrading and how to roll back safely on failure.
- Which checks come from local or CI gates versus verified GitHub Releases, npm, GHCR, Helm indices, or public deployment smoke tests.

## Documentation Versioning Policy

The site currently publishes current docs. Nextra version snapshots should be cut at real release milestones rather than frozen prematurely during routine development.

When creating a documentation snapshot, record:

- The Git tag, such as `docs-v0.1.0`.
- Matching tags or commits across `opensoha/soha` (Core, Web, Contracts, CLI, Agent, Skills, Connectors) and standalone repositories (`soha-operator`, `soha-helm`).
- `DOCS_SITE_URL`, `DOCS_BASE_URL`, and locale routing settings.
- The docs host deployment URL.
- Post-publish smoke verification results.

## Release Notes Rules

Every release notes page must cover:

- Release scope.
- Artifact matrix.
- Compatibility matrix.
- Upgrade notes.
- Rollback notes.
- Verification evidence.
- Known gaps.

If a remote artifact or public deployment record does not exist yet (such as a pending Helm chart bump or external Vercel production cutover), mark it explicitly as pending rather than substituting local build checks for publication evidence.

## Compatibility Matrix Shape

| Component | Version or tag form | Required evidence |
| --- | --- | --- |
| Contracts (`opensoha/soha` `contracts/`) | `contracts/v*` + npm version | Signed npm publish, Go submodule tag and proxy check, GitHub Release assets |
| Core and embedded Web (`opensoha/soha`) | `v*` | Pinned published Contracts dependency, same-commit Web build and digest, binary checksum, public manifest, and GHCR image checks; Web dist is an Actions build artifact, not a promised standalone Release asset |
| CLI (`opensoha/soha` `cli/`) | `cli/v*` + `@opensoha/cli` version | Multi-platform archives and checksums, signed npm launcher, fresh-cache `npx` smoke, GHCR image |
| Agent and runtimes (`opensoha/soha` `agent/`) | `agent/v*` | Multi-platform archives and checksums, multi-arch Agent / DSH / Buildpacks / Volume Reader GHCR images |
| Skills (`opensoha/soha` `skills/`) | `skills/v*` | Validated asset bundle, manifest, verification report, and signatures |
| Connectors (`opensoha/soha` `connectors/`) | `connectors/v*` | Package checks, manifest registry, and signatures |
| Operator (`opensoha/soha-operator`) | `v*` | Versioned Kustomize manifests, multi-arch GHCR image, and CRD/controller checks |
| Helm Charts (`opensoha/soha-helm`) | `<chart>-*` | Referenced runtime image verification, OCI/GitHub Release packages, and `gh-pages` index |

The six former standalone component repositories are archived as read-only historical sources; new releases are qualified from the owning repositories above.

## Generated API Reference Path

Both handwritten API pages and the generated index at [`/docs/api/reference/generated/`](../api/reference.md) are checked against the pinned Root `../soha/contracts` source (`contracts/v0.2.0`). Run `npm run api:reference:generate` after contract updates and verify parity in CI with `npm run api:reference:check` and the contract consistency suite.
