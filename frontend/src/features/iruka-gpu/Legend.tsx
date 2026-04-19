const ITEMS: readonly { color: string; label: string; hint: string }[] = [
  { color: '#e6f2ff', label: 'Idle', hint: 'waiting for work' },
  { color: '#fbbf24', label: 'Busy', hint: 'running inference' },
  { color: '#34d399', label: 'Returned', hint: 'jumped with result' },
  { color: '#ef4444', label: 'Error', hint: 'inference failed' },
]

export function Legend() {
  return (
    <aside className="iruka-legend" aria-label="Dolphin states">
      {ITEMS.map((it) => (
        <div key={it.label} className="iruka-legend__item">
          <span className="iruka-legend__dot" style={{ background: it.color }} />
          <span className="iruka-legend__text">
            <strong>{it.label}</strong>
            <em>{it.hint}</em>
          </span>
        </div>
      ))}
    </aside>
  )
}
