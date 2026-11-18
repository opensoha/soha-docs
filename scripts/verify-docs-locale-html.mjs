import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function verifyDocumentLanguage(html, lang, source, description) {
  const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<!--[\s\S]*?-->/gi, '')
  const roots = [...document.matchAll(/<html\b[^>]*>/gi)]
  assert.equal(roots.length, 1, `${source}: expected one html element`)
  assert.equal(roots[0][0].match(/\slang=["']([^"']+)["']/i)?.[1], lang, `${source}: wrong server-rendered lang`)
  for (const tag of ['body', '/body', '/html']) {
    assert.equal([...document.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].length, 1, `${source}: expected one ${tag} tag`)
  }
  if (description !== undefined) {
    const tags = document.match(/<meta\b[^>]*\sname="description"[^>]*>/gi) ?? []
    const escaped = description.replace(/[&"'<>]/g, (character) => ({ '&': '&amp;', '"': '&quot;', "'": '&#x27;', '<': '&lt;', '>': '&gt;' })[character])
    assert.equal(tags.length, 1, `${source}: expected one description`)
    assert.ok(tags[0].includes(`content="${escaped}"`), `${source}: wrong localized description`)
  }
}

async function verifyBuild() {
  const root = fileURLToPath(new URL('../.next/server/app/', import.meta.url))
  const files = (await readdir(root, { recursive: true })).filter((file) => /^(en|zh)(?:\.html$|\/.*\.html$)/.test(file))
  for (const required of ['en.html', 'zh.html', 'en/docs.html', 'zh/docs.html']) {
    assert.ok(files.includes(required), `${required}: missing static HTML; run npm run build first`)
  }
  const descriptions = {
    'en.html': 'Soha helps small and medium-sized businesses solve everyday operations challenges. OpenSoha documentation helps small teams deploy, manage, and maintain their business systems.',
    'zh.html': 'Soha，解决中小企业运维难题。OpenSoha 公开文档帮助人手有限的团队部署、管理和维护业务系统。',
  }
  for (const file of files) {
    verifyDocumentLanguage(await readFile(path.join(root, file), 'utf8'), file.startsWith('en') ? 'en' : 'zh-CN', file, descriptions[file])
  }
  console.log(`Verified server-rendered document languages for ${files.length} static pages.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyBuild()
}
