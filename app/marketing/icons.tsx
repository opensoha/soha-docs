import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  )
}

export function ArrowRight(props: IconProps) {
  return <Icon {...props}><path d="M3 8h10M9 4l4 4-4 4" /></Icon>
}

export function ArrowUpRight(props: IconProps) {
  return <Icon {...props}><path d="M5 11l6-6M6 5h5v5" /></Icon>
}

export function CopyIcon(props: IconProps) {
  return <Icon {...props}><rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" /><path d="M10.5 3.5V3A1 1 0 0 0 9.5 2H4a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1h.5" /></Icon>
}

export function CheckIcon(props: IconProps) {
  return <Icon {...props}><path d="M3 8.5l3.2 3L13 4.5" /></Icon>
}
