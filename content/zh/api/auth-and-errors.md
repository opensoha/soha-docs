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

## CLI v2 认证（待发布组合）

这些增量端点需先验证 Core/Web/CLI 版本组合。既有 `/auth/login`、`/auth/refresh`、Web cookie 与 App/提供商交换保留原协议。

| 端点（位于 `/api/v1` 下） | 用途 |
| --- | --- |
| `GET /auth/cli/options` | 发现协议与已启用的方法 |
| `POST /auth/cli/device-authorizations` | 创建请求绑定的六位设备授权 |
| `POST /auth/cli/device-authorizations/inspect` | 已登录浏览器提交请求句柄和验证码，读取确认信息 |
| `POST /auth/cli/device-authorizations/decision` | 使用原浏览器确认明确批准或拒绝 |
| `POST /auth/cli/device-token` | 使用设备凭据、PKCE 和持久请求 ID 领取 |
| `POST /auth/cli/device-authorizations/cancel` | 使用设备凭据取消 |
| `POST /auth/cli/password` | 受验证策略约束的显式密码入口 |
| `POST /auth/cli/refresh` | 轮换 v2 不透明刷新凭据 |
| `POST /auth/cli/logout` | 使用刷新凭据撤销，访问令牌过期后仍可调用 |
| `GET /auth/context` | 确认用户会话、PAT 或服务账号身份 |
| `GET /auth/cli/sessions` | 通过游标查询当前用户的 CLI 会话 |
| `POST /auth/cli/sessions/{id}/revoke` | 撤销自己拥有的会话 |
| `GET /ai-gateway/token-rotations/{requestId}` | 使用独立认证恢复非秘密轮换结果 |

等待授权返回 `409 authorization_pending`；退避返回 `429 slow_down` 与 `Retry-After`。领取/刷新恢复窗口为三十秒，必须重用原凭据、请求 ID，以及领取时的原 PKCE。使用不同请求 ID 重用已消费的刷新凭据会撤销整个会话 family；恢复有明确时限，不支持无限重放。

浏览器核对和决定要求真实浏览器会话、匹配的 Origin、当前所有权，以及策略要求的已有 MFA 验证。新增 MFA 因子也需要最近完成已有因子验证（`403 mfa_required`）。因子错误返回 `401 mfa_verification_failed`，不会让整个浏览器会话失效。不会通过自动密码回退绕过这些策略。

认证端点返回 `Cache-Control: no-store`，CLI 凭据不会进入浏览器 cookie。新的 logout/session-revoke 可以返回空 `200`。Bearer 在进入业务处理前被拒绝时，返回 `WWW-Authenticate: Bearer realm="soha", error="invalid_token"`。CLI 只在有这个前置拒绝标记时对写请求刷新并重试一次；任意业务 `401` 不构成重放写请求的依据。

常见诊断包括 `server_mismatch`、`credential_store_unavailable`、`credential_save_unconfirmed`、`interactive_auth_required`、`cli_auth_disabled`、`refresh_recovery_expired` 与 `refresh_reuse_detected`。离线状态只描述本地元数据，不能当作认证证据。用法见 [CLI 登录](../operations/soha-cli.md#登录)。
