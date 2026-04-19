export type AppEnv = {
  apiBaseUrl: string
  awsRegion: string
  cognitoClientId: string
  cognitoDomain: string
  cognitoLogoutRedirectUri: string
  cognitoRedirectUri: string
}

function getRequiredEnv(name: keyof ImportMetaEnv) {
  const value = import.meta.env[name]

  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }

  return value
}

function getOptionalEnv(name: keyof ImportMetaEnv) {
  const value = import.meta.env[name]

  if (!value) {
    return null
  }

  return value
}

function resolveApiBaseUrl(): string {
  const configured = getOptionalEnv('VITE_API_BASE_URL')
  if (configured) return configured
  if (typeof window !== 'undefined') return window.location.origin
  throw new Error('Missing required env var: VITE_API_BASE_URL')
}

export function getAppEnv(): AppEnv {
  const cognitoRedirectUri = getRequiredEnv('VITE_COGNITO_REDIRECT_URI')

  return {
    apiBaseUrl: resolveApiBaseUrl(),
    awsRegion: getRequiredEnv('VITE_AWS_REGION'),
    cognitoClientId: getRequiredEnv('VITE_COGNITO_CLIENT_ID'),
    cognitoDomain: getRequiredEnv('VITE_COGNITO_DOMAIN'),
    cognitoLogoutRedirectUri:
      getOptionalEnv('VITE_COGNITO_LOGOUT_REDIRECT_URI') ??
      (typeof window !== 'undefined' ? window.location.origin : cognitoRedirectUri),
    cognitoRedirectUri,
  }
}
