# 什么是 Soha

**Soha，解决中小企业运维难题。**

Soha 面向有自建业务系统、运维人手有限的团队，将内网访问、资源管理、业务维护、应用交付、可观测性和 AI 辅助排障集中到一个运维入口，帮助团队更轻松地管理、维护和保障业务运行。

Kubernetes 是当前支持的运行环境之一。Soha 也覆盖虚拟化、Docker、身份与内网访问等场景，并按实际运维需求持续接入更多能力。每项能力的支持范围、部署条件和实验限制以对应文档为准。

Soha 的交付以开源、自托管、私有化部署为主。开源发行版可以脱离托管服务独立运行；数据库和可选运行时的前置条件以部署文档为准。

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
