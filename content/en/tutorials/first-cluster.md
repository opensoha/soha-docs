---
title: First Cluster
description: Register the first Kubernetes cluster using direct kubeconfig or agent mode and verify namespaces and workload reads.
---

# First Cluster

Soha supports two cluster connection modes: `direct_kubeconfig` and `agent`. Use direct mode for a local or trusted cluster where the control plane can read kubeconfig material. Use agent mode when the cluster must call back through a remote agent boundary.

## Prerequisites

- A running Soha control plane from [First Deploy](./first-deploy.md).
- An access token with cluster-management permissions.
- A kubeconfig path or a planned remote agent endpoint.

## Direct Kubeconfig Registration

Register a direct cluster through the cluster API. Replace the kubeconfig path and metadata before running this against a real environment.

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

The API reference name is `POST /api/v1/clusters`.

## Agent Registration Shape

Agent clusters persist remote endpoint and token metadata in Soha. The remote `soha-agent` still owns the cluster-side runtime.

```json
{
  "id": "edge-a",
  "name": "Edge A",
  "connectionMode": "agent",
  "agentEndpoint": "https://agent.example.internal",
  "agentToken": "replace-with-agent-token"
}
```

## Verify Cluster Reads

List registered clusters:

```bash
curl -sS "$SOHA_SERVER/api/v1/clusters" \
  -H "Authorization: Bearer $SOHA_TOKEN"
```

The API reference name is `GET /api/v1/clusters`.

Read namespaces from the registered cluster:

```bash
curl -sS "$SOHA_SERVER/api/v1/clusters/local/namespaces" \
  -H "Authorization: Bearer $SOHA_TOKEN"
```

The API reference name is `GET /api/v1/clusters/:clusterID/namespaces`.

## Expected Output Shape

The concrete cluster metadata depends on your kubeconfig or agent endpoint.
Successful responses should include stable identity and list wrappers:

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

## Exit Criteria

- The cluster appears in the cluster list.
- Namespace reads return data or a clear runtime error.
- Direct clusters report kubeconfig validation errors before registration when credentials are invalid.
- Agent clusters fail with an explicit connectivity or authorization state rather than a silent empty resource list.

## Known Gaps

Current agent parity is still narrower than direct mode. Logs, YAML apply/delete, exec, port-forward, and some rollout history paths remain product-roadmap work.
