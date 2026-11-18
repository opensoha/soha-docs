# Login and Identity

## Goal

The login flow in `soha` is split into two layers:

- Local username and password sign-in
- Aggregated sign-in across multiple third-party identity providers

Supported third-party login provider types:

- `oidc`
- `feishu`
- `dingtalk`
- `wecom`
- `oauth2`
- `saml`

The design goal is not merely to support a single enterprise SSO integration, but to allow the console to hold multiple enterprise identity entry points simultaneously and display enabled providers side by side on the login page.

## Configuration Model

The backend settings service aggregates login configuration under `identity.login_providers`, containing:

- `providers[]`
- `defaultProviderId`

Each provider entry includes at least:

- `id`
- `name`
- `type`
- `enabled`
- `redirectUrl`
- `frontendRedirectUrl`

For OAuth/OIDC-style providers, it also includes:

- `clientId`
- `clientSecret`
- `issuer` or `authorizeUrl`
- `tokenUrl`
- `userInfoUrl`
- `scopes`
- `defaultRoles`
- `userIdField`
- `userNameField`
- `emailField`
- `roleField`
- `organizationField`
- `syncRolesOnLogin`
- `syncOrgsOnLogin`
- `roleSyncMode`
- `orgSyncMode`

## Login-Time Role and Organization Mapping

Runnable OIDC, OAuth2, Feishu, DingTalk, and WeCom providers support supplemental bindings at login time:

- `roleField` reads external role references from ID token claims or the userinfo/profile response
- `organizationField` reads external organization references from ID token claims or the userinfo/profile response
- `syncRolesOnLogin` controls whether local role bindings are supplemented after a successful login
- `syncOrgsOnLogin` controls whether local organization bindings are supplemented after a successful login
- `roleSyncMode` and `orgSyncMode` support `append` and `replace_external`

`append` only adds the local role or organization bindings resolved during the current login. `replace_external` clears external-source bindings previously written by the same provider before writing the newly resolved bindings; it never deletes local bindings manually maintained by administrators on the Users page.

Role resolution matches only existing local `roles.id` or `roles.name` records. Organization resolution matches only existing local organizations:

- `teams.id`
- `teams.slug`
- `teams.org_path`
- `teams.source` equals the provider type or provider ID and `teams.external_id` equals the external organization reference

Login callbacks do not automatically create local organizations or roles. Administrators must first build the organization tree under Organization Structure and populate the corresponding source and external ID for third-party organizations. Separating real-time directory synchronization from login-time authorization mapping prevents the login flow from acting as an implicit master-data import.

Application credentials such as Feishu, DingTalk, and WeCom App Key, App Secret, CorpID, and CorpSecret belong to the login provider application configuration under Login Settings, not to organization nodes. Organization nodes store only the mapping source and third-party department/organization ID; when multiple applications of the same provider type are configured, the organization source should reference the specific login provider ID rather than only the generic `feishu`, `dingtalk`, or `wecom` type.

## Directory synchronization

Directory connections are separate from login-time role and organization mapping. Feishu connections configured as `scheduled_and_realtime` accept verified contact events and apply a single-object delta from the event payload. When the payload does not contain enough current data, Soha fetches only the referenced department or person instead of pulling the complete directory snapshot. Duplicate deliveries are idempotent, and older events do not overwrite a newer projection.

Scheduled or manually triggered full reconciliation remains the drift-repair fallback. Unsupported or incomplete events mark the connection as requiring reconciliation; they do not trigger a full snapshot for every webhook.

For a departure or user deletion event, Soha removes the memberships owned by that directory source. With `userDisablePolicy: managed_only`, it also disables an account managed by the connection and revokes its active sessions. With `userDisablePolicy: never`, it leaves the account enabled and removes only the directory-owned memberships. Missing or deleted organizations are archived rather than hard-deleted.

The directory connection console shows callback configuration and verification, recent queued or failed events with retry controls, the last incremental and full reconciliation times, and whether full reconciliation is required. Feishu directory events are currently supported; DingTalk and WeCom still rely on scheduled or manual full synchronization.

SAML login sources persist and use these runtime fields:

- `metadataUrl`
- `entityId`
- `certificate`

The server publishes SP metadata and an ACS endpoint, then validates signatures, `InResponseTo`, timing, audience, recipient, and assertion replay. Imported login sources remain disabled until an operator verifies the metadata and certificates.

## Configuration Source

The sole Settings configuration source for login providers is `identity.login_providers`.

Current rules:

- Settings maintains login providers through `/settings/identity/providers`
- Legacy single-OIDC setting keys are no longer read or written
- No default login provider is projected from legacy OIDC configuration
- Deleting a login provider retains existing account identity links, while disabling sign-in through that entry point

Rationale:

- Avoid generating a `default` OIDC login provider from empty configuration
- Keep a clear boundary between external login providers used to sign in to Soha and the Provider workbench

## Runtime Flow

## Browser Sessions and Token Storage

The browser console follows a BFF-oriented session model:

- `accessToken` is kept only in frontend memory for `Authorization: Bearer ...` on regular API requests
- `refreshToken` is written by the backend as an `HttpOnly` cookie; the frontend neither persists nor reads the refresh token
- `/api/v1/auth/refresh` accepts an empty body, reads the session from the refresh cookie first, and renews the refresh cookie
- `/api/v1/auth/logout` clears the refresh cookie; frontend sign-out must call this endpoint before clearing local state
- Local development proxies `/api/v1` same-origin through the Vite `/api` proxy by default so the refresh cookie is not dropped on cross-site requests

After a page reload, when no in-memory `accessToken` is present, protected routes call the refresh endpoint to restore the session first and redirect to the login page only if recovery fails.

## OIDC Provider sessions

The OIDC Provider in the internal workbench is the protocol surface through which Soha issues identities to downstream applications. It is separate from external login providers managed in Settings. It supports:

- `authorization_code` and `refresh_token` grants
- opaque Refresh Tokens when the client enables `refresh_token` and the authorization request includes `offline_access`
- one-time Refresh Token rotation; reuse revokes the complete token family and OIDC Session
- binding Access Token, UserInfo, Introspection, and Proxy Session validity to the originating Soha Session
- effective Access Token and Refresh Token revocation through `/oauth2/revoke`
- RP-initiated logout through `/oauth2/logout` with `id_token_hint`, `post_logout_redirect_uri`, and `state`

Only Refresh Token hashes are persisted. A `post_logout_redirect_uri` must exactly match a Redirect URI registered for the client.

Browsers cannot reliably attach an `Authorization` header to native `WebSocket`, `EventSource`, or noVNC connections. Before opening a Pod logs stream, Pod terminal, virtualization operation stream, or VNC/noVNC session, the console exchanges the current session access token via `POST /api/v1/auth/stream-ticket` for a short-lived one-time ticket and passes `stream_ticket` in the same-origin stream URL query string. The server accepts only allowlisted paths; each ticket expires after 60 seconds, is strictly bound to its target path, and is consumed and deleted from PostgreSQL on first verification. After consuming the ticket, the server also validates session state and `authz_version`, ensuring role, organization, or account status changes still invalidate subsequent streaming connections.

## Machine-to-Machine Calls and Runner Tokens

Browser sign-in and machine-to-machine calls follow distinct boundaries:

- The browser console uses Soha session access/refresh tokens, backed by server-side session state and `authz_version` so role, organization, and account status changes trigger refreshes
- Direct API callers, CI runners, Docker runners, AI agent runners, and AI Gateway clients authenticate with Bearer tokens
- Long-lived machine tokens converge on the AI Gateway PAT/SAT model: only token hashes are stored, the principal is a user or service account, and access is constrained by `permissionKeys` and scopes

During the transition, `runtime.execution_runner_token` remains supported for compatibility while external runner endpoints also accept `service_account_token`:

- Delivery execution runners require `delivery.execution-tasks.claim`
- Docker runners require `docker.operations.claim`
- AI agent runners require `ai.gateway.invoke` or `observe.ai.chat`

Task-scoped callback tokens are still verified by the owning execution task or agent run. A SAT only replaces the global shared entry token governing who may call claim/status/callback on a runner channel; it does not replace per-task replay protection or callback ownership checks.

### 1. Login Page Discovery

The login page first fetches `/api/v1/auth/providers`.

The response includes:

- `id`
- `type`
- `name`
- `enabled`
- `loginUrl`

The frontend renders all enabled third-party login providers rather than filtering only for OIDC.

The login page also reads `/api/v1/auth/login-options`. When
`auth.login_verification.slider_enabled` is `true` in configuration, the frontend presents a slider interaction before password sign-in.

### 2. Browser Redirect

The sign-in entry point for each provider is:

- `GET /api/v1/auth/login/:providerID/start`

The compatibility entry point is retained:

- `GET /api/v1/auth/oidc/login`

### 3. Callback Handling

Unified provider callback endpoint:

- `GET /api/v1/auth/login/:providerID/callback`

The compatibility OIDC callback endpoint is retained:

- `GET /api/v1/auth/oidc/callback`

During callback handling, the backend:

- Validates `state`
- Resolves the provider type
- Exchanges the authorization code
- Fetches or constructs the user profile
- Links or creates a local user
- Writes `user_identities`
- Creates a session
- Generates a one-time exchange code
- Redirects back to `/login/callback?code=...`

### 4. Frontend Session Exchange

The frontend callback page calls:

- `POST /api/v1/auth/oidc/exchange`

This endpoint handles the final session exchange for all OAuth2-style login flows, not only OIDC.

## Current Provider Status

### OIDC

Fully operational.

- Discovers the issuer
- Exchanges the authorization code
- Validates the ID token
- Populates user attributes from claims or userinfo

### Generic OAuth2

Fully operational when the operator configures valid:

- `authorizeUrl`
- `tokenUrl`
- `userInfoUrl`
- Field mappings

### Feishu

Uses the Feishu Open Platform authorization-code flow with its dedicated token exchange before fetching user profile information.

It requires the operator to verify:

- Application credentials
- Callback URL
- User profile field mappings

Default presets cover common endpoints and may require adjustment for specialized Feishu application types.

### DingTalk

Uses OAuth2 authorization-code and access-token exchange, then fetches user information from the Open Platform endpoint accessible to the operator's application.

Because user-profile APIs vary across DingTalk Open Platform application types, DingTalk is modeled as a configurable provider rather than hardcoding a single URL and field schema.

### WeCom

WeCom does not follow a generic OAuth2 token-exchange flow.

The current implementation:

- Obtains `code` via web OAuth redirect
- Fetches the enterprise access token on the server using the corp secret
- Exchanges `code + access_token` for `UserId`

Accordingly:

- `tokenUrl` points to the enterprise access-token endpoint
- `userInfoUrl` points to the `getuserinfo` endpoint
- `clientId` maps to `corpid`
- `clientSecret` maps to `corpsecret`

By default, only the enterprise `UserId` is guaranteed; whether email or display name can also be populated depends on additional user-detail endpoints and field mappings configured by the operator.

### SAML

The SP login flow is operational end to end.

- SP metadata: `GET /api/v1/auth/saml/:providerID/metadata`
- ACS: `POST /api/v1/auth/login/:providerID/acs`
- strict validation of signature algorithms and placement, `InResponseTo`, Destination, Recipient, Audience, and time conditions
- one-time assertion IDs and state consumption to prevent replay
- NameID and attribute mappings resolve into the same local user, role, and organization model

Metadata accepts only currently valid signing certificates. Rotate certificates before the previous certificate expires.

## Provider workbench runtime boundary

Workbench providers are distinct from external login sources described above:

- `oidc`: Soha acts as an OIDC Provider for downstream applications. The downstream application owns `state`, `nonce`, and PKCE; the workbench launches only its configured application URL.
- `saml`: Soha acts as a SAML IdP, publishes metadata and SSO endpoints, and applies application policy, MFA, and registered ACS restrictions.
- `proxy`: supports forward-auth and reverse-proxy. Reverse-proxy rejects private, loopback, and link-local targets by default; enable `allowPrivateUpstream` only for an intentional internal-service integration.

OIDC clients can combine strict redirect URI entries with RE2 regular expressions. Strict entries require exact equality; regular expressions are validated at configuration time and matched against the complete URI, not a substring. At least one strict or regular-expression entry is required.

SAML signing certificates can be rotated from the Provider workbench with a 0-30 day overlap. During overlap, metadata publishes the new active certificate and the retiring certificate so downstream service providers can refresh without downtime.

Provider `secretRefs` accept only `soha://secrets/...` references. Read APIs return configured aliases, never reference values. OIDC redirect URIs, SAML ACS URLs, and `http.access_url` support both HTTP and HTTPS so self-hosted operators can choose their transport boundary. HTTPS remains strongly recommended because HTTP exposes authorization codes, assertions, and session cookies to network interception. OIDC and SAML issuers use the configured access URL instead of trusting forwarded host/proto headers.

## Audit and Local Identity Binding

Regardless of third-party provider type, all logins resolve into the same local identity model:

- Local `users`
- Local `roles`
- Local `sessions`
- Local `user_identities`

When a third-party login succeeds:

- Looks up an existing binding by `provider_type + provider_id + provider_user_id` first
- Attempts to merge with an existing local user by the provider-returned email if no binding exists
- Creates a new local user if no match is found
- Assigns `defaultRoles` when the user has no roles and `defaultRoles` is configured on the provider
- When `syncRolesOnLogin` is enabled, both `defaultRoles` and roles resolved from `roleField` are applied as external-source role bindings managed by that provider
- When `syncOrgsOnLogin` is enabled, organizations resolved from `organizationField` are applied as external-source organization bindings managed by that provider

The account-linking path does not independently check `email_verified`. Configure only providers that supply trustworthy email ownership; email-based linking does not mean Soha has independently verified that ownership.

Audit events are recorded uniformly by the platform; external providers supply identity assertions only and do not directly bypass local authorization.

## Frontend and Permission Boundary

Login Settings is purely a configuration surface and does not bypass the platform permission model.

Access continues to require:

- `settings.identity.view`
- `settings.identity.manage`

Visible menus, accessible routes, and invokable APIs after sign-in are still governed by the local permission snapshot and backend authorization checks rather than determined directly by an external IdP.
