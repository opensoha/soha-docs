# 事件模型

## 事件来源

- Kubernetes 集群事件
- 发布事件
- 构建事件
- 监控告警事件
- 外部集成回调事件
- 后续扩展的 MCP 调用事件

## 统一事件信封

```json
{
  "id": "evt_01J...",
  "source": "kubernetes",
  "category": "resource.lifecycle",
  "severity": "warning",
  "cluster_id": "local",
  "namespace": "default",
  "resource": {
    "kind": "Pod",
    "name": "api-7f4c6d9f8f-9xt2q"
  },
  "summary": "Back-off restarting failed container",
  "payload": {},
  "occurred_at": "2026-03-22T10:00:00Z",
  "correlation_id": "corr_123"
}
```

## 事件中心职责

- 将不同来源的原始事件归一化为统一结构
- 在需要历史回溯检索的场景下，将持久化事件流写入 PostgreSQL
- 为 SSE 实时订阅客户端维护进程内热数据缓冲队列
- 支持按集群、命名空间、项目、发布单或运维操作进行关联聚合

## 首阶段范围

首阶段保持事件中心轻量化实现：

- 通过资源访问层或本地监听缓存消费 Kubernetes 集群事件
- 暴露归一化后的标准事件列表接口
- 预先保留面向构建与发布事件的统一 Schema 扩展空间
