# 插件权限模型

插件权限模型的核心规则是：插件只能声明 requested permissions 和 secret requirements，不能给自己授权。

## 管理权限

插件管理建议使用这些权限键：

```text
plugin.view
plugin.install
plugin.manage
plugin.configure_secrets
plugin.publish
```

`plugin.view` 允许查看市场和已安装插件。安装、启用、停用、升级、移除和 secret 配置应分别受更高权限控制。

## 声明不等于授权

manifest 中的权限声明只表达插件希望访问的能力。例如：

```yaml
permissions:
  required:
    - ai.gateway.view
    - ai.gateway.invoke
  domain:
    - workspace.resource.view
secrets:
  required:
    - name: provider_api_key
      description: External provider API key
```

实际可用能力必须由以下控制共同计算：

- 当前用户或 service account 的 RBAC 权限。
- tool grants。
- access policies。
- skill bindings。
- Gateway approval guardrails。
- resource scopes。
- secret references。
- audit 和 redaction 策略。

## 高风险能力

当插件声明 mutate、execute、高权限 connector、外部 provider key 或高成本模型调用能力时，安装界面和 CLI 应要求管理员显式确认。确认记录应进入审计日志。

插件不能绕过 Soha Gateway 直接访问受保护资源。所有调用必须终止在 Soha Gateway、受控 connector API、MCP server 或已声明的外部进程边界。
