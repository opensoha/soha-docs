# 认证与错误

## 认证入口

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

访问令牌过期或签发时的授权版本失效时，受保护请求返回 `401 unauthorized`。客户端可调用刷新入口，并重新读取当前身份与权限；刷新成功只恢复当前账号仍获准的访问，不会恢复已撤销的角色、团队或其他授权。已撤销会话、停用账号不能刷新。

新会话访问令牌包含 `authzVersion`；同一会话刷新后，旧版本令牌仍然失效。兼容未携带该字段的旧令牌时，服务端重新读取当前身份，不使用令牌内的旧成员关系授权。任务、原会话和消息读取仍须通过当前权限与资源归属检查；身份有效但缺少所需权限时返回 `403 access_denied`，保存历史数据不等于允许读取。

When `auth.enable_dev_auth` is enabled in `config.yaml`, the backend can still attach the configured bootstrap principal to requests without a bearer token. That fallback is for local development only and does not replace the real password or third-party login paths.

`auth.login_verification.slider_enabled` controls whether the login page renders the frontend slider interaction before password submission.

## Provider 说明

- `POST /api/v1/auth/oidc/exchange` is still the final frontend session exchange endpoint for OIDC and OAuth2-style providers.
- `GET /api/v1/auth/providers` returns every enabled third-party provider instead of assuming a single OIDC entry.
- OIDC, OAuth2, Feishu, DingTalk, and WeCom providers can supplement local role and organization bindings at login time when `syncRolesOnLogin` or `syncOrgsOnLogin` is enabled. The callback only matches existing local roles and organizations; it does not create directory objects.
- SAML 登录已通过 `GET /api/v1/auth/saml/:providerID/metadata` 和 `POST /api/v1/auth/login/:providerID/acs` 完整启用。响应绑定一次性 state 与请求 ID，并校验签名、Destination、Recipient、Audience 和时间条件。

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
