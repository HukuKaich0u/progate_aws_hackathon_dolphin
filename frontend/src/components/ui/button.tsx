import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>

export function Button({ children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '999px',
        color: '#e2e8f0',
        cursor: 'pointer',
        padding: '0.6rem 1rem',
      }}
    >
      {children}
    </button>
  )
}
