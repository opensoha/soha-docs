---
title: Kubernetes 工作台
description: 按 Agent、Prometheus、审计、MCP 和生产就绪边界运行 Kubernetes 工作台。
---

# Kubernetes 工作台

Kubernetes 工作台覆盖集群清单、工作负载、配置、网络、存储、访问控制、扩展、Helm、事件、日志、终端和资源指标。运行时应以集群能力矩阵为准：页面可见不代表每种连接模式都支持该页面上的全部操作。

## 接入集群

Direct 模式由 Soha 控制平面使用已校验的 kubeconfig 连接集群。Agent 模式适用于内网集群：集群内的 Agent 主动连接 Soha 访问地址，因此无需对外暴露 Agent Service 的 NodePort。

在运行时配置中设置 Soha 访问地址，在集群页面创建 Agent 连接，然后执行生成的命令：

```bash
kubectl apply -f https://soha.example.com/api/v1/kubernetes/agent-installations/<install-ticket>/manifest.yaml
```

Manifest 地址具有短有效期，过期后应重新生成安装命令。Agent 使用同一个访问地址推导长连接协议（`http` 对应 `ws`，`https` 对应 `wss`），并在断开后自动重连。

安装完成后，应确认集群详情显示 Agent 长连接已建立，并在开放运维操作前检查能力矩阵。

## Pod 指标

Pod 的 CPU、内存、网络和重启图表使用所选集群上保存的 Prometheus 连接。在集群连接中配置 Prometheus URL、可选 Bearer Token、集群标签和可选 Grafana URL。

无论 Direct 还是 Agent 模式，Soha 控制平面都必须能够访问配置的 Prometheus。Agent 当前不会代理集群内不可达的私有 Prometheus；网络链路不满足时，指标能力只能视为 `partial`。

工作台会区分以下状态：

- **未配置**：集群没有 Prometheus URL。
- **无数据**：Prometheus 已响应，但所选 Pod 和时间范围没有序列。
- **查询失败**：认证、网络、PromQL 或服务端处理失败。

默认查询窗口为 60 分钟，步长为 60 秒。生产验收前，应选择一个确实产生 CPU 和内存活动的运行中 Pod 进行验证。API 为 `GET /api/v1/clusters/{clusterID}/workloads/pods/{podName}/metrics`，并且需要 namespace 上下文。

API 不会返回已保存的 Prometheus Bearer Token，但当前实现会将其保存在数据库支持的集群连接元数据中，且没有字段级加密。必须保护数据库、备份、副本和诊断导出。

## 审计与操作证据

Kubernetes 非查询操作在应用层完成授权并写入治理证据：

- **审计日志**记录获取到授权上下文后的成功、失败、拒绝和 Agent 不支持的操作尝试。
- **操作日志**记录成功完成的创建、应用、删除、重启、扩缩容、回滚、exec、终端、CronJob 暂停以及端口转发启动或停止。
- 操作元数据不得包含命令文本、Secret 数据、kubeconfig 或 Token。

在设置工作台中，使用 `/system/audit` 查询操作尝试和失败，使用 `/system/operations` 查询成功操作证据。两者都可以按集群、namespace、资源类型、资源名称、动作或操作类型、结果、请求 ID、时间范围和元数据过滤，并提供保留期摘要和 CSV 导出。访问分别需要 `system.audit.view` 或 `system.operations.view` 权限。

在进入应用服务前因请求格式错误而被拒绝的请求无法形成明确的资源操作记录，不能用审计日志替代 HTTP 访问日志。应保留入口网关和服务端请求日志作为传输层证据。

## MCP 与 Skills

使用官方 `k8s-sre` Skill 和 `k8s-readonly` MCP Preset 进行有范围约束的只读诊断。实时 AI Gateway Manifest 是最终依据；调用工具前先发现能力，并将缺失工具或 `capabilityWarnings` 视为证据不可用，而不是 Kubernetes 空数据。

该 Preset 覆盖 namespace 与工作负载摘要、ConfigMap 元数据、Secret 元数据、Helm Release 元数据、Pod、Deployment、Service、路由、存储、节点、事件和有界 Pod 日志。它不会暴露 ConfigMap 内容、Secret 数据、Helm Values 或原始 Kubernetes 对象，也不允许 exec、apply、delete、restart、scale、rollback、drain 或 port-forward。自定义资源仍需要针对每个 API Group 和 Resource 配置明确的 Kubernetes RBAC；Prometheus 证据仍要求控制平面网络可达。

## OpenAPI 与 AI 客户端

公开 OpenAPI 契约是 SDK 和 HTTP 客户端的真实源。它覆盖经过评审的结构化只读面，包括集群清单、工作负载、配置元数据、RBAC、网络、存储、CRD、Helm 元数据、事件、日志和指标。Secret 原始数据、自定义资源原始 YAML、Helm Values、终端与流式传输，以及通用变更路由仍保持内部状态，除非独立契约明确开放了受保护工作流。

`soha` CLI 不会复制一套 Kubernetes 子命令树。它负责安装官方 Skill 与 MCP 配置、发现实时 Gateway Manifest，并且只调用当前可见的工具：

```bash
soha setup --client codex --mode both --base-url https://soha.example.com
soha capabilities --output inputs
soha tool call k8s.workloads.overview \
  --input-json '{"clusterId":"prod-cn","namespace":"payments"}' \
  --skill-id k8s-sre --source cli
```

OpenAPI 使用方应直接使用生成的 Go 或 TypeScript SDK。Codex 等 MCP 客户端应使用 `soha mcp`；两条路径最终都受后端认证、范围授权、审批、审计和操作证据约束。

## 生产验收

只有以下条件全部通过后，才应放行集群：

1. 集群健康、Kubernetes 版本、namespace、节点和工作负载清单返回明确数据或明确错误。
2. 能力矩阵与所选 Direct 或 Agent 连接模式一致。
3. 已知运行中 Pod 能展示 Prometheus 指标，并能区分未配置、无数据和查询失败。
4. 一次受控非查询操作产生可检索的审计记录和成功操作记录，且不包含敏感信息。
5. Agent 在短时网络中断后能够重连，并且没有暴露入站 Agent NodePort。
6. `k8s-readonly` Preset 能够在不获取 kubeconfig 或直接集群凭据的情况下诊断工作负载。
7. 部署已明确记录 RBAC、日志保留、备份保护、TLS 和 Prometheus 网络可达性。
8. 公开 Kubernetes 操作具有稳定 OpenAPI operation ID 和生成 SDK 类型，内部与 stream-only 路由保持明确分类。

在私有 Prometheus 和任意自定义资源场景下，不应宣称 Agent 完全对等。公开结构化只读面已经契约化；敏感读取、流式接口和变更能力仍有意收窄，不能根据页面可见性推断可调用能力。
