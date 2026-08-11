# Multi-Cluster Model

## Cluster Registry Model

Each cluster has:

- durable metadata in PostgreSQL
- credential metadata in PostgreSQL
- secret material referenced externally or stored through future secret providers
- runtime clients managed by cluster-manager

## Connection Strategy

Current runtime supports two connection modes:

- `direct_kubeconfig`
  - bootstrapped from `config.yaml` or registered through the cluster API
  - supports explicit context selection
  - builds per-cluster typed, dynamic, and discovery clients
  - starts informer/cache readers dynamically after registration
- `agent`
  - installs from a short-lived manifest generated from the Soha access address
  - initiates a long-lived reverse session from the private cluster to Soha
  - carries bounded inventory, logs, streams, and controlled actions through that session

Future expansion can add:

- encrypted credential stores
- cloud provider auth plugins
- service account federation
- workload identity federation

## Health and Capability Discovery

cluster-manager should periodically collect:

- API reachability
- Kubernetes version
- available API groups and resources
- optional metrics availability
- last successful sync time

## Client Lifecycle

cluster-manager maintains a per-cluster client bundle:

- `kubernetes.Interface`
- `dynamic.Interface`
- `discovery.DiscoveryInterface`
- shared informer factory handles

Lifecycle rules:

- lazy initialize on first use or bootstrap
- refresh when credentials change or a new direct kubeconfig cluster is registered
- surface last error state
- close caches when a cluster is removed

For Agent clusters, Soha keeps the durable registry in PostgreSQL and routes requests through the active reverse session instead of building a local `client-go` bundle. The capability matrix remains authoritative when Agent RBAC or control-plane Prometheus reachability limits a feature.
