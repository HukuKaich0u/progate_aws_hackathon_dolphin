import { useEffect, useRef, useState } from 'react'
import { SEND_MESSAGES, type SendMessage } from '../send/messages'

const FFT_SIZE = 8192
const WINDOW_HZ = 50
const DETECT_THRESHOLD_DB = -65
const DEBOUNCE_MS = 2000
const METER_MIN_DB = -100
const METER_MAX_DB = -20
const MAX_ENTRIES = 50

type DetectedEntry = {
  id: string
  messageId: string
  label: string
  frequencyHz: number
  db: number
  at: Date
}

type BandReading = {
  message: SendMessage
  db: number
  detected: boolean
}

function formatTime(date: Date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function getAudioContextCtor() {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  )
}

function initialReadings(): BandReading[] {
  return SEND_MESSAGES.map((message) => ({ message, db: -Infinity, detected: false }))
}

export function ReceivePage() {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<DetectedEntry[]>([])
  const [readings, setReadings] = useState<BandReading[]>(initialReadings)
  const [sampleRate, setSampleRate] = useState<number | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastDetectRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const Ctor = getAudioContextCtor()
    if (Ctor) {
      try {
        const ctx = audioCtxRef.current ?? new Ctor()
        audioCtxRef.current = ctx
        setSampleRate(ctx.sampleRate)
      } catch {
        // ignored; populated on first user gesture
      }
    }
    return () => {
      stopInternal()
      const ctx = audioCtxRef.current
      audioCtxRef.current = null
      if (ctx && ctx.state !== 'closed') {
        void ctx.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopInternal() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    sourceRef.current?.disconnect()
    analyserRef.current?.disconnect()
    sourceRef.current = null
    analyserRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function handleStart() {
    if (isListening) return
    setError(null)
    try {
      const Ctor = getAudioContextCtor()
      if (!Ctor) throw new Error('このブラウザは Web Audio API に対応していません。')
      const ctx = audioCtxRef.current ?? new Ctor()
      audioCtxRef.current = ctx
      setSampleRate(ctx.sampleRate)
      if (ctx.state === 'suspended') await ctx.resume()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.3
      source.connect(analyser)
      sourceRef.current = source
      analyserRef.current = analyser

      setIsListening(true)
      runLoop()
    } catch (caught) {
      stopInternal()
      setError(
        caught instanceof Error
          ? caught.name === 'NotAllowedError'
            ? 'マイク権限が拒否されました。'
            : caught.message
          : 'マイクの取得に失敗しました。',
      )
    }
  }

  function handleStop() {
    stopInternal()
    setIsListening(false)
    setReadings(initialReadings())
  }

  function runLoop() {
    const analyser = analyserRef.current
    const ctx = audioCtxRef.current
    if (!analyser || !ctx) return

    const bin = new Float32Array(analyser.frequencyBinCount)
    const binHz = ctx.sampleRate / analyser.fftSize

    const step = () => {
      analyser.getFloatFrequencyData(bin)
      const now = Date.now()

      const bandReadings: BandReading[] = []
      let bestDetection: { message: SendMessage; db: number } | null = null

      for (const message of SEND_MESSAGES) {
        const loIdx = Math.max(0, Math.floor((message.frequencyHz - WINDOW_HZ) / binHz))
        const hiIdx = Math.min(bin.length - 1, Math.ceil((message.frequencyHz + WINDOW_HZ) / binHz))
        let peak = -Infinity
        for (let i = loIdx; i <= hiIdx; i += 1) {
          if (bin[i] > peak) peak = bin[i]
        }
        const detected = Number.isFinite(peak) && peak > DETECT_THRESHOLD_DB
        bandReadings.push({ message, db: peak, detected })
        if (detected && (!bestDetection || peak > bestDetection.db)) {
          bestDetection = { message, db: peak }
        }
      }

      setReadings(bandReadings)

      if (bestDetection) {
        const lastAt = lastDetectRef.current[bestDetection.message.id] ?? 0
        if (now - lastAt > DEBOUNCE_MS) {
          lastDetectRef.current[bestDetection.message.id] = now
          const entry: DetectedEntry = {
            id: `${now}-${bestDetection.message.id}`,
            messageId: bestDetection.message.id,
            label: bestDetection.message.label,
            frequencyHz: bestDetection.message.frequencyHz,
            db: bestDetection.db,
            at: new Date(now),
          }
          setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES))
        }
      }

      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  function handleClear() {
    setEntries([])
    lastDetectRef.current = {}
  }

  const nyquist = sampleRate !== null ? sampleRate / 2 : null

  return (
    <div className="login-screen">
      <button
        aria-label="戻る"
        className="login-back"
        onClick={() => window.history.back()}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
          <path
            d="M15 5l-7 7 7 7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      <main className="login-main">
        <section className="login-form sonic-section" aria-labelledby="receive-title">
          <h1 className="signup-title" id="receive-title">
            受け取る
          </h1>
          <p className="signup-sub">
            マイクで高周波を監視し、届いたメッセージを表示します。
          </p>

          <div className="sonic-info">
            <span>
              サンプリング: {sampleRate !== null ? `${sampleRate.toLocaleString('en-US')} Hz` : '未検出'}
            </span>
            <span>
              検出上限: {nyquist !== null ? `${Math.round(nyquist).toLocaleString('en-US')} Hz` : '未検出'}
            </span>
          </div>

          <p
            className={`sonic-status sonic-status--${isListening ? 'on' : 'off'}`}
            role="status"
          >
            <span className="sonic-dot" aria-hidden="true" />
            {isListening ? '受信中' : '停止中'}
          </p>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          {isListening ? (
            <button className="login-submit sonic-danger" onClick={handleStop} type="button">
              受信停止
            </button>
          ) : (
            <button
              className="login-submit"
              onClick={() => void handleStart()}
              type="button"
            >
              受信開始
            </button>
          )}
        </section>

        <section className="login-form sonic-section" aria-labelledby="receive-meters-title">
          <h2 className="sonic-section-title" id="receive-meters-title">
            周波数ごとのレベル
          </h2>
          <ul className="receive-meters">
            {readings.map(({ message, db, detected }) => {
              const finite = Number.isFinite(db) ? db : METER_MIN_DB
              const clamped = Math.max(METER_MIN_DB, Math.min(METER_MAX_DB, finite))
              const pct = ((clamped - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)) * 100
              return (
                <li
                  className={`receive-meter${detected ? ' receive-meter--on' : ''}`}
                  key={message.id}
                >
                  <div className="receive-meter-head">
                    <span className="receive-meter-label">{message.label}</span>
                    <span className="receive-meter-freq">{message.frequencyHz} Hz</span>
                  </div>
                  <div className="receive-meter-bar">
                    <div
                      className="receive-meter-bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="receive-meter-db">
                    {Number.isFinite(db) ? `${db.toFixed(1)} dB` : '—'}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="login-form sonic-section" aria-labelledby="receive-log-title">
          <div className="receive-log-head">
            <h2 className="sonic-section-title" id="receive-log-title">
              受信ログ
            </h2>
            {entries.length > 0 ? (
              <button className="signup-linklike" onClick={handleClear} type="button">
                クリア
              </button>
            ) : null}
          </div>
          {entries.length === 0 ? (
            <p className="sonic-hint">
              まだ受信がありません。別の端末で `/send` から送ってみてください。
            </p>
          ) : (
            <ul className="receive-entries">
              {entries.map((entry) => (
                <li className="receive-entry" key={entry.id}>
                  <span className="receive-entry-time">{formatTime(entry.at)}</span>
                  <span className="receive-entry-label">{entry.label}</span>
                  <span className="receive-entry-meta">
                    {entry.frequencyHz} Hz · {entry.db.toFixed(1)} dB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="login-footer">
        <p className="login-brandline">Dolphin · Receive</p>
      </footer>
    </div>
  )
}
