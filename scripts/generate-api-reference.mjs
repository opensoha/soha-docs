import { access, mkdir, readFile, writeFile } from 'node:fs/promises'

const repoRoot = new URL('../', import.meta.url)
const docsRoot = new URL('../content/zh/', import.meta.url)
const contractsRoot = new URL('../../soha-contracts/', import.meta.url)
const outputUrl = new URL('api/reference/generated/index.md', docsRoot)
const routeMetadataOverlayUrl = new URL('api/reference/route-metadata.overlay.json', docsRoot)
const checkMode = process.argv.includes('--check')

async function readContracts(file) {
  return readFile(new URL(file, contractsRoot), 'utf8')
}

async function ensureContractsAvailable() {
  try {
    await access(new URL('openapi/soha-api.yaml', contractsRoot))
  } catch {
    throw new Error(
      'missing ../soha-contracts artifacts; checkout soha-contracts as a sibling of soha-docs before generating API reference',
    )
  }
}

function normalizeOpenAPIPath(path) {
  return path.replace(/\{([^}]+)\}/g, ':$1')
}

function operationRoute(operation) {
  return `${operation.method} /api/v1${normalizeOpenAPIPath(operation.path)}`
}

function parseOpenAPIOperations(raw) {
  const operations = []
  let currentPath = ''
  let currentOperation = null

  for (const line of raw.split(/\r?\n/)) {
    if (/^[A-Za-z][A-Za-z0-9_-]*:\s*$/.test(line) && line !== 'paths:') {
      currentPath = ''
      currentOperation = null
      continue
    }

    const pathMatch = line.match(/^  (\/[A-Za-z0-9_./{}-]+):\s*$/)
    if (pathMatch) {
      currentPath = pathMatch[1]
      currentOperation = null
      continue
    }

    const methodMatch = line.match(/^    (get|post|put|delete|patch):\s*$/)
    if (currentPath && methodMatch) {
      currentOperation = {
        method: methodMatch[1].toUpperCase(),
        path: currentPath,
        tag: '',
        operationId: '',
        summary: '',
        schemaRefs: new Set(),
      }
      operations.push(currentOperation)
      continue
    }

    if (!currentOperation) {
      continue
    }

    const tagMatch = line.match(/^      tags:\s*\[([^\]]+)\]\s*$/)
    if (tagMatch) {
      currentOperation.tag = tagMatch[1].split(',')[0].trim()
      continue
    }

    const operationIdMatch = line.match(/^      operationId:\s*([A-Za-z0-9_]+)\s*$/)
    if (operationIdMatch) {
      currentOperation.operationId = operationIdMatch[1]
      continue
    }

    const summaryMatch = line.match(/^      summary:\s*(.+)\s*$/)
    if (summaryMatch) {
      currentOperation.summary = summaryMatch[1].trim()
      continue
    }

    const schemaRefMatch = line.match(/\$ref:\s*"#\/components\/schemas\/([^"]+)"/)
    if (schemaRefMatch) {
      currentOperation.schemaRefs.add(schemaRefMatch[1])
    }
  }

  return operations.map((operation) => ({
    ...operation,
    schemaRefs: [...operation.schemaRefs].sort(),
  }))
}

function parseOpenAPIMetadata(raw) {
  const title = raw.match(/^  title:\s*([^\n]+)$/m)?.[1]?.trim()
  const version = raw.match(/^  version:\s*([^\n]+)$/m)?.[1]?.trim()
  if (!title || !version) {
    throw new Error('unable to read OpenAPI title/version from ../soha-contracts/openapi/soha-api.yaml')
  }
  return { title, version }
}

function groupOperationsByTag(operations) {
  const groups = new Map()
  for (const operation of operations) {
    const tag = operation.tag || 'Untagged'
    const items = groups.get(tag) ?? []
    items.push(operation)
    groups.set(tag, items)
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
}

async function schemaArtifacts() {
  const packageJson = JSON.parse(await readContracts('package.json'))
  const artifacts = Object.values(packageJson.exports)
    .filter((value) => typeof value === 'string')
    .map((value) => value.replace(/^\.\//, ''))
    .filter((value) => value.endsWith('.schema.json'))
    .sort()

  const out = []
  for (const artifact of artifacts) {
    const schema = JSON.parse(await readContracts(artifact))
    out.push({
      artifact,
      id: schema.$id ?? '',
      title: schema.title ?? artifact,
      required: Array.isArray(schema.required) ? schema.required : [],
    })
  }
  return out
}

function overlayRouteKey(route) {
  return `${route.method.toUpperCase()} ${route.path}`
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`route metadata overlay ${label} must be a non-empty string`)
  }
}

function requireNonEmptyStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`route metadata overlay ${label} must be a non-empty array`)
  }

  for (const [index, item] of value.entries()) {
    requireNonEmptyString(item, `${label}[${index}]`)
  }
}

async function validateExample(example, label) {
  requireNonEmptyString(example.label, `${label}.label`)
  requireNonEmptyString(example.kind, `${label}.kind`)

  if (example.kind === 'contract-example') {
    requireNonEmptyString(example.path, `${label}.path`)
    if (!example.path.startsWith('../soha-contracts/examples/')) {
      throw new Error(`${label}.path must point at ../soha-contracts/examples/`)
    }
    await access(new URL(example.path, repoRoot))
    return
  }

  if (example.kind === 'http') {
    requireNonEmptyString(example.value, `${label}.value`)
    return
  }

  throw new Error(`${label}.kind must be contract-example or http`)
}

async function loadRouteMetadataOverlay(operations) {
  const overlay = JSON.parse(await readFile(routeMetadataOverlayUrl, 'utf8'))
  if (overlay.version !== 1) {
    throw new Error('route metadata overlay version must be 1')
  }
  if (!Array.isArray(overlay.routes)) {
    throw new Error('route metadata overlay routes must be an array')
  }

  const operationRoutes = new Set(operations.map(operationRoute))
  const routeMetadata = new Map()
  for (const [index, route] of overlay.routes.entries()) {
    requireNonEmptyString(route.method, `routes[${index}].method`)
    requireNonEmptyString(route.path, `routes[${index}].path`)
    requireNonEmptyString(route.status, `routes[${index}].status`)
    requireNonEmptyStringArray(route.permissions, `routes[${index}].permissions`)
    requireNonEmptyStringArray(route.scopes, `routes[${index}].scopes`)
    requireNonEmptyString(route.audit, `routes[${index}].audit`)
    if (route.compatibility !== undefined) {
      requireNonEmptyStringArray(route.compatibility, `routes[${index}].compatibility`)
    }
    if (route.deprecation !== undefined) {
      requireNonEmptyString(route.deprecation, `routes[${index}].deprecation`)
    }
    if (!Array.isArray(route.examples) || route.examples.length === 0) {
      throw new Error(`route metadata overlay routes[${index}].examples must be a non-empty array`)
    }
    for (const [exampleIndex, example] of route.examples.entries()) {
      await validateExample(example, `routes[${index}].examples[${exampleIndex}]`)
    }

    const routeKey = overlayRouteKey(route)
    if (!operationRoutes.has(routeKey)) {
      throw new Error(`route metadata overlay references unknown OpenAPI route: ${routeKey}`)
    }
    if (routeMetadata.has(routeKey)) {
      throw new Error(`route metadata overlay contains duplicate route: ${routeKey}`)
    }
    routeMetadata.set(routeKey, route)
  }

  return routeMetadata
}

function formatList(values) {
  return values.map((value) => `\`${value}\``).join(', ')
}

function formatExample(example) {
  if (example.kind === 'contract-example') {
    return `${example.label} \`${example.path}\``
  }
  return `${example.label} \`${example.value}\``
}

function operationLines(operation, routeMetadata) {
  const route = operationRoute(operation)
  const refs =
    operation.schemaRefs.length > 0 ? ` Schemas: ${operation.schemaRefs.map((ref) => `\`${ref}\``).join(', ')}.` : ''
  const summary = operation.summary ? ` ${operation.summary}` : ''
  const lines = [`- \`${route}\` - \`${operation.operationId || 'operation'}\`.${summary}${refs}`]
  const metadata = routeMetadata.get(route)
  if (!metadata) {
    return lines
  }

  lines.push(`  - Status: \`${metadata.status}\``)
  lines.push(`  - Permissions: ${formatList(metadata.permissions)}`)
  lines.push(`  - Scopes: ${metadata.scopes.join('; ')}`)
  if (metadata.compatibility) {
    lines.push(`  - Compatibility: ${metadata.compatibility.join('; ')}`)
  }
  if (metadata.deprecation) {
    lines.push(`  - Deprecation: ${metadata.deprecation}`)
  }
  lines.push(`  - Audit: ${metadata.audit}`)
  lines.push(`  - Examples: ${metadata.examples.map(formatExample).join('; ')}`)
  return lines
}

function renderReference({ metadata, operations, routeMetadata, schemas }) {
  const lines = [
    '---',
    'title: Generated API Reference',
    'description: Generated OpenSoha API operation and schema index from the public contracts artifacts.',
    '---',
    '',
    '# Generated API Reference',
    '',
    `Generated from \`../soha-contracts/openapi/soha-api.yaml\` (${metadata.title} ${metadata.version}).`,
    '',
    'This page is generated by `npm run api:reference:generate`. Run `npm run api:reference:check` before publishing docs changes.',
    '',
    '## Operation Index',
    '',
  ]

  for (const [tag, taggedOperations] of groupOperationsByTag(operations)) {
    lines.push(`### ${tag}`, '')
    for (const operation of taggedOperations) {
      lines.push(...operationLines(operation, routeMetadata))
    }
    lines.push('')
  }

  lines.push('## JSON Schema Artifacts', '')
  for (const schema of schemas) {
    lines.push(`- \`${schema.artifact}\` - ${schema.title}.`)
    if (schema.id) {
      lines.push(`  - ID: \`${schema.id}\``)
    }
    if (schema.required.length > 0) {
      lines.push(`  - Required: ${schema.required.map((field) => `\`${field}\``).join(', ')}`)
    }
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}

async function main() {
  await ensureContractsAvailable()
  const openapiRaw = await readContracts('openapi/soha-api.yaml')
  const operations = parseOpenAPIOperations(openapiRaw)
  if (operations.length === 0) {
    throw new Error('no operations parsed from ../soha-contracts/openapi/soha-api.yaml')
  }

  const next = renderReference({
    metadata: parseOpenAPIMetadata(openapiRaw),
    operations,
    routeMetadata: await loadRouteMetadataOverlay(operations),
    schemas: await schemaArtifacts(),
  })

  if (checkMode) {
    const current = await readFile(outputUrl, 'utf8')
    if (current !== next) {
      throw new Error('api/reference/generated/index.md is stale; run npm run api:reference:generate')
    }
    return
  }

  await mkdir(new URL('api/reference/generated/', docsRoot), { recursive: true })
  await writeFile(outputUrl, next)
}

await main()
