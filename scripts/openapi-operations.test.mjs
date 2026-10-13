import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openAPIOperations } from './openapi-operations.mjs'

test('reads every operation from the canonical artifact without relying on YAML line layout', () => {
  const document = JSON.parse('{"paths":{"/feed":{"get":{"tags":["AI Workbench"],"operationId":"listFeed","responses":{"200":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/Feed"}}}}}},"parameters":[{"name":"ignored"}]},"/messages/{id}/window":{"patch":{"operationId":"updateWindow","summary":"A quoted summary","requestBody":{"schema":{"oneOf":[{"$ref":"#/components/schemas/Window"},{"$ref":"#/components/schemas/Window"}]}}}}}}')
  assert.deepEqual(openAPIOperations(document), [
    { method: 'GET', path: '/feed', tag: 'AI Workbench', operationId: 'listFeed', summary: '', schemaRefs: ['Feed'] },
    { method: 'PATCH', path: '/messages/{id}/window', tag: '', operationId: 'updateWindow', summary: 'A quoted summary', schemaRefs: ['Window'] },
  ])
  assert.deepEqual(openAPIOperations({ paths: {} }), [])
})
