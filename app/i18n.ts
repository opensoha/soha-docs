export const locales = ['zh', 'en'] as const
export const defaultLocale = 'zh'

export type Locale = (typeof locales)[number]

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export function localeName(locale: Locale) {
  return locale === 'zh' ? '中文' : 'English'
}

export function withLocale(locale: Locale, path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/${locale}${normalized === '/' ? '' : normalized}`
}
