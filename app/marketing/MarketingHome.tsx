import Link from 'next/link'
import { type Locale, withLocale } from '../i18n'
import { marketingCopy, quickStartCommand } from './copy'
import { CopyCommandButton } from './CopyCommandButton'
import { homeFontClassName } from './fonts'
import { ArrowRight, ArrowUpRight } from './icons'
import { MarketingHeader } from './MarketingHeader'
import { ProductPreview } from './ProductPreview'
import styles from './marketing.module.css'

// Apply the docs theme choice (next-themes `theme` key) before first paint on direct visits.
const themeScript = `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t}catch(e){}`

export function MarketingHome({ locale }: { locale: Locale }) {
  const copy = marketingCopy[locale]
  return (
    <div className={`${styles.home} ${homeFontClassName}`} data-soha-home>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <MarketingHeader locale={locale} />
      <main id="main-content" tabIndex={-1}>
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1 id="hero-title" className={styles.heroTitle}>{copy.title.map((line) => <span key={line}>{line}</span>)}</h1>
            <p className={styles.lead}>{copy.lead}</p>
            <div className={styles.actions} data-soha-home-actions>
              <Link className={styles.primary} href={withLocale(locale, '/docs/tutorials/first-deploy')}>{copy.start}<ArrowRight /></Link>
              <Link className={styles.secondary} href={withLocale(locale, '/docs')}>{copy.docs}<ArrowRight /></Link>
            </div>
          </div>
          <figure className={styles.terminal} aria-labelledby="quick-start-title">
            <div className={styles.terminalBar}>
              <span className={styles.terminalDots} aria-hidden="true"><i /><i /><i /></span>
              <figcaption id="quick-start-title">{copy.quickStart.label}<span>{copy.quickStart.tool}</span></figcaption>
              <CopyCommandButton command={quickStartCommand} labels={copy.quickStart} />
            </div>
            <pre className={styles.terminalCode} tabIndex={0}><code>{quickStartCommand.split('\n').map((line) => (
              <span key={line} className={line.startsWith(' ') ? undefined : styles.prompt}>{line}{'\n'}</span>
            ))}</code></pre>
            <div className={styles.terminalNote}>
              <p>{copy.quickStart.note}</p>
              <Link className={styles.textLink} href={withLocale(locale, '/docs/tutorials/first-deploy')}>{copy.quickStart.link}<ArrowRight /></Link>
            </div>
          </figure>
        </section>
        <section className={`${styles.container} ${styles.capabilities}`} id="capabilities" aria-labelledby="capabilities-title">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>{copy.preview.eyebrow}</p>
            <h2 id="capabilities-title" className={styles.sectionTitle}>{copy.preview.heading}</h2>
          </header>
          <ProductPreview locale={locale} />
        </section>
        <section className={`${styles.container} ${styles.steps} ${styles.reveal}`} aria-labelledby="steps-title">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>{copy.steps.eyebrow}</p>
            <h2 id="steps-title" className={styles.sectionTitle}>{copy.steps.heading}</h2>
          </header>
          <ol className={styles.stepList}>
            {copy.steps.items.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepIndex} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <Link className={styles.textLink} href={withLocale(locale, step.href)}>{step.link}<ArrowRight /></Link>
              </li>
            ))}
          </ol>
        </section>
        <section className={`${styles.container} ${styles.host} ${styles.reveal}`} id="self-hosted" aria-labelledby="host-title">
          <div className={styles.hostIntro}>
            <p className={styles.eyebrow}>{copy.hostLabel}</p>
            <h2 id="host-title" className={styles.sectionTitle}>{copy.hostTitle}</h2>
            <p className={styles.hostLead}>{copy.hostLead}</p>
            <div className={styles.hostLinks}>
              <Link className={styles.textLink} href={withLocale(locale, '/docs/self-hosted')}>{copy.hostLink}<ArrowRight /></Link>
              <a className={styles.textLink} href="https://github.com/opensoha/soha">{copy.source}<ArrowUpRight /></a>
            </div>
          </div>
          <ul className={styles.componentList} aria-label={copy.components.label}>
            {copy.components.items.map((item) => (
              <li key={item.name}>
                <Link href={withLocale(locale, item.href)}>
                  <strong>{item.name}</strong>
                  <span>{item.body}</span>
                  <ArrowRight className={styles.componentArrow} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}>
        <div className={styles.footerBrand}><Link className={styles.brand} href={withLocale(locale, '/')}><img src="/logo.svg" alt="" width="24" height="24" /><span>Soha</span></Link><p>{copy.community}</p></div>
        <div className={styles.footerLinks}><Link href={withLocale(locale, '/docs')}>{copy.docs}</Link><a href="https://github.com/opensoha/soha">GitHub</a><a href="https://github.com/opensoha/soha/blob/main/LICENSE">{copy.license}</a></div>
      </footer>
    </div>
  )
}
