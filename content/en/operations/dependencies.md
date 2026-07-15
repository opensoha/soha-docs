# Dependencies

## PostgreSQL

Current deployment baseline: PostgreSQL 18.4 with pgvector 0.8.5. Bundled installs use `pgvector/pgvector:0.8.5-pg18-trixie`, enable `vector` and `pg_trgm`, and preload `pg_stat_statements`. External databases must provide `vector` and `pg_trgm`; `pg_stat_statements` is optional.

PostgreSQL is the durable store for:

- users, teams, projects
- roles, policies, policy bindings
- clusters and credential metadata
- audit logs and operation logs
- event stream and future delivery records
- saved views and user preferences
