# 开源核心 vs Soha Cloud

Soha 同时面向自托管开源用户和托管 Cloud 用户，但两者的边界必须清晰。开源 core 是持续存在的产品，不是 Cloud 的临时开发版。

## 对比

| 领域 | 自托管 Soha | Soha Cloud |
| --- | --- | --- |
| 部署形态 | 用户自己的环境，支持单二进制、容器、Kubernetes | OpenSoha 托管的 SaaS |
| 租户模型 | 默认 `tenant_id=default`、`workspace_id=default` | 多租户生命周期、组织、工作区 |
| 身份与登录 | 本地账号、OIDC/OAuth/SAML 等自托管配置 | SaaS IAM、SSO、成员邀请、组织策略 |
| 计费与额度 | 不包含 SaaS 计费生命周期 | 套餐、计费、用量、额度 |
| Agent | 用户注册和运维自己的 Agent / runner | 托管 Agent Fleet 和云端调度能力 |
| 连接器 | 用户部署和配置 connector | 托管连接器、云端运营与合规流程 |
| 发布边界 | 开源仓库、公开 API、contracts、SDK、artifact | 闭源 `soha-cloud`，通过公开边界集成 core |

## 连接方式

`soha-cli` 和 `soha-agent` 不应写死开源版和云版分叉逻辑。它们通过 `base_url`、token、profile 和 workspace 等配置连接目标控制平面：

```bash
soha login --base-url http://localhost:8080
soha login --base-url https://cloud.soha.run

soha agent register --base-url http://localhost:8080 --token xxx
soha agent register --base-url https://cloud.soha.run --token xxx
```

如果服务端需要暴露差异能力，应通过 capability manifest、公开 API 或 contracts 表达，而不是在 CLI / Agent 中硬编码产品分叉。

## 开发约束

- 公共行为变化先改 `soha-contracts`，再改消费者仓库。
- `soha` 不能依赖 `soha-cloud`。
- Cloud-only 能力通过组合、配置、扩展接口或独立 cloud 服务实现。
- Web、CLI、Agent、Docs 和 Skills 都作为独立发布单元演进。
- 插件和 marketplace package 不会自动扩权。
