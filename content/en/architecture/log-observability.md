# Log Observability

Soha provides one log experience across Kubernetes workloads, application delivery environments,
and Docker projects. Runtime logs work without installing a collector. Durable history and managed
collection are optional.

## Entry Points

The primary explorer is available at:

```text
/monitoring-workbench/logs
```

The same explorer is embedded in:

- Kubernetes Pod details
- application delivery environment and workload details
- Docker project service details

Embedded explorers preserve their resource scope and can open the same scope in the central log
page.

## Live And History

`Live` reads bounded runtime logs through the Kubernetes API, a connected Soha Agent, or the Docker
runtime. It supports snapshots, query-bound WebSocket tickets, reconnect, filtering, and export.
Kubernetes and delivery queries can aggregate multiple authorized sources. Docker queries are
currently runtime-only.

`History` queries an enabled Loki, Elasticsearch, or ClickHouse data source. Configure these
connections under:

```text
/monitoring-workbench/log-data-sources
```

History remains unavailable until a durable data source is configured and healthy. Soha does not
store application logs in its PostgreSQL database, and it does not expose provider credentials to
the browser.

## Authorization

Collection and end-user visibility are separate concerns. A collector may read logs for its
configured namespaces, but every query and stream is authorized again by Soha.

- cluster queries are restricted by the current cluster and namespace log permissions
- delivery queries resolve only enabled targets in the selected application-environment binding
- every resolved delivery target is authorized before a stream ticket is issued
- if any requested delivery target is forbidden, the aggregate request returns no partial log data
- Docker log access uses the existing Docker project and service permissions
- export repeats the server-side query and authorization
- query and stream activity is written to the audit log

Provider queries are built from the authorized scope. Soha does not fetch an unrestricted result
set and filter it in the browser.

## Optional Managed Collection

Managed collection is disabled by default. Open a cluster detail page and use **Log Collection** to
run preflight checks. Enabling the add-on requires an explicit confirmation based on the returned,
short-lived plan token.

The independent `soha-observability` Helm chart supports:

| Profile | Components | Intended Use |
| --- | --- | --- |
| `starter` | OpenTelemetry Collector and single-replica Loki with retained PVC | Small installations and evaluation |
| `collector_only` | OpenTelemetry Collector forwarding to an external Loki OTLP endpoint | Existing durable backend |
| `production_external` | External profile with production-oriented resource sizing | Production-managed storage |

The collector mounts `/var/log/pods` read-only. Use its namespace allowlist to limit file discovery.
External credentials are referenced from an existing Kubernetes Secret.

Stopping collection stops new writes. Uninstalling the add-on retains the Loki PVC by default, so
removing collection does not silently delete historical logs.

## Operational Limits

- Runtime logs are subject to container-runtime rotation and disappear when the underlying files
  are removed.
- Durable retention is controlled by the configured backend or the managed profile.
- Live sessions are bounded and reconnect with a new single-use ticket, which triggers fresh
  authorization.
- Query source counts, entry counts, time ranges, and provider work are bounded server-side.
- A degraded source is reported explicitly; it does not broaden the query to compensate.
