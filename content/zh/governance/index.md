# 治理

Soha 的治理能力覆盖 RBAC、token、service account、AI Gateway policy、approval、audit、secret handling 和插件扩展控制。

## 原则

- 所有公开 API 都应在服务端完成鉴权。
- 读写操作按风险写入审计。
- AI Gateway 调用必须受 access policy、tool grant、skill binding、approval、rate / budget 和 redaction 控制。
- 插件声明不等于授权。
- secret 只能通过受控引用使用，不能直接散落到 manifest、审计日志或前端状态。

## 插件治理

插件安装、启用、停用、升级、配置和移除是治理操作。Soha core 必须记录 manifest 快照、来源、版本、checksum / signature 状态、声明权限和审计轨迹。

如果插件暴露 mutate、execute 或 high risk capability，应要求管理员显式确认，并通过 approval / audit 形成可追踪记录。

## 继续阅读

- [权限模型](../architecture/authorization.md)
- [访问模型](../architecture/access-model.md)
- [审计模型](../architecture/audit-model.md)
- [角色授权分配](../operations/role-authorization-assignment.md)
