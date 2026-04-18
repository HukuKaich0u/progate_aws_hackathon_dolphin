import { getAppEnv } from '../config/env'
import { clearAuthSession, getAuthSession, isSessionExpired, type AuthSession } from '../../features/auth/auth-session'
import { refreshAuthSession } from '../../features/auth/cognito'

function buildHeaders(init: RequestInit, session: AuthSession | null) {
  const headers = new Headers(init.headers)

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
}

async function sendRequest(path: string, init: RequestInit, session: AuthSession | null) {
  const env = getAppEnv()

  return fetch(new URL(path, env.apiBaseUrl), {
    ...init,
    headers: buildHeaders(init, session),
  })
}

export async function apiClient(path: string, init: RequestInit = {}) {
  let session = getAuthSession()

  if (session && isSessionExpired(session) && session.refreshToken) {
    session = await refreshAuthSession()
  }

  const response = await sendRequest(path, init, session)

  if (response.status !== 401 || !session?.refreshToken) {
    return response
  }

  const refreshedSession = await refreshAuthSession()

  if (!refreshedSession) {
    clearAuthSession()
    return response
  }

  return sendRequest(path, init, refreshedSession)
}
