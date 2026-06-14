# 安装插件

插件安装是受控的管理操作。安装前应展示插件类型、publisher、版本、兼容性、权限声明、required secrets、capability refs、风险等级和 manifest 内容。

## 安装流程

1. 从 marketplace 查询插件。
2. 查看插件详情和 manifest。
3. 管理员确认 requested permissions、secret requirements 和风险提示。
4. 调用安装 API，Soha 记录 manifest 快照、来源、版本、checksum / signature 状态和审计事件。
5. 根据需要配置 secret 引用。
6. 启用插件。

## CLI

```bash
soha plugin search
soha plugin show <id>
soha plugin install <id>
soha plugin list
soha plugin enable <id>
soha plugin disable <id>
soha plugin upgrade <id>
soha plugin remove <id>
```

## Web

Web 控制台应提供：

- 插件市场列表和详情。
- 已安装插件列表和详情。
- 安装、启用、停用、移除。
- manifest JSON 查看。
- 安装前确认弹窗，明确插件声明不等于实际授权。

数据应尽量可见；当用户权限不足时，操作按钮禁用并说明原因，而不是让用户无法理解插件状态。

## 升级与移除

升级插件时必须重新读取并快照目标版本 manifest，避免 marketplace 后续变更静默影响已安装实例。移除插件时应保留必要审计记录，并清理 plugin-owned assets 或解除关联，不能绕过已有审批、审计和 secret 管理流程。
