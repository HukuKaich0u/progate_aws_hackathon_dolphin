import { clearAuthSession, getAuthSession, setAuthSession, type AuthSession } from '../../features/auth/auth-session'
import { apiClient } from './api-client'

const { refreshAuthSession } = vi.hoisted(() => ({
  refreshAuthSession: vi.fn(),
}))

vi.mock('../../features/auth/cognito', () => ({
  refreshAuthSession,
}))

function createSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access-token',
    expiresAt: Date.now() + 60_000,
    idToken: 'id-token',
    refreshToken: 'refresh-token',
    ...overrides,
  }
}

describe('apiClient', () => {
  beforeEach(() => {
    clearAuthSession()
    refreshAuthSession.mockReset()
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000')
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client-id')
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'example.auth.ap-northeast-1.amazoncognito.com')
    vi.stubEnv('VITE_COGNITO_REDIRECT_URI', 'http://localhost:5173/auth/callback')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('adds bearer token from current session', async () => {
    setAuthSession(createSession())
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiClient('/v1/rooms')

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/v1/rooms', 'http://localhost:3000'),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer access-token')
  })

  it('refreshes once before request when session is expired', async () => {
    setAuthSession(
      createSession({
        accessToken: 'stale-access-token',
        expiresAt: Date.now() - 1_000,
      }),
    )
    refreshAuthSession.mockResolvedValue(
      createSession({
        accessToken: 'fresh-access-token',
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiClient('/v1/rooms')

    expect(refreshAuthSession).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer fresh-access-token')
  })

  it('retries once after 401 and clears session if refresh fails', async () => {
    setAuthSession(createSession())
    refreshAuthSession.mockResolvedValue(null)
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await apiClient('/v1/rooms')

    expect(response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(refreshAuthSession).toHaveBeenCalledTimes(1)
    expect(getAuthSession()).toBeNull()
  })
})
