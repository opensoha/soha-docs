---
title: 第一次安装插件
description: 查看 marketplace plugin manifest，通过受控插件 API 安装，并在启用前验证权限。
---

# 第一次安装插件

插件安装是管理员操作。plugin manifest 会声明身份、包来源、权限、依赖、入口点和可选 skills；它不会自动授予自己访问权限。Soha 仍然会执行 RBAC、Gateway grant、access policy、approval、audit 和 secret 管理。

## 前置条件

- 已按 [第一次部署](./first-deploy.md) 启动 Soha 控制平面。
- 有一个具备 plugin-management 权限的 administrator profile。
- 控制平面已经配置 marketplace source。

## 查看 Marketplace 条目

```bash
soha plugin search
soha plugin show <id>
```

API reference 名称是：

- `GET /api/v1/plugins/marketplace`
- `GET /api/v1/plugins/marketplace/:pluginID`

安装前先检查 plugin manifest 中的字段：

- publisher
- version
- checksum 或 signature 状态
- requested permissions
- required secrets
- capability refs
- entry points

## 安装并启用

```bash
soha plugin install <id>
soha plugin list
soha plugin enable <id>
```

安装路径会 snapshot manifest 和 source metadata，避免 marketplace 后续变化静默改变已安装实例。

## 验证安装状态

```bash
soha plugin show <id>
```

直接使用 API 验证时，查看：

- `GET /api/v1/plugins/installed`
- `GET /api/v1/plugins/:pluginID`
- `GET /api/v1/plugins/:pluginID/manifest`

## 预期输出形状

Plugin 输出取决于配置的 marketplace。安装路径应区分 discovery、install 和 enablement：

Fixture artifact: [`first-plugin-install.expected.txt`](/tutorial-fixtures/first-plugin-install.expected.txt)

```bash
soha plugin search
soha plugin show <id>
soha plugin install <id>
soha plugin enable <id>
```

```text
id       name              version
demo     Demo Plugin       0.1.0
manifest: reviewed
installed: demo
enabled: demo
GET /api/v1/plugins/installed
```

## 验收标准

- 安装前 marketplace entry 可见。
- 安装前已经 review plugin manifest。
- Install 记录 version 和 source metadata。
- Enablement 与 installation 分离。
- 权限不足的用户看到 disabled actions，而不是含糊的 plugin 状态。

## 已知缺口

Plugin signing、provenance、compatibility matrix 和 rollback governance 仍是路线图工作。一次成功安装不能证明插件包已经达到生产可信。
