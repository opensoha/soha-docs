# 新增资源模块

1. 在 `internal/domain/resource` 下新增或扩展平台聚合 DTO 定义。
2. 在 `internal/infrastructure/kubernetes` 与 `internal/infrastructure/informer` 下扩展 Kubernetes 客户端访问或监听缓存读取实现。
3. 在 `internal/application/resource` 中实现资源查询或变更编排逻辑。
4. 通过 `internal/application/access` 接入统一的权限与资源范围校验钩子。
5. 在 `internal/api` 下注册 HTTP 处理器与路由映射。
6. 基于服务端聚合 DTO 在前端新增对应的列表表格、详情面板或筛选模块。
