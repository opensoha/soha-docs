import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { isLocale, locales } from '../i18n'

type LayoutProps = {
  children: ReactNode
  params: Promise<{
    locale: string
  }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params
  if (!isLocale(locale)) {
    notFound()
  }

  return children
}
