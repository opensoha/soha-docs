---
title: 第一次交付
description: 创建或接入应用、绑定环境、确认交付计划，并查看 execution task 状态。
---

# 第一次交付

本教程在控制平面边界定义第一条交付路径。它刻意保持保守：API 可以记录 application、release bundle、workflow run 和 execution task；真实 build/deploy 执行仍依赖已配置的 runner 和 provider。

## 前置条件

- 已按 [第一次部署](./first-deploy.md) 启动 Soha 控制平面。
- 如果 deploy 目标是 Kubernetes，需要先按 [第一次接入集群](./first-cluster.md) 注册集群。
- 有一个具备 delivery 权限的 access token。
- 如果期望 execution task 不停留在 queued 或 disabled 状态，需要先配置 runner/provider。

## 创建应用

先创建 application 记录：

```bash
export SOHA_SERVER=http://localhost:8080
export SOHA_TOKEN=replace-with-access-token

curl -sS -X POST "$SOHA_SERVER/api/v1/applications" \
  -H "Authorization: Bearer $SOHA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "billing-api",
    "ownerTeam": "platform",
    "repositoryUrl": "https://git.example.com/platform/billing-api"
  }'
```

API reference 名称是 `POST /api/v1/applications`。控制台入口为 **应用交付 → 应用中心 → 创建 / 接入应用**；后续增量服务只在应用详情的 **服务** Tab 新增。

## 绑定环境

进入应用详情的 **环境** Tab，从 **平台配置 → 环境目录** 选择一个环境并建立绑定。环境目录是可复用的平台库存；应用环境绑定才保存本应用的目标和发布策略。

记录返回的应用环境绑定 ID，下一步创建交付计划时使用。

## 创建并确认交付计划

`DeliveryPlan` 是 build、deploy、workflow、verify 和 rollback 的唯一用户可见交付意图。

```bash
curl -sS -X POST "$SOHA_SERVER/api/v1/delivery/plans" \
  -H "Authorization: Bearer $SOHA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-1",
    "applicationEnvironmentId": "binding-1",
    "action": "build_deploy",
    "source": "manual",
    "refType": "branch",
    "refName": "main"
  }'

curl -sS -X POST "$SOHA_SERVER/api/v1/delivery/plans/plan-1/confirm" \
  -H "Authorization: Bearer $SOHA_TOKEN"
```

API reference 名称是 `POST /api/v1/delivery/plans` 与 `POST /api/v1/delivery/plans/{planID}/confirm`。旧 build、workflow、release trigger 端点继续作为兼容 API 保留，不再形成额外的控制台写入口。

## 通过 AI Gateway 触发

启用 delivery 的 AI Gateway 后，受控 action tool 是 `delivery.actions.trigger`。它仍然会回到 delivery application service，并可能返回 `pending_approval`、`pending_human_confirm`、`dry_run`、disabled 或 queued execution 状态。

```bash
soha tool call delivery.actions.trigger \
  --profile gateway-admin \
  --input-json '{"applicationId":"app-1","applicationEnvironmentId":"binding-1","action":"build_deploy"}'
```

## 查看 Execution Task

```bash
curl -sS "$SOHA_SERVER/api/v1/delivery/execution-tasks?applicationId=app-1&limit=20" \
  -H "Authorization: Bearer $SOHA_TOKEN"
```

API reference 名称是 `GET /api/v1/delivery/execution-tasks`。

## 预期输出形状

新环境中的 runner/provider 状态可能是 disabled、queued 或 pending approval。持久化 API 响应仍应包含 application 和 task 身份：

Fixture artifact: [`first-delivery.expected.txt`](/tutorial-fixtures/first-delivery.expected.txt)

```bash
POST "$SOHA_SERVER/api/v1/applications"
POST "$SOHA_SERVER/api/v1/delivery/plans"
POST "$SOHA_SERVER/api/v1/delivery/plans/plan-1/confirm"
GET "$SOHA_SERVER/api/v1/delivery/execution-tasks?applicationId=app-1&limit=20"
```

```json
{"item": {"id": "app-1", "name": "billing-api", "ownerTeam": "platform"}}
{"item": {"id": "plan-1", "applicationId": "app-1", "applicationEnvironmentId": "binding-1", "status": "draft"}}
{"item": {"plan": {"id": "plan-1", "status": "confirmed"}, "result": {"executionTaskId": "task-1", "status": "queued"}}}
{"items": [{"id": "task-1", "taskKind": "build", "status": "queued"}]}
```

## 验收标准

- application 记录能从 application list 或 detail API 看到。
- DeliveryPlan 确认返回持久记录、queued execution task，或清晰的 disabled/unsupported 状态。
- 可以查看 execution task 状态，不需要读取 runner 本地文件。

## 已知缺口

本教程不声称 delivery runner 已经生产可用。要完成一次真实 build/deploy，还需要配置 provider、runner claim/callback、artifact metadata 和 cluster target credentials。
