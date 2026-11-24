import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import 'nextra-theme-docs/style.css'
import '../global.css'
import { defaultLocale, htmlLang, isLocale, locales, siteDescription } from '../i18n'

type LayoutProps = {
  children: ReactNode
  params: Promise<{
    locale: string
  }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { locale } = await params
  const resolvedLocale = isLocale(locale) ? locale : defaultLocale

  return {
    title: {
      default: 'OpenSoha',
      template: '%s - OpenSoha',
    },
    description: siteDescription(resolvedLocale),
    metadataBase: new URL(process.env.DOCS_SITE_URL ?? 'https://docs.opensoha.com'),
    icons: {
      icon: '/logo.svg',
      shortcut: '/logo.svg',
    },
  }
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params
  if (!isLocale(locale)) {
    notFound()
  }

  return (
    <html lang={htmlLang(locale)} dir="ltr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
