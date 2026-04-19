import { useEffect, useRef, useState } from 'react'
import { PHRASES } from './config'
import {
  getSavedWsUrl,
  useDispatcher,
  type DispatchMode,
  type DispatcherApi,
  type Endpoint,
} from './use-dispatcher'

const PRESETS: readonly { label: string; count: number }[] = [
  { label: '1', count: 1 },
  { label: '10', count: 10 },
  { label: '126', count: 126 },
  { label: '500', count: 500 },
  { label: '1,000', count: 1000 },
]

const DEFAULT_WS_URL =
  (import.meta.env.VITE_IRUKA_WS_URL as string | undefined) ?? 'ws://54.249.218.72:8000/ws/infer'

function StatusBadge({ mode, state, detail }: { mode: DispatchMode; state: string; detail?: string }) {
  const tone =
    mode === 'ws' && state === 'open'
      ? 'on'
      : state === 'connecting'
        ? 'warn'
        : state === 'error'
          ? 'err'
          : 'off'
  const label =
    mode === 'ws' && state === 'open'
      ? 'Connected to parent'
      : state === 'connecting'
        ? 'Connecting…'
        : state === 'error'
          ? `Error${detail ? `: ${detail}` : ''}`
          : 'Mock mode (no backend)'
  return <span className={`iruka-status iruka-status--${tone}`}>{label}</span>
}

function ConnectionBar({ dispatcher }: { dispatcher: DispatcherApi }) {
  const [url, setUrl] = useState<string>(() => getSavedWsUrl() || DEFAULT_WS_URL)
  const { mode, wsState, wsDetail, connect, disconnect } = dispatcher
  const isConnected = mode === 'ws' && wsState === 'open'

  return (
    <div className="iruka-controls__connection">
      <StatusBadge mode={mode} state={wsState} detail={wsDetail} />
      <input
        type="text"
        className="iruka-controls__wsurl"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="ws://host:port/ws/infer"
        spellCheck={false}
      />
      {isConnected ? (
        <button type="button" className="iruka-btn iruka-btn--danger" onClick={disconnect}>
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          className="iruka-btn"
          onClick={() => url && connect(url)}
          disabled={wsState === 'connecting' || !url}
        >
          {wsState === 'connecting' ? 'Connecting…' : 'Connect'}
        </button>
      )}
    </div>
  )
}

export function ControlPanel() {
  const [count, setCount] = useState(126)
  const [phraseKey, setPhraseKey] = useState<string>(PHRASES[0].key)
  const [endpoint, setEndpoint] = useState<Endpoint>('/infer')
  const [ambient, setAmbient] = useState(false)
  const dispatcher = useDispatcher()
  const stopAmbientRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (ambient) {
      stopAmbientRef.current = dispatcher.startAmbient(700, { endpoint, phraseKey })
    } else {
      stopAmbientRef.current?.()
      stopAmbientRef.current = null
    }
    return () => {
      stopAmbientRef.current?.()
      stopAmbientRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambient, dispatcher.mode, endpoint, phraseKey])

  const inInferMode = endpoint === '/infer'

  return (
    <section className="iruka-controls" aria-label="Dispatcher controls">
      <ConnectionBar dispatcher={dispatcher} />

      <div className="iruka-controls__row">
        <label className="iruka-controls__field">
          <span>Phrase (WAV)</span>
          <select
            value={phraseKey}
            onChange={(e) => setPhraseKey(e.target.value)}
            disabled={!inInferMode}
          >
            {PHRASES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.text}
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
        <label className="iruka-controls__field iruka-controls__field--endpoint">
          <span>Endpoint</span>
          <select value={endpoint} onChange={(e) => setEndpoint(e.target.value as Endpoint)}>
            <option value="/infer">/infer (iruka_cnn)</option>
            <option value="/hello">/hello (health)</option>
          </select>
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
          onClick={() =>
            dispatcher.dispatch(count, { endpoint, phraseKey: inInferMode ? phraseKey : null })
          }
        >
          ▶ Dispatch {count.toLocaleString()} {endpoint === '/infer' ? 'inferences' : 'pings'}
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
