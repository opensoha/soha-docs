import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import 'nextra-theme-docs/style.css'
import './global.css'

export const metadata: Metadata = {
  title: {
    default: 'OpenSoha',
    template: '%s - OpenSoha',
  },
  description: 'OpenSoha 是面向平台团队的开源 Soha 控制平面文档与产品入口。',
  metadataBase: new URL(process.env.DOCS_SITE_URL ?? 'https://docs.opensoha.dev'),
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html dir="ltr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
