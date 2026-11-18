import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentRoot = path.join(root, 'content', 'zh')
const allContentRoot = path.join(root, 'content')
const sourceExtensions = new Set(['.md', '.mdx'])

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function fromRoot(file) {
  return path.join(root, file)
}

function fromContent(file) {
  return path.join(contentRoot, file)
}

function isRepoRelative(file) {
  return (
    file.startsWith('content/') ||
    file.startsWith('.github/') ||
    file.startsWith('app/') ||
    file.startsWith('public/') ||
    file.startsWith('quality/') ||
    file === 'proxy.ts' ||
    file === 'package.json' ||
    file === 'next.config.mjs' ||
    file === 'README.md'
  )
}

function resolveFile(file) {
  return isRepoRelative(file) ? fromRoot(file) : fromContent(file)
}

async function read(file) {
  return readFile(resolveFile(file), 'utf8')
}

async function readJson(file) {
  try {
    return JSON.parse(await read(file))
  } catch (error) {
    throw new Error(`${file}: invalid JSON: ${error.message}`)
  }
}

async function exists(file) {
  try {
    await stat(resolveFile(file))
    return true
  } catch {
    return false
  }
}

async function docExists(id) {
  const candidates = [`${id}.md`, `${id}.mdx`, `${id}/index.md`, `${id}/index.mdx`]
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return true
    }
  }
  return false
}

async function listSourceDocs(dir = contentRoot) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listSourceDocs(fullPath)))
      continue
    }
    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(toPosix(path.relative(root, fullPath)))
    }
  }
  return files.sort()
}

async function listFilesNamed(dir, fileName) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFilesNamed(fullPath, fileName)))
      continue
    }
    if (entry.name === fileName) {
      files.push(toPosix(path.relative(root, fullPath)))
    }
  }
  return files.sort()
}

async function listAllPublicSourceDocs() {
  return listSourceDocs(allContentRoot)
}

function requireIncludes(name, text, required) {
  const missing = required.filter((item) => !text.includes(item))
  if (missing.length > 0) {
    throw new Error(`${name} missing:\n${missing.map((item) => `- ${item}`).join('\n')}`)
  }
}

function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) {
    return null
  }
  const fields = new Map()
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.+?)\s*$/)
    if (field) {
      fields.set(field[1], field[2].replace(/^["']|["']$/g, ''))
    }
  }
  return fields
}

function normalizeOpenAPIPath(value) {
  return value.replace(/\{([^}]+)\}/g, ':$1')
}

function parseOpenAPIOperations(raw) {
  const operations = []
  let currentPath = ''

  for (const line of raw.split(/\r?\n/)) {
    const pathMatch = line.match(/^  (\/[A-Za-z0-9_./{}-]+):\s*$/)
    if (pathMatch) {
      currentPath = pathMatch[1]
      continue
    }

    const methodMatch = line.match(/^    (get|post|put|delete|patch):\s*$/)
    if (currentPath && methodMatch) {
      operations.push(`${methodMatch[1].toUpperCase()} /api/v1${normalizeOpenAPIPath(currentPath)}`)
    }
  }

  return operations
}

async function verifyNextraSetup() {
  const [
    packageJson,
    nextConfig,
    proxy,
    rootLayout,
    themeLayout,
    docsLayout,
    docsPage,
    homePage,
    marketingHome,
    marketingCopy,
    rootMeta,
    enRootMeta,
    zhTutorialMeta,
  ] = await Promise.all([
    read('package.json'),
    read('next.config.mjs'),
    read('proxy.ts'),
    read('app/[locale]/layout.tsx'),
    read('app/theme-layout.tsx'),
    read('app/[locale]/docs/layout.tsx'),
    read('app/[locale]/docs/[[...mdxPath]]/page.tsx'),
    read('app/[locale]/page.tsx'),
    read('app/marketing/MarketingHome.tsx'),
    read('app/marketing/copy.ts'),
    read('content/zh/_meta.ts'),
    read('content/en/_meta.ts'),
    read('content/zh/tutorials/_meta.ts'),
  ])

  requireIncludes('Nextra package setup', packageJson, ['"next"', '"nextra"', '"nextra-theme-docs"', '"build": "next build"'])
  requireIncludes('Nextra i18n route setup', nextConfig, [
    'contentDirBasePath: \'/docs\'',
    'unstable_shouldAddLocaleToLinks: true',
    'i18n:',
    "defaultLocale: 'zh'",
    "locales: ['zh', 'en']",
    'DOCS_SITE_URL',
  ])
  if (nextConfig.includes("output: 'export'")) {
    throw new Error('next.config.mjs must not use output: export with official Nextra i18n')
  }
  requireIncludes('Nextra locale proxy setup', proxy, [
    "export { proxy } from 'nextra/locales'",
    'matcher:',
  ])
  requireIncludes('Next root layout setup', rootLayout, [
    '<html lang={htmlLang(locale)}',
    '<body>{children}</body>',
  ])
  if (rootLayout.includes('LocaleDocumentLang') || rootLayout.includes('htmlLang(defaultLocale)')) {
    throw new Error('locale root layout must render its own server-side language')
  }
  requireIncludes('Nextra theme layout setup', themeLayout, [
    'nextra-theme-docs',
    '<Layout',
    '<Navbar',
    'projectLink="https://github.com/opensoha/soha"',
    'docsRepositoryBase="https://github.com/opensoha/soha-docs/tree/main"',
    "'Edit this page'",
    "'Report a docs issue'",
    '<LocaleSwitch lite',
    'i18n=',
  ])
  requireIncludes('Nextra docs layout setup', docsLayout, [
    'getPageMap',
    "getPageMap(`/${locale}/docs`)",
    '<SiteThemeLayout',
    'locale={locale}',
  ])
  requireIncludes('Nextra docs page setup', docsPage, [
    "importPage",
    "generateStaticParamsFor('mdxPath', 'locale')",
    'importPage(mdxPath, locale)',
    'getMDXComponents().wrapper',
    '<Wrapper',
    '<MDXContent',
  ])
  requireIncludes('homepage CTA setup', homePage, [
    'MarketingHome',
    'isLocale',
    'generateStaticParams',
  ])
  requireIncludes('marketing homepage shell', marketingHome, [
    'data-soha-home',
    'data-soha-home-actions',
    'main-content',
  ])
  requireIncludes('marketing homepage positioning and actions', marketingCopy, [
    '中小企业',
    '运维难题',
    'small or medium-sized business',
    '开始使用',
    '阅读文档',
  ])
  requireIncludes('Nextra root navigation', rootMeta, [
    'docs:',
    "title: '文档'",
    "type: 'page'",
    "href: '/zh/docs'",
    "title: '总览'",
    'product',
    "'self-hosted'",
    'tutorials',
    'marketplace',
    'architecture',
    'development',
    'api',
    'operations',
    'governance',
    "'release-notes'",
    'reference',
  ])
  requireIncludes('Nextra English root navigation', enRootMeta, [
    'docs:',
    "title: 'Docs'",
    "type: 'page'",
    "href: '/en/docs'",
    "title: 'Overview'",
    'Self-hosted Soha',
    'Tutorials',
    'Architecture',
    'Operations',
    'Reference',
  ])
  requireIncludes('Nextra Chinese tutorial navigation', zhTutorialMeta, [
    '第一次部署',
    '第一次接入集群',
    '第一次交付',
    '第一次接入 AI Gateway MCP',
    '第一次安装插件',
  ])
}

async function verifySingleDocumentShell() {
  const layoutFiles = await listFilesNamed(path.join(root, 'app'), 'layout.tsx')
  const problems = []

  for (const file of layoutFiles) {
    const text = await read(file)
    const hasDocumentElement = /<\/?(html|body)\b/i.test(text)
    if (file === 'app/[locale]/layout.tsx') {
      if (!hasDocumentElement) {
        problems.push(`${file}: root layout must render the document shell`)
      }
      continue
    }
    if (hasDocumentElement) {
      problems.push(`${file}: nested layouts must not render <html> or <body>`)
    }
  }

  if (problems.length > 0) {
    throw new Error(`invalid Next document shell setup:\n${problems.map((item) => `- ${item}`).join('\n')}`)
  }
}

async function verifyNoPrivateSaasExposure() {
  const publicFiles = [
    'app/[locale]/layout.tsx',
    'app/[locale]/page.tsx',
    'app/marketing/MarketingHome.tsx',
    'app/marketing/copy.ts',
    'content/zh/_meta.ts',
    'content/en/_meta.ts',
    ...(await listAllPublicSourceDocs()),
  ]
  const problems = []

  for (const file of publicFiles) {
    const text = await read(file)
    if (/\bSaaS\b/i.test(text) || /Soha\s+Cloud/i.test(text)) {
      problems.push(file)
    }
  }

  for (const removedPath of ['content/zh/cloud', 'content/zh/roadmap', 'content/en/cloud', 'content/en/roadmap']) {
    if (await exists(removedPath)) {
      problems.push(`${removedPath}: removed public section still exists`)
    }
  }

  if (problems.length > 0) {
    throw new Error(`public docs expose private SaaS/Cloud or removed roadmap sections:\n${problems.map((item) => `- ${item}`).join('\n')}`)
  }
}

async function verifyNavigationDocsExist() {
  const requiredDocIds = [
    'index',
    'product/what-is-soha',
    'self-hosted/index',
    'tutorials/first-deploy',
    'tutorials/first-cluster',
    'tutorials/first-delivery',
    'tutorials/first-ai-gateway-mcp',
    'tutorials/first-plugin-install',
    'marketplace/index',
    'marketplace/installing-plugins',
    'marketplace/plugin-permissions',
    'architecture/index',
    'architecture/authorization',
    'architecture/ai-gateway',
    'architecture/mcp-integration',
    'development/local-development',
    'api/contracts',
    'api/reference',
    'api/reference/generated/index',
    'operations/operator-runbooks',
    'operations/network-access',
    'operations/docs-publish-acceptance',
    'governance/index',
    'release-notes/index',
    'release-notes/changelog',
    'release-notes/v0-1-x',
    'reference/product-information-architecture',
    'reference/database-schema',
  ]

  const missing = []
  for (const docId of requiredDocIds) {
    if (!(await docExists(docId))) {
      missing.push(docId)
    }
  }
  if (missing.length > 0) {
    throw new Error(`Nextra navigation references missing docs:\n${missing.map((item) => `- ${item}`).join('\n')}`)
  }
}

async function verifyMarkdownLinks() {
  const files = await listAllPublicSourceDocs()
  const missing = []
  const retiredRepoUrl = /github\.com\/opensoha\/soha-(contracts|web|cli|agent|skills|connectors)\b/
  const retiredHits = []
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g

  for (const file of files) {
    const text = await read(file)
    if (retiredRepoUrl.test(text)) {
      retiredHits.push(file)
    }
    const baseDir = path.dirname(file)
    for (const match of text.matchAll(linkPattern)) {
      let target = match[1].trim().replace(/^<|>$/g, '')
      if (
        target.startsWith('#') ||
        target.startsWith('/') ||
        /^[a-z][a-z0-9+.-]*:/i.test(target)
      ) {
        continue
      }

      target = target.split('#')[0].split('?')[0]
      if (!sourceExtensions.has(path.extname(target))) {
        continue
      }

      const resolved = toPosix(path.normalize(path.join(baseDir, target)))
      if (!(await exists(resolved))) {
        missing.push(`${file} -> ${match[1]}`)
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`broken relative markdown links:\n${missing.map((item) => `- ${item}`).join('\n')}`)
  }
  if (retiredHits.length > 0) {
    throw new Error(`public docs link to archived legacy component repositories:\n${retiredHits.map((item) => `- ${item}`).join('\n')}`)
  }
}

function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, '')
}

async function verifyNoUnsafeMdxJsxTokens() {
  const files = await listAllPublicSourceDocs()
  const problems = []

  for (const file of files) {
    const lines = (await read(file)).split(/\r?\n/)
    let inFence = false
    for (const [index, line] of lines.entries()) {
      if (/^\s*```/.test(line)) {
        inFence = !inFence
        continue
      }
      if (inFence) {
        continue
      }

      const text = stripInlineCode(line)
      if (/<\/?script\b/i.test(text) || /<[A-Z][A-Za-z0-9_:-]*(\s|>|\/)/.test(text)) {
        problems.push(`${file}:${index + 1}: ${line.trim()}`)
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`unsafe raw MDX JSX tokens:\n${problems.map((item) => `- ${item}`).join('\n')}`)
  }
}

async function verifyFrontMatter() {
  const requiredFiles = [
    'index.mdx',
    'operations/ai-gateway-examples.md',
    'tutorials/first-deploy.md',
    'tutorials/first-cluster.md',
    'tutorials/first-delivery.md',
    'tutorials/first-ai-gateway-mcp.md',
    'tutorials/first-plugin-install.md',
    'operations/docs-publish-acceptance.md',
    'api/reference.md',
    'api/reference/generated/index.md',
    'release-notes/index.md',
    'release-notes/changelog.md',
    'release-notes/v0-1-x.md',
  ]

  const problems = []
  for (const file of requiredFiles) {
    const fields = parseFrontMatter(await read(file))
    if (!fields) {
      problems.push(`${file}: missing front matter`)
      continue
    }
    const title = fields.get('title')
    if (!title || title.length < 3) {
      problems.push(`${file}: missing useful title`)
    }

    const description = fields.get('description')
    if (!description || description.length < 12) {
      problems.push(`${file}: missing useful description`)
    }
  }

  if (problems.length > 0) {
    throw new Error(`front matter drift:\n${problems.map((item) => `- ${item}`).join('\n')}`)
  }
}

async function verifyChangelogPage() {
  const [changelog, enChangelog, zhReleaseNotes, enReleaseNotes, zhReleaseIndex, enReleaseIndex] = await Promise.all([
    read('release-notes/changelog.md'),
    read('content/en/release-notes/changelog.md'),
    read('release-notes/v0-1-x.md'),
    read('content/en/release-notes/v0-1-x.md'),
    read('release-notes/index.md'),
    read('content/en/release-notes/index.md'),
  ])

  requireIncludes('release changelog page', changelog, [
    '# 更新日志',
    '## Unreleased',
    '## 0.1.x Beta',
    '不推断外部发布状态',
    '[`/docs/api/reference/generated/`](../api/reference.md)',
    '[OpenSoha 0.1.x 发布说明](./v0-1-x.md)',
  ])
  requireIncludes('English release changelog page', enChangelog, [
    '# Changelog',
    '## Unreleased',
    '## 0.1.x Beta',
    'does not infer external deployment status',
    '[`/docs/api/reference/generated/`](../api/reference.md)',
    '[OpenSoha 0.1.x Releases](./v0-1-x.md)',
  ])
  const requiredReleaseRefs = [
    'contracts/v0.2.0',
    'v0.1.13',
    'cli/v0.2.1',
    'agent/v0.2.0',
    'skills/v0.1.4',
    'connectors/v0.1.1',
    'v0.1.1',
  ]
  requireIncludes('Chinese 0.1.x release notes', zhReleaseNotes, requiredReleaseRefs)
  requireIncludes('English 0.1.x release notes', enReleaseNotes, requiredReleaseRefs)
  requireIncludes('Chinese release index contracts path', zhReleaseIndex, ['../soha/contracts'])
  requireIncludes('English release index contracts path', enReleaseIndex, ['../soha/contracts'])
}

async function verifyVercelDeploymentDocs() {
  const [readme, docsPublishing, nextConfig] = await Promise.all([
    read('README.md'),
    read('operations/docs-publishing.md'),
    read('next.config.mjs'),
  ])
  const combined = `${readme}\n${docsPublishing}\n${nextConfig}`

  requireIncludes('Next i18n deployment docs', combined, [
    'Vercel',
    'GitHub',
    'standard Next.js build',
    'npm run build',
    'content/zh',
    'content/en',
    'nextra/locales',
  ])
  if (await exists('.github/workflows/publish.yml')) {
    throw new Error('.github/workflows/publish.yml must not exist after switching docs publishing away from GitHub Pages')
  }
  if (await exists('public/CNAME')) {
    throw new Error('public/CNAME must not exist after switching docs publishing away from GitHub Pages')
  }
}

async function verifySearchConfiguration() {
  const config = await read('next.config.mjs')
  const docsPublishing = await read('operations/docs-publishing.md')

  requireIncludes('Nextra local search configuration', config, [
    'search:',
    'codeblocks: false',
  ])
  requireIncludes('docs search publishing notes', docsPublishing, [
    'Nextra',
    'Pagefind',
    'Search quality gate',
  ])
}

async function verifyScreenshotRegressionManifest() {
  const manifestPath = 'quality/docs-screenshot-regression.json'
  const manifest = await readJson(manifestPath)
  if (manifest.schemaVersion !== 'opensoha.dev/docs-screenshot-regression/v1') {
    throw new Error(`${manifestPath}: unsupported schemaVersion ${JSON.stringify(manifest.schemaVersion)}`)
  }
  if (!manifest.baselineDir || !manifest.diffDir) {
    throw new Error(`${manifestPath}: baselineDir and diffDir are required`)
  }

  const viewports = new Set()
  for (const viewport of manifest.viewports ?? []) {
    if (!viewport.name || viewport.width < 1 || viewport.height < 1) {
      throw new Error(`${manifestPath}: invalid viewport ${JSON.stringify(viewport)}`)
    }
    viewports.add(viewport.name)
  }
  for (const required of ['desktop', 'mobile']) {
    if (!viewports.has(required)) {
      throw new Error(`${manifestPath}: missing ${required} viewport`)
    }
  }

  const routes = manifest.routes ?? []
  const routePaths = new Set()
  const routeIds = new Set()
  for (const route of routes) {
    if (routeIds.has(route.id)) {
      throw new Error(`${manifestPath}: duplicate route id ${route.id}`)
    }
    routeIds.add(route.id)
    routePaths.add(route.path)
    if (!route.path.startsWith('/') || !route.path.endsWith('/')) {
      throw new Error(`${manifestPath}: route ${route.id} path must be an absolute trailing-slash route`)
    }
    if (!(await exists(route.source))) {
      throw new Error(`${manifestPath}: route ${route.id} source ${route.source} does not exist`)
    }
    if (!Array.isArray(route.viewports) || route.viewports.length === 0) {
      throw new Error(`${manifestPath}: route ${route.id} must declare at least one viewport`)
    }
    for (const viewport of route.viewports) {
      if (!viewports.has(viewport)) {
        throw new Error(`${manifestPath}: route ${route.id} references unknown viewport ${viewport}`)
      }
    }
    if (!Array.isArray(route.assertions) || route.assertions.length < 2) {
      throw new Error(`${manifestPath}: route ${route.id} must declare at least two assertions`)
    }
  }

  for (const requiredRoute of [
    '/zh/',
    '/zh/docs/api/contracts/',
    '/zh/docs/api/reference/',
    '/zh/docs/operations/docs-publish-acceptance/',
  ]) {
    if (!routePaths.has(requiredRoute)) {
      throw new Error(`${manifestPath}: missing required screenshot route ${requiredRoute}`)
    }
  }

  const docsPublishing = await read('operations/docs-publishing.md')
  requireIncludes('docs screenshot regression notes', docsPublishing, [
    manifestPath,
    'Screenshot regression gate',
    'desktop',
    'mobile',
  ])
}

async function verifyPublishAcceptanceRecord() {
  const zhRecord = await read('operations/docs-publish-acceptance.md')

  requireIncludes('docs publish acceptance record', zhRecord, [
    'Vercel project',
    'GitHub integration',
    'docs.opensoha.dev',
    'DOCS_SITE_URL=https://docs.opensoha.dev',
    'NEXT_LOCALE',
    'Commit SHA',
    'Deployment URL',
    'DNS/custom domain',
    'Pending external Vercel publish',
    'curl -I -s https://docs.opensoha.dev/zh/',
    'curl -I -s https://docs.opensoha.dev/zh/docs/api/contracts/',
    'curl -I -s https://docs.opensoha.dev/en/docs/',
  ])
}

async function verifyEnvironmentDocs() {
  const envDocs = await read('operations/environment-variables.md')

  requireIncludes('environment variable docs', envDocs, [
    'SOHA_CONFIG_FILE',
    'SOHA_HTTP_ADDR',
    'SOHA_LOGGER_LEVEL',
    'SOHA_DATABASE_HOST',
    'SOHA_DATABASE_PORT',
    'SOHA_DATABASE_NAME',
    'SOHA_DATABASE_USER',
    'SOHA_DATABASE_PASSWORD',
    'SOHA_REDIS_ADDR',
    'SOHA_AUTH_ENABLE_DEV_AUTH',
    'SOHA_CONFIG',
    'SOHA_TOKEN',
    'SOHA_SERVER',
    'SOHA_SKILLS_SOURCE',
    'SOHA_SKILLS_DIR',
    'HERMES_CONTROL_PLANE_URL',
    'SOHA_EXECUTION_RUNNER_TOKEN',
    'SOHA_AI_GATEWAY_RATE_LIMIT_BACKEND',
    'SOHA_AI_GATEWAY_RATE_LIMIT_REDIS_ADDR',
    'DOCS_SITE_URL',
    'DOCS_BASE_URL',
    'DOCS_SHOW_LAST_UPDATE_TIME',
  ])
}

async function verifyTutorialCoverage() {
  const requirements = new Map([
    [
      'tutorials/first-deploy.md',
      [
        'docker compose -f deploy/docker-compose.yaml up -d --no-build --wait soha',
        'curl -fsS http://localhost:8080/healthz',
        'curl -fsS http://localhost:8080/readyz',
        'GET /api/v1/auth/providers',
      ],
    ],
    [
      'tutorials/first-cluster.md',
      [
        'direct_kubeconfig',
        'agent',
        'POST /api/v1/clusters',
        'GET /api/v1/clusters',
        'GET /api/v1/clusters/:clusterID/namespaces',
      ],
    ],
    [
      'tutorials/first-delivery.md',
      [
        'POST /api/v1/applications',
        'POST /api/v1/delivery/plans',
        'POST /api/v1/delivery/plans/{planID}/confirm',
        'GET /api/v1/delivery/execution-tasks',
        'delivery.actions.trigger',
      ],
    ],
    [
      'tutorials/first-ai-gateway-mcp.md',
      [
        'soha login',
        'soha capabilities',
        'soha mcp install',
        'GET /api/v1/ai-gateway/capabilities',
      ],
    ],
    [
      'tutorials/first-plugin-install.md',
      [
        'soha plugin search',
        'soha plugin install',
        'GET /api/v1/plugins/marketplace',
        'plugin manifest',
      ],
    ],
  ])

  for (const [file, required] of requirements) {
    requireIncludes(`${file} tutorial coverage`, await read(file), required)
  }
}

async function verifyChineseTutorialLocalization() {
  const tutorialFiles = [
    'tutorials/first-deploy.md',
    'tutorials/first-cluster.md',
    'tutorials/first-delivery.md',
    'tutorials/first-ai-gateway-mcp.md',
    'tutorials/first-plugin-install.md',
  ]
  const problems = []

  for (const file of tutorialFiles) {
    const zh = await read(file)
    const en = await read(`content/en/${file}`)
    if (zh.trim() === en.trim()) {
      problems.push(`${file}: Chinese content is identical to English source`)
      continue
    }
    if (!/[\u3400-\u9fff]/.test(zh)) {
      problems.push(`${file}: Chinese content has no CJK text`)
    }
  }

  if (problems.length > 0) {
    throw new Error(`Chinese tutorial localization problems:\n${problems.map((item) => `- ${item}`).join('\n')}`)
  }
}

async function verifyGatewayEndpointStatus() {
  const openapi = await readFile(new URL('../../soha/contracts/openapi/soha-api.yaml', import.meta.url), 'utf8')
  const contracted = new Set(parseOpenAPIOperations(openapi))
  const apiCore = await read('api/core-endpoints.md')

  const pendingManagementEndpoints = [
    'GET /api/v1/ai-gateway/ai-clients',
    'POST /api/v1/ai-gateway/ai-clients',
    'PUT /api/v1/ai-gateway/ai-clients/:clientID',
    'GET /api/v1/ai-gateway/tool-grants',
    'POST /api/v1/ai-gateway/tool-grants',
    'DELETE /api/v1/ai-gateway/tool-grants/:grantID',
    'GET /api/v1/ai-gateway/access-policies',
    'POST /api/v1/ai-gateway/access-policies',
    'PUT /api/v1/ai-gateway/access-policies/:policyID',
    'DELETE /api/v1/ai-gateway/access-policies/:policyID',
    'GET /api/v1/ai-gateway/skill-bindings',
    'POST /api/v1/ai-gateway/skill-bindings',
    'PUT /api/v1/ai-gateway/skill-bindings/:bindingID',
    'DELETE /api/v1/ai-gateway/skill-bindings/:bindingID',
  ]

  const nowContracted = pendingManagementEndpoints.filter((endpoint) => contracted.has(endpoint))
  if (nowContracted.length > 0) {
    throw new Error(
      `AI Gateway management endpoints moved into OpenAPI; update docs status sections:\n${nowContracted
        .map((item) => `- ${item}`)
        .join('\n')}`,
    )
  }

  requireIncludes('AI Gateway pending OpenAPI status', apiCore, [
    'Public OpenAPI contract status',
    'Pending contracts addition',
    'not yet included in the public OpenAPI artifact',
    ...pendingManagementEndpoints,
  ])
}

async function verifyOperatorRunbookCoverage() {
  const zhRunbook = await read('operations/operator-runbooks.md')

  requireIncludes('operator runbook coverage', zhRunbook, [
    'Agent Fleet',
    'Connector Runtime',
    'Delivery Runner',
    'AI Gateway Approval And Governance',
    'soha capabilities --profile local --domain platform --output json',
    'soha diagnose --profile local --cluster-capability kubernetes.logs.stream',
    'connectors/connector-event-envelope.schema.json',
    'POST /api/v1/delivery/execution-tasks/claim',
    'GET  /api/v1/delivery/execution-tasks/:taskID/runner-status',
    'POST /api/v1/delivery/execution-callbacks',
    'soha governance status --profile local --window-hours 24',
    'soha approval timeline approval-123 --profile local',
    'approval_sla_due_soon',
    'high_risk_grant_without_resource_scope',
  ])
}

async function verifyNetworkAccessRunbookCoverage() {
  const [zhRunbook, enRunbook] = await Promise.all([
    read('operations/network-access.md'),
    read('content/en/operations/network-access.md'),
  ])
  const required = [
    '/api/v1/network-access/**',
    '/api/network-control/v1/**',
    '/api/ingest/v1/**',
    'internal_direct',
    'internal_ztna',
    'external_vpn',
    'external_vpn_ztna',
    'external_direct_ztna',
    'ProtectedSet',
    'managed_follow',
    'app_subscription',
    'network_access.sessions.list',
    'tunnel_required',
  ]
  requireIncludes('Chinese network access runbook coverage', zhRunbook, required)
  requireIncludes('English network access runbook coverage', enRunbook, required)
}

async function verifyBilingualLocalizationHygiene() {
  const enDocs = await listSourceDocs(path.join(root, 'content', 'en'))
  const zhDocs = await listSourceDocs(path.join(root, 'content', 'zh'))
  const problems = []
  const cjkPattern = /[\u3400-\u9fff]/

  for (const file of enDocs) {
    const text = await read(file)
    if (cjkPattern.test(text)) {
      problems.push(`${file}: English documentation still contains CJK characters`)
    }
  }

  for (const file of zhDocs) {
    if (file.endsWith('/api/reference/generated/index.md')) {
      continue
    }
    const text = await read(file)
    if (!cjkPattern.test(text)) {
      problems.push(`${file}: Chinese documentation has no CJK text`)
    }
  }

  for (const redundantPath of ['FIXES_APPLIED.md', 'public/tutorials']) {
    try {
      await stat(fromRoot(redundantPath))
      problems.push(`${redundantPath}: redundant file or duplicate fixture directory must not exist`)
    } catch {
      // Expected absent path.
    }
  }

  if (problems.length > 0) {
    throw new Error(`bilingual localization or repository hygiene drift:\n${problems.map((item) => `- ${item}`).join('\n')}`)
  }
}

await verifyNextraSetup()
await verifySingleDocumentShell()
await verifyNoPrivateSaasExposure()
await verifyNavigationDocsExist()
await verifyMarkdownLinks()
await verifyNoUnsafeMdxJsxTokens()
await verifyFrontMatter()
await verifyChangelogPage()
await verifyVercelDeploymentDocs()
await verifySearchConfiguration()
await verifyScreenshotRegressionManifest()
await verifyPublishAcceptanceRecord()
await verifyEnvironmentDocs()
await verifyTutorialCoverage()
await verifyChineseTutorialLocalization()
await verifyBilingualLocalizationHygiene()
await verifyGatewayEndpointStatus()
await verifyOperatorRunbookCoverage()
await verifyNetworkAccessRunbookCoverage()
