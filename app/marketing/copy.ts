// Keep in sync with content/{zh,en}/tutorials/first-deploy.md; scripts/verify-docs-drift.mjs checks this.
export const quickStartCommand = [
  'git clone --branch v0.1.13 --depth 1 https://github.com/opensoha/soha.git',
  'cd soha',
  'SOHA_IMAGE=ghcr.io/opensoha/soha:v0.1.13 \\',
  '  docker compose -f deploy/docker-compose.yaml up -d --no-build --wait soha',
].join('\n')

export const marketingCopy = {
  zh: {
    nav: ['文档', '菜单', '跳至主要内容'],
    eyebrow: 'Soha · 开源、自托管',
    title: ['解决中小企业', '运维难题'],
    lead: '为有自建业务的小团队，连接内网访问、资源管理、应用交付与问题调查。',
    start: '开始使用', docs: '阅读文档', source: '查看源代码',
    quickStart: {
      label: '快速开始', tool: 'Docker Compose', copy: '复制命令', copied: '已复制', failed: '复制失败',
      note: '启动 PostgreSQL 与 Soha，默认只监听本机。打开 localhost:8080 登录控制台；开放外部访问前，先更换初始凭据和系统密钥。',
      link: '查看完整步骤',
    },
    hostLabel: '部署在你的环境', hostTitle: '开源核心，自托管运行',
    hostLead: '保留对业务系统和运维环境的掌控。选择部署方式，再按需要接入资源与工具。',
    hostLink: '查看部署指南', community: 'OpenSoha 开源社区', license: 'Apache 2.0 许可证',
    preview: {
      eyebrow: '产品能力',
      heading: '围绕日常工作，连接运维能力',
      tabs: ['内网访问', '资源管理', '应用交付', '监控与 AI'],
      label: '探索 Soha 产品能力',
      titles: ['找到业务系统的访问入口', '从资源找到管理动作', '让应用、环境与交付任务对应', '从问题线索开始调查'],
      bodies: ['集中管理内网业务入口，让团队从这里访问自己的系统。', '管理 Kubernetes、虚拟机与 Docker 资源，保留操作记录。', '围绕应用与目标环境执行交付，查看过程与结果。', '结合日志、指标与告警，用受权限约束的 AI 工具辅助调查。'],
      points: [
        ['Wi-Fi/有线准入、WireGuard VPN 与 ZTNA', '同一套用户、设备与访问策略', '控制面只下发授权，不转发业务流量'],
        ['集群可直连，也可通过 Agent 主动连接', '内网集群无需对外暴露端口', '操作留下审计证据'],
        ['为应用绑定目标环境', '确认交付计划后再执行', '执行依赖已配置的 runner'],
        ['告警驱动的根因分析', '日志、事件、审计与发布记录合并为证据', '工具调用受权限与审批约束'],
      ],
      links: ['了解内网访问', '了解资源管理', '了解应用交付', '了解 AI 辅助调查'],
      diagrams: ['业务系统通过访问入口连接团队', '运行资源关联管理操作与审计记录', '应用关联环境与执行任务', '监控线索关联受控调查和审计记录'],
      access: ['业务系统', '内网服务', 'Soha 访问入口', '团队'],
      resources: ['Kubernetes', '虚拟机', 'Docker', '查看资源', '执行操作', '审计记录'],
      delivery: ['应用', '交付对象', '环境', '运行目标', '执行任务', '过程与结果', '关联每次变更的上下文'],
      investigation: ['日志', '指标', '告警', 'AI 辅助调查', '受控工具调用', '审计记录'],
    },
    steps: {
      eyebrow: '上手路径',
      heading: '从第一次部署到日常运维',
      items: [
        { title: '启动控制平面', body: '用 Docker Compose 在本机试跑，或用 Helm 安装到 Kubernetes。镜像内置 Web 控制台，不需要单独启动前端。', link: '第一次部署', href: '/docs/tutorials/first-deploy' },
        { title: '接入集群与资源', body: '使用 kubeconfig 直连，或在内网集群安装 Agent，由集群主动连接 Soha。', link: '第一次接入集群', href: '/docs/tutorials/first-cluster' },
        { title: '交付与调查', body: '为应用绑定环境并确认交付计划；出现告警时，结合日志与指标发起受控的 AI 调查。', link: '第一次交付', href: '/docs/tutorials/first-delivery' },
      ],
    },
    components: {
      label: 'Soha 组成部分',
      items: [
        { name: 'Soha Server', body: 'API、鉴权、RBAC、审计与内嵌 Web 控制台，单镜像交付。', href: '/docs/operations/deployment' },
        { name: 'Soha Agent', body: '运行在集群或主机内，主动连接控制平面，执行有边界的受控操作。', href: '/docs/tutorials/first-cluster' },
        { name: 'Soha CLI', body: '在命令行操作工作台资源，并提供 MCP stdio 入口。', href: '/docs/operations/soha-cli' },
        { name: 'Helm Charts', body: '在 Kubernetes 上安装 Soha、Agent 与 Operator。', href: '/docs/operations/deployment' },
        { name: 'Soha Operator', body: '可选组件，在集群内执行 WorkloadCronJob 自动化。', href: '/docs/operations/operator-runbooks' },
      ],
    },
  },
  en: {
    nav: ['Docs', 'Menu', 'Skip to main content'],
    eyebrow: 'Soha · Open source, self-hosted',
    title: ['Operations for', 'smaller teams'],
    lead: 'Connect access, resources, delivery, and investigation for your small or medium-sized business.',
    start: 'Get started', docs: 'Read the docs', source: 'View source',
    quickStart: {
      label: 'Quick start', tool: 'Docker Compose', copy: 'Copy command', copied: 'Copied', failed: 'Copy failed',
      note: 'Starts PostgreSQL and Soha on loopback only. Open localhost:8080 to sign in. Before exposing it, replace the initial credentials and system secrets.',
      link: 'Full walkthrough',
    },
    hostLabel: 'Deploy in your environment', hostTitle: 'Open source, self-hosted',
    hostLead: 'Keep control of your business systems and operations environment. Deploy Soha, then connect the resources and tools you need.',
    hostLink: 'Deployment guide', community: 'The OpenSoha community', license: 'Apache 2.0 license',
    preview: {
      eyebrow: 'Capabilities',
      heading: 'Operations, organized around the work',
      tabs: ['Internal access', 'Resources', 'Delivery', 'Monitoring & AI'],
      label: 'Explore Soha capabilities',
      titles: ['Find the way into your business systems', 'From resources to management actions', 'Connect applications, targets, and delivery', 'Investigate from the evidence'],
      bodies: ['Manage internal entry points so your team can access its own business systems.', 'Manage Kubernetes, virtual machines, and Docker resources with operation records.', 'Execute delivery for an application and its target environment. Review the process and results.', 'Use logs, metrics, and alerts as context for AI-assisted investigation with permissioned tools.'],
      points: [
        ['Wi-Fi and wired admission, WireGuard VPN, and ZTNA', 'One set of users, devices, and access policies', 'The control plane grants access but never relays traffic'],
        ['Connect clusters directly or through an outbound Agent', 'No inbound ports for internal clusters', 'Operations leave audit evidence'],
        ['Bind each application to its target environments', 'Confirm the delivery plan before it runs', 'Execution requires a configured runner'],
        ['Alert-driven root cause analysis', 'Logs, events, audits, and releases merged as evidence', 'Tool calls bound by permissions and approvals'],
      ],
      links: ['Explore internal access', 'Explore resources', 'Explore application delivery', 'Explore AI-assisted investigation'],
      diagrams: ['Business systems connect to the team through access entry points', 'Runtime resources connect to management actions and audit records', 'Applications connect to environments and execution tasks', 'Monitoring evidence connects to controlled investigation and audit records'],
      access: ['Business systems', 'Internal services', 'Soha access', 'Team'],
      resources: ['Kubernetes', 'Virtual machines', 'Docker', 'View resources', 'Run operations', 'Audit records'],
      delivery: ['Application', 'Delivery object', 'Environment', 'Runtime target', 'Execution task', 'Process & results', 'Keep every change in context'],
      investigation: ['Logs', 'Metrics', 'Alerts', 'AI investigation', 'Permissioned tools', 'Audit records'],
    },
    steps: {
      eyebrow: 'Getting started',
      heading: 'From first deploy to daily operations',
      items: [
        { title: 'Start the control plane', body: 'Try it locally with Docker Compose, or install it on Kubernetes with Helm. The image ships the Web console, so there is no separate frontend to run.', link: 'First deploy', href: '/docs/tutorials/first-deploy' },
        { title: 'Connect clusters and resources', body: 'Connect with a kubeconfig, or install the Agent in an internal cluster so it dials out to Soha.', link: 'First cluster', href: '/docs/tutorials/first-cluster' },
        { title: 'Deliver and investigate', body: 'Bind applications to environments and confirm delivery plans. When an alert fires, start a controlled AI investigation from logs and metrics.', link: 'First delivery', href: '/docs/tutorials/first-delivery' },
      ],
    },
    components: {
      label: 'What Soha is made of',
      items: [
        { name: 'Soha Server', body: 'API, authentication, RBAC, audit, and the embedded Web console in a single image.', href: '/docs/operations/deployment' },
        { name: 'Soha Agent', body: 'Runs inside clusters or hosts, dials out to the control plane, and performs bounded operations.', href: '/docs/tutorials/first-cluster' },
        { name: 'Soha CLI', body: 'Work with workbench resources from the terminal, with an MCP stdio entry point.', href: '/docs/operations/soha-cli' },
        { name: 'Helm Charts', body: 'Install Soha, the Agent, and the Operator on Kubernetes.', href: '/docs/operations/deployment' },
        { name: 'Soha Operator', body: 'Optional. Runs WorkloadCronJob automation inside the cluster.', href: '/docs/operations/operator-runbooks' },
      ],
    },
  },
}

export const previewRoutes = [
  '/docs/operations/network-access', '/docs/architecture/multi-cluster-model',
  '/docs/tutorials/first-delivery', '/docs/architecture/ai-copilot',
]
