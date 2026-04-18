import { getAppEnv } from '../../lib/config/env'
import { clearAuthSession, getAuthSession, setAuthSession, type AuthSession } from './auth-session'

const AUTH_PENDING_STORAGE_KEY = 'dolphin.auth.pending'

type PendingAuthRequest = {
  codeVerifier: string
  redirectTo: string
  state: string
}

type TokenResponse = {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token?: string
}

function buildAuthSession(tokens: TokenResponse, currentSession: AuthSession | null): AuthSession {
  return {
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    idToken: tokens.id_token,
    refreshToken: tokens.refresh_token ?? currentSession?.refreshToken ?? null,
  }
}

function encodeBase64Url(buffer: Uint8Array) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function sha256(value: string) {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return new Uint8Array(digest)
}

function randomString(size = 32) {
  const buffer = new Uint8Array(size)
  window.crypto.getRandomValues(buffer)
  return encodeBase64Url(buffer)
}

function storePendingAuthRequest(pendingAuthRequest: PendingAuthRequest) {
  window.sessionStorage.setItem(AUTH_PENDING_STORAGE_KEY, JSON.stringify(pendingAuthRequest))
}

function readPendingAuthRequest() {
  const rawValue = window.sessionStorage.getItem(AUTH_PENDING_STORAGE_KEY)
  if (!rawValue) {
    throw new Error('Missing pending auth request.')
  }

  return JSON.parse(rawValue) as PendingAuthRequest
}

function clearPendingAuthRequest() {
  window.sessionStorage.removeItem(AUTH_PENDING_STORAGE_KEY)
}

type InitiateAuthResponse = {
  AuthenticationResult?: {
    AccessToken: string
    ExpiresIn: number
    IdToken: string
    RefreshToken?: string
  }
  ChallengeName?: string
}

async function callCognitoIdp<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const env = getAppEnv()
  const response = await fetch(`https://cognito-idp.${env.awsRegion}.amazonaws.com/`, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    method: 'POST',
  })
  const raw = await response.text()
  const parsed = raw ? (JSON.parse(raw) as Record<string, unknown> & { message?: string; __type?: string }) : null

  if (!response.ok) {
    const code = (parsed?.__type as string | undefined)?.split('#').pop()
    throw new Error(mapCognitoError(code, parsed?.message))
  }

  return (parsed ?? {}) as T
}

function mapCognitoError(code: string | undefined, message: string | undefined) {
  switch (code) {
    case 'UsernameExistsException':
      return 'このメールアドレスは既に登録されています。'
    case 'InvalidPasswordException':
      return 'パスワードの条件を満たしていません（8文字以上、英大小と数字を含む）。'
    case 'CodeMismatchException':
      return '確認コードが正しくありません。'
    case 'ExpiredCodeException':
      return '確認コードの有効期限が切れました。再送信してください。'
    case 'LimitExceededException':
      return '試行回数の上限に達しました。しばらく待ってから再度お試しください。'
    case 'NotAuthorizedException':
      return 'メールアドレスまたはパスワードが正しくありません。'
    case 'UserNotConfirmedException':
      return 'アカウントが未確認です。確認コードを入力してください。'
    default:
      return message ?? '処理に失敗しました。'
  }
}

export async function signUp(email: string, password: string): Promise<void> {
  const env = getAppEnv()
  await callCognitoIdp('SignUp', {
    ClientId: env.cognitoClientId,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
    Username: email,
  })
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  const env = getAppEnv()
  await callCognitoIdp('ConfirmSignUp', {
    ClientId: env.cognitoClientId,
    ConfirmationCode: code,
    Username: email,
  })
}

export async function resendConfirmationCode(email: string): Promise<void> {
  const env = getAppEnv()
  await callCognitoIdp('ResendConfirmationCode', {
    ClientId: env.cognitoClientId,
    Username: email,
  })
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const env = getAppEnv()
  const response = await fetch(`https://cognito-idp.${env.awsRegion}.amazonaws.com/`, {
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { PASSWORD: password, USERNAME: email },
      ClientId: env.cognitoClientId,
    }),
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    method: 'POST',
  })

  const raw = await response.text()
  const parsed = raw ? (JSON.parse(raw) as InitiateAuthResponse & { message?: string; __type?: string }) : null

  if (!response.ok || !parsed) {
    const code = (parsed?.__type as string | undefined)?.split('#').pop()
    throw new Error(mapCognitoError(code, parsed?.message))
  }

  if (parsed.ChallengeName) {
    throw new Error(`Cognito challenge not supported: ${parsed.ChallengeName}`)
  }

  if (!parsed.AuthenticationResult) {
    throw new Error('認証応答が不正です。')
  }

  const session: AuthSession = {
    accessToken: parsed.AuthenticationResult.AccessToken,
    expiresAt: Date.now() + parsed.AuthenticationResult.ExpiresIn * 1000,
    idToken: parsed.AuthenticationResult.IdToken,
    refreshToken: parsed.AuthenticationResult.RefreshToken ?? null,
  }

  setAuthSession(session)
  return session
}

export async function beginLogin(redirectTo: string) {
  const env = getAppEnv()
  const codeVerifier = randomString(32)
  const state = randomString(32)
  const challenge = encodeBase64Url(await sha256(codeVerifier))
  const params = new URLSearchParams({
    client_id: env.cognitoClientId,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: env.cognitoRedirectUri,
    response_type: 'code',
    scope: 'email openid profile',
    state,
  })

  storePendingAuthRequest({
    codeVerifier,
    redirectTo,
    state,
  })

  window.location.assign(`https://${env.cognitoDomain}/oauth2/authorize?${params.toString()}`)
}

export async function completeAuthCallback(searchParams: URLSearchParams) {
  const env = getAppEnv()
  const code = searchParams.get('code')
  const returnedState = searchParams.get('state')
  const pendingAuthRequest = readPendingAuthRequest()

  if (!code || !returnedState) {
    throw new Error('Missing authorization response.')
  }

  if (returnedState !== pendingAuthRequest.state) {
    throw new Error('Mismatched login state.')
  }

  const response = await fetch(`https://${env.cognitoDomain}/oauth2/token`, {
    body: new URLSearchParams({
      client_id: env.cognitoClientId,
      code,
      code_verifier: pendingAuthRequest.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: env.cognitoRedirectUri,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to exchange authorization code.')
  }

  const tokens = (await response.json()) as TokenResponse

  setAuthSession(buildAuthSession(tokens, null))

  clearPendingAuthRequest()

  return {
    redirectTo: pendingAuthRequest.redirectTo,
  }
}

export async function refreshAuthSession() {
  const env = getAppEnv()
  const currentSession = getAuthSession()

  if (!currentSession?.refreshToken) {
    clearAuthSession()
    return null
  }

  const response = await fetch(`https://${env.cognitoDomain}/oauth2/token`, {
    body: new URLSearchParams({
      client_id: env.cognitoClientId,
      grant_type: 'refresh_token',
      refresh_token: currentSession.refreshToken,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  if (!response.ok) {
    clearAuthSession()
    return null
  }

  const tokens = (await response.json()) as TokenResponse
  const nextSession = buildAuthSession(tokens, currentSession)
  setAuthSession(nextSession)
  return nextSession
}

export function beginLogout(redirectTo?: string) {
  const env = getAppEnv()
  const logoutRedirectUri = redirectTo ?? env.cognitoLogoutRedirectUri
  const params = new URLSearchParams({
    client_id: env.cognitoClientId,
    logout_uri: logoutRedirectUri,
  })

  clearAuthSession()
  clearPendingAuthRequest()
  window.location.assign(`https://${env.cognitoDomain}/logout?${params.toString()}`)
}
