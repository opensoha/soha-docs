# Operator Runbooks

本页是 OpenSoha 运维人员处理托管运行面问题的入口。所有检查都应优先通过公开 API、`soha` CLI、runner callback、审计和治理视图完成；不要绕过 Gateway 直接使用数据库、Kubernetes、Docker 或 runner 私有状态作为常规排障路径。

## 通用排障入口

先确认 CLI profile、当前身份和 Gateway 可见能力：

```bash
soha profile show local
soha context show --profile local
soha capabilities --profile local --output names
soha diagnose --profile local --tool k8s.pods.logs
```

记录每个请求的 request id、actor、AI client、skill、tool、cluster、namespace、application 和 approval request id。后续排查应能在 audit、approval timeline、runner callback 或 operation evidence 中关联这些字段。

## Agent Fleet

适用场景：托管 Agent 或自托管 remote agent 无法读取集群、能力矩阵显示 `unsupported` / `partial`、runner heartbeat 过期、Agent 版本不满足 capability 要求。

检查顺序：

1. 查看平台能力矩阵：

   ```bash
   soha capabilities --profile local --domain platform --output json
   soha diagnose --profile local --cluster-capability kubernetes.logs.stream
   ```

2. 核对 `direct.status` 与 `agent.status`，确认是否为真实产品边界，而不是前端禁用态。
3. 检查 `requiredAgentVersion`、`requiredScopes`、`riskLevel` 和 `requiresApproval`。
4. 如果是 runner 任务问题，使用 Agent Runtime claim/callback 日志和 operation lifecycle evidence 关联 `agentId`、`runnerId`、`operationId`。
5. 如果 Agent 已下线或版本过旧，先降级为只读诊断能力；不要把写操作改走 Direct 模式绕过审批。

恢复动作：

- 重新注册或升级 Agent 后，重新读取 capability matrix。
- 对高风险能力重新执行 `soha diagnose`，确认审批和 scope 提示仍然存在。
- 将修复记录写入对应 audit 或 incident 备注，保留 request id。

## Connector Runtime

适用场景：外部消息或 webhook 已到达 provider，但 Soha 没有事件、action 没有回调、连接器重复投递、死信队列增长。

检查顺序：

1. 确认连接器 manifest 中声明了 event 类型、action 和 secret refs。
2. 校验事件是否符合 `connectors/connector-event-envelope.schema.json`，每批事件必须有 `connectorId` 和 `events`。
3. 用 connector event id 或 provider message id 检查幂等键，重复事件应被识别为 replay，而不是写入多条业务事件。
4. 查看 connector runtime 指标：retry count、dead letter count、action latency、last successful delivery。
5. 在 Gateway audit 中按 connector id、action、subject 或 request id 查询关联操作。

恢复动作：

- provider 临时失败时使用 retry/backoff，不手工重放未确认幂等键的 payload。
- 死信事件重新投递前先导出脱敏 payload、失败原因和最后一次响应码。
- secretRef 失效时只轮换 secret，不把明文写入 manifest、日志或 issue。

## Delivery Runner

适用场景：发布卡在 queued/running、callback timeout、runner claim 不到任务、rollback 没有证据、artifact 缺失。

检查顺序：

1. 确认 runner token 配置：

   ```yaml
   runtime:
     execution_runner_token: demo-execution-runner-token
   ```

2. 通过 runner-facing API 检查任务 claim、runner-status 和 callback 是否正常：

   ```http
   POST /api/v1/delivery/execution-tasks/claim
   GET  /api/v1/delivery/execution-tasks/:taskID/runner-status
   POST /api/v1/delivery/execution-callbacks
   ```

3. 核对 operation lifecycle：`claimed`、`heartbeat`、`cancel_requested`、`cancelled`、`timed_out`、`succeeded`、`failed`、`late_callback_ignored`。
4. 查找失败证据：provider log、event、artifact、callback payload、approval 和 user action。
5. 如果 callback 已超时，后续 late callback 只能作为 evidence，不能覆盖已落库终态。

恢复动作：

- runner 进程恢复后先确认 claim 不会重复执行已终态任务。
- rollback 必须走 delivery workflow 或审批后的业务 action，不能由 runner 本地脚本私自修改生产环境。
- 缺失 artifact 时补写 evidence 摘要，不补写未经脱敏的 provider 原始日志。

## AI Gateway Approval And Governance

适用场景：高风险 tool 被拒绝、approval 卡住、governance health 降级、rate limit/budget/redaction 告警。

检查入口：

```bash
soha governance status --profile local --window-hours 24
soha audit list --profile local --tool-name delivery.actions.trigger --limit 20
soha approval list --profile local --status pending
soha approval timeline approval-123 --profile local
```

处理顺序：

1. 先看 governance health check，确认是否是 `approval_sla_due_soon`、`stale_gateway_approvals`、`high_risk_allow_without_approval`、`high_risk_grant_without_resource_scope` 或 redaction 命中。
2. 进入 approval timeline，核对当前阶段、候选人、角色/团队 quorum、change window、on-call routing 和 pending requirements。
3. 查同一 `approvalRequestId` 的 audit，确认原始 actor、AI client、skill、tool、risk level、resource scope 和 request id。
4. 批准后 replay 仍必须重新经过 Gateway policy 和 owning service 授权；批准记录不等于永久授权。
5. 拒绝、取消、超时都应写 audit，并在 incident 或 change 记录里保留原因。

恢复动作：

- 缺少 Gateway 审批防护时，先添加 require-approval / human-confirm / dry-run guardrail，再重新触发请求。
- 缺少 resource scope 时，补 policy 或 grant 的 cluster、namespace、application、environment 约束。
- redaction 误杀时调整 allow fields 或规则范围，不关闭全局脱敏。
