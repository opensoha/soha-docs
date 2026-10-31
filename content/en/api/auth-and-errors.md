# Auth And Errors

## Auth Entry

The current backend uses real identity and session handling.

- Password login: `POST /api/v1/auth/login`
- Token refresh: `POST /api/v1/auth/refresh`
- Current user: `GET /api/v1/auth/me`
- Logout: `POST /api/v1/auth/logout`
- Provider discovery: `GET /api/v1/auth/providers`
- Login options: `GET /api/v1/auth/login-options`
- Provider browser entry: `GET /api/v1/auth/login/:providerID/start`
- Provider callback: `GET /api/v1/auth/login/:providerID/callback`
- OIDC browser entry: `GET /api/v1/auth/oidc/login`
- OIDC callback: `GET /api/v1/auth/oidc/callback`
- OIDC frontend exchange: `POST /api/v1/auth/oidc/exchange`

Production-style requests use `Authorization: Bearer <access-token>`.

Protected requests return `401 unauthorized` when an access token expires or its issuance authorization version becomes stale. Clients can use the refresh endpoint and reload the current identity and permissions. A successful refresh only restores access still granted to that account; it does not restore revoked roles, teams, or other grants. Revoked sessions and disabled accounts cannot refresh.

New session access tokens include `authzVersion`; refreshing the same session leaves older versions invalid. For legacy tokens without this field, the server reloads the current identity instead of authorizing embedded memberships. Reading tasks, original conversations, and messages still requires current permission and resource ownership. An authenticated identity without the required permission receives `403 access_denied`; retaining history does not grant access to it.

When `auth.enable_dev_auth` is enabled in `config.yaml`, the backend can still attach the configured bootstrap principal to requests without a bearer token. That fallback is for local development only and does not replace the real password or third-party login paths.

`auth.login_verification.slider_enabled` controls whether the login page renders the frontend slider interaction before password submission.

## Provider Notes

- `POST /api/v1/auth/oidc/exchange` is still the final frontend session exchange endpoint for OIDC and OAuth2-style providers.
- `GET /api/v1/auth/providers` returns every enabled third-party provider instead of assuming a single OIDC entry.
- OIDC, OAuth2, Feishu, DingTalk, and WeCom providers can supplement local role and organization bindings at login time when `syncRolesOnLogin` or `syncOrgsOnLogin` is enabled. The callback only matches existing local roles and organizations; it does not create directory objects.
- SAML login is operational through `GET /api/v1/auth/saml/:providerID/metadata` and `POST /api/v1/auth/login/:providerID/acs`. Responses are bound to one-time state and request IDs and validate signatures, Destination, Recipient, Audience, and time conditions.

## Error Envelope

```json
{
  "error": {
    "code": "access_denied",
    "message": "principal is not allowed to list deployments in namespace payments",
    "request_id": "req_123"
  }
}
```

## Error Codes

- `invalid_argument`
- `unauthorized`
- `access_denied`
- `not_found`
- `cluster_unavailable`
- `internal_error`

## CLI v2 authentication (pending release combination)

These additive endpoints require a verified Core/Web/CLI combination. Existing `/auth/login`, `/auth/refresh`, Web cookies and App/provider exchanges retain their original protocol.

| Endpoint (below `/api/v1`) | Purpose |
| --- | --- |
| `GET /auth/cli/options` | Discover protocol and enabled methods |
| `POST /auth/cli/device-authorizations` | Create a request-bound six-digit device authorization |
| `POST /auth/cli/device-authorizations/inspect` | Authenticated browser inspection with request locator and code |
| `POST /auth/cli/device-authorizations/decision` | Explicit approve/deny bound to the original browser confirmation |
| `POST /auth/cli/device-token` | Claim with device proof, PKCE and durable request ID |
| `POST /auth/cli/device-authorizations/cancel` | Cancel with device proof |
| `POST /auth/cli/password` | Explicit password path subject to verification policy |
| `POST /auth/cli/refresh` | Rotate an opaque v2 refresh credential |
| `POST /auth/cli/logout` | Revoke using the refresh proof, including after access expiry |
| `GET /auth/context` | Confirm a user session, PAT or service-account identity |
| `GET /auth/cli/sessions` | List the current user's CLI sessions with cursor pagination |
| `POST /auth/cli/sessions/{id}/revoke` | Revoke an owned session |
| `GET /ai-gateway/token-rotations/{requestId}` | Recover non-secret Key rotation outcome using independent authentication |

Pending polling returns `409 authorization_pending`; backoff returns `429 slow_down` with `Retry-After`. Claim/refresh recovery is limited to thirty seconds and requires the original credential, request ID and PKCE where applicable. A different refresh request ID reusing a consumed credential revokes the family. Recovery is bounded, not indefinite replay.

Browser inspection/decision requires a real browser session, matching Origin, current ownership and existing MFA step-up where required. Registering another MFA factor also requires recent verification with an existing factor (`403 mfa_required`). An incorrect factor returns `401 mfa_verification_failed` without invalidating the browser session. No automatic password fallback bypasses this policy.

Authentication endpoints use `Cache-Control: no-store` and do not expose CLI credentials through browser cookies. New logout/session-revoke responses may be empty `200` responses. An invalid bearer rejected before protected business handling carries `WWW-Authenticate: Bearer realm="soha", error="invalid_token"`. The CLI retries a write once only with that pre-handler signal; an arbitrary business `401` does not authorize replaying a write.

Typical diagnostics include `server_mismatch`, `credential_store_unavailable`, `credential_save_unconfirmed`, `interactive_auth_required`, `cli_auth_disabled`, `refresh_recovery_expired` and `refresh_reuse_detected`. An offline CLI status is local metadata rather than authentication evidence. See [CLI login](../operations/soha-cli.md#login).
