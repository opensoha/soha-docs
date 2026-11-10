# 日志可观测性

Soha 为 Kubernetes 工作负载、应用交付环境和 Docker 项目提供统一日志体验。运行时日志无需安装采集器即可使用，
持久化历史和 Soha 增强采集均为可选能力。

## 使用入口

统一日志中心位于：

```text
/monitoring-workbench/logs
```

同一个日志查看器还嵌入在：

- Kubernetes Pod 详情
- 应用交付环境和工作负载详情
- Docker 项目服务详情

上下文入口会保留当前资源范围，并可将同一范围带到日志中心继续查看。

## Live 与 History

`Live` 通过 Kubernetes API、已连接的 Soha Agent 或 Docker runtime 读取有界运行时日志，支持快照、绑定查询条件的
WebSocket ticket、重连、筛选和导出。Kubernetes 与应用交付可以聚合多个已授权来源；Docker 当前只支持运行时日志。

`History` 使用 Loki 原生集成。升级后，旧 Elasticsearch 和 ClickHouse Provider 设置可能仍保存在配置中，但 Core
不再使用它们。通用外部 `logs.query` 能力当前只覆盖持久化集群日志。受支持的 Loki 配置入口为：

```text
/monitoring-workbench/log-data-sources
```

在配置 Loki 并通过健康检查前，History 不会伪装成可用。Soha 不把应用日志写入自身 PostgreSQL，也不会把日志
后端凭据暴露给浏览器。

## 权限边界

采集权限与最终用户查看权限是两个边界。采集器可以读取其配置范围内的日志，但每次查询和实时流仍由 Soha 根据当前
用户重新授权。

- 集群查询受当前用户的集群和 namespace 日志权限约束
- 应用交付查询只解析所选 application-environment 绑定中已启用的目标
- 签发实时流 ticket 前，会逐个授权所有解析出的交付目标
- 任一交付目标无权访问时，整次聚合请求失败，不返回已经读取的部分日志
- Docker 日志复用现有 Docker 项目和服务权限
- 导出会重新执行服务端查询和授权
- 查询与实时流行为会写入审计日志

日志后端查询由已授权范围生成。Soha 不会先查询全量日志，再在浏览器中做权限过滤。

## 可选增强采集

Soha 默认不会启用增强采集。在集群详情的 **日志采集** 区域先执行预检；启用时必须使用预检返回的短期 plan token
再次明确确认。

独立的 `soha-observability` Helm chart 提供：

| Profile | 组件 | 适用场景 |
| --- | --- | --- |
| `starter` | OpenTelemetry Collector 和带保留 PVC 的单副本 Loki | 小规模环境和评估 |
| `collector_only` | OpenTelemetry Collector，将日志转发到外部 Loki OTLP 端点 | 已有持久化后端 |
| `production_external` | 使用面向生产资源规格的 Collector 和外部后端 | 生产环境自主管理存储与分析 |

Collector 只读挂载 `/var/log/pods`。可以通过 namespace allowlist 限制文件发现范围；外部凭据只引用已有的
Kubernetes Secret。

默认 signal allowlist 只有 `logs`，因此升级后仍保持原有 filelog 到 Loki 的链路。运维人员可以明确启用带 TLS 和
token 的 OTLP receiver，再加入 metrics 和 traces。Metrics 通过 Prometheus Remote Write 导出。通用 traces 可通过
OTLP/gRPC 导出给外部消费者；这不会让 Core 的 Trace Explore 或服务拓扑查询变为可用。这些可选外部链路必须配置
端点并引用现有的凭据 Secret。

Collector 会补充 Soha workspace 和 Kubernetes cluster 标识，保留应用上报的 OpenTelemetry service identity，
并拒绝缺少 `service.name` 的 metrics 或 traces。其有界脱敏策略会删除配置的凭据属性并哈希配置的用户标识。
Soha 仍是控制面和查询层；Prometheus-compatible storage 与 Loki 分别承担 metrics 和 logs 的后端。外部 Trace
Provider 集成属于后续工作；相关路由和查询 DTO 为兼容性保留，在集成可用前报告能力不可用。

停止采集只会停止新日志写入。卸载 add-on 默认保留 Loki PVC，因此不会在停用采集时静默删除历史日志。

## 运行限制

- `starter` Loki 是 filesystem storage 的单副本实例，不是生产 HA 后端。
- 使用 `production_external` 时，保留、复制、容量、备份、升级、凭据轮换和故障恢复由外部后端负责。
- 运行时日志受容器运行时轮转影响，底层文件删除后无法继续查询。
- 历史保留期由外部数据源或托管 profile 决定。
- Live 会话有服务端时限；重连必须获取新的单次 ticket，并重新执行授权。
- 来源数、条目数、时间范围和 provider 查询工作量都由服务端限制。
- 来源降级会明确返回，不会通过扩大查询范围来补偿。
- Helm 渲染和 Collector 配置校验通过，不等于 collector 到 backend 再到 Soha 的真实链路已经可用；每个部署都必须
  用已知信号执行 smoke test 后才能标记为健康。
