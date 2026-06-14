import { readFile } from 'node:fs/promises'

const docsRoot = new URL('../content/zh/', import.meta.url)
const compact = (value) => value.split(/\s+/).filter(Boolean).join(' ')
const gatewayExamplesDocs = ['operations/ai-gateway-examples.md']
const cliDocs = ['operations/soha-cli.md']
const gatewayArchitectureDocs = ['architecture/ai-gateway.md']
const gatewayApiDocs = ['api/core-endpoints.md']
const currentGatewayDocs = [
  ...gatewayApiDocs,
  ...cliDocs,
  ...gatewayArchitectureDocs,
]

async function readText(file) {
  return readFile(new URL(file, docsRoot), 'utf8')
}

async function requireText(name, files, required, { compactWhitespace = false } = {}) {
  for (const file of files) {
    const raw = await readText(file)
    const text = compactWhitespace ? compact(raw) : raw
    for (const needle of required) {
      const expected = compactWhitespace ? compact(needle) : needle
      if (!text.includes(expected)) {
        throw new Error(`${name}: ${file} missing ${JSON.stringify(needle)}`)
      }
    }
  }
}

async function forbidText(name, files, forbidden) {
  for (const file of files) {
    const text = await readText(file)
    for (const needle of forbidden) {
      if (text.includes(needle)) {
        throw new Error(`${name}: ${file} still contains obsolete phrase ${JSON.stringify(needle)}`)
      }
    }
  }
}

await requireText(
  'governance aliases',
  gatewayExamplesDocs,
  [
    'cached content',
    'tool-use prompt',
    'thoughts token',
    'cached/audio/reasoning/prediction',
    'costCents',
    'openrouter',
    'fireworks',
    'voyage',
  ],
  { compactWhitespace: true },
)

for (const file of gatewayExamplesDocs) {
  const text = await readText(file)
  const count = text.match(/Condition notes:/g)?.length ?? 0
  if (count !== 1) {
    throw new Error(`${file} should contain exactly one Condition notes section, got ${count}`)
  }
}

await requireText(
  'resource and prompt debugging',
  gatewayExamplesDocs,
  [
    'soha resource read soha://delivery/applications',
    'soha prompt get soha.delivery.plan_release',
    'soha diagnose --profile gateway-admin --resource soha://k8s/runtime',
    'soha diagnose --profile gateway-admin --prompt soha.k8s.diagnose_workload',
    'resources/read',
    'prompts/get',
  ],
  { compactWhitespace: true },
)

await requireText(
  'approval SLA governance',
  gatewayExamplesDocs,
  ['approval_sla_due_soon', 'stale_gateway_approvals', 'pending Gateway approvals'],
)

await requireText(
  'delivery and k8s tool commands',
  gatewayExamplesDocs,
  [
    'soha tool call delivery.build_sources.list',
    'soha tool call delivery.release_targets.list',
    'soha tool call k8s.deployments.events',
    'soha tool call k8s.services.backends',
  ],
)

await requireText(
  'CLI command surface',
  cliDocs,
  [
    'service-account list|create|token-list|token-create|token-revoke',
    'approval list|timeline|approve|reject|cancel',
    'governance status',
    'mcp install',
    'completion bash|zsh',
  ],
)

await requireText(
  'current CLI surface',
  gatewayArchitectureDocs,
  [
    'tool call',
    'resource read',
    'prompt get',
    'token list|create|revoke',
    'service-account list|create|token-list|token-create|token-revoke',
    'audit list',
    'governance status',
    'approval list|timeline|approve|reject|cancel',
    'completion bash|zsh',
  ],
)

await requireText(
  'current Gateway APIs',
  [...gatewayApiDocs, ...gatewayArchitectureDocs],
  [
    'GET /api/v1/ai-gateway/capabilities',
    'POST /api/v1/ai-gateway/tools/:toolName/invoke',
    'POST /api/v1/ai-gateway/resources/read',
    'POST /api/v1/ai-gateway/prompts/get',
    'GET /api/v1/ai-gateway/governance/status',
    'GET /api/v1/ai-gateway/audit-logs',
    'GET /api/v1/ai-gateway/approval-requests',
    'GET /api/v1/ai-gateway/approval-requests/:requestID/timeline',
    'POST /api/v1/ai-gateway/approval-requests/:requestID/approve',
    'POST /api/v1/ai-gateway/approval-requests/:requestID/reject',
    'POST /api/v1/ai-gateway/approval-requests/:requestID/cancel',
  ],
  { compactWhitespace: true },
)

await requireText(
  'current default tools',
  currentGatewayDocs,
  [
    'delivery.applications.list',
    'delivery.applications.detail',
    'delivery.applications.create',
    'delivery.application_environments.list',
    'delivery.application_services.list',
    'delivery.build_sources.list',
    'delivery.release_targets.list',
    'delivery.actions.trigger',
    'delivery.release_bundles.list',
    'delivery.execution_tasks.list',
    'delivery.execution_logs.list',
    'delivery.workflow_templates.list',
    'delivery.release_context.diff',
    'delivery.rollback.context',
    'k8s.pods.list',
    'k8s.pods.logs',
    'k8s.pods.describe',
    'k8s.deployments.list',
    'k8s.deployments.rollout_status',
    'k8s.deployments.events',
    'k8s.services.list',
    'k8s.services.backends',
    'k8s.routes.context',
    'k8s.storage.context',
    'k8s.nodes.detail',
    'k8s.events.list',
    'diagnosis.release_failure.analyze',
  ],
)

await forbidText(
  'obsolete phrases',
  currentGatewayDocs,
  [
    '首版可调用工具',
    '首版 manifest',
    '首批 API',
    '当前第一版',
    '第一版可运行后端入口',
    'First API',
    'First-version tool names',
    'First-version invokable tools',
    'first-version command surface',
    'first-version CLI',
    '  - 浏览器验证 `/ai-workbench/gateway`',
    '/ai-workbench/gateway',
    'ai-workbench-gateway',
    '待可登录演示环境补充',
    '有可登录演示环境后',
  ],
)
