import { clearAuthSession, getAuthSession, setAuthSession } from './auth-session'
import { logout } from './logout'

const { beginLogout } = vi.hoisted(() => ({
  beginLogout: vi.fn(),
}))

vi.mock('./cognito', () => ({
  beginLogout,
}))

describe('logout', () => {
  beforeEach(() => {
    clearAuthSession()
    beginLogout.mockReset()
  })

  it('clears local session and redirects to Cognito logout', () => {
    setAuthSession({
      accessToken: 'access-token',
      expiresAt: Date.now() + 60_000,
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    })

    logout('http://localhost:5173')

    expect(getAuthSession()).toBeNull()
    expect(beginLogout).toHaveBeenCalledWith('http://localhost:5173')
  })
})
