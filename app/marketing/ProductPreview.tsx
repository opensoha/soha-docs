'use client'

import Link from 'next/link'
import { useRef, useState, type KeyboardEvent } from 'react'
import { type Locale, withLocale } from '../i18n'
import { marketingCopy, previewRoutes } from './copy'
import { ArrowRight } from './icons'
import styles from './marketing.module.css'

function FlowArrow() {
  return <span className={styles.flowArrow} aria-hidden="true"><ArrowRight width="20" height="20" /></span>
}

export function ProductPreview({ locale }: { locale: Locale }) {
  const copy = marketingCopy[locale].preview
  const [selected, setSelected] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % 4
      : event.key === 'ArrowLeft' ? (index + 3) % 4
      : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : null
    if (next === null) return
    event.preventDefault()
    setSelected(next)
    tabs.current[next]?.focus({ preventScroll: true })
  }
  return (
    <figure className={styles.preview}>
      <div className={styles.tabs} role="tablist" aria-label={copy.label}>
        {copy.tabs.map((tab, index) => (
          <button type="button" role="tab" key={tab} id={`preview-tab-${index}`}
            aria-controls={`preview-panel-${index}`} aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1} ref={(element) => { tabs.current[index] = element }}
            onClick={() => setSelected(index)} onKeyDown={(event) => navigate(event, index)}>{tab}</button>
        ))}
      </div>
      {copy.tabs.map((tab, index) => <div className={styles.previewPanel} key={tab} role="tabpanel" id={`preview-panel-${index}`} aria-labelledby={`preview-tab-${index}`} hidden={selected !== index} tabIndex={0}>
        <div className={styles.sceneCopy}>
          <h3>{copy.titles[index]}</h3>
          <p>{copy.bodies[index]}</p>
          <ul className={styles.scenePoints}>{copy.points[index].map((point) => <li key={point}>{point}</li>)}</ul>
          <Link className={styles.textLink} href={withLocale(locale, previewRoutes[index])}>{copy.links[index]}<ArrowRight /></Link>
        </div>
        <div className={styles.diagram} role="group" aria-label={copy.diagrams[index]} data-scenario={index}>
          {index === 0 && <div className={styles.accessFlow}>
            <div className={styles.sourceStack}>{copy.access.slice(0, 2).map((label) => <span key={label}>{label}</span>)}</div>
            <FlowArrow /><strong className={styles.blueEntity}>{copy.access[2]}</strong><FlowArrow /><span className={styles.entity}>{copy.access[3]}</span>
          </div>}
          {index === 1 && <div className={styles.resourceFlow}>
            <div className={styles.resourceList}>{copy.resources.slice(0, 3).map((label) => <span key={label}>{label}</span>)}</div>
            <FlowArrow /><div className={styles.actionStack}><strong>{copy.resources[3]}</strong><strong>{copy.resources[4]}</strong></div>
            <div className={styles.auditLine}><span className={styles.downArrow} aria-hidden="true"><ArrowRight width="18" height="18" /></span><span>{copy.resources[5]}</span></div>
          </div>}
          {index === 2 && <div className={styles.deliveryFlow}>
            <ol>{[0, 2, 4].map((item) => <li key={item}><strong>{copy.delivery[item]}</strong><span>{copy.delivery[item + 1]}</span></li>)}</ol><p>{copy.delivery[6]}</p>
          </div>}
          {index === 3 && <div className={styles.investigationFlow}>
            <div className={styles.evidence}>{copy.investigation.slice(0, 3).map((label) => <span key={label}>{label}</span>)}</div>
            <span className={styles.downArrow} aria-hidden="true"><ArrowRight width="20" height="20" /></span><strong className={styles.blueEntity}>{copy.investigation[3]}</strong><span className={styles.downArrow} aria-hidden="true"><ArrowRight width="20" height="20" /></span>
            <div className={styles.investigationResult}><span>{copy.investigation[4]}</span><span>{copy.investigation[5]}</span></div>
          </div>}
        </div>
      </div>)}
    </figure>
  )
}
