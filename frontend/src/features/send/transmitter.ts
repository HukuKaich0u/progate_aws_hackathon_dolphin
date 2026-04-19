export type PlayOptions = {
  durationMs?: number
  onLevel?: (db: number) => void
}

export type Transmitter = {
  play: (frequencyHz: number, options?: PlayOptions) => Promise<void>
}

const DEFAULT_DURATION_MS = 2000
const PEAK_GAIN = 0.5
const ATTACK_SEC = 0.02
const RELEASE_SEC = 0.05

export function createWebAudioTransmitter(): Transmitter {
  let context: AudioContext | null = null

  function ensureContext(): AudioContext {
    if (!context || context.state === 'closed') {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) {
        throw new Error('このブラウザは Web Audio API に対応していません。')
      }
      context = new Ctor()
    }
    return context
  }

  async function play(frequencyHz: number, options: PlayOptions = {}) {
    const ctx = ensureContext()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    const durationMs = options.durationMs ?? DEFAULT_DURATION_MS
    const onLevel = options.onLevel

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequencyHz

    const now = ctx.currentTime
    const durationSec = durationMs / 1000
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, now + ATTACK_SEC)
    gain.gain.setValueAtTime(PEAK_GAIN, now + durationSec - RELEASE_SEC)
    gain.gain.linearRampToValueAtTime(0, now + durationSec)

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    let analyser: AnalyserNode | null = null
    let rafId: number | null = null
    if (onLevel) {
      analyser = ctx.createAnalyser()
      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0.2
      gain.connect(analyser)

      const bin = new Float32Array(analyser.frequencyBinCount)
      const binHz = ctx.sampleRate / analyser.fftSize
      const targetIdx = Math.round(frequencyHz / binHz)
      const loIdx = Math.max(0, targetIdx - 4)
      const hiIdx = Math.min(bin.length - 1, targetIdx + 4)

      const tick = () => {
        analyser?.getFloatFrequencyData(bin)
        let peak = -Infinity
        for (let i = loIdx; i <= hiIdx; i += 1) {
          if (bin[i] > peak) peak = bin[i]
        }
        onLevel(Number.isFinite(peak) ? peak : -Infinity)
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }

    oscillator.start(now)
    oscillator.stop(now + durationSec)

    await new Promise<void>((resolve) => {
      const fallback = window.setTimeout(() => resolve(), durationMs + 200)
      oscillator.onended = () => {
        window.clearTimeout(fallback)
        resolve()
      }
    })

    if (rafId !== null) cancelAnimationFrame(rafId)
    analyser?.disconnect()
    oscillator.disconnect()
    gain.disconnect()
  }

  return { play }
}
