# Architecture Entry

> **🚧 Translation in Progress**: This page is being translated from Chinese. Some sections may still contain Chinese text.

Core and its six components share the Root `soha/.agents/skills/` development
rules. Independently owned repositories maintain their own skills. Cross-repository
ownership and dependency rules live in the OpenSoha workspace `AGENTS.md`.

This directory only retains public architecture documentation focused on domains and topics, and no longer duplicates the following engineering memory content:

- System layering overview
- Frontend engineering structure overview
- Backend engineering structure overview
- Engineering change rules and memory update rules

## Current Documentation Boundaries

This retains:

- Master data directory
- Application delivery
- Application delivery DevOps workbench
- Monitoring and alerting
- AI Copilot
- Soha AI Gateway
- Login and identity chain
- Agent protocol
- Permission model
- Multi-cluster model
- Event model
- Audit model
- MCP integration

During implementation, use the affected repository's skill as the execution
rule and the corresponding documents in this directory for public domain
design and constraints.

Additional conventions:

- The platform environment directory is reusable cluster/namespace/stage inventory. Application-environment bindings are maintained only in application detail and carry that application's targets and release policy.
- During the compatibility period, some permission keys, scope fields, and backend legacy data still use `delivery.*`, `businessLineId`, and `delivery_environments` naming, but they no longer represent independent user-maintainable master data entries.
