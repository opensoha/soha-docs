import { generateStaticParamsFor, importPage } from 'nextra/pages'
import Link from 'next/link'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { type Locale, isLocale, withLocale } from '../../../i18n'
import { useMDXComponents as getMDXComponents } from '../../../../mdx-components'

type PageProps = {
  params: Promise<{
    locale: string
    mdxPath?: string[]
  }>
}

export const generateStaticParams = generateStaticParamsFor('mdxPath', 'locale')
const Wrapper = getMDXComponents().wrapper

const contentRoot = path.join(process.cwd(), 'content')
const docExtensions = ['md', 'mdx'] as const

async function fileExists(file: string) {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

async function docsSourceExists(locale: Locale, mdxPath: string[]) {
  if (mdxPath.some((segment) => segment === '..' || segment.includes('/'))) {
    return false
  }

  const localeRoot = path.join(contentRoot, locale)
  const candidates =
    mdxPath.length === 0
      ? docExtensions.map((extension) => path.join(localeRoot, `index.${extension}`))
      : docExtensions.flatMap((extension) => [
          path.join(localeRoot, ...mdxPath) + `.${extension}`,
          path.join(localeRoot, ...mdxPath, `index.${extension}`),
        ])

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return true
    }
  }
  return false
}

async function loadDocsPage(locale: Locale, mdxPath: string[]) {
  if (!(await docsSourceExists(locale, mdxPath))) {
    return null
  }

  try {
    return await importPage(mdxPath, locale)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { locale: rawLocale, mdxPath = [] } = await params
  if (!isLocale(rawLocale)) {
    return { title: 'Not found' }
  }

  const result = await loadDocsPage(rawLocale, mdxPath)
  return result?.metadata ?? { title: rawLocale === 'zh' ? '文档未找到' : 'Document not found' }
}

export default async function DocsPage(props: PageProps) {
  const params = await props.params
  const rawLocale = params.locale
  if (!isLocale(rawLocale)) {
    return null
  }

  const locale = rawLocale
  const mdxPath = params.mdxPath ?? []
  const result = await loadDocsPage(locale, mdxPath)

  if (!result) {
    return (
      <main className="x:mx-auto x:max-w-(--nextra-content-width) x:px-6 x:py-16">
        <h1 className="x:text-3xl x:font-bold">
          {locale === 'zh' ? '文档未找到' : 'Document not found'}
        </h1>
        <p className="x:mt-4 x:text-gray-600 x:dark:text-gray-400">
          {locale === 'zh'
            ? '这个公开文档入口已移除或不存在。'
            : 'This public documentation entry was removed or does not exist.'}
        </p>
        <p className="x:mt-6">
          <Link href={withLocale(locale, '/docs')}>
            {locale === 'zh' ? '返回文档总览' : 'Back to docs'}
          </Link>
        </p>
      </main>
    )
  }

  const { default: MDXContent, metadata, sourceCode, toc } = result

  if (!Wrapper) {
    return <MDXContent {...props} params={params} />
  }

  return (
    <Wrapper metadata={metadata} sourceCode={sourceCode} toc={toc}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
