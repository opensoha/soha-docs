# Architecture Entry

> **🚧 Translation in Progress**: This page is being translated from Chinese. Some sections may still contain Chinese text.

Repository-level engineering memory, architecture execution baseline, frontend and backend technical solutions, and feature designs have now been consolidated into `agents.md` at the repository root.

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

During engineering implementation, please prioritize `agents.md` at the repository root; for topic design and domain constraints, refer to the corresponding documents in this directory.

Additional conventions:

- Application groups, application environment tags, and application environment bindings are all carried by the application center. No independent business scope or global environment directory is retained.
- During the compatibility period, some permission keys, scope fields, and backend legacy data still use `delivery.*`, `businessLineId`, and `delivery_environments` naming, but they no longer represent independent user-maintainable master data entries.
