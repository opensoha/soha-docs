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
