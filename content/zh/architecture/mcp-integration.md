# MCP 集成

## 架构位置

MCP 能力位于平台统一集成边界之后，不直接穿透底层基础设施。

标准调用链路如下：

1. API 接入层接收客户端请求
2. 访问控制服务与策略引擎完成权限校验
3. 集成应用服务解析目标适配器与能力元数据
4. 基础设施层的 MCP 注册表定位具体适配器实现
5. 审计服务记录调用上下文与结果元数据
6. 事件服务按需发出集成调用事件

## 目录结构

```text
internal/domain/mcp
internal/application/integration
internal/infrastructure/mcp
```

## 注册模型

每个 MCP 适配器在注册时需声明：

- 适配器唯一标识（`adapter id`）
- 显示名称
- 能力列表
- 所需权限范围（`scopes`）
- 传输层连接配置
- 超时控制与执行隔离策略

当前内置适配器包括：

- `platform-native.v1`
- `logs.v1`
- `metrics.v1`
- `traces.v1`
- `delivery.v1`

`traces.v1` 标识作为兼容性保留，但 Core 当前尚未内置调用链执行能力，需等待后续外部调用链提供商集成。通用 `logs.query` 能力当前仅查询持久化的集群日志。

## 权限边界

MCP 调用严禁绕过平台授权体系。每一项 MCP 能力均映射为明确的平台动作与目标资源范围，由平台统一掌控：

- 调用主体身份识别
- 权限与范围裁决
- 调用审计落盘
- 响应内容脱敏与范围过滤

`delivery.v1` 当前通过规范工具名称向 MCP 客户端暴露以下 Gateway 工具：

- `delivery.applications.list`
- `delivery.applications.detail`
- `delivery.applications.create`
- `delivery.application_environments.list`
- `delivery.application_services.list`
- `delivery.build_sources.list`
- `delivery.release_targets.list`
- `delivery.release_bundles.list`
- `delivery.execution_tasks.list`
- `delivery.execution_logs.list`
- `delivery.release_context.diff`
- `delivery.rollback.context`
- `delivery.actions.trigger`

上述工具调用全部经过平台权限、资源范围、审计和操作日志边界；Gin 请求处理器不得直接执行代码仓库写入或长耗时 Shell 命令。

## 模块契约

为支持单二进制内置模块的按需启停并为外部扩展模块协议预留统一接口，平台引入了标准模块注册契约。

后端模块描述符的最小字段集合包括：

- `id`
- `name`
- `defaultPath`
- `enabledConfigKey`
- `dependencies`
- `visiblePermissions`
- `seedMenus`

当前启用与注册的模块状态通过 `GET /api/v1/modules` 对外暴露。
