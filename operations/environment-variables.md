# Environment Overrides

## Backend

soha no longer uses `.env.example` as its primary configuration source.

Backend configuration lives in `configs/config.yaml`. Environment variables are only used for overrides when deployment environments need to change file defaults.

Typical overrides:

- `SOHA_CONFIG_FILE`
- `SOHA_HTTP_ADDR`
- `SOHA_LOGGER_LEVEL`
- `SOHA_DATABASE_HOST`
- `SOHA_DATABASE_PORT`
- `SOHA_DATABASE_NAME`
- `SOHA_DATABASE_USER`
- `SOHA_DATABASE_PASSWORD`
- `SOHA_REDIS_ADDR`
- `SOHA_AUTH_ENABLE_DEV_AUTH`

## Frontend

The current SPA does not expose a documented public env contract.

- API requests always target same-origin `/api/v1`
- local development relies on the Vite proxy in `web/vite.config.ts`
- the in-app docs page opens `/docs/`; the `soha` server redirects that path to the configured external docs URL by default

If you deploy the frontend and API on separate origins, use a reverse proxy or update `web/src/services/api-client.ts` accordingly.

## Docs

`soha-docs` has its own build-time configuration.

- `DOCS_SITE_URL`: published site origin, default `https://docs.opensoha.dev`
- `DOCS_BASE_URL`: published path prefix, default `/docs/`
- `DOCS_SHOW_LAST_UPDATE_TIME`: set to `true` to show Docusaurus last update time
- `SOHA_CLOUD_LOGIN_URL`: when set, points the homepage Cloud action and docs navbar `Cloud 登录` item to the SaaS entry

For `https://docs.opensoha.dev/`, build with `DOCS_BASE_URL=/`. For `https://opensoha.dev/docs/`, build with `DOCS_BASE_URL=/docs/`.
