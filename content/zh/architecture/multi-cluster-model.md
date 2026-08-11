# 多集群模型

## 集群注册模型

每个集群包含：

- PostgreSQL 中的持久化元数据
- PostgreSQL 中的凭据元数据
- 通过外部 Secret Provider 引用或受保护保存的敏感材料
- 由 cluster-manager 管理的运行时连接

## 连接策略

当前运行时支持两种连接模式：

- `direct_kubeconfig`
  - 从 `config.yaml` 引导，或通过集群 API 注册
  - 支持显式选择 context
  - 为每个集群构建 typed、dynamic 和 discovery client
  - 注册后动态启动 informer/cache reader
- `agent`
  - 使用基于 Soha 访问地址生成的短有效期 Manifest 安装
  - 由内网集群主动与 Soha 建立长连接
  - 通过该连接传输有边界的资源清单、日志、流和受控操作

后续可以扩展：

- 加密凭据存储
- 云厂商认证插件
- Service Account 联邦
- 工作负载身份联邦

## 健康与能力发现

cluster-manager 应定期采集：

- API 可达性
- Kubernetes 版本
- 可用的 API Group 和 Resource
- 可选指标能力
- 最近一次成功同步时间

## Client 生命周期

对于 Direct 集群，cluster-manager 维护每个集群的 client bundle：

- `kubernetes.Interface`
- `dynamic.Interface`
- `discovery.DiscoveryInterface`
- shared informer factory handle

生命周期规则：

- 首次使用或引导时延迟初始化
- 凭据变化或注册新的 Direct 集群时刷新
- 展示最近一次错误状态
- 删除集群时关闭 cache

对于 Agent 集群，Soha 在 PostgreSQL 中保存持久化注册信息，并通过已建立的反向长连接路由请求，而不是在控制平面创建本地 `client-go` bundle。当 Agent RBAC 或控制平面到 Prometheus 的网络限制某项能力时，以能力矩阵为最终依据。
