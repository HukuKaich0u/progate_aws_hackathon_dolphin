import { useEffect, useRef, useState, type ChangeEvent } from 'react'

const MIN_FREQ = 14000
const MAX_FREQ = 28000
const DEFAULT_FREQ = 18000
const MIN_VOLUME = 0
const MAX_VOLUME = 0.3
const DEFAULT_VOLUME = 0.1

const FFT_SIZE = 8192
const SPECTRUM_MIN_HZ = 10000
const SPECTRUM_MAX_HZ = 28000
const BAND_LOW_HZ = 17000
const BAND_HIGH_HZ = 28000
const SPECTRUM_MIN_DB = -120
const SPECTRUM_MAX_DB = -20

function formatHz(value: number) {
  return `${Math.round(value).toLocaleString('en-US')} Hz`
}

function getAudioContextCtor() {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  )
}

export function SonicPage() {
  const [frequency, setFrequency] = useState(DEFAULT_FREQ)
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [isPlaying, setIsPlaying] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  const [isListening, setIsListening] = useState(false)
  const [rxError, setRxError] = useState<string | null>(null)
  const [peakHz, setPeakHz] = useState<number | null>(null)
  const [peakDb, setPeakDb] = useState<number | null>(null)
  const [bandDb, setBandDb] = useState<number | null>(null)

  const [wavName, setWavName] = useState<string | null>(null)
  const [wavUrl, setWavUrl] = useState<string | null>(null)

  const [sampleRate, setSampleRate] = useState<number | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const rxStreamRef = useRef<MediaStream | null>(null)
  const rxSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rxAnalyserRef = useRef<AnalyserNode | null>(null)
  const rxRafRef = useRef<number | null>(null)
  const rxCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const Ctor = getAudioContextCtor()
    if (Ctor) {
      try {
        const ctx = audioCtxRef.current ?? new Ctor()
        audioCtxRef.current = ctx
        setSampleRate(ctx.sampleRate)
      } catch {
        // ignored; sampleRate will be populated on first user gesture
      }
    }
    return () => {
      stopToneInternal()
      stopListeningInternal()
      if (wavUrl) URL.revokeObjectURL(wavUrl)
      const ctx = audioCtxRef.current
      audioCtxRef.current = null
      if (ctx && ctx.state !== 'closed') {
        void ctx.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (oscRef.current && audioCtxRef.current) {
      oscRef.current.frequency.setValueAtTime(frequency, audioCtxRef.current.currentTime)
    }
  }, [frequency])

  useEffect(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime)
    }
  }, [volume])

  async function ensureAudioContext(): Promise<AudioContext> {
    const Ctor = getAudioContextCtor()
    if (!Ctor) throw new Error('このブラウザは Web Audio API に対応していません。')
    const ctx = audioCtxRef.current ?? new Ctor()
    audioCtxRef.current = ctx
    setSampleRate(ctx.sampleRate)
    if (ctx.state === 'suspended') await ctx.resume()
    return ctx
  }

  function stopToneInternal() {
    const osc = oscRef.current
    const gain = gainRef.current
    oscRef.current = null
    gainRef.current = null
    if (osc) {
      try {
        osc.stop()
      } catch {
        // already stopped
      }
      osc.disconnect()
    }
    if (gain) gain.disconnect()
  }

  async function handleStartTx() {
    if (isPlaying) return
    setTxError(null)
    try {
      const ctx = await ensureAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, ctx.currentTime)
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      oscRef.current = osc
      gainRef.current = gain
      setIsPlaying(true)
    } catch (caught) {
      setTxError(caught instanceof Error ? caught.message : '音声の開始に失敗しました。')
    }
  }

  function handleStopTx() {
    stopToneInternal()
    setIsPlaying(false)
  }

  function stopListeningInternal() {
    if (rxRafRef.current !== null) {
      cancelAnimationFrame(rxRafRef.current)
      rxRafRef.current = null
    }
    rxSourceRef.current?.disconnect()
    rxAnalyserRef.current?.disconnect()
    rxSourceRef.current = null
    rxAnalyserRef.current = null
    rxStreamRef.current?.getTracks().forEach((t) => t.stop())
    rxStreamRef.current = null
  }

  async function handleStartRx() {
    if (isListening) return
    setRxError(null)
    try {
      const ctx = await ensureAudioContext()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      rxStreamRef.current = stream

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)
      rxSourceRef.current = source
      rxAnalyserRef.current = analyser

      setIsListening(true)
      runRxLoop()
    } catch (caught) {
      stopListeningInternal()
      setRxError(
        caught instanceof Error
          ? caught.name === 'NotAllowedError'
            ? 'マイク権限が拒否されました。'
            : caught.message
          : 'マイクの取得に失敗しました。',
      )
    }
  }

  function handleStopRx() {
    stopListeningInternal()
    setIsListening(false)
    setPeakHz(null)
    setPeakDb(null)
    setBandDb(null)
  }

  function runRxLoop() {
    const analyser = rxAnalyserRef.current
    const ctx = audioCtxRef.current
    if (!analyser || !ctx) return

    const bin = new Float32Array(analyser.frequencyBinCount)
    const sampleRate = ctx.sampleRate
    const binHz = sampleRate / analyser.fftSize

    const step = () => {
      analyser.getFloatFrequencyData(bin)

      let peakIdx = 0
      let peakValue = -Infinity
      for (let i = 1; i < bin.length; i += 1) {
        if (bin[i] > peakValue) {
          peakValue = bin[i]
          peakIdx = i
        }
      }
      setPeakHz(peakIdx * binHz)
      setPeakDb(Number.isFinite(peakValue) ? peakValue : null)

      const bandLowIdx = Math.max(0, Math.floor(BAND_LOW_HZ / binHz))
      const bandHighIdx = Math.min(bin.length - 1, Math.ceil(BAND_HIGH_HZ / binHz))
      let bandPeak = -Infinity
      for (let i = bandLowIdx; i <= bandHighIdx; i += 1) {
        if (bin[i] > bandPeak) bandPeak = bin[i]
      }
      setBandDb(Number.isFinite(bandPeak) ? bandPeak : null)

      drawSpectrum(bin, binHz)

      rxRafRef.current = requestAnimationFrame(step)
    }
    rxRafRef.current = requestAnimationFrame(step)
  }

  function drawSpectrum(bin: Float32Array, binHz: number) {
    const canvas = rxCanvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.max(1, Math.floor(height * ratio))
    }
    const g = canvas.getContext('2d')
    if (!g) return
    g.setTransform(ratio, 0, 0, ratio, 0, 0)
    g.clearRect(0, 0, width, height)

    const lowIdx = Math.max(0, Math.floor(SPECTRUM_MIN_HZ / binHz))
    const highIdx = Math.min(bin.length - 1, Math.ceil(SPECTRUM_MAX_HZ / binHz))
    const range = highIdx - lowIdx
    if (range <= 0) return

    const spectrumSpan = SPECTRUM_MAX_HZ - SPECTRUM_MIN_HZ
    const hzToX = (hz: number) => ((hz - SPECTRUM_MIN_HZ) / spectrumSpan) * width

    const bandLowX = hzToX(BAND_LOW_HZ)
    const bandHighX = hzToX(BAND_HIGH_HZ)
    g.fillStyle = 'rgba(8, 102, 255, 0.08)'
    g.fillRect(bandLowX, 0, bandHighX - bandLowX, height)

    const nyquistHz = binHz * bin.length
    if (nyquistHz > SPECTRUM_MIN_HZ && nyquistHz < SPECTRUM_MAX_HZ) {
      g.fillStyle = 'rgba(217, 48, 37, 0.06)'
      g.fillRect(hzToX(nyquistHz), 0, width - hzToX(nyquistHz), height)
    }

    g.strokeStyle = '#0866ff'
    g.lineWidth = 1.5
    g.beginPath()
    for (let i = lowIdx; i <= highIdx; i += 1) {
      const x = ((i - lowIdx) / range) * width
      const db = bin[i]
      const clamped = Math.max(SPECTRUM_MIN_DB, Math.min(SPECTRUM_MAX_DB, db))
      const y = height - ((clamped - SPECTRUM_MIN_DB) / (SPECTRUM_MAX_DB - SPECTRUM_MIN_DB)) * height
      if (i === lowIdx) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()

    if (nyquistHz > SPECTRUM_MIN_HZ && nyquistHz < SPECTRUM_MAX_HZ) {
      const nx = hzToX(nyquistHz)
      g.strokeStyle = '#d93025'
      g.lineWidth = 1
      g.setLineDash([4, 4])
      g.beginPath()
      g.moveTo(nx, 0)
      g.lineTo(nx, height)
      g.stroke()
      g.setLineDash([])
      g.fillStyle = '#d93025'
      g.font = '10px system-ui, sans-serif'
      g.fillText('Nyquist', nx + 4, 12)
    }

    g.fillStyle = '#8a8d91'
    g.font = '10px system-ui, sans-serif'
    g.fillText(`${SPECTRUM_MIN_HZ / 1000}k`, 4, height - 4)
    g.textAlign = 'right'
    g.fillText(`${SPECTRUM_MAX_HZ / 1000}k`, width - 4, height - 4)
    g.textAlign = 'left'
  }

  function handleWavPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (wavUrl) URL.revokeObjectURL(wavUrl)
    const url = URL.createObjectURL(file)
    setWavUrl(url)
    setWavName(file.name)
  }

  const bandLabel =
    bandDb === null || !Number.isFinite(bandDb) ? '—' : `${bandDb.toFixed(1)} dB`
  const peakLabel = peakHz === null ? '—' : formatHz(peakHz)
  const peakDbLabel =
    peakDb === null || !Number.isFinite(peakDb) ? '' : ` / ${peakDb.toFixed(1)} dB`
  const nyquist = sampleRate !== null ? sampleRate / 2 : null
  const txAboveNyquist = nyquist !== null && frequency > nyquist

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
        <div className="login-brand" aria-hidden="true">
          <svg height="72" viewBox="0 0 80 80" width="72">
            <circle cx="40" cy="40" fill="#0866FF" r="36" />
            <path
              d="M40 22c-10.5 0-19 7.6-19 17 0 5.3 2.8 10 7.2 13v8l6.7-3.7c1.6.4 3.3.7 5.1.7 10.5 0 19-7.6 19-17s-8.5-18-19-18z"
              fill="#fff"
            />
            <path d="M30 39l7 5 5-6 8 7-7-5-5 6-8-7z" fill="#0866FF" />
          </svg>
        </div>

        <section className="login-form sonic-section" aria-labelledby="sonic-tx-title">
          <h2 className="sonic-section-title" id="sonic-tx-title">
            送信
          </h2>
          <p className="signup-sub">高周波トーンを端末スピーカーから発生させます。</p>

          <div className="sonic-freq" aria-live="polite">
            {formatHz(frequency)}
          </div>

          {txAboveNyquist && nyquist !== null ? (
            <p className="sonic-warn" role="alert">
              ※ この周波数はこの端末のナイキスト上限 ({formatHz(nyquist)}) を超えています。出力・検出できません。
            </p>
          ) : null}

          <label className="sonic-field">
            <span className="sonic-field-label">
              周波数
              <small>
                {formatHz(MIN_FREQ)} 〜 {formatHz(MAX_FREQ)}
              </small>
            </span>
            <input
              className="sonic-range"
              max={MAX_FREQ}
              min={MIN_FREQ}
              onChange={(e) => setFrequency(Number(e.target.value))}
              step={100}
              type="range"
              value={frequency}
            />
          </label>

          <label className="sonic-field">
            <span className="sonic-field-label">
              音量
              <small>{Math.round((volume / MAX_VOLUME) * 100)}%</small>
            </span>
            <input
              className="sonic-range"
              max={MAX_VOLUME}
              min={MIN_VOLUME}
              onChange={(e) => setVolume(Number(e.target.value))}
              step={0.01}
              type="range"
              value={volume}
            />
          </label>

          <p
            className={`sonic-status sonic-status--${isPlaying ? 'on' : 'off'}`}
            role="status"
          >
            <span className="sonic-dot" aria-hidden="true" />
            {isPlaying ? '送信中' : '停止中'}
          </p>

          {txError ? (
            <p className="login-error" role="alert">
              {txError}
            </p>
          ) : null}

          {isPlaying ? (
            <button className="login-submit sonic-danger" onClick={handleStopTx} type="button">
              停止
            </button>
          ) : (
            <button
              className="login-submit"
              onClick={() => void handleStartTx()}
              type="button"
            >
              開始
            </button>
          )}
        </section>

        <section className="login-form sonic-section" aria-labelledby="sonic-rx-title">
          <h2 className="sonic-section-title" id="sonic-rx-title">
            受信
          </h2>
          <p className="signup-sub">
            マイクから音を取得し、{BAND_LOW_HZ / 1000}〜{BAND_HIGH_HZ / 1000}kHz 帯のピークを確認します。
          </p>

          <div className="sonic-info">
            <span>
              サンプリング: {sampleRate !== null ? formatHz(sampleRate) : '未検出'}
            </span>
            <span>
              検出上限: {nyquist !== null ? formatHz(nyquist) : '未検出'}
            </span>
          </div>

          <canvas className="sonic-canvas" ref={rxCanvasRef} />

          <div className="sonic-metrics">
            <div>
              <span className="sonic-metric-label">ピーク</span>
              <span className="sonic-metric-value">
                {peakLabel}
                <small>{peakDbLabel}</small>
              </span>
            </div>
            <div>
              <span className="sonic-metric-label">
                {BAND_LOW_HZ / 1000}-{BAND_HIGH_HZ / 1000}kHz 最大
              </span>
              <span className="sonic-metric-value">{bandLabel}</span>
            </div>
          </div>

          <p
            className={`sonic-status sonic-status--${isListening ? 'on' : 'off'}`}
            role="status"
          >
            <span className="sonic-dot" aria-hidden="true" />
            {isListening ? '受信中' : '停止中'}
          </p>

          {rxError ? (
            <p className="login-error" role="alert">
              {rxError}
            </p>
          ) : null}

          {isListening ? (
            <button className="login-submit sonic-danger" onClick={handleStopRx} type="button">
              受信停止
            </button>
          ) : (
            <button
              className="login-submit"
              onClick={() => void handleStartRx()}
              type="button"
            >
              受信開始
            </button>
          )}
        </section>

        <section className="login-form sonic-section" aria-labelledby="sonic-wav-title">
          <h2 className="sonic-section-title" id="sonic-wav-title">
            WAV ファイル再生
          </h2>
          <p className="signup-sub">
            任意の音声ファイル（.wav / .mp3 など）を選択してブラウザ上で再生します。
          </p>

          <label className="sonic-file">
            <input accept="audio/*" onChange={handleWavPick} type="file" />
            <span>{wavName ?? 'ファイルを選択'}</span>
          </label>

          {wavUrl ? (
            <audio className="sonic-audio" controls src={wavUrl}>
              <track kind="captions" />
            </audio>
          ) : null}

          <p className="sonic-hint">
            受信を同時に開始すると、再生音のスペクトラムがそのまま確認できます。
          </p>
        </section>
      </main>

      <footer className="login-footer">
        <p className="login-brandline">Dolphin · Sonic PoC</p>
      </footer>
    </div>
  )
}
