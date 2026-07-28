---
name: soha-docs
description: >-
  Implement or review OpenSoha's Nextra and Next.js documentation in
  `content/en/**`, `content/zh/**`, locale routing, generated OpenAPI
  reference pages, tutorial fixtures, screenshot baselines, and publishing
  configuration. Use when public product, API, deployment, operation, or
  contributor documentation changes.
---

# Soha Docs

## Purpose

Keep the public docs accurate, bilingual, buildable, and independent from the
Soha server source tree.

## Workflow

1. Identify the authoritative product repository or `../soha-contracts`
   contract before documenting behavior.
2. Edit the matching `content/en` and `content/zh` pages when the promise is
   shared. Keep locale `_meta.ts` navigation aligned.
3. Generate API reference pages with `npm run api:reference:generate`; do not
   hand-edit `content/*/api/reference/generated/**`.
4. Update tutorial expected-output fixtures only after verifying the real
   command or API output.
5. Run focused checks while editing, then the full docs gate. Update screenshot
   baselines only for an intentional reviewed visual change.

## Rules

- Public routes remain locale-prefixed and owned by the existing Nextra locale
  flow in `app/[locale]`, `proxy.ts`, and content metadata.
- The core server may link to the published docs URL but must not import this
  repository or embed its source.
- Do not describe planned behavior as available. Mark experimental, degraded,
  Cloud-only, or unsupported capabilities explicitly.
- Keep secrets, real tokens, private hostnames, and user data out of examples
  and screenshots.
- Avoid duplicate prose when one canonical page plus links is sufficient.

## Verification

```bash
npm run typecheck
npm test
npm run screenshots:check
npm run build
```

The screenshot check is required for layout, navigation, theme, or referenced
image changes; content-only edits may rely on the docs tests and build.
