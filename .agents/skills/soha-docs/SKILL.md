---
name: soha-docs
description: Change or review the public bilingual Soha documentation site, navigation, API references, and publishing. Repository-local collaboration rules are outside this skill.
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
3. When API references change, generate pages with `npm run api:reference:generate`; do not
   hand-edit `content/*/api/reference/generated/**`.
4. Update tutorial expected-output fixtures only after verifying the real
   command or API output.
5. Run focused checks for local content edits; use the full docs gate for site structure, dependency, or publishing changes. Update screenshot
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
image changes. Local prose fixes use relevant content/link checks; broad content changes use
docs tests and build. Collaboration skill edits use metadata and reference validation.
