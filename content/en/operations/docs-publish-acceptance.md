---
title: Docs Publish Acceptance Record
description: Tracks external publishing switches, Next.js hosting settings, and initial deployment acceptance evidence for soha-docs.
---

# Docs Publish Acceptance Record

This document tracks the acceptance status of external publishing switches for `soha-docs`. The publishing pipeline uses standard Next.js/Nextra i18n hosting rather than GitHub Pages; after the initial release, remote deployment, custom domain, and smoke test evidence must be recorded back here.

## Release Targets

| Item | Release Target | Acceptance Status |
| --- | --- | --- |
| Published origin | `https://docs.opensoha.dev` | Configured as default in `next.config.mjs` |
| Base URL | `/` | Configured as default in `next.config.mjs` |
| i18n routing | `/zh`, `/zh/docs/...`, `/en`, `/en/docs/...` | Migrated to the official `nextra/locales` i18n proxy |
| Vercel project | project root `soha-docs`, build `npm run build` | Pending verification by a repository administrator in Vercel project settings |
| GitHub integration | connected repository with automatic Next.js output detection | Pending verification by a repository administrator in Vercel project settings |
| First publish run | Vercel production deployment | Pending completion of the first remote production deployment |

The fallback deployment topology is `https://opensoha.dev/site/`. Override the defaults with `DOCS_SITE_URL=https://opensoha.dev` and `DOCS_BASE_URL=/site/` only if the release environment explicitly switches to that subpath layout.

## Switch Acceptance Checklist

- The Vercel project root must be `soha-docs`.
- The build command must be `npm run build`.
- The output directory must be left empty or use automatic detection; it must not be set to `out`.
- The custom domain must match the release origin: `docs.opensoha.dev`.
- Default builds must use `DOCS_SITE_URL=https://docs.opensoha.dev` and `DOCS_BASE_URL=/`.
- Subpath deployments may override settings only via deployment environment variables without modifying default release values.
- The locale cookie uses `NEXT_LOCALE`, and unprefixed `/` and `/docs/...` requests must redirect to `/zh` or `/en` through the official i18n proxy.

Local release build verification command:

```bash
DOCS_SITE_URL=https://docs.opensoha.dev DOCS_BASE_URL=/ npm run build
```

Subpath compatibility verification command:

```bash
DOCS_SITE_URL=https://opensoha.dev DOCS_BASE_URL=/site/ npm run build
```

## First Publish Record

The initial release must be published through a Vercel production deployment or an equivalent Next.js host and record the following evidence:

| Field | Record |
| --- | --- |
| Run URL | Pending |
| Commit SHA | Pending |
| `DOCS_SITE_URL` | `https://docs.opensoha.dev` |
| `DOCS_BASE_URL` | `/` |
| Deployment URL | Pending |
| Vercel project screenshot or audit note | Pending |
| GitHub integration screenshot or audit note | Pending |
| DNS/custom domain screenshot or audit note | Pending |
| Result | Pending external Vercel publish |

Post-publish smoke checks must cover at least:

```bash
curl -I -s https://docs.opensoha.dev/zh/
curl -I -s https://docs.opensoha.dev/zh/docs/api/contracts/
curl -I -s https://docs.opensoha.dev/en/docs/
```

Acceptance completion criteria:

- The Vercel production deployment succeeds.
- The production deployment URL serves `https://docs.opensoha.dev/`.
- All three URLs above return HTTP `200` or an equivalent success status.
- The Run URL, Commit SHA, Deployment URL, Vercel project, GitHub integration, and DNS/custom domain records in this document are completed.
