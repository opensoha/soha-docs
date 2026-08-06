# 权限模型

Soha 使用精确 RBAC 权限键，并与 ABAC、Scope Grant 组合。Web、OpenAPI、CLI、MCP、Skills 和 AI Gateway 最终都进入同一条服务端授权决策链。

## 权限契约

可授权权限采用稳定格式 `<domain>.<resource>.<action>`，例如：

- `virtualization.vms.view`
- `virtualization.vms.create`
- `virtualization.vms.resize`
- `virtualization.vms.delete`
- `platform.pods.logs`
- `platform.pods.exec`

`@opensoha/contracts` 的 `auth/permission-catalog.json` 是权限定义真实源，服务端通过 `GET /api/v1/access/permissions` 返回同一目录。每条定义包含显示名称、风险等级、支持的范围类型、审批策略、状态、是否可分配以及兼容别名。

角色只在 `permissionKeys` 中保存精确权限。历史 `capabilities` 字段和已被替代的粗粒度 `*.manage` 只用于迁移兼容：角色编辑器会只读展示并原样回传，但新授权只能选择目录中的精确权限。

## 决策链

资源所属的应用服务按以下顺序判断：

1. 鉴权并加载主体的持久化角色权限。
2. 与 PAT 或服务账号 Token 的权限上限求交集。
3. 校验精确权限键；迁移期内，目录声明的旧别名可以兼容满足该权限。
4. 使用主体、目标资源和请求上下文执行 ABAC deny/allow。
5. 使用 Scope Grant 继续收窄可操作范围。
6. 需要审批时返回 `approval_required`，不直接执行。
7. 再与模块启用状态、Provider/Agent 能力和资源生命周期状态求交集。
8. 变更前立即复核，并记录允许、拒绝或审批挂起审计。

ABAC 拒绝或 Scope 不匹配始终优先。Provider 支持与资源状态只能减少动作，不能授予权限。

## 菜单、页面与动作

角色编辑器按 `工作台 -> 菜单/页面 -> 页面动作` 展示权限。这个层级只负责浏览和批量选择，不是安全标识。

- 页面查看权限决定路由访问和菜单派生。
- 每个按钮或 API 操作使用页面所属资源的精确动作权限。
- 勾选父级会展开为当前列出的精确子权限，不保存通配符。
- 未知键和旧权限键保留在只读兼容分组中。
- 原“全局资源动作”不再是可分配权限域。

后端过滤后的 `visibleMenuIds` 决定导航入口。前端路由和按钮校验用于改善体验，后端服务仍是最终授权点。

## 资源动作

列表与详情 API 可以返回 `allowedActions`。它是权限、范围、运行时能力、资源状态和审批状态求交后的最终动作集合。

例如，一个虚拟机角色可以拥有 `view`、`create`、`resize`，但没有 `delete`。如果当前 Provider 不支持扩容，即使角色拥有 `resize`，返回的 `allowedActions` 仍会移除该动作。即使按钮可见，变更 API 也会重复同一授权检查。

## AI 与自动化调用

MCP 与 Skills manifest 中的权限键和范围只用于发现与预检，不代表执行授权。

- CLI 只发送服务端签发的 Token 与目标资源范围，不自行声明权限。
- AI Gateway 调用同时需要 `ai.gateway.invoke` 和业务资源权限。
- Tool Grant、Access Policy、Skill Binding 只能继续收窄权限。
- 高风险调用可以先进入审批挂起，再由所属服务执行。
- 直接 HTTP、CLI 和 MCP 调用复用同一应用服务权限与审计路径。

Gateway 管理按资源拆分，包括 `ai.gateway.clients.manage`、`ai.gateway.tokens.manage`、`ai.gateway.grants.manage`、`ai.gateway.policies.manage`、`ai.gateway.skills.manage` 和 `ai.gateway.approvals.manage`。旧 `ai.gateway.manage` 仅作为兼容状态存在。

## 决策结果

```json
{
  "status": "allow",
  "permissionKey": "virtualization.vms.resize",
  "action": "resize",
  "resource": {
    "type": "VirtualMachine",
    "id": "vm-42"
  },
  "allowedActions": ["view", "resize"],
  "reasonCode": "authorized",
  "policyVersion": "2026-08-05"
}
```

## 存储与所有权

- `roles.permission_keys` 保存精确权限。
- `policies` 保存 ABAC 规则。
- `scope_grants` 保存主体到资源范围的附加收窄。
- Token 权限上限限制 PAT 与服务账号。
- operation 与 audit 记录变更和授权结果。

`soha-contracts` 负责公共目录与决策结构；`internal/application/access` 负责公共权限、ABAC 与范围组合；各领域服务负责资源属性、运行时状态、审批上下文和最终变更校验。

实际分配步骤见[角色授权分配](../operations/role-authorization-assignment.md)。
