import { LoginPage } from '../features/auth/login-page'

type LoginRouteComponentProps = {
  redirectTo?: string
}

export function LoginRouteComponent({ redirectTo }: LoginRouteComponentProps) {
  return <LoginPage redirectTo={redirectTo} />
}
