import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = 'quality/docs-screenshot-regression.json'
const updateMode = process.argv.includes('--update')

function fromRoot(file) {
  return path.join(root, file)
}

async function read(file) {
  return readFile(fromRoot(file), 'utf8')
}

async function readJson(file) {
  return JSON.parse(await read(file))
}

async function exists(file) {
  try {
    await stat(fromRoot(file))
    return true
  } catch {
    return false
  }
}

function routeHTMLPath(routePath) {
  if (routePath === '/') {
    return '.next/server/app/index.html'
  }
  return path.posix.join('.next/server/app', `${routePath.replace(/^\/|\/$/g, '')}.html`)
}

function baselinePath(manifest, routeID, viewportName) {
  return path.posix.join(manifest.baselineDir, `${routeID}.${viewportName}.json`)
}

function requiredSnippets(assertion) {
  switch (assertion) {
    case 'navbar':
      return ['OpenSoha', '文档', '中文', 'github.com/opensoha/soha']
    case 'sidebar':
      return ['nextra-sidebar', 'API 与 Contracts']
    case 'main-content':
      return ['__MAIN_CONTENT__']
    case 'homepage-actions':
      return ['home-actions', '开始阅读文档', 'API 与 Contracts', 'AI Gateway']
    case 'code-blocks':
      return ['<pre']
    case 'generated-reference-link':
      return ['/docs/api/reference/generated/', 'Generated reference']
    case 'runbook-sections':
      return ['Agent Fleet', 'Connector Runtime', 'Delivery Runner', 'AI Gateway Approval And Governance']
    case 'acceptance-record':
      return ['文档发布验收记录', 'Vercel project', 'Deployment URL', 'Pending external Vercel publish']
    default:
      throw new Error(`unknown screenshot assertion ${assertion}`)
  }
}

function assertRenderedHTML(route, htmlPath, html) {
  const missing = []
  if (!/^<!doctype html>/i.test(html)) {
    missing.push('<!DOCTYPE html>')
  }
  const htmlTagCount = html.match(/<html\b/gi)?.length ?? 0
  const bodyTagCount = html.match(/<body\b/gi)?.length ?? 0
  if (htmlTagCount !== 1) {
    missing.push(`document shell: expected 1 <html>, found ${htmlTagCount}`)
  }
  if (bodyTagCount !== 1) {
    missing.push(`document shell: expected 1 <body>, found ${bodyTagCount}`)
  }
  if (/<body\b[\s\S]*<html\b/i.test(html)) {
    missing.push('document shell: nested <html> inside <body>')
  }
  for (const assertion of route.assertions) {
    for (const snippet of requiredSnippets(assertion)) {
      if (snippet === '__MAIN_CONTENT__') {
        if (!html.includes('nextra-skip-nav') && !html.includes('home-shell')) {
          missing.push(`${assertion}: nextra content shell`)
        }
        continue
      }
      if (!html.includes(snippet)) {
        missing.push(`${assertion}: ${snippet}`)
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(`${htmlPath} does not satisfy screenshot assertions:\n${missing.map((item) => `- ${item}`).join('\n')}`)
  }
}

async function buildBaseline(manifest, route, viewport, htmlPath, html) {
  return {
    schemaVersion: 'opensoha.dev/docs-screenshot-baseline/v1',
    routeId: route.id,
    routePath: route.path,
    source: route.source,
    viewport,
    htmlPath,
    assertions: route.assertions,
    assertionCount: route.assertions.length,
    renderedLengthFloor: Math.floor(html.length / 1000) * 1000,
  }
}

async function verifyOrUpdateBaseline(manifest, route, viewport, htmlPath, html) {
  const file = baselinePath(manifest, route.id, viewport.name)
  const baseline = await buildBaseline(manifest, route, viewport, htmlPath, html)
  const serialized = `${JSON.stringify(baseline, null, 2)}\n`

  if (updateMode) {
    await mkdir(path.dirname(fromRoot(file)), { recursive: true })
    await writeFile(fromRoot(file), serialized)
    return
  }

  if (!(await exists(file))) {
    throw new Error(`${file} is missing; run npm run screenshots:update after npm run build`)
  }
  const existing = await read(file)
  if (existing !== serialized) {
    throw new Error(`${file} is stale; run npm run build && npm run screenshots:update`)
  }
}

const manifest = await readJson(manifestPath)
const viewports = new Map((manifest.viewports ?? []).map((viewport) => [viewport.name, viewport]))
const visitedBaselines = []

for (const route of manifest.routes ?? []) {
  const htmlPath = routeHTMLPath(route.path)
  if (!(await exists(htmlPath))) {
    throw new Error(`${htmlPath} is missing; run npm run build before screenshot verification`)
  }
  const html = await read(htmlPath)
  assertRenderedHTML(route, htmlPath, html)

  for (const viewportName of route.viewports ?? []) {
    const viewport = viewports.get(viewportName)
    if (!viewport) {
      throw new Error(`${manifestPath}: route ${route.id} references unknown viewport ${viewportName}`)
    }
    await verifyOrUpdateBaseline(manifest, route, viewport, htmlPath, html)
    visitedBaselines.push(baselinePath(manifest, route.id, viewportName))
  }
}

if (updateMode) {
  console.log(`updated ${visitedBaselines.length} docs screenshot baseline records`)
} else {
  console.log(`verified ${visitedBaselines.length} docs screenshot baseline records`)
}
