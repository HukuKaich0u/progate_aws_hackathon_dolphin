import { useState, type FormEvent } from 'react'
import {
  confirmSignUp as defaultConfirmSignUp,
  resendConfirmationCode as defaultResendCode,
  signUp as defaultSignUp,
} from './cognito'

type Step = 'register' | 'confirm'

type SignupPageProps = {
  confirmSignUp?: (email: string, code: string) => Promise<void>
  navigate?: (path: string) => void
  resendConfirmationCode?: (email: string) => Promise<void>
  signUp?: (email: string, password: string) => Promise<void>
}

const defaultNavigate = (path: string) => {
  window.location.replace(path)
}

export function SignupPage({
  confirmSignUp = defaultConfirmSignUp,
  navigate = defaultNavigate,
  resendConfirmationCode = defaultResendCode,
  signUp = defaultSignUp,
}: SignupPageProps = {}) {
  const [step, setStep] = useState<Step>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    setNotice(null)
    setIsSubmitting(true)
    try {
      await signUp(email.trim(), password)
      setStep('confirm')
      setNotice('確認コードをメールに送信しました。')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'アカウント作成に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    setNotice(null)
    setIsSubmitting(true)
    try {
      await confirmSignUp(email.trim(), code.trim())
      navigate('/login')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '確認に失敗しました。')
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setError(null)
    setNotice(null)
    try {
      await resendConfirmationCode(email.trim())
      setNotice('確認コードを再送信しました。')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'コード再送信に失敗しました。')
    }
  }

  return (
    <div className="login-screen">
      <button
        aria-label="戻る"
        className="login-back"
        onClick={() => (step === 'confirm' ? setStep('register') : window.history.back())}
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

        {step === 'register' ? (
          <form className="login-form" onSubmit={handleRegister} noValidate>
            <h1 className="signup-title">アカウントを作成</h1>
            <input
              autoComplete="email"
              className="login-input"
              inputMode="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              required
              type="email"
              value={email}
            />
            <input
              autoComplete="new-password"
              className="login-input"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード（8文字以上・英大小+数字）"
              required
              type="password"
              value={password}
            />

            {error ? <p className="login-error" role="alert">{error}</p> : null}
            {notice ? <p className="signup-notice">{notice}</p> : null}

            <button className="login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? '作成中...' : '登録'}
            </button>

            <a className="login-forgot" href="/login">
              すでにアカウントをお持ちの方
            </a>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleConfirm} noValidate>
            <h1 className="signup-title">確認コードを入力</h1>
            <p className="signup-sub">{email} に送信した6桁のコードを入力してください。</p>
            <input
              autoComplete="one-time-code"
              className="login-input"
              inputMode="numeric"
              onChange={(e) => setCode(e.target.value)}
              placeholder="確認コード"
              required
              value={code}
            />

            {error ? <p className="login-error" role="alert">{error}</p> : null}
            {notice ? <p className="signup-notice">{notice}</p> : null}

            <button className="login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? '確認中...' : '確認してログイン画面へ'}
            </button>

            <button className="login-forgot signup-linklike" onClick={handleResend} type="button">
              確認コードを再送信
            </button>
          </form>
        )}
      </main>

      <footer className="login-footer">
        <p className="login-brandline">Dolphin</p>
      </footer>
    </div>
  )
}
