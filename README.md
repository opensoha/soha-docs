# Soha Docs

This repository owns the Docusaurus documentation source for OpenSoha. The
published site acts as the public project introduction, self-hosted
documentation entry, Soha Cloud SaaS entry, and API/contracts reference entry.

The `soha` core repository must not import this source tree. Product links should point to the published docs URL, and local development can proxy `/docs/` to this site's dev server when needed.

Published docs should be deployed independently, for example at `https://docs.opensoha.dev/` or under an external `/docs/` path. The `soha` server links to docs through its configured external docs URL by default.

Set `SOHA_CLOUD_LOGIN_URL` at build time when the Cloud login entry is ready.
The homepage and navbar will link to that URL; without it, Cloud entry points
route to the local Cloud overview page:

```sh
SOHA_CLOUD_LOGIN_URL=https://cloud.soha.run/login npm run build
```

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## License

This repository is licensed under the Apache License 2.0. See
[LICENSE](./LICENSE) for the full license text.
