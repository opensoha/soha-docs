# Monitoring And Alerting

Soha is the control and investigation plane for observability. It does not store raw telemetry or
replace OpenTelemetry, SkyWalking OAP, Prometheus-compatible storage, Loki, or Grafana.

## Architecture Boundary

OpenTelemetry is the preferred instrumentation, resource identity, collection, and transport
standard. It is not an observability backend. Soha uses the following execution paths:

```text
Metrics: OTel Collector or scrape -> Prometheus-compatible backend -> Soha
Traces:  OTel Collector -> SkyWalking OAP or Jaeger -> Soha
Logs:    OTel Collector -> Loki, Elasticsearch, or ClickHouse -> Soha
Alerts:  Soha rules or external alerting systems -> Soha alert events
```

SkyWalking OAP remains an external APM analysis backend. Soha queries its service metadata,
topology, and traces through bounded adapters. Provider credentials remain on the server.

## Workbench Information Architecture

The canonical namespace is `/monitoring-workbench`. The four primary directions are:

1. **Services and health**: service inventory, provider freshness, topology context, and active
   alerts.
2. **Explore**: one shareable scope and time range across metrics, traces, logs, and events.
3. **Dashboards**: native templates and bounded Grafana JSON import rendered by Soha.
4. **Alerts and events**: rules, event lifecycle, notification evidence, healing, and on-call.

Provider, data-source, integration, rule, notification, healing, and on-call pages are operational
configuration surfaces, not separate observability products. Existing `/observability/*` links are
kept as compatibility redirects.

## Data Sources And Query State

Built-in adapters support Prometheus metrics, Jaeger and SkyWalking traces, and Loki,
Elasticsearch, and ClickHouse logs. A provider's code capability is reported separately from its
runtime state:

- `unconfigured`: no enabled data source exists;
- `unknown`: the source has not been validated;
- `healthy`: backend validation succeeded;
- `degraded` or `failed`: one or more configured sources cannot be used;
- `unsupported`: no executable adapter is available.

Queries keep scope, absolute time range, filters, signal, and provider-native query details in a
versioned context and query snapshot. A query can return `success`, `empty`, `partial`, `no_data`,
`error`, or `unsupported`. Backend errors are not presented as empty results, and authorization may
narrow but never broaden the requested scope.

The service APIs use SkyWalking Metadata V2 and topology when a scoped, healthy SkyWalking data
source is available. Missing identity or version-specific fields are returned as degraded or
unsupported instead of fabricated health. Trace results can open associated logs with the same
trace ID, span ID, scope, and time range.

SkyWalking OAP receives OTLP traces over gRPC and converts them to its Zipkin trace model. Soha can
query those traces through the configured Zipkin query endpoint. Native Metadata V2 service and
topology views remain conditional on telemetry analyzed by SkyWalking's native service model.

## Dashboards

Soha imports Grafana Classic JSON and V1 resource wrappers into a bounded intermediate model. It
retains the original JSON, variables, data-source bindings, import warnings, and unsupported panel
JSON. It renders supported panels itself and never executes an unknown panel or exposes backend
credentials to the browser.

Current guardrails include:

- a 2 MiB dashboard payload limit;
- at most 200 imported panels and 8 targets per panel;
- Prometheus expressions limited to 8,192 bytes;
- explicit data-source type and UID mapping;
- bounded custom and constant variables;
- explicit rejection of Grafana V2 resources;
- `timeseries`, `table`, `stat`, `gauge`, `text`, and `row` as the supported panel surface.

Unsupported panels remain inspectable and produce warnings. Grafana alert rules are not imported
from dashboard JSON. Playback advances one shared client-side time window; it is not Grafana
playlist emulation or server-side video generation.

## Alert Lifecycle

Alertmanager v1, Grafana Alerting v1, and Generic Webhook integrations normalize external payloads
into durable alert events. Integration-specific tokens protect registered webhook endpoints. The
current platform owns:

- alert integration registration and normalization;
- internal metric-rule evaluation with reducer, comparator, threshold, and pending duration;
- `pending`, `firing`, `resolved`, `no_data`, and `error` evaluation evidence;
- acknowledgement, ownership, resolution, silences, routing, and notification delivery logs;
- healing runs with permission and approval checks;
- notification policies, channels, templates, on-call schedules, rotations, escalation policies,
  and assignment rules;
- durable rule runs and trigger-time query snapshots;
- audit records for authorized configuration and manual state mutations.

A backend error or missing data does not clear a firing internal alert. Only a definitive healthy
evaluation that no longer matches can resolve it. The simple rule editor covers validated metric
rules; provider-specific logs and traces rules remain advanced capabilities.

Alert details preserve the diagnostic time window and can open metrics, traces, and logs without
requiring the user to re-enter scope. AI investigation receives the same alert, cluster, namespace,
workload, and time context, while governance actions stay in the monitoring workbench.

## Deliberate Limits

- Soha does not implement a cross-signal query language or a second telemetry database.
- The `starter` observability profile is single-replica Loki and is not production HA.
- Provider configuration or a valid Collector configuration does not prove live data flow. A known
  metric, trace, and trace-correlated log must be written and queried in each production
  environment before the corresponding provider is treated as healthy.
- Native Nightingale integration, Alertmanager inhibition, subscriptions, recurring maintenance
  windows, rule packs, anomaly detection, SLO burn-rate rules, and an independent Incident model
  are not part of the current baseline. Add them only after a concrete operating need establishes
  their lifecycle and ownership.
- Existing time-bounded silences provide the current suppression primitive; they are not presented
  as source-level inhibition or a recurring maintenance scheduler.

See the generated API reference for the authoritative public HTTP surface.
