import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  type AuthSession,
} from './auth-session'

function createSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access-token',
    expiresAt: 4_102_444_800_000,
    idToken: 'id-token',
    refreshToken: null,
    ...overrides,
  }
}

describe('auth-session', () => {
  beforeEach(() => {
    clearAuthSession()
  })

  it('clears expired session with no refresh token', () => {
    setAuthSession(
      createSession({
        expiresAt: Date.now() - 1_000,
      }),
    )

    expect(getAuthSession()).toBeNull()
    expect(window.sessionStorage.getItem('dolphin.auth.session')).toBeNull()
  })

  it('keeps session if access token is still fresh', () => {
    const session = createSession({
      expiresAt: Date.now() + 60_000,
    })

    setAuthSession(session)

    expect(getAuthSession()).toEqual(session)
  })
})
