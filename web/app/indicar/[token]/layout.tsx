import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Indicação — Hormone Ecosystem',
  other: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  },
}

export default function IndicarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
