# 网络访问工作台运维指南

网络访问工作台使用同一套用户、组织、设备、站点、资源和策略，统一管理 Wi-Fi/有线准入、WireGuard VPN、ZTNA 与 mihomo。Soha 是授权真实源，但控制面不转发用户流量。

## 运行边界

| 组件 | 职责 | 接口或数据面 |
| --- | --- | --- |
| `soha-server` | 资产、策略、授权、审计和低频汇总查询 | `/api/v1/network-access/**` |
| `network-control` | 端点/NAS/网关注册、配置、租约和会话控制 | `/api/network-control/v1/**`，端口 `8082`，mTLS |
| `ingest` | 心跳、RADIUS Accounting 和代理汇总 | `/api/ingest/v1/**`，端口 `8083`，mTLS，独立 PostgreSQL |
| `network-gateway` | WireGuard、路由和 deny-first 防火墙执行 | 独立 Linux 数据面，需要 `NET_ADMIN` |
| `soha-app-service` | 端点 WireGuard、路由、DNS 和 mihomo 的唯一协调者 | Windows LocalSystem 服务与受限 Named Pipe |
| FreeRADIUS/NAS adapter | EAP/RADIUS 协议和交换机/AP 属性转换 | 独立运行时，不保存 Soha 授权策略 |

核心、控制和 ingest 只承载控制消息。实际 VPN/ZTNA 流量只经过端点与 `network-gateway`，高频遥测只进入 ingest 数据库。

## 五种访问模式

| 模式 | 使用场景 | 执行方式 |
| --- | --- | --- |
| `internal_direct` | 公司 Wi-Fi/有线直接访问获准网络 | FreeRADIUS 授权，NAS 通过 VLAN、`Filter-ID` 和 ACL 执行 |
| `internal_ztna` | 公司网络内访问受保护资源 | 短期资源授权加 WireGuard 分流；物理网络必须阻断旁路 |
| `external_vpn` | 外部网络接入普通内网 | WireGuard NetworkLease，仅下发获准私网前缀 |
| `external_vpn_ztna` | 先接入内网 VPN，再访问受保护资源 | NetworkLease 与短期 ResourceLease 组合；`ProtectedSet` 优先拒绝宽泛路由 |
| `external_direct_ztna` | 外部直接访问指定资源，不开放普通内网 | 仅建立资源范围的 WireGuard ZTNA 分流 |

ZTNA 授权与用户、组织、设备状态、站点、策略版本和近期 MFA 绑定。身份、组织、设备姿态或策略变化会使续租失败并收窄或撤销会话。

## Wi-Fi 和有线准入

FreeRADIUS 负责 EAP-TLS、RADIUS 状态机和厂商接入；Soha 不实现 RADIUS 协议栈。证书身份由叶证书序列号和 Authority Key Identifier 绑定到已登记设备，`Calling-Station-Id` 仅作为 NAS 证据。

策略结果为 `onboarding`、`full`、`restricted`、`quarantine` 或 `deny`。允许结果可返回标准 VLAN、`Filter-ID` 和 `Session-Timeout`；降级或撤销通过已登记 NAS 能力选择 CoA 或 Disconnect。授权桥接不可用、策略过期或身份不匹配时必须拒绝。

VLAN 和 ACL 是否真正生效取决于 AP、交换机、路由器和防火墙。上线前必须在目标厂商硬件上验证 Wi-Fi、漫游、有线端口、CoA/Disconnect 和 `tunnel_required` 资源的物理旁路阻断。

## WireGuard、ZTNA 和地址冲突

Soha 使用原生 WireGuard；NetBird 只作为设计参考，不是运行依赖。网关为每个端点配置唯一 overlay `/32`，先安装 `ProtectedSet` 拒绝规则，再安装 NetworkLease/ResourceLease 允许规则。网关离线、配置过期或回读不一致时停止新增授权并回到拒绝基线。

端点只安装分流路由，不接管默认路由。若本地网络与企业前缀重叠，MVP 会明确拒绝冲突路由，而不是静默改变目的地址。mihomo fake-IP 不能解决 VPN CIDR 冲突；WireGuard DNS 启用或 fake-IP 池与 WireGuard/旁路前缀重叠时，端点会拒绝该配置。

## mihomo 共存

工作台支持两种 mihomo 模式：

- `managed_follow`：管理员下发订阅与选定节点。
- `app_subscription`：App 保存订阅并由用户选择节点。

MVP 只开放回环地址上的 mixed proxy。mihomo TUN、默认路由、LAN 监听和系统 DNS 均关闭，WireGuard 保持分流路由和 DNS 所有权。订阅更新走 `DIRECT`，避免代理提供者通过自身形成回环。mihomo 更新失败只回滚或关闭 mihomo，不会拆除 WireGuard；WireGuard 失败也不会改写已验证的代理状态。

## 部署

本地 Docker 运行完整软件栈：

```bash
docker compose -f deploy/docker-compose.yaml --profile network-access up -d --build
```

原始 Kubernetes 清单位于 `deploy/network-runtime.yaml`，包含 control、ingest、WireGuard gateway 和所需持久卷。FreeRADIUS 配置位于 `deploy/freeradius/`。

Helm Chart 默认不创建网络运行时。只启用非特权 control/ingest 平面时配置：

```yaml
image:
  # 安装前先构建并导入此镜像。
  tag: local
networkRuntime:
  enabled: true
  existingTLSSecret: soha-network-runtime-tls
```

该 Secret 必须包含 `network-control.crt`、`network-control.key`、`ingest.crt`、`ingest.key` 和 `client-ca.crt`。Chart 会创建独立 ingest PostgreSQL。高权限 gateway 与 FreeRADIUS/NAS adapter 继续使用版本匹配的原始清单部署，以便管理员明确审查主机网络、UDP、`NET_ADMIN` 和 RADIUS shared secret。

## AI 与 CLI 验收

`network_access.*` Gateway 工具复用业务服务、权限、scope、审批和审计，不直接访问数据库或数据面。安装后的 CLI 可执行最小只读验收：

```bash
curl -fsS http://127.0.0.1:8080/readyz
soha version --json
soha diagnose --profile local --timeout 10s
soha capabilities --profile local --output names --timeout 10s
soha diagnose --profile local --tool network_access.sessions.list --timeout 10s
soha tool call network_access.sessions.list --profile local --input-json '{}' --timeout 10s
```

工具缺失时先检查角色权限、资源 scope、MCP tool grant 和当前 AI client context。创建授权、撤销会话或执行 CoA/Disconnect 属于变更操作，应先预览并保留审批与审计链。

## 尚需实体环境验收

软件测试不能替代以下门禁：

- 目标 Wi-Fi AP 与有线交换机/NAS 的真实准入和降级验证。
- Windows 设备上 WireGuard、mihomo、SCM、Named Pipe、DPAPI 与 Linux gateway 的端到端验证。
- 公司物理网络对 `tunnel_required` 资源的旁路阻断验证。

这些项目通过前，不应把实体网络兼容性或旁路关闭标记为完成。
