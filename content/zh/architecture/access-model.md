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

## Docker 卷文件（候选组合）

候选 Core 将卷挂载元数据与文件内容分开授权：`docker.services.view` 允许查看挂载元数据，目录枚举与文件预览需要独立的 `docker.services.files`。`view`、旧 `manage` 和旧 `actions` 不会自动展开为文件权限。

默认 `ops`、`developer` 角色明确包含文件权限；自定义角色需要单独授予。PAT/服务账号 Key 仍与当前角色权限取交集：只含 `view` 或旧 `manage` 的 Key 不会因角色增加 `files` 而自动取得文件内容。Web 卷文件入口同时要求服务查看和文件权限；仅持有文件权限的调用者仍可使用已授权的文件 API。

这项说明对应候选 Core 与同版权限目录，尚未发布；既有版本的文件权限边界可能不同。它不表示 CLI 已提供卷文件命令。

## 范围属性

ABAC 与 Scope Grant 可以使用用户、组织、项目、租户/工作区、应用、环境、集群、命名空间、资源标识、标签、所有者、请求来源和审批状态。

只有精确 RBAC 权限但没有匹配范围时仍然拒绝；只有匹配范围但没有精确 RBAC 权限时同样拒绝。

## 运行时结果

需要行级按钮控制的资源 API 会返回 `allowedActions`。所属服务计算这个集合，并在真正变更前重复授权。前端可见性不能替代后端校验。

完整决策链、兼容规则和多调用面保证见[权限模型](./authorization.md)。
