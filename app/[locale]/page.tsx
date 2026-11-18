import { notFound } from 'next/navigation'
import { isLocale, locales } from '../i18n'
import { MarketingHome } from '../marketing/MarketingHome'

type PageProps = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return <MarketingHome locale={locale} />
}
