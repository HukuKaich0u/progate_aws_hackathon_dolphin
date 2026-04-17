import { clearAuthSession, setAuthSession, type AuthSession } from './auth-session'
import { requireAuth } from './require-auth'

const { refreshAuthSession } = vi.hoisted(() => ({
  refreshAuthSession: vi.fn(),
}))

vi.mock('./cognito', () => ({
  refreshAuthSession,
}))

describe('requireAuth', () => {
  beforeEach(() => {
    clearAuthSession()
    refreshAuthSession.mockReset()
  })

  it('redirects anonymous user to /login with returnTo', async () => {
    await expect(requireAuth('/rooms/abc')).rejects.toMatchObject({
      options: {
        to: '/login',
        search: { redirect: '/rooms/abc' },
      },
    })
  })

  it('returns the existing session for authenticated users', async () => {
    const session: AuthSession = {
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: null,
      expiresAt: 4_102_444_800_000,
    }

    setAuthSession(session)

    await expect(requireAuth('/rooms/abc')).resolves.toEqual(session)
  })

  it('attempts refresh before redirecting expired session to /login', async () => {
    const expiredSession: AuthSession = {
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() - 1_000,
    }
    const refreshedSession: AuthSession = {
      ...expiredSession,
      accessToken: 'next-access-token',
      expiresAt: Date.now() + 60_000,
    }

    setAuthSession(expiredSession)
    refreshAuthSession.mockResolvedValue(refreshedSession)

    await expect(requireAuth('/rooms/abc')).resolves.toEqual(refreshedSession)
    expect(refreshAuthSession).toHaveBeenCalledTimes(1)
  })
})
