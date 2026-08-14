# 监控与告警

Soha 是可观测性的控制面和调查入口。它不存储原始遥测数据，也不替代 OpenTelemetry、SkyWalking OAP、
Prometheus-compatible storage、Loki 或 Grafana。

## 架构边界

OpenTelemetry 是首选的埋点、Resource identity、采集和传输标准，它不是可观测性后端。Soha 使用以下执行链路：

```text
Metrics: OTel Collector 或 scrape -> Prometheus-compatible backend -> Soha
Traces:  OTel Collector -> SkyWalking OAP 或 Jaeger -> Soha
Logs:    OTel Collector -> Loki、Elasticsearch 或 ClickHouse -> Soha
Alerts:  Soha 规则或外部告警系统 -> Soha 告警事件
```

SkyWalking OAP 继续作为外部 APM 分析后端。Soha 通过有界 adapter 查询其服务元数据、拓扑和 Trace；Provider
凭据始终保留在服务端。

## 工作台信息架构

规范入口统一在 `/monitoring-workbench`。四个一级方向是：

1. **服务与健康**：服务清单、Provider 新鲜度、拓扑上下文和活跃告警。
2. **Explore**：Metrics、Traces、Logs、Events 共享可复制的 scope 和时间范围。
3. **Dashboard**：原生模板，以及由 Soha 渲染的有界 Grafana JSON 导入。
4. **告警与事件**：规则、事件生命周期、通知证据、自愈和值班。

Provider、数据源、集成、规则、通知、自愈和值班页面属于运营配置面，不是彼此独立的可观测性产品。现有
`/observability/*` 链接继续作为兼容跳转保留。

## 数据源与查询状态

内置 adapter 支持 Prometheus metrics、Jaeger 和 SkyWalking traces，以及 Loki、Elasticsearch 和 ClickHouse
logs。代码能力与运行状态分开表达：

- `unconfigured`：没有已启用的数据源；
- `unknown`：尚未验证数据源；
- `healthy`：后端校验成功；
- `degraded` 或 `failed`：一个或多个已配置来源不可用；
- `unsupported`：没有可执行 adapter。

查询使用版本化 context 和 query snapshot 保存 scope、绝对时间范围、筛选条件、signal 和 Provider 原生查询。
查询结果可为 `success`、`empty`、`partial`、`no_data`、`error` 或 `unsupported`。后端错误不会伪装成空结果；
授权可以收紧请求范围，但不能扩大范围。

当存在范围匹配且健康的 SkyWalking 数据源时，服务 API 使用 SkyWalking Metadata V2 和 topology。缺失 identity
或版本特定字段时返回 degraded 或 unsupported，不伪造健康。Trace 结果可携带相同 trace ID、span ID、scope 和
时间范围打开关联日志。

SkyWalking OAP 通过 gRPC 接收 OTLP Trace，并将其转换为 Zipkin Trace 模型。Soha 可通过配置的 Zipkin query
端点查询这些 Trace；Metadata V2 服务和拓扑视图仍以 SkyWalking 原生服务模型已经分析出数据为前提。

## Dashboard

Soha 将 Grafana Classic JSON 和 V1 resource wrapper 导入有界中间模型，保留原始 JSON、变量、数据源绑定、
导入 warning 和不支持 Panel 的 JSON。Soha 自行渲染已支持的 Panel，不执行未知 Panel，也不向浏览器暴露后端
凭据。

当前限制包括：

- Dashboard payload 最大 2 MiB；
- 最多导入 200 个 Panel，每个 Panel 最多 8 个 target；
- Prometheus 表达式最长 8,192 bytes；
- 数据源 type 和 UID 必须明确映射；
- 仅支持有界 custom 和 constant variable；
- 明确拒绝 Grafana V2 resource；
- 支持 `timeseries`、`table`、`stat`、`gauge`、`text` 和 `row`。

不支持的 Panel 会保留供查看并产生 warning。Grafana alert rule 不会随 Dashboard JSON 导入。播放功能只推进一个
客户端共享时间窗，不模拟 Grafana playlist，也不在服务端生成视频。

## 告警生命周期

Alertmanager v1、Grafana Alerting v1 和 Generic Webhook integration 会把外部 payload 规范化为持久化告警事件。
已注册 webhook 使用 integration 专属 token。当前平台负责：

- 告警 integration 注册和 payload 规范化；
- 带 reducer、comparator、threshold 和 pending duration 的内部 metric rule evaluator；
- `pending`、`firing`、`resolved`、`no_data` 和 `error` 评估证据；
- 确认、归属、解决、静默、路由和通知投递记录；
- 带权限和审批检查的自愈运行；
- 通知策略、渠道、模板、值班计划、轮转、升级策略和分派规则；
- 持久化 rule run 和触发时 query snapshot；
- 对已授权配置写入和手工状态操作记录审计。

后端错误或无数据不会清除正在 firing 的内部告警。只有一次明确成功且不再匹配的评估才能解决告警。普通规则编辑器
覆盖已验证的 metric rule；Provider 特定的 logs 和 traces rule 仍是高级能力。

告警详情保留诊断时间窗，可直接打开 Metrics、Traces 和 Logs，无需重新输入 scope。AI 调查接收相同的 alert、
cluster、namespace、workload 和时间上下文，治理动作仍留在监控工作台。

## 明确限制

- Soha 不实现跨信号查询语言，也不建设第二套遥测数据库。
- `starter` 可观测 profile 使用单副本 Loki，不是生产 HA。
- 数据源配置或 Collector 配置校验通过，不代表真实数据链路已经打通。每个生产环境必须写入并查询一个已知 metric、
  trace 和带 trace correlation 的 log，之后才能把对应 Provider 视为健康。
- Nightingale 原生集成、Alertmanager inhibition、subscription、周期维护窗、rule pack、异常检测、SLO burn-rate rule
  和独立 Incident 模型不属于当前基线。只有明确运维需求确定其生命周期和所有权后再增加。
- 现有有时限 silence 是当前的抑制机制，但不等同于来源级 inhibition 或周期维护调度器。

公开 HTTP 接口以生成的 API Reference 为准。
