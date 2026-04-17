export type AppEnv = {
  apiBaseUrl: string
  cognitoClientId: string
  cognitoDomain: string
  cognitoRedirectUri: string
}

function getRequiredEnv(name: keyof ImportMetaEnv) {
  const value = import.meta.env[name]

  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }

  return value
}

export function getAppEnv(): AppEnv {
  return {
    apiBaseUrl: getRequiredEnv('VITE_API_BASE_URL'),
    cognitoClientId: getRequiredEnv('VITE_COGNITO_CLIENT_ID'),
    cognitoDomain: getRequiredEnv('VITE_COGNITO_DOMAIN'),
    cognitoRedirectUri: getRequiredEnv('VITE_COGNITO_REDIRECT_URI'),
  }
}
