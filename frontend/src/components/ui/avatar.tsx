type AvatarProps = {
  fallback: string
}

export function Avatar({ fallback }: AvatarProps) {
  return (
    <div
      aria-label={fallback}
      style={{
        alignItems: 'center',
        background: '#334155',
        borderRadius: '999px',
        display: 'inline-flex',
        height: '2.5rem',
        justifyContent: 'center',
        width: '2.5rem',
      }}
    >
      {fallback.slice(0, 2).toUpperCase()}
    </div>
  )
}
