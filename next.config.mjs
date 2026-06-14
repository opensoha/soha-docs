import nextra from 'nextra'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const nextThemesShim = join(projectRoot, 'app/next-themes-shim.tsx')
const nextThemesShimTurbopack = './app/next-themes-shim.tsx'

function normalizeBasePath(value) {
  if (!value || value === '/') {
    return undefined
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '')
}

const docsSiteUrl = process.env.DOCS_SITE_URL ?? 'https://docs.opensoha.dev'
const basePath = normalizeBasePath(process.env.DOCS_BASE_URL)

const withNextra = nextra({
  contentDirBasePath: '/docs',
  defaultShowCopyCode: true,
  search: {
    codeblocks: false,
  },
  unstable_shouldAddLocaleToLinks: true,
})

export default withNextra({
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
  },
  trailingSlash: true,
  basePath,
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      'next-themes': nextThemesShimTurbopack,
      'next-mdx-import-source-file': './mdx-components.tsx',
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'next-themes': nextThemesShim,
    }
    return config
  },
  images: {
    unoptimized: true,
  },
  env: {
    DOCS_SITE_URL: docsSiteUrl,
    DOCS_BASE_URL: process.env.DOCS_BASE_URL ?? '/',
  },
})
