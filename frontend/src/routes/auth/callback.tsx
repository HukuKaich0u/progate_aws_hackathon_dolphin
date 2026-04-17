import { CallbackPage } from '../../features/auth/callback-page'

type AuthCallbackRouteComponentProps = {
  navigate?: (to: string) => void
}

export function AuthCallbackRouteComponent({ navigate }: AuthCallbackRouteComponentProps) {
  return <CallbackPage navigate={navigate} />
}
