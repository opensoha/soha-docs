# Docs Publishing

The documentation site lives in the independent `soha-docs` repository and uses Docusaurus.

## Commands

```bash
cd soha-docs
npm install
npm run build
npm run serve
```

Documentation must evolve with code changes. Architecture, API, and development guides are first-class project assets.

The build output lands in `build/` inside this repository. Publish that directory to an external docs site such as `https://docs.opensoha.dev/` or `https://opensoha.dev/docs/`.

The `soha` core repository must not import this source tree. By default, `soha` redirects `/docs/` to the configured external docs URL. Development and private deployments may still use docs `proxy` or `dir` asset modes when needed.
