# Soha Docs

This repository owns the Nextra documentation and website source for OpenSoha.
The published site acts as the public project introduction, self-hosted
documentation entry, and API/contracts reference entry.

The `soha` core repository must not import this source tree. Product links
should point to the published docs URL, and local development can proxy `/docs/`
to this site's dev server when needed.

## Internationalization

The site uses Nextra's official docs-theme i18n flow on top of Next.js routing:

- Chinese content lives in `content/zh`.
- English content lives in `content/en`.
- Public routes are locale-prefixed: `/zh`, `/zh/docs/...`, `/en`, and
  `/en/docs/...`.
- `proxy.ts` uses `nextra/locales` to redirect `/` and `/docs/...` to the best
  locale from `NEXT_LOCALE` or the browser language.

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

The site is a standard Next.js build for Vercel or another Node-capable host.
It is no longer exported to `out/`.

Vercel can connect directly to a GitHub repository. For the default OpenSoha
docs deployment, use the repository root `soha-docs`, build command
`npm run build`, and leave the output directory empty so Vercel detects Next.js.

## License

This repository is licensed under the Apache License 2.0. See
[LICENSE](./LICENSE) for the full license text.
