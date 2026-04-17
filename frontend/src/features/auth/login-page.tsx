import { beginLogin } from './cognito'

type LoginPageProps = {
  redirectTo?: string
}

export function LoginPage({ redirectTo = '/' }: LoginPageProps) {
  return (
    <main>
      <h1>Sign in</h1>
      <button onClick={() => void beginLogin(redirectTo)} type="button">
        Continue with Cognito
      </button>
    </main>
  )
}
