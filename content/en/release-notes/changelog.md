---
title: Changelog
description: Tracks locally verifiable release-facing documentation changes in OpenSoha current docs without inferring external deployment status.
---

# Changelog

This page tracks release-facing documentation changes that have landed in current docs and are verified by local docs checks. Actual GitHub Releases, npm publications, container images, docs host deployments, and public smoke results are recorded in the release notes or publish acceptance records; this page does not infer external deployment status.

## Unreleased

- Aligned release notes, deployment examples, and retired legacy-repository notices with consolidated `opensoha/soha` releases (Contracts `0.2.0`, Core `v0.1.13`, CLI `v0.2.1`, Agent `v0.2.0`, Skills `v0.1.4`, Connectors `v0.1.1`) and Operator `v0.1.1`.
- Pointed edit and feedback links to `opensoha/soha-docs` and localized theme chrome, metadata descriptions, and document `lang` synchronization across `zh` and `en`.
- Switched docs publishing notes and acceptance records to standard Next.js hosting with official Nextra i18n routes.
- Added the generated API reference route contract at [`/docs/api/reference/generated/`](../api/reference.md) backed by `../soha/contracts`.
- Added tutorial entry pages and expected-output fixtures for first deploy, cluster registration, delivery, AI Gateway MCP, and plugin installation.
- Added local docs drift checks covering sidebar entries, front matter, markdown links, tutorial command coverage, publish config, release notes, and pending OpenAPI management endpoint status.

## 0.1.x Beta

- See [OpenSoha 0.1.x Releases](./v0-1-x.md) for the verified component artifact matrix, upgrade order, and rollback boundaries.
- External Vercel production deployment and custom-domain smoke evidence remain pending in [Docs Publish Acceptance](../operations/docs-publish-acceptance.md) until the first remote production deployment completes.
