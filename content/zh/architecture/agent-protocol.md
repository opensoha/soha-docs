# Agent 协议

## 设计目标

当平台不希望或无法通过直连 kubeconfig 访问远端集群时，`soha` Agent 协议为控制平面提供了一条稳定、受控的远程集群通信路径。

后端在 PostgreSQL 中保存 Agent 连接元数据，随后由 Gin API 层通过 HTTP 调用远端 Agent，完成集群摘要同步、资源列表读取与受控变更操作。

## 注册模型

平台集群注册请求载荷：

```json
{
  "id": "edge-prod-01",
  "name": "Edge Production 01",
  "region": "cn-shanghai",
  "environment": "production",
  "connectionMode": "agent",
  "agentEndpoint": "https://agent.example.internal",
  "agentToken": "optional-bearer-token"
}
```

数据库持久化字段映射：

- `clusters.connection_mode = agent`
- `cluster_credentials_meta.credential_type = bearer`
- `cluster_credentials_meta.source_type = agent`
- `cluster_credentials_meta.metadata.endpoint`
- `cluster_credentials_meta.metadata.token`

## 必需的 Agent 端点

### 集群摘要

`GET /api/v1/platform/summary`

响应示例：

```json
{
  "data": {
    "id": "edge-prod-01",
    "name": "Edge Production 01",
    "region": "cn-shanghai",
    "environment": "production",
    "labels": { "provider": "agent" },
    "connectionMode": "agent",
    "version": "v1.31.2",
    "capabilities": ["apps", "batch", "networking.k8s.io"],
    "health": {
      "status": "healthy",
      "message": "ok",
      "lastChecked": "2026-03-22T10:00:00Z"
    }
  }
}
```

### 命名空间列表

`GET /api/v1/platform/namespaces`

响应示例：

```json
{
  "items": [
    {
      "name": "default",
      "status": "Active",
      "labels": {},
      "ageSeconds": 3600,
      "allowedActions": ["view", "list"]
    }
  ]
}
```

### Pod 列表

`GET /api/v1/platform/workloads/pods?namespace=default`

### Deployment 列表

`GET /api/v1/platform/workloads/deployments?namespace=default`

## 受控执行端点

### 重启 Deployment

`POST /api/v1/platform/actions/deployments/restart`

请求示例：

```json
{
  "namespace": "default",
  "name": "api"
}
```

### 扩缩容 Deployment

`POST /api/v1/platform/actions/deployments/scale`

请求示例：

```json
{
  "namespace": "default",
  "name": "api",
  "replicas": 3
}
```

## 身份认证

配置了 `agentToken` 时，`soha` 控制平面会在请求中携带：

```http
Authorization: Bearer <token>
```

建议的 Agent 安全实现准则：

- 在处理任何平台调用前严格校验 Bearer 令牌
- 将只读查询端点与执行变更端点清晰隔离
- 对执行变更端点采用显式白名单收敛操作范围

## 错误契约

Agent 遇到异常时应返回标准 HTTP 错误状态码。当远端 Agent 不可达或拒绝执行操作时，`soha` 会将下游连接故障与执行失败统一映射为 `cluster_unavailable`。

## 授权边界

`soha` 控制平面始终是主授权裁决点，具体边界如下：

- 在发起 Agent 调用前，先由 `soha` 完成 RBAC 与 ABAC 策略评估
- Agent 仍须独立校验自身配置的 Bearer 令牌
- Agent 不得仅因请求声称来自 `soha` 就跳过本地鉴权并无条件信任调用方
- 高风险变更操作应保持最小化、显式化的接口边界

## 当前平台接入范围

当前后端对 Agent 协议的实际调用范围包括：

- 通过摘要端点同步集群健康状态快照
- 读取命名空间、Pod 与 Deployment 资源列表
- 执行 Deployment 重启与副本扩缩容等工作负载动作
- 有界容器日志读取与受支持的流式接口
- 原始 YAML 清单拉取
- 集群事件查询
- 容器终端执行（`exec`）
- 发布滚动历史查询

Agent 模式通过集群内 Agent 主动建立的反向长连接提供这些能力。实际可用范围取决于运行中的 Agent 版本、安装预设、`security.allowed_actions` 和 Kubernetes RBAC；协议已有实现不代表当前安装已授权全部动作。

接入后以 [Agent Runtime 的平台能力矩阵](../operations/agent-runtime.md#平台能力矩阵) 和 [Kubernetes 工作台](../operations/kubernetes-workbench.md) 为准。认证接口 `GET /api/v1/diagnostics/actions` 可辅助核对 Agent 的动作实现、白名单和权限就绪度；诊断读取本身不会授权变更操作。
