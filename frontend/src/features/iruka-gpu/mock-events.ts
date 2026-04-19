import { FLEET_SIZE, LABELS } from './config'
import { useFleetStore } from './fleet-store'

/**
 * Mock dispatcher that fans out N fake inference requests across the fleet.
 * Mirrors the shape of events parent_gateway will push over WebSocket.
 */
export function dispatchMock(requestCount: number, opts?: { baseLatencyMs?: number }) {
  const store = useFleetStore.getState()
  store.pulseParent()

  const startWall = performance.now()
  const latencies: number[] = []
  let completed = 0

  for (let i = 0; i < requestCount; i++) {
    const workerId = i % FLEET_SIZE
    // Stagger dispatch so the ripple reaching each dolphin feels spatial
    const dispatchDelay = i * (40 / FLEET_SIZE)
    const base = opts?.baseLatencyMs ?? 120
    const processTime = base + (Math.random() - 0.5) * 80

    window.setTimeout(() => {
      store.applyEvent({
        type: 'dispatched',
        worker_id: workerId,
        request_id: `mock-${startWall}-${i}`,
        timestamp: performance.now(),
      })
    }, dispatchDelay)

    window.setTimeout(() => {
      const label = LABELS[Math.floor(Math.random() * LABELS.length)]
      const confidence = 0.55 + Math.random() * 0.4
      // 2% chance of error
      if (Math.random() < 0.02) {
        store.applyEvent({
          type: 'error',
          worker_id: workerId,
          request_id: `mock-${startWall}-${i}`,
          message: 'mock error',
          timestamp: performance.now(),
        })
      } else {
        store.applyEvent({
          type: 'result',
          worker_id: workerId,
          request_id: `mock-${startWall}-${i}`,
          label,
          confidence,
          latency_ms: processTime,
          timestamp: performance.now(),
        })
        latencies.push(processTime)
      }

      completed++
      if (completed === requestCount) {
        const wall = performance.now() - startWall
        latencies.sort((a, b) => a - b)
        const pick = (q: number) =>
          latencies.length > 0
            ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * q))]
            : 0
        store.setMetrics({
          rps: (requestCount / wall) * 1000,
          p50: pick(0.5),
          p95: pick(0.95),
          lastBatchWallMs: wall,
          lastBatchSize: requestCount,
        })
      }
    }, dispatchDelay + processTime)
  }
}

/**
 * Slow continuous drip — handy to make the ocean feel "alive" on idle.
 */
export function startAmbientPings(intervalMs = 600): () => void {
  const store = useFleetStore.getState()
  const id = window.setInterval(() => {
    const workerId = Math.floor(Math.random() * FLEET_SIZE)
    const latency = 80 + Math.random() * 120
    const requestId = `ambient-${performance.now()}`
    store.applyEvent({
      type: 'dispatched',
      worker_id: workerId,
      request_id: requestId,
      timestamp: performance.now(),
    })
    window.setTimeout(() => {
      store.applyEvent({
        type: 'result',
        worker_id: workerId,
        request_id: requestId,
        label: LABELS[Math.floor(Math.random() * LABELS.length)],
        confidence: 0.7 + Math.random() * 0.25,
        latency_ms: latency,
        timestamp: performance.now(),
      })
    }, latency)
  }, intervalMs)
  return () => window.clearInterval(id)
}
