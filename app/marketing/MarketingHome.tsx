import Link from 'next/link'
import { type Locale, withLocale } from '../i18n'
import { marketingCopy } from './copy'
import { MarketingHeader } from './MarketingHeader'
import { ProductPreview } from './ProductPreview'
import styles from './marketing.module.css'

export function MarketingHome({ locale }: { locale: Locale }) {
  const copy = marketingCopy[locale]
  return (
    <div className={styles.home} data-soha-home>
      <MarketingHeader locale={locale} />
      <main id="main-content" tabIndex={-1}>
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-title">
          <h1 id="hero-title" className={styles.heroTitle}>{copy.title.map((line) => <span key={line}>{line}</span>)}</h1>
          <p className={styles.lead}>{copy.lead}</p>
          <div className={styles.actions} data-soha-home-actions>
            <Link className={styles.primary} href={withLocale(locale, '/docs/tutorials/first-deploy')}>{copy.start}<span aria-hidden="true">↗</span></Link>
            <Link className={styles.secondary} href={withLocale(locale, '/docs')}>{copy.docs}<span aria-hidden="true">→</span></Link>
          </div>
        </section>
        <section className={`${styles.container} ${styles.capabilities}`} id="capabilities" aria-labelledby="capabilities-title">
          <h2 id="capabilities-title" className={styles.sectionLabel}>{copy.preview.heading}</h2>
          <ProductPreview locale={locale} />
        </section>
        <section className={`${styles.container} ${styles.host} ${styles.reveal}`} id="self-hosted" aria-labelledby="host-title">
          <div><p className={styles.eyebrow}>{copy.hostLabel}</p><h2 id="host-title">{copy.hostTitle}</h2></div>
          <div className={styles.hostDetail}><p>{copy.hostLead}</p><div className={styles.hostLinks}><Link className={styles.textLink} href={withLocale(locale, '/docs/self-hosted')}>{copy.hostLink}<span aria-hidden="true">↗</span></Link><a className={styles.textLink} href="https://github.com/opensoha/soha">{copy.source}<span aria-hidden="true">↗</span></a></div></div>
        </section>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}>
        <div className={styles.footerBrand}><Link className={styles.brand} href={withLocale(locale, '/')}><img src="/logo.svg" alt="" width="24" height="24" /><span>Soha</span></Link><p>{copy.community}</p></div>
        <div className={styles.footerLinks}><Link href={withLocale(locale, '/docs')}>{copy.docs}</Link><a href="https://github.com/opensoha/soha">GitHub</a><a href="https://github.com/opensoha/soha/blob/main/LICENSE">{copy.license}</a></div>
      </footer>
    </div>
  )
}
