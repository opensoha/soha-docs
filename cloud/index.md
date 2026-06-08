# Soha Cloud

Soha Cloud 是托管 SaaS 层，也是公开文档站里的 SaaS 入口。它提供开源 core 之外的多租户、组织、计费、云运营和托管运行时能力。

## Cloud 负责什么

- 多租户生命周期。
- 组织、工作区、成员和邀请。
- SaaS IAM、SSO 和组织级安全策略。
- 套餐、额度、计费和用量。
- 云端运营后台、风控、合规和高级审计。
- 托管连接器。
- 托管 Agent Fleet。

## Cloud 不应该改变什么

- 开源 Soha core 必须继续可独立运行。
- `soha` core 不 import `soha-cloud`。
- Cloud-only 实现细节不写进开源 server。
- CLI / Agent 仍通过 `base_url`、token、profile、workspace 和 capability manifest 连接控制平面。
- 公共 API、协议和 schema 由 `soha-contracts` 管理。

## 登录入口

当 Cloud 域名准备好后，在文档站构建时设置：

```bash
SOHA_CLOUD_LOGIN_URL=https://cloud.soha.run/login npm run build
```

设置后，首页的 `进入 Soha Cloud` 按钮和顶部导航的 `Cloud 登录` 会跳转到该地址。未设置时，Cloud 入口会停留在本页，避免把未准备好的 SaaS 地址硬编码进开源文档。

## 文档范围

本页只记录 Cloud 与开源 core 的产品边界。组织生命周期、计费、运营后台、风控策略和托管 fleet 的私有实现应保留在 `soha-cloud` 的闭源文档或服务内部。
