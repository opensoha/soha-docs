import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

function verify({ length = 8000, floor = 1000, routePath = '/zh/', content = 'home-shell' } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'soha-docs-baseline-'))
  const write = (file, value) => {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value))
  }
  try {
    const viewport = { name: 'desktop', width: 1440, height: 1000 }
    const route = { id: 'home', path: '/zh/', source: 'app/page.tsx', viewports: ['desktop'], assertions: ['main-content'] }
    write('quality/docs-screenshot-regression.json', { baselineDir: 'quality/baselines', viewports: [viewport], routes: [route] })
    write('quality/baselines/home.desktop.json', {
      schemaVersion: 'opensoha.dev/docs-screenshot-baseline/v1', routeId: 'home', routePath,
      source: route.source, viewport, htmlPath: '.next/server/app/zh.html', assertions: route.assertions,
      assertionCount: 1, renderedLengthFloor: floor,
    })
    write('.next/server/app/zh.html', `<!DOCTYPE html><html><body>${content}${'x'.repeat(length)}</body></html>`)
    mkdirSync(path.join(root, 'scripts'))
    const script = path.join(root, 'scripts/verify-docs-screenshots.mjs')
    copyFileSync(new URL('./verify-docs-screenshots.mjs', import.meta.url), script)
    return spawnSync(process.execPath, [script], { encoding: 'utf8' })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('content growth above the recorded floor does not rewrite the baseline', () => {
  const result = verify()
  assert.equal(result.status, 0, result.stderr)
})

test('content below the recorded floor remains a failure', () => {
  const result = verify({ length: 100 })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /shorter than the recorded floor/)
})

test('route metadata changes still require review', () => {
  const result = verify({ routePath: '/wrong/' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /is stale/)
})

test('missing content assertions still fail even when HTML is long enough', () => {
  const result = verify({ content: 'missing-content-shell' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /does not satisfy screenshot assertions/)
})

test('invalid floors cannot silently disable the length check', () => {
  for (const floor of [null, -1, '1000']) {
    const result = verify({ floor })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /invalid rendered length floor/)
  }
})
