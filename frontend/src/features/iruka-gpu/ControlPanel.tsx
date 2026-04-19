import { useEffect, useRef, useState } from 'react'
import { LABELS } from './config'
import { dispatchMock, startAmbientPings } from './mock-events'

const PRESETS: readonly { label: string; count: number }[] = [
  { label: '1', count: 1 },
  { label: '10', count: 10 },
  { label: '126', count: 126 },
  { label: '500', count: 500 },
  { label: '1,000', count: 1000 },
]

export function ControlPanel() {
  const [count, setCount] = useState(126)
  const [text, setText] = useState(LABELS[0])
  const [ambient, setAmbient] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (ambient) {
      stopRef.current = startAmbientPings(700)
    } else {
      stopRef.current?.()
      stopRef.current = null
    }
    return () => {
      stopRef.current?.()
      stopRef.current = null
    }
  }, [ambient])

  return (
    <section className="iruka-controls" aria-label="Dispatcher controls">
      <div className="iruka-controls__row">
        <label className="iruka-controls__field">
          <span>Phrase</span>
          <select value={text} onChange={(e) => setText(e.target.value)}>
            {LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="iruka-controls__field">
          <span>Dispatch N</span>
          <input
            type="number"
            min={1}
            max={10000}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(10000, Number(e.target.value) || 0)))}
          />
        </label>
      </div>

      <div className="iruka-controls__row iruka-controls__row--presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={`iruka-chip${count === p.count ? ' iruka-chip--on' : ''}`}
            type="button"
            onClick={() => setCount(p.count)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="iruka-controls__row iruka-controls__row--actions">
        <button
          type="button"
          className="iruka-btn iruka-btn--primary"
          onClick={() => dispatchMock(count)}
        >
          ▶ Dispatch {count.toLocaleString()} requests
        </button>
        <button
          type="button"
          className={`iruka-btn${ambient ? ' iruka-btn--toggle-on' : ''}`}
          onClick={() => setAmbient((v) => !v)}
          title="Continuously send random requests to keep the pod alive"
        >
          {ambient ? '■ Stop ambient' : '🌊 Ambient pings'}
        </button>
      </div>
    </section>
  )
}
