import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  mainSidebar: [
    "index",
    {
      type: "category",
      label: "介绍",
      link: {
        type: "doc",
        id: "product/what-is-soha",
      },
      items: [
        "product/what-is-soha",
        "product/self-hosted-vs-cloud",
      ],
    },
    {
      type: "category",
      label: "自托管 Soha",
      link: {
        type: "doc",
        id: "self-hosted/index",
      },
      items: [
        "self-hosted/index",
        "operations/deployment",
        "operations/configuration",
        "operations/environment-variables",
        "operations/agent-runtime",
        "operations/ai-gateway-examples",
        "operations/mcp",
        "operations/mcp-configuration",
      ],
    },
    {
      type: "category",
      label: "Soha Cloud",
      link: {
        type: "doc",
        id: "cloud/index",
      },
      items: [
        "cloud/index",
      ],
    },
    {
      type: "category",
      label: "市场",
      link: {
        type: "doc",
        id: "marketplace/index",
      },
      items: [
        "marketplace/index",
        "marketplace/installing-plugins",
        "marketplace/plugin-permissions",
      ],
    },
    {
      type: "category",
      label: "架构",
      link: {
        type: "doc",
        id: "architecture/index",
      },
      items: [
        "architecture/application-delivery",
        "architecture/delivery-devops-workbench",
        "architecture/monitoring-and-alerting",
        "architecture/authorization",
        "architecture/login-and-identity",
        "architecture/ai-copilot",
        "architecture/ai-gateway",
        "architecture/agent-protocol",
        "architecture/multi-cluster-model",
        "architecture/event-model",
        "architecture/audit-model",
        "architecture/mcp-integration",
        "architecture/access-model",
      ],
    },
    {
      type: "category",
      label: "开发",
      items: [
        "development/local-development",
        "development/frontend-structure",
        "development/backend-structure",
        "development/configuration",
        "development/database-migrations",
        "development/add-resource-module",
        "development/add-page",
        "development/add-mcp-integration",
      ],
    },
    {
      type: "category",
      label: "API 与 Contracts",
      link: {
        type: "doc",
        id: "api/contracts",
      },
      items: [
        "api/contracts",
        "api/overview",
        "api/core-endpoints",
        "api/auth-and-errors",
      ],
    },
    {
      type: "category",
      label: "运维",
      items: [
        "operations/configuration",
        "operations/role-authorization-assignment",
        "operations/agent-runtime",
        "operations/virtualization-lab-runbook",
        "operations/soha-cli",
        "operations/ai-gateway-examples",
        "operations/deployment",
        "operations/environment-variables",
        "operations/dependencies",
        "operations/docs-publishing",
        "operations/mcp",
        "operations/mcp-configuration",
      ],
    },
    {
      type: "category",
      label: "治理",
      link: {
        type: "doc",
        id: "governance/index",
      },
      items: [
        "governance/index",
        "architecture/authorization",
        "architecture/access-model",
        "architecture/audit-model",
        "operations/role-authorization-assignment",
      ],
    },
    {
      type: "category",
      label: "路线图",
      items: ["roadmap/index"],
    },
    {
      type: "category",
      label: "参考",
      items: [
        "reference/product-information-architecture",
        "reference/database-schema",
      ],
    },
  ],
};

export default sidebars;
