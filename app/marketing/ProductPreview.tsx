'use client'

import Link from 'next/link'
import { useRef, useState, type KeyboardEvent } from 'react'
import { type Locale, withLocale } from '../i18n'
import { marketingCopy, previewRoutes } from './copy'
import styles from './marketing.module.css'

export function ProductPreview({ locale }: { locale: Locale }) {
  const copy = marketingCopy[locale].preview
  const [selected, setSelected] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  function select(index: number) {
    setSelected(index)
    const item = tabs.current[index]
    const list = item?.parentElement
    if (!item || !list) return
    const target = item.getBoundingClientRect()
    const viewport = list.getBoundingClientRect()
    if (target.left < viewport.left) list.scrollLeft += target.left - viewport.left
    else if (target.right > viewport.right) list.scrollLeft += target.right - viewport.right
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % 4
      : event.key === 'ArrowLeft' ? (index + 3) % 4
      : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : null
    if (next === null) return
    event.preventDefault()
    select(next)
    tabs.current[next]?.focus({ preventScroll: true })
  }
  return (
    <figure className={styles.preview}>
      <div className={styles.tabs} role="tablist" aria-label={copy.label}>
        {copy.tabs.map((tab, index) => (
          <button type="button" role="tab" key={tab} id={`preview-tab-${index}`}
            aria-controls={`preview-panel-${index}`} aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1} ref={(element) => { tabs.current[index] = element }}
            onClick={() => select(index)} onKeyDown={(event) => navigate(event, index)}>{tab}</button>
        ))}
      </div>
      {copy.tabs.map((tab, index) => <div className={styles.previewPanel} key={tab} role="tabpanel" id={`preview-panel-${index}`} aria-labelledby={`preview-tab-${index}`} hidden={selected !== index} tabIndex={0}>
        <div className={styles.sceneCopy}><h3>{copy.titles[index]}</h3><p>{copy.bodies[index]}</p><Link className={styles.textLink} href={withLocale(locale, previewRoutes[index])}>{copy.links[index]}<span aria-hidden="true">↗</span></Link></div>
        <div className={styles.diagram} role="group" aria-label={copy.diagrams[index]} data-scenario={index}>
          {index === 0 && <div className={styles.accessFlow}>
            <div className={styles.sourceStack}>{copy.access.slice(0, 2).map((label) => <span key={label}>{label}</span>)}</div>
            <span className={styles.flowArrow} aria-hidden="true">→</span><strong className={styles.blueEntity}>{copy.access[2]}</strong><span className={styles.flowArrow} aria-hidden="true">→</span><span className={styles.entity}>{copy.access[3]}</span>
          </div>}
          {index === 1 && <div className={styles.resourceFlow}>
            <div className={styles.resourceList}>{copy.resources.slice(0, 3).map((label) => <span key={label}>{label}</span>)}</div>
            <span className={styles.flowArrow} aria-hidden="true">→</span><div className={styles.actionStack}><strong>{copy.resources[3]}</strong><strong>{copy.resources[4]}</strong></div>
            <div className={styles.auditLine}><span aria-hidden="true">↓</span><span>{copy.resources[5]}</span></div>
          </div>}
          {index === 2 && <div className={styles.deliveryFlow}>
            <ol>{[0, 2, 4].map((item) => <li key={item}><strong>{copy.delivery[item]}</strong><span>{copy.delivery[item + 1]}</span></li>)}</ol><p>{copy.delivery[6]}</p>
          </div>}
          {index === 3 && <div className={styles.investigationFlow}>
            <div className={styles.evidence}>{copy.investigation.slice(0, 3).map((label) => <span key={label}>{label}</span>)}</div>
            <span className={styles.flowArrow} aria-hidden="true">↓</span><strong className={styles.blueEntity}>{copy.investigation[3]}</strong><span className={styles.flowArrow} aria-hidden="true">↓</span>
            <div className={styles.investigationResult}><span>{copy.investigation[4]}</span><span>{copy.investigation[5]}</span></div>
          </div>}
        </div>
      </div>)}
    </figure>
  )
}
