# 数据库迁移

SQL 迁移脚本按数据库驱动分目录维护在 `migrations/<driver>/` 下：

- PostgreSQL 初始基线迁移脚本：`migrations/postgres/0001_init.sql`
- PostgreSQL 增量迁移脚本：`migrations/postgres/0002_*.sql` 及后续编号文件
- PostgreSQL 兼容性基线：PostgreSQL 18.4（配套 `pgvector` 0.8.5）

## 迁移规范

- `0001_init.sql` 维护全新安装的数据库表结构基线
- 全新数据库初始化应能够按文件名排序完整执行 `migrations/postgres/*.sql` 全部迁移历史
- 初始基线脚本与全量 `migrations/postgres/*.sql` 历史必须在安装了 `pgvector` 的 PostgreSQL 18.4 上可顺利执行
- `schema_migrations` 表记录已执行的脚本文件名，因此存量数据库升级时仅按序执行新增的增量迁移文件
- 表结构演进在灰度滚动升级期间应保持向后兼容

`0017_postgres_vector.sql` 用于启用 `vector` 扩展。若应用使用的数据库迁移账号不具备创建扩展的权限，外部数据库管理员必须在运行迁移前预先安装 `pgvector` 并手工创建该扩展。

`0018_postgres_search_observability.sql` 用于启用 `pg_trgm` 扩展，且仅当数据库实例已预加载 `pg_stat_statements` 模块且迁移账号具备超级用户权限时才会自动创建 `pg_stat_statements`。外部数据库管理员也可在后续单独开启并创建 `pg_stat_statements`，不会影响 Soha 正常启动。

## 初始基线覆盖范围

初始基线迁移脚本负责创建以下核心数据表：

- 身份认证与会话表
- 访问控制与策略表
- 集群注册表与凭据元数据表
- 审计日志与统一事件流表
- AI 工作台与分析运行表
- 应用交付与编排表
- 系统公告回执与端口转发表
- 构建、部署、通知渠道与运行时支撑表

迁移脚本本身不会直接插入默认登录账号。初始管理员账号由后端启动流程读取配置（如 `auth.dev_principal` 等初始化配置）按需创建；早期开发配置基线示例为 `admin / soha`。
