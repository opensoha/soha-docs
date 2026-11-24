'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from './icons'
import styles from './marketing.module.css'

type CopyState = 'idle' | 'copied' | 'failed'

export function CopyCommandButton({ command, labels }: { command: string, labels: { copy: string, copied: string, failed: string } }) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setState('copied')
    } catch {
      setState('failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2000)
  }

  const label = state === 'copied' ? labels.copied : state === 'failed' ? labels.failed : labels.copy
  return (
    <button type="button" className={styles.copyButton} data-state={state} onClick={copy}>
      {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{label}</span>
    </button>
  )
}
