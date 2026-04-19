export type WorkerState = 'idle' | 'busy' | 'returned' | 'error'

export interface Worker {
  id: number
  state: WorkerState
  lastLabel?: string
  lastLatencyMs?: number
  lastConfidence?: number
  stateChangedAt: number
}

export interface FleetMetrics {
  rps: number
  p50: number
  p95: number
  activeMax: number
  total: number
  errors: number
  lastBatchWallMs: number
  lastBatchSize: number
}

export type ParentState = 'idle' | 'dispatching'

export interface DispatchedEvent {
  type: 'dispatched'
  worker_id: number
  request_id: string
  timestamp: number
}

export interface ResultEvent {
  type: 'result'
  worker_id: number
  request_id: string
  label: string
  confidence: number
  latency_ms: number
  timestamp: number
}

export interface ErrorEvent {
  type: 'error'
  worker_id: number
  request_id: string
  message: string
  timestamp: number
}

export type FleetEvent = DispatchedEvent | ResultEvent | ErrorEvent

export interface ResultEntry {
  worker_id: number
  label: string
  confidence: number
  latency_ms: number
  timestamp: number
}
