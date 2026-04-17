import { redirect } from '@tanstack/react-router'
import { clearAuthSession, getAuthSession } from './auth-session'

export async function requireAuth(path: string) {
  const session = getAuthSession()

  if (session && session.expiresAt > Date.now()) {
    return session
  }

  clearAuthSession()

  throw redirect({
    to: '/login',
    search: {
      redirect: path,
    },
  })
}
