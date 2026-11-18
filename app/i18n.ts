export const locales = ['zh', 'en'] as const
export const defaultLocale = 'zh'

export type Locale = (typeof locales)[number]

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export function localeName(locale: Locale) {
  return locale === 'zh' ? '中文' : 'English'
}

export function htmlLang(locale: Locale) {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

export function siteDescription(locale: Locale) {
  return locale === 'zh'
    ? 'Soha，解决中小企业运维难题。OpenSoha 公开文档帮助人手有限的团队部署、管理和维护业务系统。'
    : 'Soha helps small and medium-sized businesses solve everyday operations challenges. OpenSoha documentation helps small teams deploy, manage, and maintain their business systems.'
}

export function withLocale(locale: Locale, path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/${locale}${normalized === '/' ? '' : normalized}`
}
