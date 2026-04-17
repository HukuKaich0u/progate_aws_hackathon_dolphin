import { clearAuthSession } from './auth-session'
import { beginLogout } from './cognito'

export function logout(redirectTo = window.location.origin) {
  clearAuthSession()
  beginLogout(redirectTo)
}
