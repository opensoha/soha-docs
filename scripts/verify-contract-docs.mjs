import { access, readFile } from 'node:fs/promises'
import { openAPIOperations } from './openapi-operations.mjs'

const repoRoot = new URL('../', import.meta.url)
const docsRoot = new URL('../content/zh/', import.meta.url)
const contractsRoot = new URL('../../soha-contracts/', import.meta.url)

async function readDocs(file) {
  const root =
    file.startsWith('.') ||
    file === 'next.config.mjs' ||
    file === 'package.json' ||
    file.startsWith('public/') ||
    file.startsWith('quality/')
      ? repoRoot
      : docsRoot
  return readFile(new URL(file, root), 'utf8')
}

async function readContracts(file) {
  return readFile(new URL(file, contractsRoot), 'utf8')
}

async function ensureContractsAvailable() {
  try {
    await access(new URL('openapi/soha-api.json', contractsRoot))
  } catch {
    throw new Error(
      'missing ../soha-contracts artifacts; checkout soha-contracts as a sibling of soha-docs before running docs tests',
    )
  }
}

function normalizeOpenAPIPath(path) {
  return path.replace(/\{([^}]+)\}/g, ':$1')
}

function formatOperation(operation) {
  return `${operation.method} /api/v1${normalizeOpenAPIPath(operation.path)}`
}

function formatOverlayRoute(route) {
  return `${route.method.toUpperCase()} ${route.path}`
}

function requireIncludes(name, text, required) {
  const missing = required.filter((needle) => !text.includes(needle))
  if (missing.length > 0) {
    throw new Error(`${name} missing:\n${missing.map((item) => `- ${item}`).join('\n')}`)
  }
}

function compact(value) {
  return value.split(/\s+/).filter(Boolean).join(' ')
}

await ensureContractsAvailable()

const [openapiRaw, apiCore, apiContracts, apiGenerated, docsPublishing, envDocs, configTs, ciWorkflow] =
  await Promise.all([
    readContracts('openapi/soha-api.json'),
    readDocs('api/core-endpoints.md'),
    readDocs('api/contracts.md'),
    readDocs('api/reference/generated/index.md'),
    readDocs('operations/docs-publishing.md'),
    readDocs('operations/environment-variables.md'),
    readDocs('next.config.mjs'),
    readDocs('.github/workflows/ci.yml'),
  ])

const openapi = JSON.parse(openapiRaw)
const openapiVersion = openapi.info?.version
const openapiTitle = openapi.info?.title
if (!openapiVersion || !openapiTitle) {
  throw new Error('unable to read OpenAPI title/version from ../soha-contracts/openapi/soha-api.json')
}

const operations = openAPIOperations(openapi)
if (operations.length === 0) {
  throw new Error('no operations parsed from ../soha-contracts/openapi/soha-api.json')
}

requireIncludes(
  'Generated API reference OpenAPI operation coverage',
  compact(apiGenerated),
  operations.map(formatOperation),
)
requireIncludes('Generated API reference metadata', apiGenerated, [
  `Generated from \`../soha-contracts/openapi/soha-api.yaml\` (${openapiTitle} ${openapiVersion}).`,
  '## Operation Index',
  '## JSON Schema Artifacts',
])

const gatewayOperationDocs = compact(apiCore)
requireIncludes(
  'AI Gateway API docs',
  gatewayOperationDocs,
  operations
    .filter((operation) => operation.tag === 'AI Gateway' || operation.tag === 'MCP')
    .map(formatOperation),
)

const contractsPackage = JSON.parse(await readContracts('package.json'))
const exportedArtifacts = Object.values(contractsPackage.exports)
  .filter((value) => typeof value === 'string')
  .map((value) => value.replace(/^\.\//, ''))
  .filter((value) => value.startsWith('openapi/') || value.endsWith('.schema.json'))

requireIncludes('OpenAPI metadata docs', apiContracts, [
  `OpenAPI title: \`${openapiTitle}\``,
  `OpenAPI version: \`${openapiVersion}\``,
  '`openapi/soha-api.yaml`',
])

const schemaArtifacts = exportedArtifacts.filter((value) => value.endsWith('.schema.json')).sort()

for (const schemaFile of schemaArtifacts) {
  const schema = JSON.parse(await readContracts(schemaFile))
  requireIncludes(`${schemaFile} generated API reference`, apiGenerated, [
    schemaFile,
    schema.title ?? schemaFile,
    ...(schema.$id ? [schema.$id] : []),
  ])
  if (Array.isArray(schema.required) && schema.required.length > 0) {
    requireIncludes(`${schemaFile} generated required fields`, apiGenerated, schema.required)
  }
}

const routeMetadataOverlay = JSON.parse(await readDocs('api/reference/route-metadata.overlay.json'))
if (routeMetadataOverlay.version !== 1 || !Array.isArray(routeMetadataOverlay.routes)) {
  throw new Error('api/reference/route-metadata.overlay.json must contain version 1 routes')
}

const operationSet = new Set(operations.map(formatOperation))
for (const [index, route] of routeMetadataOverlay.routes.entries()) {
  const routeName = formatOverlayRoute(route)
  if (!operationSet.has(routeName)) {
    throw new Error(`route metadata overlay references unknown OpenAPI route: ${routeName}`)
  }
  for (const field of ['status', 'audit']) {
    if (typeof route[field] !== 'string' || route[field].trim().length === 0) {
      throw new Error(`route metadata overlay routes[${index}].${field} must be a non-empty string`)
    }
  }
  for (const field of ['permissions', 'scopes', 'examples']) {
    if (!Array.isArray(route[field]) || route[field].length === 0) {
      throw new Error(`route metadata overlay routes[${index}].${field} must be a non-empty array`)
    }
  }

  requireIncludes(`${routeName} generated route metadata`, apiGenerated, [
    `- \`${routeName}\``,
    `  - Status: \`${route.status}\``,
    `  - Permissions: ${route.permissions.map((permission) => `\`${permission}\``).join(', ')}`,
    `  - Scopes: ${route.scopes.join('; ')}`,
    `  - Audit: ${route.audit}`,
    `  - Examples:`,
  ])

  if (Array.isArray(route.compatibility) && route.compatibility.length > 0) {
    requireIncludes(`${routeName} generated compatibility metadata`, apiGenerated, [
      `  - Compatibility: ${route.compatibility.join('; ')}`,
    ])
  }
  if (typeof route.deprecation === 'string' && route.deprecation.trim().length > 0) {
    requireIncludes(`${routeName} generated deprecation metadata`, apiGenerated, [
      `  - Deprecation: ${route.deprecation}`,
    ])
  }
}

requireIncludes('docs publish env contract', docsPublishing + envDocs + configTs, [
  'DOCS_SITE_URL',
  'DOCS_BASE_URL',
  'DOCS_SHOW_LAST_UPDATE_TIME',
  "process.env.DOCS_SITE_URL ?? 'https://docs.opensoha.dev'",
  "process.env.DOCS_BASE_URL ?? '/'",
])

requireIncludes('docs CI sibling contracts checkout', ciWorkflow, [
  'repository: opensoha/soha-contracts',
  'path: soha-contracts',
  'working-directory: soha-docs',
])
