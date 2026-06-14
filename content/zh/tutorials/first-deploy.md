---
title: 第一次部署
description: 启动第一个自托管 Soha 控制平面，并验证 health、readiness、登录 provider 和文档链接。
---

# 第一次部署

本教程是自托管 Soha 控制平面的冷启动路径。命令需要在相邻的 `soha` 仓库中执行，不是在 `soha-docs` 目录中执行。

## 前置条件

- Docker 和 Compose 可用。
- `soha` 仓库已经 checkout 到 `soha-docs` 的同级目录。
- 本地 shell history 中不要写入生产 secret。

## 启动 Stack

```bash
cd ../soha
docker compose -f deploy/docker-compose.yaml up -d --build
```

Compose stack 负责 PostgreSQL 和 API 容器。全新的本地安装会使用仓库 `configs/` 下的配置，并 seed [配置](../operations/configuration.md) 中记录的 bootstrap 账号。

## 验证控制平面

Health 和 readiness 都应该返回成功：

```bash
curl -sS http://localhost:8080/healthz
curl -sS http://localhost:8080/readyz
```

再检查 login-provider 边界是否可达：

```bash
curl -sS http://localhost:8080/api/v1/auth/providers
```

这个检查对应的 API reference 名称是 `GET /api/v1/auth/providers`。

## 预期输出形状

具体值取决于本地配置。健康的本地 stack 应该输出类似形状：

Fixture artifact: [`first-deploy.expected.txt`](/tutorial-fixtures/first-deploy.expected.txt)

```bash
curl -sS http://localhost:8080/healthz
curl -sS http://localhost:8080/readyz
curl -sS http://localhost:8080/api/v1/auth/providers
```

```json
{"status": "ok"}
{"ready": true}
{"providers": [{"id": "password", "type": "password", "enabled": true}]}
```

## 验证 Console 和文档链接

打开 `http://localhost:8080/`。默认本地 bootstrap 账号是：

```text
username: admin
password: soha
```

Console 内的文档入口会打开 `/docs/`。release 模式下，`soha` 会把这个路径重定向到配置的外部文档地址，再由 Nextra locale proxy 路由到 `/zh/docs/...` 或 `/en/docs/...`。文档站本身按 [Docs Publishing](../operations/docs-publishing.md) 描述的托管流程独立发布。

## 验收标准

- `curl -sS http://localhost:8080/healthz` 返回健康状态。
- `curl -sS http://localhost:8080/readyz` 返回 ready 状态。
- `GET /api/v1/auth/providers` 至少返回一个启用的 provider。
- Console 可以加载，不需要额外启动 frontend dev server。

## 已知缺口

本教程只验证本地控制平面。它还不证明 signed release artifact、Helm install、Docker image CI smoke 或生产回滚路径。
