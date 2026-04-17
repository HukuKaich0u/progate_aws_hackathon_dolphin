import { getAppEnv } from '../../lib/config/env'
import { setAuthSession } from './auth-session'

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

  setAuthSession({
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    idToken: tokens.id_token,
    refreshToken: tokens.refresh_token ?? null,
  })

  clearPendingAuthRequest()

  return {
    redirectTo: pendingAuthRequest.redirectTo,
  }
}
