---
title: 第一次部署
description: 启动第一个自托管 Soha 控制平面，并验证 health、readiness、登录 provider 和文档链接。
---

# 第一次部署

使用已发布的 Core 镜像启动本机 Soha 控制平面。镜像同时提供 API 和内嵌的 Web 控制台。源码构建和 Kubernetes 安装见 [部署指南](../operations/deployment.md)。

## 前置条件

安装 Docker 和 Compose 插件。在用于克隆 Core 仓库的目录中执行以下命令。

## 启动 Stack

```bash
git clone --branch v0.1.12 --depth 1 https://github.com/opensoha/soha.git
cd soha
SOHA_IMAGE=ghcr.io/opensoha/soha:v0.1.12 \
  docker compose -f deploy/docker-compose.yaml up -d --no-build --wait soha
```

Compose 启动 PostgreSQL 和 Core，挂载 `configs/config.example.yaml`，默认只通过回环地址提供访问。开放外部访问前，按 [配置指南](../operations/configuration.md) 更换初始凭据和系统密钥。

## 验证控制平面

Health 和 readiness 都应该返回成功：

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
```

再检查 login-provider 边界是否可达：

```bash
curl -fsS http://localhost:8080/api/v1/auth/providers
```

这个检查对应的 API reference 名称是 `GET /api/v1/auth/providers`。

## 预期输出形状

具体值取决于本地配置。健康的本地 stack 应该输出类似形状：

Fixture artifact: [`first-deploy.expected.txt`](/tutorial-fixtures/first-deploy.expected.txt)

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
curl -fsS http://localhost:8080/api/v1/auth/providers
```

```json
{"postgres": "ok", "status": "ok"}
{"status": "ready"}
{"items": [{"type": "password", "id": "password", "name": "Password", "enabled": true}]}
```

## 验证 Console 和文档链接

打开 `http://localhost:8080/`。默认本地 bootstrap 账号是：

```text
username: opensoha
password: opensoha
```

Console 内的文档入口会打开 `/docs/`。release 模式下，`soha` 会把这个路径重定向到配置的外部文档地址，再由 Nextra locale proxy 路由到 `/zh/docs/...` 或 `/en/docs/...`。文档站本身按 [Docs Publishing](../operations/docs-publishing.md) 描述的托管流程独立发布。

## 验收标准

- `curl -fsS http://localhost:8080/healthz` 返回健康状态。
- `curl -fsS http://localhost:8080/readyz` 返回 ready 状态。
- `GET /api/v1/auth/providers` 至少返回一个启用的 provider。
- Console 可以加载，不需要额外启动 frontend dev server。

## 验证范围

以上检查覆盖 Core、PostgreSQL、登录提供方和 Web 控制台。安装了额外运行时的环境，应在开放流量前单独验证这些运行时。
