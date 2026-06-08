# 什么是 Soha

Soha 是面向平台团队的开源控制平面。它把 Kubernetes 多集群管理、应用交付、可观测性、权限治理、AI Gateway、MCP / Skills 和 Agent Runtime 放在同一个可审计的操作面里。

Soha 的早期交付形态以开源、自托管、私有化部署为主。开源 core 必须可以独立运行，普通用户不需要启动独立的 SaaS 服务才能使用产品。

## 命名约定

- OpenSoha：开源组织和社区名。
- Soha：产品名。
- `soha`：开源 core 仓库名，也是 CLI 命令。
- Soha Cloud：托管 SaaS 层。
- `opensoha`：GitHub 组织名。

## 开源核心

开源 Soha core 负责：

- 单租户或默认租户控制平面。
- Server API 和 Web 控制台集成点。
- Agent 协议支持。
- 基础 AI Gateway、MCP / Skills registry 和插件安装记录。
- 本地部署、私有化部署、单二进制交付。
- 本地鉴权、RBAC、审计、资源管理、token 和 service account。

开源发行版默认使用：

```text
tenant_id = default
workspace_id = default
```

core 可以在模型上预留 tenant-aware 能力，但不承载 SaaS 租户生命周期、计费、套餐、云运营后台或托管 fleet 管理。

## Soha Cloud

Soha Cloud 是托管 SaaS 层，负责多租户生命周期、组织和工作区、成员邀请、SaaS IAM、SSO、套餐、额度、计费、用量、云端运营后台、托管连接器和托管 Agent Fleet。

Cloud 层通过公开 API、`soha-contracts`、生成 SDK、构建产物或 HTTP 接口复用开源 core 能力。`soha` core 不能 import `soha-cloud`，Cloud-only 逻辑也不能回流到开源 core。

## 扩展模型

Soha 支持通过 marketplace package 装配 Skills、MCP presets、Connectors、AI provider adapters、Agent profiles 和 Gateway policy packs。插件只声明扩展资产、所需 secret 和 requested permissions；是否可用仍由 Soha 的 RBAC、tool grants、access policies、skill bindings、approval、audit 和 secret management 共同决定。
