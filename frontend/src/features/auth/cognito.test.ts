import { clearAuthSession, getAuthSession, setAuthSession, type AuthSession } from './auth-session'
import {
  beginLogout,
  confirmSignUp,
  refreshAuthSession,
  resendConfirmationCode,
  signInWithPassword,
  signUp,
} from './cognito'

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
    vi.stubEnv('VITE_AWS_REGION', 'ap-northeast-1')
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

  it('stores an auth session on successful password sign in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            AuthenticationResult: {
              AccessToken: 'access',
              ExpiresIn: 3600,
              IdToken: 'id',
              RefreshToken: 'refresh',
            },
          }),
      }),
    )

    const session = await signInWithPassword('test@example.com', 'Passw0rd1')

    expect(fetch).toHaveBeenCalledWith(
      'https://cognito-idp.ap-northeast-1.amazonaws.com/',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        }),
        method: 'POST',
      }),
    )
    expect(session).toMatchObject({ accessToken: 'access', idToken: 'id', refreshToken: 'refresh' })
    expect(getAuthSession()).toMatchObject({ accessToken: 'access' })
  })

  it('throws a friendly error when password sign in is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () =>
          JSON.stringify({
            __type: 'NotAuthorizedException',
            message: 'Incorrect username or password.',
          }),
      }),
    )

    await expect(signInWithPassword('test@example.com', 'bad')).rejects.toThrow(
      'メールアドレスまたはパスワードが正しくありません。',
    )
    expect(getAuthSession()).toBeNull()
  })

  it('calls Cognito SignUp with the email as username', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{}' })
    vi.stubGlobal('fetch', fetchMock)

    await signUp('new@example.com', 'Passw0rd1')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toMatchObject({
      ClientId: 'client-id',
      Password: 'Passw0rd1',
      UserAttributes: [{ Name: 'email', Value: 'new@example.com' }],
      Username: 'new@example.com',
    })
    expect(fetchMock.mock.calls[0][1].headers['X-Amz-Target']).toBe(
      'AWSCognitoIdentityProviderService.SignUp',
    )
  })

  it('maps UsernameExistsException to a Japanese message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () =>
          JSON.stringify({ __type: 'UsernameExistsException', message: 'User already exists' }),
      }),
    )

    await expect(signUp('dup@example.com', 'Passw0rd1')).rejects.toThrow(
      'このメールアドレスは既に登録されています。',
    )
  })

  it('calls Cognito ConfirmSignUp with the provided code', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{}' })
    vi.stubGlobal('fetch', fetchMock)

    await confirmSignUp('new@example.com', '123456')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toMatchObject({
      ClientId: 'client-id',
      ConfirmationCode: '123456',
      Username: 'new@example.com',
    })
    expect(fetchMock.mock.calls[0][1].headers['X-Amz-Target']).toBe(
      'AWSCognitoIdentityProviderService.ConfirmSignUp',
    )
  })

  it('maps CodeMismatchException to a Japanese message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () =>
          JSON.stringify({ __type: 'CodeMismatchException', message: 'Invalid verification code' }),
      }),
    )

    await expect(confirmSignUp('new@example.com', 'wrong')).rejects.toThrow(
      '確認コードが正しくありません。',
    )
  })

  it('calls Cognito ResendConfirmationCode with the email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{}' })
    vi.stubGlobal('fetch', fetchMock)

    await resendConfirmationCode('new@example.com')

    expect(fetchMock.mock.calls[0][1].headers['X-Amz-Target']).toBe(
      'AWSCognitoIdentityProviderService.ResendConfirmationCode',
    )
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
