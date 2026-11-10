# Monitoring And Alerting

Soha is the control and investigation plane for observability. It does not store raw telemetry or
replace OpenTelemetry, Prometheus-compatible storage, Loki, or Grafana.

## Architecture Boundary

OpenTelemetry is the preferred instrumentation, resource identity, collection, and transport
standard. It is not an observability backend. Soha uses the following execution paths:

```text
Metrics: OTel Collector or scrape -> Prometheus-compatible backend -> Soha
Traces:  external provider integration is not currently available in Core
Logs:    runtime logs -> Soha; durable cluster logs -> configured Loki -> Soha
Alerts:  Soha rules or external alerting systems -> Soha alert events
```

The observability chart retains optional generic OTLP trace export for external consumers. Core does
not currently provide Trace Explore or service-topology views; related routes and query DTOs remain
for compatibility and report the capability as unavailable. External trace-provider integration is
future work. Existing provider configuration records are preserved during upgrade but are not
usable by Core.

## Workbench Information Architecture

The canonical namespace is `/monitoring-workbench`. The four primary directions are:

1. **Services and health**: provider freshness and active alerts. Service topology is unavailable.
2. **Explore**: one shareable scope and time range across metrics, logs, and events. Trace Explore is
   unavailable.
3. **Dashboards**: native templates and bounded Grafana JSON import rendered by Soha.
4. **Alerts and events**: rules, event lifecycle, notification evidence, healing, and on-call.

Provider, data-source, integration, rule, notification, healing, and on-call pages are operational
configuration surfaces, not separate observability products. Existing `/observability/*` links are
kept as compatibility redirects.

## Data Sources And Query State

Core supports Prometheus metrics and native Loki log queries. Runtime logs remain available without
a durable provider. The generic external `logs.query` capability currently queries durable cluster
logs only. A provider's code capability is reported separately from its runtime state:

- `unconfigured`: no enabled data source exists;
- `unknown`: the source has not been validated;
- `healthy`: backend validation succeeded;
- `degraded` or `failed`: one or more configured sources cannot be used;
- `unsupported`: no executable adapter is available.

Queries keep scope, absolute time range, filters, signal, and provider-native query details in a
versioned context and query snapshot. A query can return `success`, `empty`, `partial`, `no_data`,
`error`, or `unsupported`. Backend errors are not presented as empty results, and authorization may
narrow but never broaden the requested scope.

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
rules; provider-specific log rules remain advanced capabilities, while trace rules are unavailable.

Alert details preserve the diagnostic time window and can open metrics and logs without requiring
the user to re-enter scope. Trace links remain unavailable until an external provider integration is
delivered. AI investigation receives the same alert, cluster, namespace,
workload, and time context, while governance actions stay in the monitoring workbench.

Rules that still include an enabled retired log source report missing evidence and do not automatically
resolve a firing alert from partial results. Disable the retired source or select Loki explicitly before
revalidating the rule.

## Deliberate Limits

- Soha does not implement a cross-signal query language or a second telemetry database.
- The `starter` observability profile is single-replica Loki and is not production HA.
- Provider configuration or a valid Collector configuration does not prove live data flow. Verify
  metrics and logs against their configured backends in each production environment. The chart's
  optional OTLP trace export is for external consumers; it does not make Core Trace or topology
  queries available.
- Native Nightingale integration, Alertmanager inhibition, subscriptions, recurring maintenance
  windows, rule packs, anomaly detection, SLO burn-rate rules, and an independent Incident model
  are not part of the current baseline. Add them only after a concrete operating need establishes
  their lifecycle and ownership.
- Existing time-bounded silences provide the current suppression primitive; they are not presented
  as source-level inhibition or a recurring maintenance scheduler.

See the generated API reference for the authoritative public HTTP surface.
