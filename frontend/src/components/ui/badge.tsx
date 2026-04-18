import type { PropsWithChildren } from 'react'

export function Badge({ children }: PropsWithChildren) {
  return (
    <span
      style={{
        background: '#1d4ed8',
        borderRadius: '999px',
        color: '#eff6ff',
        display: 'inline-block',
        fontSize: '0.875rem',
        padding: '0.25rem 0.75rem',
      }}
    >
      {children}
    </span>
  )
}
