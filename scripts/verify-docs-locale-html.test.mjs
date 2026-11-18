import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyDocumentLanguage } from './verify-docs-locale-html.mjs'

test('checks the initial HTML without executing a client language correction', () => {
  for (const lang of ['en', 'zh-CN']) {
    verifyDocumentLanguage(`<!DOCTYPE html><html lang="${lang}"><body></body></html>`, lang, 'fixture')
  }
  assert.throws(() => verifyDocumentLanguage('<html lang="zh-CN"><body><script>document.documentElement.lang="en"</script></body></html>', 'en', 'fixture'), /wrong server-rendered lang/)
})

test('rejects nested document elements and missing body', () => {
  assert.throws(() => verifyDocumentLanguage('<html lang="en"><body><html lang="en"><body></body></html></body></html>', 'en', 'fixture'), /expected one html element/)
  assert.throws(() => verifyDocumentLanguage('<html lang="en"></html>', 'en', 'fixture'), /expected one body tag/)
})

test('checks localized descriptions and their HTML escaping', () => {
  const html = '<html lang="en"><head><meta name="description" content="Soha &amp; operations"/></head><body></body></html>'
  verifyDocumentLanguage(html, 'en', 'fixture', 'Soha & operations')
  assert.throws(() => verifyDocumentLanguage(html, 'en', 'fixture', '中文描述'), /wrong localized description/)
})
