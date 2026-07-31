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

`History` 查询已启用的 Loki、Elasticsearch 或 ClickHouse 数据源。数据源配置入口为：

```text
/monitoring-workbench/log-data-sources
```

在持久化数据源配置并通过健康检查前，History 不会伪装成可用。Soha 不把应用日志写入自身 PostgreSQL，也不会把日志
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
| `production_external` | 外部后端模式，并使用面向生产的资源规格 | 生产环境自主管理存储 |

Collector 只读挂载 `/var/log/pods`。可以通过 namespace allowlist 限制文件发现范围；外部凭据只引用已有的
Kubernetes Secret。

停止采集只会停止新日志写入。卸载 add-on 默认保留 Loki PVC，因此不会在停用采集时静默删除历史日志。

## 运行限制

- 运行时日志受容器运行时轮转影响，底层文件删除后无法继续查询。
- 历史保留期由外部数据源或托管 profile 决定。
- Live 会话有服务端时限；重连必须获取新的单次 ticket，并重新执行授权。
- 来源数、条目数、时间范围和 provider 查询工作量都由服务端限制。
- 来源降级会明确返回，不会通过扩大查询范围来补偿。
