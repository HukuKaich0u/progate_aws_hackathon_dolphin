import { useEffect, useRef } from 'react'
import {
  Application,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Texture,
  Ticker,
} from 'pixi.js'
import { COLORS, FLEET_SIZE, GRID_COLS, GRID_ROWS } from './config'
import { useFleetStore } from './fleet-store'
import type { Worker, WorkerState } from './types'

interface DolphinView {
  sprite: Sprite
  baseX: number
  baseY: number
  phase: number
  lastState: WorkerState
  animStartAt: number
}

interface Ripple {
  graphics: Graphics
  startAt: number
}

interface Burst {
  graphics: Graphics
  startAt: number
  x: number
  y: number
}

const RIPPLE_DURATION_MS = 1600
const BURST_DURATION_MS = 500
const JUMP_DURATION_MS = 650
const BUSY_DIVE_PX = 7
// Baseline rotation so every dolphin sits in a mid-leap diagonal pose
// (tail down-left, nose up-right) like the classic jumping-dolphin icon.
const DOLPHIN_BASE_ROTATION = -0.22

function drawDolphin(g: Graphics): void {
  // Classic "leaping dolphin" line-art silhouette.
  // Body is sleek and slightly diagonal (tail low-left, nose high-right).
  // Drawn with white fill + dark outline so the runtime tint colors the body
  // while the outline stays clearly visible against the deep-ocean background.

  const OUTLINE = 0x0a1a36
  const OUTLINE_W = 1.1
  const BODY = 0xffffff

  // --- Tail fluke (drawn behind the body) ---
  g.moveTo(-10, 0)
  // Upper fluke lobe
  g.bezierCurveTo(-16, -3, -24, -6, -26, -4)
  g.bezierCurveTo(-23, -2, -20, -1, -17, 0)
  // Inner notch
  g.bezierCurveTo(-20, 1, -23, 3, -26, 5)
  // Lower fluke lobe
  g.bezierCurveTo(-24, 7, -16, 4, -10, 2)
  g.closePath()
  g.fill({ color: BODY })
  g.stroke({ color: OUTLINE, width: OUTLINE_W })

  // --- Main body outline ---
  // Starts at the upper tail peduncle, traces the back → head → rostrum →
  // jaw → belly → lower peduncle → back to start.
  g.moveTo(-10, -1)
  // Back / top curve over the dorsal region up to the melon
  g.bezierCurveTo(-6, -8, 2, -10, 8, -10)
  // Forward to rostrum top
  g.bezierCurveTo(14, -10, 18, -8, 20, -6)
  // Rostrum tip (short, rounded bottlenose beak)
  g.quadraticCurveTo(22, -4, 22, -3)
  g.quadraticCurveTo(22, -2, 20, -1)
  // Tip underside
  g.bezierCurveTo(19, 0, 17, 1, 14, 2)
  // Mouth corner → jaw line back toward belly
  g.bezierCurveTo(10, 3, 6, 4, 2, 5)
  // Belly curve
  g.bezierCurveTo(-4, 6, -8, 5, -10, 3)
  // Back to starting point
  g.bezierCurveTo(-11, 1, -11, 0, -10, -1)
  g.closePath()
  g.fill({ color: BODY })
  g.stroke({ color: OUTLINE, width: OUTLINE_W })

  // --- Dorsal fin (small, clearly swept BACK toward the tail) ---
  g.moveTo(3, -9)
  // Leading edge up-and-back to the peak
  g.bezierCurveTo(2, -12, -2, -14, -4, -13)
  // Trailing edge down to the back of the base
  g.bezierCurveTo(-5, -11, -4, -10, -3, -9)
  g.lineTo(3, -9)
  g.closePath()
  g.fill({ color: BODY })
  g.stroke({ color: OUTLINE, width: OUTLINE_W })

  // --- Pectoral fin (small flipper hanging off the belly) ---
  g.moveTo(5, 3)
  g.bezierCurveTo(3, 7, 0, 10, -3, 9)
  g.bezierCurveTo(-1, 6, 1, 4, 5, 3)
  g.closePath()
  g.fill({ color: BODY })
  g.stroke({ color: OUTLINE, width: OUTLINE_W })

  // --- Mouth line (subtle separation between upper and lower jaw) ---
  g.moveTo(15, 2)
  g.quadraticCurveTo(18, 0, 20, -1)
  g.stroke({ color: OUTLINE, width: 0.6, alpha: 0.65 })

  // --- Eye ---
  g.circle(15, -4, 1.2)
  g.fill({ color: OUTLINE })
}

function drawParent(g: Graphics): void {
  g.circle(0, 0, 58)
  g.fill({ color: COLORS.parentCoreOuter, alpha: 0.28 })
  g.circle(0, 0, 42)
  g.fill({ color: COLORS.parentCoreMid, alpha: 0.5 })
  g.circle(0, 0, 28)
  g.fill({ color: COLORS.parentCoreInner, alpha: 0.95 })
  g.circle(0, 0, 10)
  g.fill({ color: COLORS.parentCoreDot })
  g.circle(0, 0, 64)
  g.stroke({ color: COLORS.rippleOuter, width: 1.5, alpha: 0.5 })
}

function computeLayout(width: number, height: number) {
  const positions: { x: number; y: number }[] = []
  const marginX = Math.max(60, width * 0.05)
  const topMargin = Math.max(130, height * 0.2)
  const bottomMargin = Math.max(80, height * 0.12)
  const availW = width - marginX * 2
  const availH = Math.max(80, height - topMargin - bottomMargin)
  const colSpace = availW / GRID_COLS
  const rowSpace = availH / GRID_ROWS
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (positions.length >= FLEET_SIZE) break
      positions.push({
        x: marginX + colSpace * (c + 0.5),
        y: topMargin + rowSpace * (r + 0.5),
      })
    }
  }
  return { positions, topMargin }
}

function drawOcean(g: Graphics, width: number, height: number): void {
  g.clear()
  const gradient = new FillGradient(0, 0, 0, height)
  gradient.addColorStop(0, COLORS.oceanTop)
  gradient.addColorStop(1, COLORS.oceanBottom)
  g.rect(0, 0, width, height)
  g.fill(gradient)
  for (let i = 0; i < 8; i++) {
    const y = (height / 8) * i
    g.rect(0, y, width, 1)
    g.fill({ color: 0xffffff, alpha: 0.015 })
  }
}

function applyWorkerAnim(
  d: DolphinView,
  worker: Worker | undefined,
  now: number,
): void {
  if (!worker) return

  if (worker.state !== d.lastState) {
    d.lastState = worker.state
    d.animStartAt = now
  }
  const since = now - d.animStartAt
  const bob = Math.sin(now * 0.0018 + d.phase) * 2.2

  switch (worker.state) {
    case 'idle': {
      d.sprite.y = d.baseY + bob
      d.sprite.x = d.baseX + Math.cos(now * 0.001 + d.phase) * 0.5
      d.sprite.tint = 0xe6f2ff
      d.sprite.alpha = 0.92
      d.sprite.scale.set(1)
      d.sprite.rotation = DOLPHIN_BASE_ROTATION + Math.sin(now * 0.001 + d.phase) * 0.04
      break
    }
    case 'busy': {
      const t = Math.min(since / 140, 1)
      const dive = t * BUSY_DIVE_PX
      d.sprite.y = d.baseY + dive + bob * 0.5
      d.sprite.x = d.baseX
      d.sprite.tint = COLORS.dolphinBusy
      d.sprite.alpha = 1
      d.sprite.scale.set(0.95)
      d.sprite.rotation = DOLPHIN_BASE_ROTATION + 0.12
      break
    }
    case 'returned': {
      const t = Math.min(since / JUMP_DURATION_MS, 1)
      const arc = Math.sin(t * Math.PI)
      d.sprite.y = d.baseY - arc * 34
      d.sprite.x = d.baseX
      d.sprite.tint = COLORS.dolphinReturned
      d.sprite.alpha = 1
      d.sprite.scale.set(1 + arc * 0.3)
      d.sprite.rotation = DOLPHIN_BASE_ROTATION - arc * 0.4
      break
    }
    case 'error': {
      const pulse = 0.5 + 0.5 * Math.sin(since * 0.02)
      d.sprite.y = d.baseY + bob
      d.sprite.x = d.baseX
      d.sprite.tint = COLORS.dolphinError
      d.sprite.alpha = 0.8 + pulse * 0.2
      d.sprite.scale.set(1)
      d.sprite.rotation = DOLPHIN_BASE_ROTATION
      break
    }
  }
}

export function OceanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let app: Application | null = null
    let destroyed = false
    let texture: Texture | null = null
    let bgGraphics: Graphics | null = null
    let parent: Graphics | null = null
    let parentHalo: Graphics | null = null
    let rippleLayer: Container | null = null
    let burstLayer: Container | null = null
    let dolphins: DolphinView[] = []
    const ripples: Ripple[] = []
    const bursts: Burst[] = []
    let lastPulseId = useFleetStore.getState().parentPulseId
    const seenReturned = new Set<string>()
    let resizeObserver: ResizeObserver | null = null

    const tickerFn = (_ticker: Ticker) => {
      if (!app || !parent || !parentHalo || !rippleLayer || !burstLayer) return
      const now = performance.now()
      const snapshot = useFleetStore.getState()

      for (let i = 0; i < dolphins.length; i++) {
        applyWorkerAnim(dolphins[i], snapshot.workers[i], now)
      }

      const ambient = 1 + Math.sin(now * 0.003) * 0.03
      const dispatching = snapshot.parentState === 'dispatching'
      const boost = dispatching ? 0.15 : 0
      parent.scale.set(ambient + boost)

      parentHalo.clear()
      const haloScale = 1 + (Math.sin(now * 0.002) + 1) * 0.08
      parentHalo.circle(0, 0, 90 * haloScale)
      parentHalo.stroke({ color: COLORS.rippleOuter, width: 1, alpha: 0.15 })
      parentHalo.circle(0, 0, 110 * haloScale)
      parentHalo.stroke({ color: COLORS.rippleOuter, width: 1, alpha: 0.08 })

      if (snapshot.parentPulseId !== lastPulseId) {
        lastPulseId = snapshot.parentPulseId
        if (rippleLayer) {
          const g = new Graphics()
          g.x = parent.x
          g.y = parent.y
          rippleLayer.addChild(g)
          ripples.push({ graphics: g, startAt: now })
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        const t = (now - r.startAt) / RIPPLE_DURATION_MS
        if (t >= 1) {
          r.graphics.destroy()
          ripples.splice(i, 1)
          continue
        }
        r.graphics.clear()
        const maxR = Math.max(app.screen.width, app.screen.height) * 0.75
        const rr = maxR * easeOutCubic(t)
        r.graphics.circle(0, 0, rr)
        r.graphics.stroke({
          color: COLORS.rippleOuter,
          width: 2,
          alpha: (1 - t) * 0.55,
        })
        r.graphics.circle(0, 0, rr - 10)
        r.graphics.stroke({
          color: COLORS.rippleInner,
          width: 1,
          alpha: (1 - t) * 0.3,
        })
      }

      for (let i = 0; i < dolphins.length; i++) {
        const w = snapshot.workers[i]
        if (!w || w.state !== 'returned') continue
        const key = `${i}-${w.stateChangedAt}`
        if (seenReturned.has(key)) continue
        seenReturned.add(key)
        if (burstLayer) {
          const g = new Graphics()
          burstLayer.addChild(g)
          bursts.push({ graphics: g, startAt: now, x: dolphins[i].baseX, y: dolphins[i].baseY - 10 })
        }
      }
      if (seenReturned.size > FLEET_SIZE * 3) {
        const keys = Array.from(seenReturned).slice(-FLEET_SIZE * 2)
        seenReturned.clear()
        keys.forEach((k) => seenReturned.add(k))
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]
        const t = (now - b.startAt) / BURST_DURATION_MS
        if (t >= 1) {
          b.graphics.destroy()
          bursts.splice(i, 1)
          continue
        }
        b.graphics.clear()
        const rr = 6 + t * 26
        b.graphics.circle(b.x, b.y, rr)
        b.graphics.stroke({
          color: COLORS.resultSparkle,
          width: 1.5,
          alpha: 0.8 * (1 - t),
        })
        b.graphics.circle(b.x, b.y, Math.max(0, 3 - t * 3))
        b.graphics.fill({ color: COLORS.resultSparkle, alpha: 1 - t })
      }
    }

    const applyLayout = (width: number, height: number) => {
      if (!bgGraphics || !parent || !parentHalo) return
      drawOcean(bgGraphics, width, height)
      const { positions: next, topMargin } = computeLayout(width, height)
      for (let i = 0; i < next.length; i++) {
        if (!dolphins[i]) continue
        dolphins[i].baseX = next[i].x
        dolphins[i].baseY = next[i].y
      }
      parent.x = width / 2
      parent.y = topMargin / 2 + 6
      parentHalo.x = parent.x
      parentHalo.y = parent.y
    }

    const init = async () => {
      const localApp = new Application()
      const initialWidth = Math.max(320, container.clientWidth)
      const initialHeight = Math.max(320, container.clientHeight)
      await localApp.init({
        width: initialWidth,
        height: initialHeight,
        background: COLORS.oceanBottom,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio ?? 1, 2),
        autoDensity: true,
      })
      if (destroyed) {
        localApp.destroy(true, { children: true })
        return
      }
      app = localApp
      container.appendChild(app.canvas as HTMLCanvasElement)

      bgGraphics = new Graphics()
      app.stage.addChild(bgGraphics)

      parentHalo = new Graphics()
      app.stage.addChild(parentHalo)

      const template = new Graphics()
      drawDolphin(template)
      texture = app.renderer.generateTexture({ target: template, resolution: 2 })
      template.destroy()

      const { positions, topMargin } = computeLayout(initialWidth, initialHeight)
      const dolphinLayer = new Container()
      app.stage.addChild(dolphinLayer)
      dolphins = positions.map((pos, i) => {
        const sprite = new Sprite(texture!)
        sprite.anchor.set(0.5, 0.5)
        sprite.x = pos.x
        sprite.y = pos.y
        sprite.tint = 0xe6f2ff
        dolphinLayer.addChild(sprite)
        return {
          sprite,
          baseX: pos.x,
          baseY: pos.y,
          phase: ((i * 7919) % 1000) / 1000 * Math.PI * 2,
          lastState: 'idle',
          animStartAt: 0,
        } as DolphinView
      })

      rippleLayer = new Container()
      app.stage.addChild(rippleLayer)
      burstLayer = new Container()
      app.stage.addChild(burstLayer)

      parent = new Graphics()
      drawParent(parent)
      parent.x = initialWidth / 2
      parent.y = topMargin / 2 + 6
      app.stage.addChild(parent)

      applyLayout(initialWidth, initialHeight)
      app.ticker.add(tickerFn)

      // Manual resize via ResizeObserver (avoids Pixi v8 resizeTo cleanup quirks)
      resizeObserver = new ResizeObserver((entries) => {
        if (!app) return
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        if (width < 10 || height < 10) return
        app.renderer.resize(width, height)
        applyLayout(width, height)
      })
      resizeObserver.observe(container)
    }

    void init()

    return () => {
      destroyed = true
      resizeObserver?.disconnect()
      resizeObserver = null
      if (app) {
        app.ticker.remove(tickerFn)
        app.destroy(true, { children: true })
        app = null
      }
      if (texture) {
        texture.destroy(true)
        texture = null
      }
    }
  }, [])

  return <div ref={containerRef} className="ocean-canvas" />
}

function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - clamped, 3)
}
