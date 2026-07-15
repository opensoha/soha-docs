# Database Migrations

SQL migrations now use a driver-scoped layout under `migrations/<driver>/`.

- Canonical PostgreSQL bootstrap migration: `migrations/postgres/0001_init.sql`
- Incremental PostgreSQL migrations: `migrations/postgres/0002_*.sql` and later
- PostgreSQL compatibility baseline: 18.4 with pgvector 0.8.5

## Rules

- `0001_init.sql` owns the fresh-install schema baseline
- fresh database initialization should succeed by executing the full sorted `migrations/postgres/*.sql` history
- the bootstrap file and the full `migrations/postgres/*.sql` history should remain executable against PostgreSQL 18.4 with pgvector available
- `schema_migrations` tracks executed filenames, so existing databases receive only new incremental files
- schema changes should still remain backward-compatible during rollout

`0017_postgres_vector.sql` enables the `vector` extension. External database administrators must install pgvector before migration and create the extension themselves when the application migration user lacks extension privileges.

`0018_postgres_search_observability.sql` enables `pg_trgm`. It creates `pg_stat_statements` only when the server preloaded the module and the migration user is a superuser. External database administrators can enable and create `pg_stat_statements` later without affecting Soha startup.

## Initial Migration

The bootstrap migration creates:

- identity tables
- access and policy tables
- cluster registry tables
- audit and event tables
- AI workbench tables
- delivery orchestration tables
- announcement receipt and port-forward tables
- build, deploy, notification, and runtime support tables

It does not seed the default login account. The bootstrap user is created by backend startup from `auth.dev_principal`, and the current repository baseline is `admin / soha` only.
