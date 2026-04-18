export type AppEnv = {
  apiBaseUrl: string
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

export function getAppEnv(): AppEnv {
  const cognitoRedirectUri = getRequiredEnv('VITE_COGNITO_REDIRECT_URI')

  return {
    apiBaseUrl: getRequiredEnv('VITE_API_BASE_URL'),
    cognitoClientId: getRequiredEnv('VITE_COGNITO_CLIENT_ID'),
    cognitoDomain: getRequiredEnv('VITE_COGNITO_DOMAIN'),
    cognitoLogoutRedirectUri:
      getOptionalEnv('VITE_COGNITO_LOGOUT_REDIRECT_URI') ??
      (typeof window !== 'undefined' ? window.location.origin : cognitoRedirectUri),
    cognitoRedirectUri,
  }
}
