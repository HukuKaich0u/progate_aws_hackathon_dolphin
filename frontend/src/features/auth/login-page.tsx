import { beginLogin } from './cognito'

type LoginPageProps = {
  redirectTo?: string
}

export function LoginPage({ redirectTo = '/' }: LoginPageProps) {
  return (
    <main className="page-shell">
      <section className="hero-panel hero-panel--narrow">
        <p className="eyebrow">Authentication</p>
        <h1 className="hero-title">Sign in to open your call room.</h1>
        <p className="hero-copy">
          Continue with Cognito to restore your session and access protected room routes.
        </p>
        <div className="hero-actions">
          <button onClick={() => void beginLogin(redirectTo)} type="button">
            Continue with Cognito
          </button>
        </div>
      </section>
    </main>
  )
}
