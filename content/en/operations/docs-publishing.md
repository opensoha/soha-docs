# Docs Publishing

The documentation site lives in the independent `soha-docs` repository and uses Next.js with Nextra. Release docs are published independently from the `soha` core binary and web artifact.

The active site uses Nextra's official docs-theme i18n flow. Chinese content lives under `content/zh`, English content lives under `content/en`, and public routes are locale-prefixed:

- `/zh` and `/zh/docs/...`
- `/en` and `/en/docs/...`

`proxy.ts` exports `proxy` from `nextra/locales`, so `/` and `/docs/...` redirect to the best locale from `NEXT_LOCALE` or the browser language.

## Commands

```bash
cd soha-docs
npm install
npm test
npm run typecheck
npm run build
npm run serve
```

Documentation must evolve with code changes. Architecture, API, and development guides are first-class project assets.

The site is a standard Next.js build. It is not exported to `out/`, and it is not deployed through GitHub Pages. Publish the build with a Node-capable Next.js host such as Vercel, using the repository root `soha-docs`, build command `npm run build`, and the host's automatic Next.js output detection.

The `soha` core repository must not import this source tree. By default, `soha` serves the API and embedded Web console, then redirects `/docs/` to the configured external docs URL. Development and private deployments may still use docs `proxy` or `dir` asset modes when needed, but release docs are treated as an independent site.

## Build-Time Environment

`next.config.mjs` reads these build-time variables:

- `DOCS_SITE_URL`: published origin. Default: `https://docs.opensoha.dev`
- `DOCS_BASE_URL`: published path prefix. Default: `/`
- `DOCS_SHOW_LAST_UPDATE_TIME`: retained as a workflow variable for release compatibility; Nextra does not currently render it.

For `https://docs.opensoha.dev/`, use:

```bash
DOCS_SITE_URL=https://docs.opensoha.dev DOCS_BASE_URL=/ npm run build
```

For `https://opensoha.dev/site/`, use:

```bash
DOCS_SITE_URL=https://opensoha.dev DOCS_BASE_URL=/site/ npm run build
```

## Quality Gates

The Search quality gate is based on Nextra's local Pagefind-backed search. `next.config.mjs` keeps search enabled while excluding code blocks from the index, and `scripts/verify-docs-drift.mjs` checks that the publishing notes and config stay aligned. Release builds do not require external Algolia credentials.

The broken-link gate has two layers: the Nextra/Next build validates routable pages, and `scripts/verify-docs-drift.mjs` scans relative Markdown links during `npm test`.

The Screenshot regression gate is driven by
`quality/docs-screenshot-regression.json`. The manifest records the required
desktop and mobile viewport coverage, source document for each route, and the
DOM/content assertions that a screenshot runner must capture before a release.
After a local or CI build, run `npm run screenshots:check` to verify the
rendered Nextra routes against the checked-in baseline records under
`quality/screenshots/baseline`. When an intentional docs or Web-facing route
change updates the rendered pages, run:

```bash
npm run build
npm run screenshots:update
npm run screenshots:check
```

The baseline records store the route, viewport, source hash, rendered HTML hash,
and assertion set. They are text artifacts so release reviews can see exactly
which public docs pages changed.

## Hosting Workflow

The release publishing path is a host-managed Next.js deployment, not GitHub Pages.

- Connect the `soha-docs` repository to the Next.js host.
- Set the project root to `soha-docs`.
- Use `npm run build` as the build command.
- Leave the output directory empty or automatic so the host detects Next.js.
- Configure the production domain as `docs.opensoha.dev` in the host and DNS provider.
- Do not add `public/CNAME` or `.github/workflows/publish.yml`; those are GitHub Pages-specific artifacts.
- Keep the CI workflow checking out `opensoha/soha-contracts` next to `soha-docs` so docs consistency tests can validate OpenAPI and JSON Schema artifacts.
- Verification before deploy: `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.

Set deployment environment variables when publishing outside the defaults:

- `DOCS_SITE_URL`
- `DOCS_BASE_URL`
- `DOCS_SHOW_LAST_UPDATE_TIME`

The CI workflow uses the same sibling `soha-contracts` checkout and runs the same docs consistency tests before every build.

## English Content Strategy

The active Nextra site uses locale-aware content roots now. Chinese source is `content/zh`; English source is `content/en`. Legacy Docusaurus translation directories are not part of the active source tree after the Nextra docs-theme rebuild.

When changing translated content, keep search indexing, canonical URL changes, and deployment environment variables explicit in the Next/Nextra config and CI workflow.
