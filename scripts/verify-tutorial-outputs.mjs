import { readFile } from 'node:fs/promises'

const repoRoot = new URL('../', import.meta.url)
const docsRoot = new URL('../content/zh/', import.meta.url)
const fixtureRoot = new URL('../public/tutorial-fixtures/', import.meta.url)

const requirements = new Map([
  [
    'tutorials/first-deploy.md',
    {
      fixture: 'first-deploy.expected.txt',
      required: [
        '## 预期输出形状',
        'curl -sS http://localhost:8080/healthz',
        '"status": "ok"',
        'curl -sS http://localhost:8080/readyz',
        '"ready": true',
        'curl -sS http://localhost:8080/api/v1/auth/providers',
        '"providers"',
      ],
    },
  ],
  [
    'tutorials/first-cluster.md',
    {
      fixture: 'first-cluster.expected.txt',
      required: [
        '## 预期输出形状',
        'POST "$SOHA_SERVER/api/v1/clusters"',
        '"connectionMode": "direct_kubeconfig"',
        'GET "$SOHA_SERVER/api/v1/clusters"',
        '"items"',
        'GET "$SOHA_SERVER/api/v1/clusters/local/namespaces"',
        '"name": "default"',
      ],
    },
  ],
  [
    'tutorials/first-delivery.md',
    {
      fixture: 'first-delivery.expected.txt',
      required: [
        '## 预期输出形状',
        'POST "$SOHA_SERVER/api/v1/applications"',
        '"name": "billing-api"',
        'POST "$SOHA_SERVER/api/v1/builds/trigger"',
        '"status": "queued"',
        'GET "$SOHA_SERVER/api/v1/delivery/execution-tasks?applicationId=app-1&limit=20"',
        '"taskKind"',
      ],
    },
  ],
  [
    'tutorials/first-ai-gateway-mcp.md',
    {
      fixture: 'first-ai-gateway-mcp.expected.txt',
      required: [
        '## 预期输出形状',
        'soha login',
        'profile: gateway-admin',
        'soha capabilities --profile gateway-admin --output names',
        'delivery.actions.trigger',
        'soha resource read soha://delivery/applications --profile gateway-admin',
        'soha prompt get soha.delivery.plan_release --profile gateway-admin',
      ],
    },
  ],
  [
    'tutorials/first-plugin-install.md',
    {
      fixture: 'first-plugin-install.expected.txt',
      required: [
        '## 预期输出形状',
        'soha plugin search',
        'soha plugin show <id>',
        'soha plugin install <id>',
        'soha plugin enable <id>',
        'GET /api/v1/plugins/installed',
      ],
    },
  ],
])

for (const [file, spec] of requirements) {
  const text = await readFile(new URL(file, docsRoot), 'utf8')
  const fixture = (await readFile(new URL(spec.fixture, fixtureRoot), 'utf8')).trim()
  const missing = spec.required.filter((item) => !text.includes(item))
  if (missing.length > 0) {
    throw new Error(`${file} missing expected output fixture content:\n${missing.map((item) => `- ${item}`).join('\n')}`)
  }

  const outputSection = text.match(/^## 预期输出形状\n(?<body>[\s\S]*?)(?=^## |\Z)/m)?.groups?.body ?? ''
  if (!/```(?:json|text|bash)\n[\s\S]*?\n```/.test(outputSection)) {
    throw new Error(`${file} must include at least one fenced expected output block`)
  }
  const publicFixturePath = `/tutorial-fixtures/${spec.fixture}`
  if (!text.includes(publicFixturePath)) {
    throw new Error(`${file} must link to ${publicFixturePath}`)
  }
  for (const line of fixture.split(/\r?\n/).filter((item) => item.trim() !== '')) {
    if (!outputSection.includes(line)) {
      throw new Error(`${file} output section is missing fixture line from ${spec.fixture}: ${line}`)
    }
  }
}
