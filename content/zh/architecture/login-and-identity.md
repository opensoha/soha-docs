# 登录与身份链路

## 目标

`soha` 的登录链路分成两层：

- 本地账号密码登录
- 多第三方登录源聚合登录

当前第三方登录源模型支持：

- `oidc`
- `feishu`
- `dingtalk`
- `wecom`
- `oauth2`
- `saml`

核心设计目标不是仅对接单一企业单点登录入口，而是让控制台能够同时托管多套企业身份登录源，并由登录页按启用状态并列展示。

## 配置模型

后端设置服务将登录源配置统一聚合在 `identity.login_providers` 中，顶层结构包含：

- `providers[]`
- `defaultProviderId`

每个登录源配置项至少包含：

- `id`
- `name`
- `type`
- `enabled`
- `redirectUrl`
- `frontendRedirectUrl`

针对 OAuth2 与 OIDC 类登录源，还包含：

- `clientId`
- `clientSecret`
- `issuer` 或 `authorizeUrl`
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

## 登录时角色与组织映射

OIDC、OAuth2、飞书、钉钉、企业微信这几类登录源支持“登录时补充绑定”：

- `roleField` 从 ID Token 声明或用户信息响应中读取外部角色引用
- `organizationField` 从 ID Token 声明或用户信息响应中读取外部组织引用
- `syncRolesOnLogin` 控制是否在登录成功后补充本地角色绑定
- `syncOrgsOnLogin` 控制是否在登录成功后补充本地组织绑定
- `roleSyncMode` 和 `orgSyncMode` 均支持 `append` 与 `replace_external`

`append` 仅追加本次解析到的本地角色或组织绑定。`replace_external` 会先清理同一登录源上次写入的外部来源绑定，再写入本次解析结果，不会删除管理员在用户管理页手工分配的本地绑定。

角色解析仅匹配本地已存在的 `roles.id` 或 `roles.name`。组织解析仅匹配本地已存在的组织节点：

- `teams.id`
- `teams.slug`
- `teams.org_path`
- `teams.source` 等于登录源类型或登录源 ID，且 `teams.external_id` 等于外部组织引用

登录回调不会自动创建本地组织或角色。管理员需先在“组织架构”中建立组织树，并为第三方组织填入对应来源和外部 ID。该边界将第三方组织目录同步与登录授权映射解耦，避免登录链路演变为隐式主数据导入。

飞书、钉钉、企业微信的应用凭据（如 App Key、App Secret、CorpID、CorpSecret）归属“登录设置”中的登录源应用配置，不属于组织节点。组织节点只保存映射来源和第三方部门/组织 ID；若同一种登录源类型配置了多个企业应用，组织来源应优先绑定具体的登录源应用 ID，而非笼统选择 `feishu`、`dingtalk` 或 `wecom` 类型。

## 目录同步

目录连接与登录时的角色、组织映射相互独立。配置为 `scheduled_and_realtime` 的飞书连接会接收已验证的通讯录事件，并根据事件载荷应用单对象增量变更。载荷不足以提供最新完整字段时，Soha 仅定向补查事件所指向的部门或人员，不会拉取全量目录快照。重复投递按幂等方式处理，较旧事件不会覆盖较新的本地投影。

定时或手动触发的全量对账仍作为漂移修复兜底。无法识别或载荷缺失的事件会将连接标记为“需要对账”，而不会让每次回调都触发全量快照同步。

收到离职或人员删除事件后，Soha 会移除该目录来源拥有的成员关系。`userDisablePolicy: managed_only` 还会停用由该连接托管的账号并撤销其活动会话；`userDisablePolicy: never` 保持账号启用，仅移除目录来源成员关系。缺失或删除的组织节点采用归档处理，不执行硬删除。

目录连接控制台展示回调配置与验证状态、近期排队或失败事件及重试入口、最近增量与全量对账时间，以及是否需要执行全量对账。当前实时目录事件支持飞书；钉钉和企业微信使用定时或手动全量同步。

SAML 登录源还保存并使用以下运行时字段：

- `metadataUrl`
- `entityId`
- `certificate`

服务端生成 SP 元数据和断言消费服务（ACS）地址，并严格验证签名、`InResponseTo`、时效窗口、受众、接收方与断言重放。登录源导入时默认保持禁用状态，待管理员核对元数据与签名证书后再显式启用。

## 配置来源

登录源在设置中心中的唯一真实配置源为 `identity.login_providers`。

当前约束规则：

- 设置中心通过 `/settings/identity/providers` 统一维护登录源
- 不再读写旧版单一 OIDC 设置键
- 不再从旧版 OIDC 配置自动投影默认登录源
- 删除登录源后，历史账号关联记录予以保留，但该登录入口立即停止受理登录

上述设计用于：

- 避免空配置下自动生成幽灵 `default` OIDC 登录源
- 让“外部身份登录 Soha”与内网工作台的“Soha 对外签发身份”保持清晰边界

## 浏览器会话与令牌存储

浏览器控制台按同源会话模式收敛令牌存储：

- `accessToken` 仅保存在前端运行内存中，用于常规 API 请求的 `Authorization: Bearer ...`
- `refreshToken` 由后端写入 `HttpOnly` Cookie，前端不再持久化或直接读取刷新令牌
- `/api/v1/auth/refresh` 支持空请求体，优先从刷新令牌 Cookie 读取会话并轮换续写 Cookie
- `/api/v1/auth/logout` 会清除刷新令牌 Cookie，前端退出登录必须先调用该接口再清空内存态
- 本地开发环境默认通过 Vite 的 `/api` 代理访问同源 `/api/v1`，避免刷新令牌 Cookie 在跨源请求中失效

页面刷新后若内存中不存在 `accessToken`，受保护路由会先调用刷新接口尝试恢复会话，仅在恢复失败时才跳转到登录页。

## OIDC Provider 会话

内网工作台中的 OIDC Provider 是 Soha 面向下游内部应用签发身份的协议面，不同于设置中心里的外部登录源。其核心能力包括：

- 支持 `authorization_code` 与 `refresh_token` 授权模式
- 当客户端启用 `refresh_token` 且授权请求包含 `offline_access` 时，签发不透明刷新令牌
- 刷新令牌执行单次轮换；旧令牌一旦发生重放，将立即撤销整个令牌族及关联的 OIDC 会话
- 访问令牌、UserInfo、令牌内省（Introspection）与反向代理会话均绑定发起授权的源 Soha 会话；源会话失效后下游会话同步失效
- `/oauth2/revoke` 对访问令牌和刷新令牌执行真实服务端撤销
- `/oauth2/logout` 支持 `id_token_hint`、`post_logout_redirect_uri` 与 `state`，并同步撤销 OIDC 会话与源 Soha 会话

刷新令牌仅以哈希值持久化。`post_logout_redirect_uri` 必须与客户端预先登记的回调地址完全一致。

由于浏览器原生 `WebSocket`、`EventSource` 与 noVNC 连接无法稳定附加自定义 `Authorization` 请求头，当控制台需要打开 Pod 日志流、Pod 终端、虚拟化操作流或 VNC/noVNC 控制台时，必须先携带当前会话访问令牌调用 `POST /api/v1/auth/stream-ticket` 换取短期一次性票据，再将 `stream_ticket` 附加到同源流式地址的查询参数中。服务端仅放行白名单路径，票据有效期为 60 秒、精确绑定请求路径，并在首次校验时直接从 PostgreSQL 原子消费删除；消费后仍会继续核验会话状态与 `authz_version`，确保角色、组织或账号状态变更能够即时阻断后续流式连接。

## 机器调用与运行器令牌

浏览器交互会话与自动化机器调用采用明确隔离的凭据边界：

- 浏览器控制台使用 Soha 会话访问令牌与刷新令牌，并通过服务端会话表及 `authz_version` 使角色、组织、账号状态变更即时生效
- 外部 API 调用方、CI 运行器、Docker 运行器、AI Agent 运行器与 AI Gateway 客户端统一使用 Bearer 令牌
- 长期机器凭据统一收敛至 AI Gateway 的个人访问令牌（PAT）与服务账号令牌（SAT）形态：数据库仅存储哈希值，主体为用户或服务账号，权限通过 `permissionKeys` 与资源范围（Scope）精细约束

当前过渡期在保持 `runtime.execution_runner_token` 兼容的同时，允许外部运行器接口直接验证服务账号令牌（`service_account_token`）：

- 应用交付执行运行器需要 `delivery.execution-tasks.claim`
- Docker 运维运行器需要 `docker.operations.claim`
- AI Agent 运行器需要 `ai.gateway.invoke` 或 `observe.ai.chat`

单次任务专属的 `callbackToken` 仍由对应执行任务或 `AgentRun` 独立核验。服务账号令牌仅替代“谁有权接入该运行器通道发起认领、状态查询与回调”的全局共享通道令牌，不替代任务级防重放与归属校验。

## 第三方登录运行链路

### 1. 登录页展示

登录页初始化时首先读取 `/api/v1/auth/providers`，返回条目包含：

- `id`
- `type`
- `name`
- `enabled`
- `loginUrl`

前端按返回结果并列展示所有已启用的第三方登录源，而不仅限于 OIDC。

登录页同时读取 `/api/v1/auth/login-options`；当后端配置 `auth.login_verification.slider_enabled` 为 `true` 时，前端会在提交密码前要求完成滑块验证交互。

### 2. 浏览器跳转

各第三方登录源的标准跳转入口为：

- `GET /api/v1/auth/login/:providerID/start`

历史兼容入口继续保留：

- `GET /api/v1/auth/oidc/login`

### 3. 回调处理

统一第三方登录回调入口为：

- `GET /api/v1/auth/login/:providerID/callback`

兼容 OIDC 回调入口继续保留：

- `GET /api/v1/auth/oidc/callback`

后端在回调阶段依次完成：

- 校验 `state` 防跨站请求伪造参数
- 解析目标登录源配置与协议类型
- 向外部身份提供商交换授权码
- 拉取或组装外部用户资料
- 匹配绑定或新建本地用户
- 写入 `user_identities` 身份映射表
- 创建本地持久化会话
- 生成短期一次性会话交换码
- 重定向回前端 `/login/callback?code=...`

### 4. 前端换取会话

前端回调页统一调用：

- `POST /api/v1/auth/oidc/exchange`

该接口不仅服务于标准 OIDC，也统一承担各类 OAuth2 第三方登录的最终前端会话换取。

## 当前各登录源实现状态

### OIDC

完整可运行：

- 自动发现 `issuer` 元数据
- 授权码换取令牌
- 校验 ID Token 签名与声明
- 按声明（Claims）或 `userinfo` 端点补齐用户资料

### 通用 OAuth2

完整可运行，前提是运维管理员配置了可用的：

- `authorizeUrl`
- `tokenUrl`
- `userInfoUrl`
- 用户资料字段映射

### 飞书（Feishu）

按飞书开放平台授权码流程完成专用令牌交换并拉取用户资料。

上线前需由运维管理员核对：

- 飞书应用凭据
- 授权回调地址
- 用户资料字段映射

默认预置端点覆盖常见飞书自建应用形态，若企业使用定制网关或特殊应用类型可按需覆盖。

### 钉钉（DingTalk）

通过 OAuth2 授权码交换访问令牌，并调用运维管理员配置的钉钉开放平台用户资料接口读取身份信息。

由于钉钉不同应用形态的用户资料接口存在差异，系统将其实现为可配置字段与端点的登录源，而不强行固化单一接口结构。

### 企业微信（WeCom）

企业微信网页授权不同于标准通用 OAuth2 令牌交换模型，当前实现按以下步骤运行：

- 通过网页授权回调获取一次性 `code`
- 服务端使用企业应用密钥换取企业级 `access_token`
- 使用 `code` 与 `access_token` 调用身份接口换取企业成员 `UserId`

对应配置字段语义为：

- `tokenUrl`：企业 `access_token` 获取地址
- `userInfoUrl`：成员身份查询（`getuserinfo`）地址
- `clientId`：企业微信 `corpid`
- `clientSecret`：对应自建应用的 `corpsecret`

默认身份接口仅稳定返回企业内部 `UserId`，不一定直接包含邮箱或显示姓名；如需补齐扩展资料，可由运维管理员配置可达的成员详情接口与字段映射。

### SAML

提供完整可运行的 SP 登录链路：

- SP 元数据端点：`GET /api/v1/auth/saml/:providerID/metadata`
- 断言消费服务（ACS）端点：`POST /api/v1/auth/login/:providerID/acs`
- 严格校验签名算法、签名节点位置、`InResponseTo`、`Destination`、`Recipient`、`Audience` 与时间有效期条件
- 断言 ID 与请求 `state` 均为一次性消费，防止重放攻击
- `NameID` 与属性声明统一映射落盘到本地用户、角色和组织体系

元数据仅信任当前有效的签名证书，证书轮换必须在旧证书到期前完成。

## Provider 工作台运行边界

内网工作台中的身份提供商能力与上述外部登录源分属两套独立边界：

- `oidc`：Soha 作为下游应用的身份提供方（OIDC Provider）；下游应用负责生成并校验 `state`、`nonce` 与 PKCE，工作台仅负责跳转至应用已登记的启动地址。
- `saml`：Soha 作为 SAML 身份提供方（IdP），暴露元数据与单点登录端点，并按应用访问策略、MFA 要求与已登记 ACS 地址签发签名断言。
- `proxy`：提供正向认证（forward-auth）与反向代理（reverse-proxy）能力。反向代理默认拒绝转发至私网、回环和链路本地地址；仅在明确需要代理内网受保护服务时显式开启 `allowPrivateUpstream`。

OIDC 客户端支持组合配置严格相等的回调地址与 RE2 正则表达式规则。严格规则要求完整字符相等；正则表达式在保存时校验语法，并对完整 URI 执行全量匹配而非子串匹配。两类规则至少须配置一条。

SAML 签名证书支持在工作台内平滑轮换，过渡重叠期可设为 0–30 天。重叠期内元数据会同时发布新活动证书与待退役证书，便于下游服务提供方（SP）零停机完成公钥更新。

工作台配置中的 `secretRefs` 仅接受规范的 `soha://secrets/...` 引用，查询接口只返回已绑定的别名，绝不回传密钥明文。OIDC 回调地址、SAML ACS 地址与 `http.access_url` 均支持 HTTP 与 HTTPS，由私有化部署管理员按网络边界决定传输协议；正式生产环境仍强烈建议启用 HTTPS，以防授权码、SAML 断言和会话 Cookie 遭受链路监听或篡改。OIDC 与 SAML 的签发者标识（`issuer`）固定取自服务端已配置的访问地址，不信任外部请求头携带的 `X-Forwarded-Host` 或 `X-Forwarded-Proto`。

## 审计与本地身份绑定

无论用户通过哪种第三方登录源完成认证，最终都统一收敛到同一套本地身份与会话模型：

- 本地用户表 `users`
- 本地角色表 `roles`
- 本地会话表 `sessions`
- 外部身份映射表 `user_identities`

第三方登录首次回调成功时的账号归并顺序如下：

- 优先按 `provider_type + provider_id + provider_user_id` 查找已有身份绑定
- 未命中绑定时，按登录源返回的邮箱尝试关联存量本地用户
- 仍未命中时创建新的本地用户记录
- 若该用户尚无任何角色且登录源配置了 `defaultRoles`，则自动绑定默认角色
- 若启用了 `syncRolesOnLogin`，则 `defaultRoles` 与 `roleField` 解析结果会一并作为该登录源托管的外部角色绑定写入
- 若启用了 `syncOrgsOnLogin`，则 `organizationField` 解析结果会作为该登录源托管的外部组织绑定写入

当前账号归并链路不会额外检查 `email_verified`。只应接入能保证邮箱归属可信的登录源，不能将按邮箱关联理解为 Soha 已独立验证邮箱所有权。

登录全过程由平台统一写入审计日志；第三方登录源仅提供可信身份断言，不直接接管平台内部权限裁决。

## 前端与权限边界

“登录设置”仅作为身份入口的配置界面，不会绕过平台既有的 RBAC 与范围授权模型，继续受以下权限键保护：

- `settings.identity.view`
- `settings.identity.manage`

用户登录成功后的可见菜单、可访问前端路由与可调用后端 API，完全由本地权限快照与服务端实时鉴权决定，不由外部身份提供商直接裁决。
