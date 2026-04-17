import type { PropsWithChildren } from 'react'

type DialogProps = PropsWithChildren<{
  open: boolean
}>

export function Dialog({ children, open }: DialogProps) {
  if (!open) {
    return null
  }

  return <div role="dialog">{children}</div>
}
