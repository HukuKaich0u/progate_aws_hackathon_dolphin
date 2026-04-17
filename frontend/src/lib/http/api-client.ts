import { getAppEnv } from '../config/env'
import { getAuthSession } from '../../features/auth/auth-session'

export async function apiClient(path: string, init: RequestInit = {}) {
  const env = getAppEnv()
  const session = getAuthSession()
  const headers = new Headers(init.headers)

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(new URL(path, env.apiBaseUrl), {
    ...init,
    headers,
  })
}
