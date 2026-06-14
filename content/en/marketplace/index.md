# Soha 市场

Soha 市场用于发现和安装扩展资产。它的目标不是把任意第三方代码注入 `soha` core 进程，而是用声明式 manifest、外部进程和受控 API 把 Skills、MCP presets、Connectors、AI provider adapters、Agent profiles 和 Gateway policy packs 装配进控制平面。

## 插件类型

- `skill`：AI 工作流、操作契约、guardrails、capability refs。
- `mcp-preset`：MCP server、tool、resource、prompt 的装配定义。
- `connector`：飞书、企微、GitLab、Jira、Slack、PagerDuty、Sentry 等外部系统接入。
- `ai-provider-adapter`：OpenAI-compatible、Anthropic、Gemini、OpenRouter、本地模型网关或企业内部模型网关。
- `agent-profile`：Agent Runtime provider、toolset、skill binding 模板。
- `gateway-policy-pack`：可复用的 access policy、approval rule、redaction policy、rate / budget preset。

## Core 侧职责

Soha core 负责：

- 插件 marketplace metadata 查询。
- 安装记录、版本、enabled / disabled 状态。
- manifest 快照、checksum / signature 校验状态。
- 声明权限、secret 引用和已安装 assets。
- RBAC、tool grants、access policies、skill bindings、approval、audit、secret management。

插件负责声明自己需要什么，不负责授予自己权限。

## API 面

插件 MVP 使用公开 API：

```text
GET    /api/v1/plugins/marketplace
GET    /api/v1/plugins/marketplace/{pluginID}
GET    /api/v1/plugins/installed
GET    /api/v1/plugins/{pluginID}
GET    /api/v1/plugins/{pluginID}/manifest
POST   /api/v1/plugins/install
POST   /api/v1/plugins/{pluginID}/enable
POST   /api/v1/plugins/{pluginID}/disable
POST   /api/v1/plugins/{pluginID}/upgrade
PUT    /api/v1/plugins/{pluginID}/config
DELETE /api/v1/plugins/{pluginID}
```

## 继续阅读

- [安装插件](./installing-plugins.md)
- [插件权限模型](./plugin-permissions.md)
- [API 与 Contracts](../api/contracts.md)
