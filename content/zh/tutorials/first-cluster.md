---
title: 第一次接入集群
description: 使用 direct kubeconfig 或 agent 模式注册第一个 Kubernetes 集群，并验证 namespace 和 workload 读取。
---

# 第一次接入集群

Soha 支持两种集群连接模式：`direct_kubeconfig` 和 `agent`。本地或可信集群可以使用 direct 模式，让控制平面读取 kubeconfig material。集群必须通过远端 agent 回连时，使用 agent 模式。

## 前置条件

- 已按 [第一次部署](./first-deploy.md) 启动 Soha 控制平面。
- 有一个具备 cluster-management 权限的 access token。
- 有 kubeconfig 路径，或已经规划好 remote agent endpoint。

## 注册 Direct Kubeconfig 集群

通过 cluster API 注册 direct 集群。真实环境执行前请替换 kubeconfig 路径和元数据。

```bash
export SOHA_SERVER=http://localhost:8080
export SOHA_TOKEN=replace-with-access-token

curl -sS -X POST "$SOHA_SERVER/api/v1/clusters" \
  -H "Authorization: Bearer $SOHA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "local",
    "name": "Local",
    "connectionMode": "direct_kubeconfig",
    "kubeconfig": "/Users/example/.kube/config",
    "context": "local"
  }'
```

API reference 名称是 `POST /api/v1/clusters`。

## Agent 注册形状

Agent 集群会在 Soha 中持久化远端 endpoint 和 token metadata。远端 `soha-agent` 仍然拥有集群侧 runtime。

```json
{
  "id": "edge-a",
  "name": "Edge A",
  "connectionMode": "agent",
  "agentEndpoint": "https://agent.example.internal",
  "agentToken": "replace-with-agent-token"
}
```

## 验证集群读取

列出已注册集群：

```bash
curl -sS "$SOHA_SERVER/api/v1/clusters" \
  -H "Authorization: Bearer $SOHA_TOKEN"
```

API reference 名称是 `GET /api/v1/clusters`。

读取注册集群中的 namespace：

```bash
curl -sS "$SOHA_SERVER/api/v1/clusters/local/namespaces" \
  -H "Authorization: Bearer $SOHA_TOKEN"
```

API reference 名称是 `GET /api/v1/clusters/:clusterID/namespaces`。

## 预期输出形状

具体集群 metadata 取决于 kubeconfig 或 agent endpoint。成功响应应该包含稳定身份和 list wrapper：

Fixture artifact: [`first-cluster.expected.txt`](/tutorial-fixtures/first-cluster.expected.txt)

```bash
POST "$SOHA_SERVER/api/v1/clusters"
GET "$SOHA_SERVER/api/v1/clusters"
GET "$SOHA_SERVER/api/v1/clusters/local/namespaces"
```

```json
{"item": {"id": "local", "name": "Local", "connectionMode": "direct_kubeconfig"}}
{"items": [{"id": "local", "connectionMode": "direct_kubeconfig"}]}
{"items": [{"name": "default", "status": "Active"}]}
```

## 验收标准

- cluster 出现在集群列表中。
- Namespace 读取返回数据，或返回清晰的 runtime error。
- Direct 集群在 credential 无效时，应在注册前报告 kubeconfig validation error。
- Agent 集群在不可达或未授权时，应返回明确的 connectivity 或 authorization 状态，而不是静默空列表。

## 已知缺口

当前 agent parity 仍小于 direct 模式。Logs、YAML apply/delete、exec、port-forward 和部分 rollout history 路径仍是产品路线图工作。
