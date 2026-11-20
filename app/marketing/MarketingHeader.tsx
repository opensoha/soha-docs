'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { type Locale, withLocale } from '../i18n'
import { marketingCopy } from './copy'
import styles from './marketing.module.css'

export function MarketingHeader({ locale }: { locale: Locale }) {
  const copy = marketingCopy[locale]
  const menu = useRef<HTMLDetailsElement>(null)
  const links = [
    [copy.nav[0], '#capabilities'], [copy.nav[1], '#self-hosted'],
    [copy.nav[2], withLocale(locale, '/docs')],
    [locale === 'zh' ? '演示环境' : 'Live Demo', 'https://demo.opensoha.com/'],
    ['GitHub', 'https://github.com/opensoha/soha'],
    [locale === 'zh' ? 'EN' : '中文', withLocale(locale === 'zh' ? 'en' : 'zh', '/')],
  ]
  const navigation = links.map(([label, href]) => (
    <Link key={href} href={href} hrefLang={label === 'EN' ? 'en' : label === '中文' ? 'zh-CN' : undefined}>
      {label}
    </Link>
  ))
  return (
    <header className={styles.header}>
      <a className={styles.skip} href="#main-content">{copy.nav[4]}</a>
      <div className={`${styles.container} ${styles.headerInner}`}>
        <Link className={styles.brand} href={withLocale(locale, '/')} aria-label="Soha">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>Soha</span>
        </Link>
        <nav className={styles.desktopNav} aria-label={locale === 'zh' ? '主导航' : 'Main navigation'}>{navigation}</nav>
        <details ref={menu} className={styles.mobileMenu} onKeyDown={(event) => {
          if (event.key === 'Escape' && menu.current?.open) {
            menu.current.open = false
            menu.current.querySelector('summary')?.focus()
          }
        }}>
          <summary>{copy.nav[3]} <span aria-hidden="true">+</span></summary>
          <nav aria-label={locale === 'zh' ? '移动导航' : 'Mobile navigation'} onClick={(event) => {
            if ((event.target as HTMLElement).closest('a') && menu.current) menu.current.open = false
          }}>{navigation}</nav>
        </details>
      </div>
    </header>
  )
}
