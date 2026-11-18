---
title: API Reference Generation Path
description: Defines the source inputs, output paths, and release acceptance boundaries for the OpenSoha API reference.
---

# API Reference Generation Path

OpenSoha API documentation combines handwritten narrative pages with a reference index generated from contract artifacts. Handwritten pages focus on architectural context and key highlights, while the generated pages provide complete operation and JSON Schema coverage. Docs tests validate consistency against `../soha/contracts` and verify that the generated pages across both locales have no drift.

- Generated reference: [`/docs/api/reference/generated/`](./reference/generated/index.md)
- Source command: `npm run api:reference:generate`
- Drift check: `npm run api:reference:check`

Running the generation command updates the reference index under both `content/en` and `content/zh`.

## Source Inputs

The generator consumes only published contract sources:

- `../soha/contracts/openapi/soha-api.yaml`
- `../soha/contracts/*/*.schema.json`
- `../soha/contracts/examples/**`
- `api/reference/route-metadata.overlay.json`, which supplements covered core routes with implementation status, permissions, scopes, audit notes, and examples.

The generator must not read Root `soha/web` or runtime implementations as the public API source of truth.

## Contract Distribution

The same versioned contract is available without running the docs generator:

- npm: `@opensoha/contracts/openapi/soha-api.yaml` and `@opensoha/contracts/openapi/soha-api.json`.
- Go: `github.com/opensoha/soha/contracts/openapi`, with embedded YAML/JSON accessors plus version and SHA-256 metadata.
- A running Soha server: `/swagger/openapi.yaml` and `/swagger/openapi.json` when Swagger is enabled.

Server responses include `X-Soha-Contracts-Version` and `X-Soha-Contracts-SHA256`. Soha serves the packaged contract bytes directly; it does not generate a second runtime specification.

## Generated Output Contract

The generated output includes:

- An operation index.
- Request and response schema references.
- A JSON Schema artifact index.
- Core route metadata overlay entries from `api/reference/route-metadata.overlay.json`, supplementing the generated reference with implementation status, permissions, scopes, audit notes, and examples.

## Current Status

The current release scope commits to stable paths, the source input contract, the operation and schema index renderer, and the initial core route metadata overlay for AI Gateway. Overlay coverage can be expanded incrementally to add compatibility and deprecation notes for additional routes.
