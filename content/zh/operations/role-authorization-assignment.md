# 角色授权分配

通过角色编辑器分配页面所属的精确动作权限，不再维护第二套“全局资源动作”。

## 分配流程

1. 明确目标页面和用户真正需要的动作。
2. 在“访问控制 > 角色”中打开目标角色。
3. 按 `工作台 -> 菜单/页面 -> 页面动作` 逐级进入。
4. 只选择需要的精确动作。
5. 为目标应用、环境、集群、命名空间、项目或资源配置 ABAC 策略或 Scope Grant。
6. 将角色绑定到用户或服务身份。
7. 刷新会话或 Token，并同时验证一个允许动作和一个拒绝动作。

父级复选框只是批量选择器。选择页面或工作台会展开为当前可见的精确权限键，不会保存通配符或菜单授权。

## 最小权限示例

如果开发人员只需要查看、创建和调整虚拟机规格，而不能删除，分配：

- `workspace.resource.view`
- `virtualization.vms.view`
- `virtualization.vms.create`
- `virtualization.vms.resize`

不要分配 `virtualization.vms.delete`，并补充目标工作区或资源的 Scope Grant。最后确认创建和调整规格成功，而控制台、API 或 MCP 的删除调用均返回 403。

## 兼容权限

历史角色 `capabilities`、未知权限键，以及 `virtualization.vms.manage` 这类已替代的粗粒度权限，会显示在只读兼容分组中。保存角色会保留这些值，但不能新增选择。应按照 canonical catalog 中的替代关系逐步补齐精确权限。

## 验证

在权限快照中检查精确 `permissionKeys` 与后端过滤后的 `visibleMenuIds`。对于资源行，检查 `allowedActions`；动作缺失可能来自 RBAC、ABAC/Scope、审批、Provider 能力或资源状态。

每次授权变更至少验证：

- 目标页面可见；
- 目标动作执行成功；
- 一个明确排除的动作在界面中不可用，直接调用也返回 403；
- 超出授权范围的资源保持拒绝；
- 审计记录包含请求与决策结果。

CLI、MCP 和 Skills 不使用独立授权。它们携带服务端签发的 Token 和目标范围，最终进入与 Web、OpenAPI 相同的资源所属应用服务。

完整决策链见[权限模型](../architecture/authorization.md)。
