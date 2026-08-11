---
title: Kubernetes Workbench
description: Operate the Kubernetes dashboard with explicit Agent, Prometheus, audit, MCP, and production-readiness boundaries.
---

# Kubernetes Workbench

The Kubernetes Workbench covers cluster inventory, workloads, configuration, networking, storage, access control, extensions, Helm, events, logs, terminals, and resource metrics. Use the cluster capability matrix as the runtime source of truth: a visible page does not imply that every action is available through every connection mode.

## Connect A Cluster

Direct mode lets the Soha control plane connect with a validated kubeconfig. Agent mode is intended for private clusters: the cluster-side Agent initiates the long-lived connection to the Soha access address, so the Agent service does not need a public NodePort.

Set the Soha access address in Runtime Configuration, create an Agent connection from the cluster page, and run the generated command:

```bash
kubectl apply -f https://soha.example.com/api/v1/kubernetes/agent-installations/<install-ticket>/manifest.yaml
```

The manifest URL is short-lived. Generate a new installation when it expires. The Agent derives the session transport from the same access address (`http` to `ws`, `https` to `wss`) and reconnects automatically.

After installation, verify that the cluster detail reports a connected Agent session and inspect the capability matrix before enabling operational workflows.

## Pod Metrics

Pod CPU, memory, network, and restart charts use the Prometheus connection stored on the selected cluster. Configure the Prometheus URL, optional bearer token, cluster label, and optional Grafana URL on the cluster connection.

The Soha control plane must be able to reach the configured Prometheus endpoint in both Direct and Agent modes. Agent mode does not currently proxy a private in-cluster Prometheus endpoint. Keep the capability as `partial` when that network path is unavailable.

The dashboard distinguishes these states:

- **Not configured**: the cluster has no Prometheus URL.
- **No data**: Prometheus responded but returned no series for the selected pod and range.
- **Query failed**: authentication, reachability, PromQL, or server processing failed.

The default query window is 60 minutes with a 60-second step. Test one running pod with known CPU and memory activity before accepting a cluster for production use. The API route is `GET /api/v1/clusters/{clusterID}/workloads/pods/{podName}/metrics` and requires namespace context.

Prometheus bearer tokens are not returned by the API, but the current implementation stores them in database-backed cluster connection metadata without field-level encryption. Protect the database, backups, replicas, and diagnostic exports.

## Audit And Operation Evidence

Kubernetes mutation paths authorize before execution and write governance evidence at the application boundary:

- **Audit logs** record successful, failed, denied, and unsupported mutation attempts after authorization context is available.
- **Operation logs** record successful operational actions such as create, apply, delete, restart, scale, rollback, exec, terminal, CronJob suspend, and port-forward start or stop.
- Command text, secret data, kubeconfig, and tokens must not be copied into operation metadata.

In the Settings workbench, use `/system/audit` for attempts and failures and `/system/operations` for successful operation evidence. Both views can filter by cluster, namespace, resource kind, resource name, action or operation type, result, request ID, time range, and metadata. Both also support retention summaries and CSV export. Access requires `system.audit.view` or `system.operations.view`.

Malformed requests rejected before the application service cannot identify a resource operation and are not a substitute for HTTP access logs. Keep ingress and server request logs enabled for that transport-level evidence.

## MCP And Skills

Use the official `k8s-sre` skill with the `k8s-readonly` MCP preset for scoped, read-only diagnosis. The live AI Gateway manifest remains authoritative; discover it before calling tools and treat missing tools or `capabilityWarnings` as unavailable evidence, not empty Kubernetes data.

The preset includes namespace and workload summaries, ConfigMap metadata, Secret metadata, Helm release metadata, pods, deployments, services, routes, storage, nodes, events, and bounded pod logs. ConfigMap content, Secret data, Helm values, and raw Kubernetes objects are not exposed. The preset does not allow exec, apply, delete, restart, scale, rollback, drain, or port-forward. Custom-resource access still requires explicit Kubernetes RBAC for each API group and resource. Prometheus evidence still requires control-plane reachability.

## OpenAPI And AI Clients

The public OpenAPI contract is the source of truth for SDK and HTTP clients. It covers the reviewed structured-read surface for cluster inventory, workloads, configuration metadata, RBAC, networking, storage, CRDs, Helm metadata, events, logs, and metrics. Raw Secret data, raw custom-resource YAML, Helm values, terminal and stream transports, and general mutation routes remain internal unless a separate contract explicitly exposes a guarded workflow.

The `soha` CLI does not duplicate this API as a Kubernetes command tree. It installs the official Skill and MCP configuration, discovers the live Gateway manifest, and invokes only visible tools:

```bash
soha setup --client codex --mode both --base-url https://soha.example.com
soha capabilities --output inputs
soha tool call k8s.workloads.overview \
  --input-json '{"clusterId":"prod-cn","namespace":"payments"}' \
  --skill-id k8s-sre --source cli
```

OpenAPI consumers should use the generated Go or TypeScript SDK directly. Codex and other MCP clients should use `soha mcp`; both paths still rely on backend authentication, scope authorization, approval, audit, and operation evidence.

## Production Acceptance

Accept a cluster only after all of the following pass:

1. Cluster health, Kubernetes version, namespaces, nodes, and workload inventory return explicit data or explicit errors.
2. The capability matrix matches the selected Direct or Agent connection mode.
3. A known running pod displays Prometheus metrics, and not-configured, no-data, and query-failure states are distinguishable.
4. A controlled mutation produces a searchable audit entry and a successful operation entry without secret material.
5. Agent reconnect works after a short network interruption, and no inbound Agent NodePort is exposed.
6. The `k8s-readonly` preset can diagnose a workload without kubeconfig or direct cluster credentials.
7. RBAC, retention, backup protection, TLS, and Prometheus network reachability are documented for the deployment.
8. Public Kubernetes operations have stable OpenAPI operation IDs and generated SDK types; internal and stream-only routes remain explicitly classified.

Do not claim full Agent parity for private Prometheus or arbitrary custom resources. Public structured reads are contract-covered; sensitive reads, streams, and mutations remain intentionally narrower and must not be inferred from page visibility.
