import { useEffect, useRef, useState } from 'react'
import { dispatchMock, startAmbientPings } from './mock-events'
import { wsClient, type WsState } from './ws-client'

export type DispatchMode = 'mock' | 'ws'
export type Endpoint = '/hello' | '/infer'

export interface DispatchOptions {
  endpoint?: Endpoint
  phraseKey?: string | null
}

export interface DispatcherApi {
  mode: DispatchMode
  wsState: WsState
  wsDetail?: string
  wsUrl: string | null
  dispatch: (count: number, opts?: DispatchOptions) => void
  startAmbient: (intervalMs: number, opts?: DispatchOptions) => () => void
  connect: (url: string) => void
  disconnect: () => void
}

const STORAGE_KEY = 'iruka-gpu:ws-url'

export function useDispatcher(): DispatcherApi {
  const [wsState, setWsState] = useState<WsState>(wsClient.getState().state)
  const [wsDetail, setWsDetail] = useState<string | undefined>(wsClient.getState().detail)
  const [wsUrl, setWsUrl] = useState<string | null>(wsClient.getState().url)
  const ambientStopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const off = wsClient.onState((state, detail) => {
      setWsState(state)
      setWsDetail(detail)
      setWsUrl(wsClient.getState().url)
    })
    return off
  }, [])

  const mode: DispatchMode = wsClient.isOpen() ? 'ws' : 'mock'

  const dispatch = (count: number, opts?: DispatchOptions) => {
    if (wsClient.isOpen()) {
      wsClient.sendDispatch(count, opts?.endpoint ?? '/infer', opts?.phraseKey)
    } else {
      dispatchMock(count)
    }
  }

  const startAmbient = (intervalMs: number, opts?: DispatchOptions): (() => void) => {
    ambientStopRef.current?.()
    if (wsClient.isOpen()) {
      wsClient.sendAmbientStart(intervalMs, opts?.endpoint ?? '/infer', opts?.phraseKey)
      ambientStopRef.current = () => wsClient.sendAmbientStop()
    } else {
      const stop = startAmbientPings(intervalMs)
      ambientStopRef.current = stop
    }
    return () => {
      ambientStopRef.current?.()
      ambientStopRef.current = null
    }
  }

  const connect = (url: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, url)
    } catch {
      // ignore
    }
    wsClient.connect(url)
  }

  const disconnect = () => {
    wsClient.disconnect()
  }

  return { mode, wsState, wsDetail, wsUrl, dispatch, startAmbient, connect, disconnect }
}

export function getSavedWsUrl(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}
