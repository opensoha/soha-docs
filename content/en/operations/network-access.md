# Network Access Workbench Operations

The Network Access Workbench applies one user, organization, device, site, resource, and policy model to Wi-Fi/wired admission, WireGuard VPN, ZTNA, and mihomo. Soha is the authorization source, but its control plane never forwards user traffic.

## Runtime boundaries

| Component | Responsibility | Interface or data plane |
| --- | --- | --- |
| `soha-server` | Assets, policy, authorization, audit, and bounded summary queries | `/api/v1/network-access/**` |
| `network-control` | Endpoint/NAS/gateway enrollment, configuration, leases, and session control | `/api/network-control/v1/**`, port `8082`, mTLS |
| `ingest` | Heartbeats, RADIUS Accounting, and proxy aggregates | `/api/ingest/v1/**`, port `8083`, mTLS, separate PostgreSQL |
| `network-gateway` | WireGuard, routing, and deny-first firewall enforcement | Separate Linux data plane with `NET_ADMIN` |
| `soha-app-service` | Sole endpoint coordinator for WireGuard, routes, DNS, and mihomo | Windows LocalSystem service and restricted Named Pipe |
| FreeRADIUS/NAS adapter | EAP/RADIUS protocol and switch/AP attribute translation | Separate runtime with no independent Soha policy store |

Core, control, and ingest carry control messages only. VPN/ZTNA packets travel between the endpoint and `network-gateway`; high-frequency telemetry goes only to the ingest database.

## Five access modes

| Mode | Use case | Enforcement |
| --- | --- | --- |
| `internal_direct` | Direct access from corporate Wi-Fi or Ethernet | FreeRADIUS authorization; NAS-enforced VLAN, `Filter-ID`, and ACLs |
| `internal_ztna` | Protected-resource access from the corporate network | Short-lived resource grant plus WireGuard split routing; the physical network must block bypass |
| `external_vpn` | General private-network access from an external network | WireGuard NetworkLease with only approved private prefixes |
| `external_vpn_ztna` | Connect to the private VPN, then access protected resources | NetworkLease plus short-lived ResourceLease; `ProtectedSet` denies override broad routes |
| `external_direct_ztna` | Reach selected resources directly without general private-network access | Resource-scoped WireGuard ZTNA routes only |

ZTNA grants are bound to user, organization, device posture, site, policy version, and recent MFA. Identity, organization, posture, or policy changes cause renewal to fail closed and narrow or revoke the session.

## Wi-Fi and wired admission

FreeRADIUS owns EAP-TLS, the RADIUS state machine, and vendor-facing protocol behavior; Soha does not implement a RADIUS stack. The leaf certificate serial and Authority Key Identifier bind an admitted identity to an enrolled device. `Calling-Station-Id` remains NAS evidence, not the Soha device identifier.

Policy results are `onboarding`, `full`, `restricted`, `quarantine`, or `deny`. An allow result can return standard VLAN, `Filter-ID`, and `Session-Timeout` attributes. A downgrade or revocation selects CoA or Disconnect from the registered NAS capability. An unavailable authorization bridge, stale policy, or identity mismatch must reject access.

Actual VLAN and ACL enforcement depends on the AP, switch, router, and firewall. Before rollout, validate Wi-Fi, roaming, wired ports, CoA/Disconnect, and physical bypass prevention for `tunnel_required` resources on the target vendor hardware.

## WireGuard, ZTNA, and address conflicts

Soha uses native WireGuard. NetBird is a design reference, not a runtime dependency. The gateway assigns a unique overlay `/32` to each endpoint, installs `ProtectedSet` denies before NetworkLease/ResourceLease allows, and fails back to a deny baseline when it is offline, stale, or cannot verify applied state.

The endpoint installs split routes and never takes over the default route. If a local network overlaps an enterprise prefix, the MVP rejects the conflicting route explicitly instead of silently translating the destination. mihomo fake-IP is not a VPN CIDR-conflict solution; the endpoint rejects fake-IP whenever WireGuard DNS is active or the fake-IP pool overlaps a WireGuard or bypass prefix.

## mihomo coexistence

The workbench supports two mihomo modes:

- `managed_follow`: an administrator supplies the subscription and selected node.
- `app_subscription`: the App stores the subscription and the user selects a node.

The MVP exposes only a loopback mixed proxy. mihomo TUN, default routes, LAN listening, and system DNS ownership stay disabled while WireGuard owns split routes and DNS. Provider downloads use `DIRECT` to avoid proxy-provider loops. A failed mihomo update rolls back or disables only mihomo; it does not remove WireGuard, and a WireGuard failure does not rewrite the last verified proxy state.

## Deployment

Run the complete software stack locally with Docker:

```bash
docker compose -f deploy/docker-compose.yaml --profile network-access up -d --build
```

The raw Kubernetes baseline is `deploy/network-runtime.yaml`; it includes control, ingest, the WireGuard gateway, and required persistent volumes. FreeRADIUS configuration is under `deploy/freeradius/`.

The Helm Chart creates no network runtime by default. Enable only the unprivileged control/ingest plane with:

```yaml
image:
  # Build and load this image before installation.
  tag: local
networkRuntime:
  enabled: true
  existingTLSSecret: soha-network-runtime-tls
```

The Secret must contain `network-control.crt`, `network-control.key`, `ingest.crt`, `ingest.key`, and `client-ca.crt`. The Chart also creates an isolated ingest PostgreSQL workload. Deploy the privileged gateway and FreeRADIUS/NAS adapter from version-matched raw manifests so the operator explicitly reviews host networking, UDP exposure, `NET_ADMIN`, certificates, and the RADIUS shared secret.

## AI and CLI acceptance

`network_access.*` Gateway tools reuse the owning services, permissions, scopes, approvals, and audit rather than accessing databases or the data plane directly. Use the installed CLI for a minimal read-only smoke test:

```bash
curl -fsS http://127.0.0.1:8080/readyz
soha version --json
soha diagnose --profile local --timeout 10s
soha capabilities --profile local --output names --timeout 10s
soha diagnose --profile local --tool network_access.sessions.list --timeout 10s
soha tool call network_access.sessions.list --profile local --input-json '{}' --timeout 10s
```

If a tool is absent, check role permissions, resource scopes, MCP tool grants, and the current AI client context. Creating grants, revoking sessions, and executing CoA/Disconnect are mutations; preview them first and retain the approval and audit chain.

## Remaining physical acceptance gates

Software tests do not replace these gates:

- Real admission and downgrade tests on the target Wi-Fi AP and wired switch/NAS.
- End-to-end Windows validation of WireGuard, mihomo, SCM, Named Pipe, DPAPI, and the Linux gateway.
- Physical-network bypass prevention for every `tunnel_required` resource.

Do not mark hardware compatibility or bypass closure complete until those checks pass.
