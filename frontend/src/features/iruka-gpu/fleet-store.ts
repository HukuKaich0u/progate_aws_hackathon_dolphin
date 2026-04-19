import { create } from 'zustand'
import type { FleetEvent, FleetMetrics, ParentState, ResultEntry, Worker } from './types'
import { FLEET_SIZE } from './config'

interface FleetStore {
  workers: Worker[]
  metrics: FleetMetrics
  parentState: ParentState
  parentPulseId: number
  recentResults: ResultEntry[]
  liveActive: number // currently "busy" worker count (for UI)

  initWorkers: () => void
  applyEvent: (event: FleetEvent) => void
  pulseParent: () => void
  setMetrics: (m: Partial<FleetMetrics>) => void
  reset: () => void
}

const emptyMetrics: FleetMetrics = {
  rps: 0,
  p50: 0,
  p95: 0,
  activeMax: 0,
  total: 0,
  errors: 0,
  lastBatchWallMs: 0,
  lastBatchSize: 0,
}

export const useFleetStore = create<FleetStore>()((set, get) => ({
  workers: [],
  metrics: emptyMetrics,
  parentState: 'idle',
  parentPulseId: 0,
  recentResults: [],
  liveActive: 0,

  initWorkers: () => {
    const now = performance.now()
    const workers: Worker[] = Array.from({ length: FLEET_SIZE }, (_, i) => ({
      id: i,
      state: 'idle',
      stateChangedAt: now,
    }))
    set({
      workers,
      metrics: { ...emptyMetrics },
      parentState: 'idle',
      parentPulseId: 0,
      recentResults: [],
      liveActive: 0,
    })
  },

  applyEvent: (event) => {
    const { workers } = get()
    const idx = event.worker_id
    if (idx < 0 || idx >= workers.length) return

    const now = performance.now()
    const nextWorkers = workers.slice()

    if (event.type === 'dispatched') {
      nextWorkers[idx] = {
        ...nextWorkers[idx],
        state: 'busy',
        stateChangedAt: now,
      }
      set((s) => ({ workers: nextWorkers, liveActive: s.liveActive + 1 }))
      return
    }

    if (event.type === 'result') {
      nextWorkers[idx] = {
        ...nextWorkers[idx],
        state: 'returned',
        lastLabel: event.label,
        lastLatencyMs: event.latency_ms,
        lastConfidence: event.confidence,
        stateChangedAt: now,
      }
      const entry: ResultEntry = {
        worker_id: event.worker_id,
        label: event.label,
        confidence: event.confidence,
        latency_ms: event.latency_ms,
        timestamp: event.timestamp,
      }
      set((s) => ({
        workers: nextWorkers,
        metrics: {
          ...s.metrics,
          total: s.metrics.total + 1,
          activeMax: Math.max(s.metrics.activeMax, s.liveActive),
        },
        recentResults: [entry, ...s.recentResults].slice(0, 8),
        liveActive: Math.max(0, s.liveActive - 1),
      }))
      // drop back to idle after a short delay so the jump animation can play
      window.setTimeout(() => {
        const current = get()
        if (current.workers[idx]?.stateChangedAt === now) {
          const reset = current.workers.slice()
          reset[idx] = { ...reset[idx], state: 'idle', stateChangedAt: performance.now() }
          set({ workers: reset })
        }
      }, 1200)
      return
    }

    if (event.type === 'error') {
      nextWorkers[idx] = {
        ...nextWorkers[idx],
        state: 'error',
        stateChangedAt: now,
      }
      set((s) => ({
        workers: nextWorkers,
        metrics: { ...s.metrics, errors: s.metrics.errors + 1 },
        liveActive: Math.max(0, s.liveActive - 1),
      }))
      window.setTimeout(() => {
        const current = get()
        if (current.workers[idx]?.stateChangedAt === now) {
          const reset = current.workers.slice()
          reset[idx] = { ...reset[idx], state: 'idle', stateChangedAt: performance.now() }
          set({ workers: reset })
        }
      }, 1500)
    }
  },

  pulseParent: () => {
    set((s) => ({
      parentPulseId: s.parentPulseId + 1,
      parentState: 'dispatching',
    }))
    window.setTimeout(() => set({ parentState: 'idle' }), 600)
  },

  setMetrics: (m) => set((s) => ({ metrics: { ...s.metrics, ...m } })),

  reset: () => get().initWorkers(),
}))
