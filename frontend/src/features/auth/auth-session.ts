export type AuthSession = {
  accessToken: string
  idToken: string
  refreshToken: string | null
  expiresAt: number
}

const AUTH_SESSION_STORAGE_KEY = 'dolphin.auth.session'

let session: AuthSession | null = null

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function readStoredSession() {
  if (!canUseStorage()) {
    return null
  }

  const rawSession = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as AuthSession
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return null
  }
}

export function isSessionExpired(authSession: AuthSession, now = Date.now()) {
  return authSession.expiresAt <= now
}

export function getAuthSession() {
  if (session) {
    if (isSessionExpired(session) && !session.refreshToken) {
      clearAuthSession()
      return null
    }

    return session
  }

  session = readStoredSession()

  if (session && isSessionExpired(session) && !session.refreshToken) {
    clearAuthSession()
    return null
  }

  return session
}

export function setAuthSession(nextSession: AuthSession) {
  session = nextSession

  if (canUseStorage()) {
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(nextSession))
  }
}

export function clearAuthSession() {
  session = null

  if (canUseStorage()) {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  }
}
