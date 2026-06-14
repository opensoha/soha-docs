import { Layout, LocaleSwitch, Navbar } from 'nextra-theme-docs'
import type { PageMapItem } from 'nextra'
import type { ReactNode } from 'react'
import { type Locale, localeName, locales } from './i18n'

function createNavbar(locale: Locale) {
  return (
    <Navbar
      key="site-navbar"
      logo={<span className="site-logo">OpenSoha</span>}
      projectLink="https://github.com/opensoha/soha"
    >
      <LocaleSwitch lite className="site-locale-switch" />
    </Navbar>
  )
}

const footer = (
  <footer className="site-footer" key="site-footer">
    Apache-2.0 © {new Date().getFullYear()} OpenSoha contributors.
  </footer>
)

export function SiteThemeLayout({
  children,
  locale,
  pageMap,
}: {
  children: ReactNode
  locale: Locale
  pageMap: PageMapItem[]
}) {
  return (
    <Layout
      banner={null}
      navbar={createNavbar(locale)}
      pageMap={pageMap}
      docsRepositoryBase="https://github.com/opensoha/soha/tree/main/soha-docs"
      editLink="编辑此页"
      feedback={{
        content: '反馈文档问题',
      }}
      footer={footer}
      i18n={locales.map((item) => ({
        locale: item,
        name: localeName(item),
      }))}
      toc={{
        title: locale === 'zh' ? '本页内容' : 'On This Page',
        backToTop: locale === 'zh' ? '回到顶部' : 'Back to top',
      }}
      themeSwitch={{
        dark: locale === 'zh' ? '深色' : 'Dark',
        light: locale === 'zh' ? '浅色' : 'Light',
        system: locale === 'zh' ? '跟随系统' : 'System',
      }}
    >
      {children}
    </Layout>
  )
}
