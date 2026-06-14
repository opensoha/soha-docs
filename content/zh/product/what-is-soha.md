# 什么是 Soha

Soha 是面向平台团队的开源控制平面。它把 Kubernetes 多集群管理、应用交付、可观测性、权限治理、AI Gateway、MCP / Skills 和 Agent Runtime 放在同一个可审计的操作面里。

Soha 的早期交付形态以开源、自托管、私有化部署为主。开源发行版必须可以独立运行，普通用户不需要依赖额外服务才能使用产品。

## 命名约定

- OpenSoha：开源组织和社区名。
- Soha：产品名。
- `soha`：开源 core 仓库名，也是 CLI 命令。
- `opensoha`：GitHub 组织名。

## 开源发行版

开源 Soha 发行版包含：

- Server API 和 Web 控制台集成点。
- Agent 协议支持。
- AI Gateway、MCP / Skills registry 和插件安装记录。
- 本地部署、私有化部署、单二进制交付。
- 本地鉴权、RBAC、审计、资源管理、token 和 service account。

## 扩展模型

Soha 支持通过 marketplace package 装配 Skills、MCP presets、Connectors、AI provider adapters、Agent profiles 和 Gateway policy packs。插件只声明扩展资产、所需 secret 和 requested permissions；是否可用仍由 Soha 的 RBAC、tool grants、access policies、skill bindings、approval、audit 和 secret management 共同决定。
