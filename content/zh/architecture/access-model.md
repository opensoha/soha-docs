# 访问控制模型

Soha 的访问控制分开回答两个问题：

- RBAC 精确权限键回答主体**能做什么**。
- ABAC 策略与 Scope Grant 回答主体**可以在哪里、对哪个资源执行**。

最终服务端决策还会与 Token 权限上限、审批策略、模块状态、Provider/Agent 能力以及资源状态求交集。

## 基础角色

`admin`、`ops`、`developer`、`tester`、`readonly` 和 `auditor` 是启动时的默认角色。运行时以数据库中的持久化角色定义为准，管理员可以调整其精确权限。

## 精确动作

权限归属于资源，例如 `platform.pods.logs`、`platform.pods.exec`、`virtualization.vms.create` 或 `virtualization.vms.delete`。因此可以只允许创建、调整规格，而不允许删除。

菜单分组和“全部权限”只是编辑器批量操作，会展开为精确子权限，不产生通配符授权。

## 范围属性

ABAC 与 Scope Grant 可以使用用户、组织、项目、租户/工作区、应用、环境、集群、命名空间、资源标识、标签、所有者、请求来源和审批状态。

只有精确 RBAC 权限但没有匹配范围时仍然拒绝；只有匹配范围但没有精确 RBAC 权限时同样拒绝。

## 运行时结果

需要行级按钮控制的资源 API 会返回 `allowedActions`。所属服务计算这个集合，并在真正变更前重复授权。前端可见性不能替代后端校验。

完整决策链、兼容规则和多调用面保证见[权限模型](./authorization.md)。
