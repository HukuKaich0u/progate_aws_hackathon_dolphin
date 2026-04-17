import { clearAuthSession, setAuthSession, type AuthSession } from './auth-session'
import { requireAuth } from './require-auth'

describe('requireAuth', () => {
  beforeEach(() => {
    clearAuthSession()
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
})
