import { useFleetStore } from './fleet-store'
import type { FleetEvent } from './types'

export type WsState = 'closed' | 'connecting' | 'open' | 'error'

type Listener = (state: WsState, detail?: string) => void

interface ServerMessage {
  type: string
  [key: string]: unknown
}

class IrukaWsClient {
  private socket: WebSocket | null = null
  private url: string | null = null
  private state: WsState = 'closed'
  private detail: string | undefined
  private listeners = new Set<Listener>()
  private reconnectTimer: number | null = null
  private manualClose = false

  onState(cb: Listener): () => void {
    this.listeners.add(cb)
    cb(this.state, this.detail)
    return () => {
      this.listeners.delete(cb)
    }
  }

  getState(): { state: WsState; detail?: string; url: string | null } {
    return { state: this.state, detail: this.detail, url: this.url }
  }

  connect(url: string): void {
    this.disconnect()
    this.manualClose = false
    this.url = url
    this.setState('connecting')
    try {
      const socket = new WebSocket(url)
      this.socket = socket
      socket.binaryType = 'arraybuffer'

      socket.addEventListener('open', () => {
        this.setState('open')
      })
      socket.addEventListener('message', (e) => {
        this.handleMessage(e.data)
      })
      socket.addEventListener('close', (e) => {
        this.socket = null
        if (this.manualClose) {
          this.setState('closed')
        } else {
          this.setState('error', `connection closed (${e.code})`)
        }
      })
      socket.addEventListener('error', () => {
        this.setState('error', 'socket error')
      })
    } catch (err) {
      this.setState('error', (err as Error).message)
    }
  }

  disconnect(): void {
    this.manualClose = true
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socket) {
      try {
        this.socket.close()
      } catch {
        // ignore
      }
      this.socket = null
    }
    this.setState('closed')
  }

  isOpen(): boolean {
    return this.state === 'open' && this.socket?.readyState === WebSocket.OPEN
  }

  sendDispatch(
    count: number,
    endpoint: '/hello' | '/infer' = '/infer',
    phraseKey?: string | null,
  ): void {
    this.send({ type: 'dispatch', count, endpoint, phrase_key: phraseKey ?? null })
  }

  sendAmbientStart(
    intervalMs: number,
    endpoint: '/hello' | '/infer' = '/infer',
    phraseKey?: string | null,
  ): void {
    this.send({
      type: 'ambient_start',
      interval_ms: intervalMs,
      endpoint,
      phrase_key: phraseKey ?? null,
    })
  }

  sendAmbientStop(): void {
    this.send({ type: 'ambient_stop' })
  }

  private send(obj: Record<string, unknown>): void {
    if (!this.isOpen()) {
      this.setState('error', 'not connected')
      return
    }
    this.socket!.send(JSON.stringify(obj))
  }

  private setState(state: WsState, detail?: string): void {
    this.state = state
    this.detail = detail
    this.listeners.forEach((cb) => cb(state, detail))
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== 'string') return
    let msg: ServerMessage
    try {
      msg = JSON.parse(data) as ServerMessage
    } catch {
      return
    }
    const store = useFleetStore.getState()

    switch (msg.type) {
      case 'pulse': {
        store.pulseParent()
        break
      }
      case 'dispatched': {
        const event: FleetEvent = {
          type: 'dispatched',
          worker_id: Number(msg.worker_id ?? 0),
          request_id: String(msg.request_id ?? ''),
          timestamp: performance.now(),
        }
        store.applyEvent(event)
        break
      }
      case 'result': {
        const event: FleetEvent = {
          type: 'result',
          worker_id: Number(msg.worker_id ?? 0),
          request_id: String(msg.request_id ?? ''),
          label: String(msg.label ?? ''),
          confidence: Number(msg.confidence ?? 0),
          latency_ms: Number(msg.latency_ms ?? 0),
          timestamp: performance.now(),
        }
        store.applyEvent(event)
        break
      }
      case 'error': {
        if (typeof msg.worker_id === 'number') {
          const event: FleetEvent = {
            type: 'error',
            worker_id: msg.worker_id,
            request_id: String(msg.request_id ?? ''),
            message: String(msg.message ?? ''),
            timestamp: performance.now(),
          }
          store.applyEvent(event)
        }
        break
      }
      case 'metrics': {
        store.setMetrics({
          rps: Number(msg.rps ?? 0),
          p50: Number(msg.p50 ?? 0),
          p95: Number(msg.p95 ?? 0),
          lastBatchSize: Number(msg.total_ok ?? 0) + Number(msg.total_fail ?? 0),
          lastBatchWallMs: Number(msg.wall_ms ?? 0),
        })
        break
      }
      default:
        // ignore unknown
        break
    }
  }
}

export const wsClient = new IrukaWsClient()
