import { getPageMap } from 'nextra/page-map'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { isLocale } from '../../i18n'
import { SiteThemeLayout } from '../../theme-layout'

type LayoutProps = {
  children: ReactNode
  params: Promise<{
    locale: string
  }>
}

export default async function DocsLayout({ children, params }: LayoutProps) {
  const { locale } = await params
  if (!isLocale(locale)) {
    notFound()
  }

  return (
    <SiteThemeLayout locale={locale} pageMap={await getPageMap(`/${locale}/docs`)}>
      {children}
    </SiteThemeLayout>
  )
}
