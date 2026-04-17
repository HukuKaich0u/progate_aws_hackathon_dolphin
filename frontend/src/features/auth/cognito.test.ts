import { clearAuthSession, getAuthSession, setAuthSession, type AuthSession } from './auth-session'
import { beginLogout, refreshAuthSession } from './cognito'

function createSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access-token',
    expiresAt: Date.now() - 1_000,
    idToken: 'id-token',
    refreshToken: 'refresh-token',
    ...overrides,
  }
}

describe('cognito auth helpers', () => {
  beforeEach(() => {
    clearAuthSession()
    vi.restoreAllMocks()
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client-id')
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'example.auth.ap-northeast-1.amazoncognito.com')
    vi.stubEnv('VITE_COGNITO_REDIRECT_URI', 'http://localhost:5173/auth/callback')
    vi.stubEnv('VITE_COGNITO_LOGOUT_REDIRECT_URI', 'http://localhost:5173')
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('refreshes tokens with Cognito token endpoint when refresh token exists', async () => {
    setAuthSession(createSession())
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          access_token: 'next-access-token',
          expires_in: 3600,
          id_token: 'next-id-token',
        }),
        ok: true,
      }),
    )

    const nextSession = await refreshAuthSession()

    expect(fetch).toHaveBeenCalledWith(
      'https://example.auth.ap-northeast-1.amazoncognito.com/oauth2/token',
      expect.objectContaining({
        body: expect.any(URLSearchParams),
        method: 'POST',
      }),
    )
    expect(nextSession).toMatchObject({
      accessToken: 'next-access-token',
      idToken: 'next-id-token',
      refreshToken: 'refresh-token',
    })
    expect(getAuthSession()).toMatchObject({
      accessToken: 'next-access-token',
      refreshToken: 'refresh-token',
    })
  })

  it('builds Hosted UI logout URL with logout redirect', () => {
    const originalLocation = window.location
    const assign = vi.fn()

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        assign,
      },
    })

    beginLogout()

    expect(assign).toHaveBeenCalledWith(
      'https://example.auth.ap-northeast-1.amazoncognito.com/logout?client_id=client-id&logout_uri=http%3A%2F%2Flocalhost%3A5173',
    )

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })
})
