# 自托管 Soha

自托管 Soha 是开源 core 的默认交付形态。目标是让用户可以在自己的环境里运行完整控制平面，并保留单二进制部署体验。

## 运行模型

- `soha` server 提供 HTTP API、鉴权、RBAC、审计、AI Gateway、MCP / Skills registry、插件安装记录和 Web 控制台入口。
- `soha-web` 独立构建 Vite SPA，release 时以版本化 artifact 交给 `soha` 嵌入。
- `soha-docs` 独立发布，`soha` 通过配置的外部 docs URL 链接文档。
- `soha-agent` 和 runner 通过公开 API / Agent protocol 连接控制平面。

## 默认租户

开源发行版默认使用：

```text
tenant_id = default
workspace_id = default
```

这允许 core 保持 tenant-aware 数据边界，同时避免把 SaaS 租户生命周期、计费、套餐和云运营后台放进开源仓库。

## Web 资源模式

`soha` 需要支持三种 Web 资源模式：

- `embed`：release 默认模式，服务内嵌 `soha-web` dist artifact。
- `dir`：从配置的本地目录读取 dist，便于本地或私有构建。
- `proxy`：开发模式，代理到 Vite dev server。

普通用户不应被要求分别启动前端和后端才能使用自托管 Soha。

## 推荐入口

- [部署](../operations/deployment.md)
- [配置](../operations/configuration.md)
- [环境变量覆盖](../operations/environment-variables.md)
- [Agent Runtime](../operations/agent-runtime.md)
- [AI Gateway 示例](../operations/ai-gateway-examples.md)
- [MCP](../operations/mcp.md)
