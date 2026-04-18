import { redirect } from '@tanstack/react-router'
import { clearAuthSession, getAuthSession } from './auth-session'
import { refreshAuthSession } from './cognito'

export async function requireAuth(path: string) {
  const session = getAuthSession()

  if (session && session.expiresAt > Date.now()) {
    return session
  }

  if (session?.refreshToken) {
    const refreshedSession = await refreshAuthSession()

    if (refreshedSession) {
      return refreshedSession
    }
  }

  clearAuthSession()

  throw redirect({
    to: '/login',
    search: {
      redirect: path,
    },
  })
}
