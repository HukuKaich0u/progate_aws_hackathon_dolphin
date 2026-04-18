import type { PropsWithChildren } from 'react'

type SheetProps = PropsWithChildren<{
  open: boolean
}>

export function Sheet({ children, open }: SheetProps) {
  if (!open) {
    return null
  }

  return (
    <section
      style={{
        background: '#111827',
        border: '1px solid #334155',
        borderRadius: '1rem',
        marginTop: '1rem',
        padding: '1rem',
      }}
    >
      {children}
    </section>
  )
}
