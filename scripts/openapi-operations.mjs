// The generated JSON artifact preserves both block and flow-style YAML operations.
export function openAPIOperations(document) {
  const operations = []
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue
      const schemaRefs = new Set()
      function collectRefs(value) {
        if (!value || typeof value !== 'object') return
        if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/'))
          schemaRefs.add(value.$ref.slice('#/components/schemas/'.length))
        Object.values(value).forEach(collectRefs)
      }
      collectRefs(operation)
      operations.push({
        method: method.toUpperCase(),
        path,
        tag: operation.tags?.[0] ?? '',
        operationId: operation.operationId ?? '',
        summary: operation.summary ?? '',
        schemaRefs: [...schemaRefs].sort(),
      })
    }
  }
  return operations
}
