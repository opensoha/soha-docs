# 认证与错误

## 认证入口

当前后端使用完整的真实身份认证与会话管理机制。

- 密码登录：`POST /api/v1/auth/login`
- 令牌刷新：`POST /api/v1/auth/refresh`
- 当前用户：`GET /api/v1/auth/me`
- 退出登录：`POST /api/v1/auth/logout`
- 登录源发现：`GET /api/v1/auth/providers`
- 登录选项查询：`GET /api/v1/auth/login-options`
- 第三方浏览器登录入口：`GET /api/v1/auth/login/:providerID/start`
- 第三方登录回调：`GET /api/v1/auth/login/:providerID/callback`
- OIDC 浏览器登录入口：`GET /api/v1/auth/oidc/login`
- OIDC 登录回调：`GET /api/v1/auth/oidc/callback`
- OIDC 前端会话交换：`POST /api/v1/auth/oidc/exchange`

正式环境请求使用 `Authorization: Bearer <access-token>` 携带访问令牌。

访问令牌过期或签发时的授权版本失效时，受保护请求返回 `401 unauthorized`。客户端可调用刷新入口，并重新读取当前身份与权限；刷新成功只恢复当前账号仍获准的访问，不会恢复已撤销的角色、团队或其他授权。已撤销会话、停用账号不能刷新。

新会话访问令牌包含 `authzVersion`；同一会话刷新后，旧版本令牌仍然失效。兼容未携带该字段的旧令牌时，服务端重新读取当前身份，不使用令牌内的旧成员关系授权。任务、原会话和消息读取仍须通过当前权限与资源归属检查；身份有效但缺少所需权限时返回 `403 access_denied`，保存历史数据不等于允许读取。

当 `config.yaml` 中启用 `auth.enable_dev_auth` 时，后端仍可为未携带 Bearer 令牌的请求附加已配置的默认开发主体。该回退机制仅用于本地开发联调，不能替代真实的账号密码登录或第三方登录链路。

`auth.login_verification.slider_enabled` 用于控制登录页在提交密码前是否展示前端滑块验证交互。

## 登录源说明

- `POST /api/v1/auth/oidc/exchange` 仍是 OIDC 与 OAuth2 类登录源最终换取前端会话的统一端点。
- `GET /api/v1/auth/providers` 返回所有已启用的第三方登录源，而不再假设仅存在单一 OIDC 入口。
- 启用 `syncRolesOnLogin` 或 `syncOrgsOnLogin` 后，OIDC、OAuth2、飞书、钉钉与企业微信登录源可在登录时补充本地角色与组织绑定。回调仅匹配本地已存在的角色和组织，不会自动创建目录对象。
- SAML 登录已通过 `GET /api/v1/auth/saml/:providerID/metadata` 和 `POST /api/v1/auth/login/:providerID/acs` 完整启用。响应绑定一次性 `state` 与请求 ID，并校验签名、`Destination`、`Recipient`、`Audience` 和时间条件。

## 错误响应信封

```json
{
  "error": {
    "code": "access_denied",
    "message": "principal is not allowed to list deployments in namespace payments",
    "request_id": "req_123"
  }
}
```

## 标准错误码

- `invalid_argument`
- `unauthorized`
- `access_denied`
- `not_found`
- `cluster_unavailable`
- `internal_error`

## CLI v2 认证（待发布组合）

这些增量端点需先验证 Core/Web/CLI 版本组合。既有 `/auth/login`、`/auth/refresh`、Web Cookie 与桌面端/登录源交换保留原协议。

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

等待授权返回 `409 authorization_pending`；退避返回 `429 slow_down` 与 `Retry-After`。领取/刷新恢复窗口为三十秒，必须重用原凭据、请求 ID，以及领取时的原 PKCE。使用不同请求 ID 重用已消费的刷新凭据会撤销整个会话族；恢复有明确时限，不支持无限重放。

浏览器核对和决定要求真实浏览器会话、匹配的 `Origin`、当前所有权，以及策略要求的已有 MFA 验证。新增 MFA 因子也需要最近完成已有因子验证（`403 mfa_required`）。因子错误返回 `401 mfa_verification_failed`，不会让整个浏览器会话失效。不会通过自动密码回退绕过这些策略。

认证端点返回 `Cache-Control: no-store`，CLI 凭据不会进入浏览器 Cookie。新的退出登录与会话撤销接口可以返回空 `200`。Bearer 令牌在进入业务处理前被拒绝时，返回 `WWW-Authenticate: Bearer realm="soha", error="invalid_token"`。CLI 只在有这个前置拒绝标记时对写请求刷新并重试一次；任意业务 `401` 不构成重放写请求的依据。

常见诊断包括 `server_mismatch`、`credential_store_unavailable`、`credential_save_unconfirmed`、`interactive_auth_required`、`cli_auth_disabled`、`refresh_recovery_expired` 与 `refresh_reuse_detected`。离线状态只描述本地元数据，不能当作认证证据。用法见 [CLI 登录](../operations/soha-cli.md#登录)。
