# 依赖

## PostgreSQL

当前部署基线为 PostgreSQL 18.4 与 pgvector 0.8.5。内置安装使用 `pgvector/pgvector:0.8.5-pg18-trixie` 镜像，启用 `vector` 和 `pg_trgm` 扩展，并预加载 `pg_stat_statements`。外部数据库必须提供 `vector` 和 `pg_trgm`；`pg_stat_statements` 为可选项。

PostgreSQL 作为以下数据的持久化存储：

- 用户、团队与项目
- 角色、策略与策略绑定
- 集群与凭据元数据
- 审计日志与操作日志
- 事件流与后续交付记录
- 已保存视图与用户偏好设置
