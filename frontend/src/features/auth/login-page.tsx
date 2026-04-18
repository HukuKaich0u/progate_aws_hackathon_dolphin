import { useState, type FormEvent } from 'react'
import { signInWithPassword as defaultSignIn } from './cognito'

type LoginPageProps = {
  redirectTo?: string
  signIn?: (email: string, password: string) => Promise<unknown>
  navigate?: (path: string) => void
}

const defaultNavigate = (path: string) => {
  window.location.replace(path)
}

export function LoginPage({
  navigate = defaultNavigate,
  redirectTo = '/',
  signIn = defaultSignIn,
}: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate(redirectTo)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ログインに失敗しました。')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <button
        aria-label="戻る"
        className="login-back"
        onClick={() => window.history.back()}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
          <path
            d="M15 5l-7 7 7 7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      <main className="login-main">
        <div className="login-brand" aria-hidden="true">
          <svg height="72" viewBox="0 0 80 80" width="72">
            <circle cx="40" cy="40" fill="#0866FF" r="36" />
            <path
              d="M40 22c-10.5 0-19 7.6-19 17 0 5.3 2.8 10 7.2 13v8l6.7-3.7c1.6.4 3.3.7 5.1.7 10.5 0 19-7.6 19-17s-8.5-18-19-18z"
              fill="#fff"
            />
            <path d="M30 39l7 5 5-6 8 7-7-5-5 6-8-7z" fill="#0866FF" />
          </svg>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <input
            autoComplete="username"
            className="login-input"
            inputMode="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="携帯電話番号またはメールアドレス"
            required
            type="email"
            value={email}
          />
          <input
            autoComplete="current-password"
            className="login-input"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            required
            type="password"
            value={password}
          />

          {error ? <p className="login-error" role="alert">{error}</p> : null}

          <button className="login-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </button>

          <a className="login-forgot" href="#" onClick={(e) => e.preventDefault()}>
            パスワードを忘れた場合
          </a>
        </form>
      </main>

      <footer className="login-footer">
        <a className="login-secondary" href="/signup">
          新しいアカウントを作成
        </a>
        <p className="login-brandline">Dolphin</p>
      </footer>
    </div>
  )
}
