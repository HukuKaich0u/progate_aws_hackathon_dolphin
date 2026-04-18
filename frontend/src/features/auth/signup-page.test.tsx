import { fireEvent, screen, waitFor } from '@testing-library/react'
import { render } from '../../test/render'
import { SignupPage } from './signup-page'

function typeInto(placeholder: string, value: string) {
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } })
}

describe('SignupPage', () => {
  it('transitions to the confirm step after a successful sign up', async () => {
    const signUp = vi.fn().mockResolvedValue(undefined)
    const confirmSignUp = vi.fn()

    render(<SignupPage signUp={signUp} confirmSignUp={confirmSignUp} />)

    typeInto('メールアドレス', 'new@example.com')
    typeInto('パスワード（8文字以上・英大小+数字）', 'Passw0rd1')
    fireEvent.click(screen.getByRole('button', { name: '登録' }))

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith('new@example.com', 'Passw0rd1')
    })
    await screen.findByRole('button', { name: '確認してログイン画面へ' })
    expect(screen.getByText('確認コードをメールに送信しました。')).toBeInTheDocument()
  })

  it('shows the error message when sign up fails', async () => {
    const signUp = vi.fn().mockRejectedValue(new Error('このメールアドレスは既に登録されています。'))

    render(<SignupPage signUp={signUp} />)

    typeInto('メールアドレス', 'dup@example.com')
    typeInto('パスワード（8文字以上・英大小+数字）', 'Passw0rd1')
    fireEvent.click(screen.getByRole('button', { name: '登録' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'このメールアドレスは既に登録されています。',
    )
  })

  it('navigates to /login after confirming the sign up', async () => {
    const signUp = vi.fn().mockResolvedValue(undefined)
    const confirmSignUp = vi.fn().mockResolvedValue(undefined)
    const navigate = vi.fn()

    render(
      <SignupPage
        confirmSignUp={confirmSignUp}
        navigate={navigate}
        signUp={signUp}
      />,
    )

    typeInto('メールアドレス', 'new@example.com')
    typeInto('パスワード（8文字以上・英大小+数字）', 'Passw0rd1')
    fireEvent.click(screen.getByRole('button', { name: '登録' }))

    const confirmSubmit = await screen.findByRole('button', { name: '確認してログイン画面へ' })
    typeInto('確認コード', '123456')
    fireEvent.click(confirmSubmit)

    await waitFor(() => {
      expect(confirmSignUp).toHaveBeenCalledWith('new@example.com', '123456')
    })
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/login')
    })
  })

  it('resend button calls resendConfirmationCode', async () => {
    const signUp = vi.fn().mockResolvedValue(undefined)
    const resendConfirmationCode = vi.fn().mockResolvedValue(undefined)

    render(
      <SignupPage
        resendConfirmationCode={resendConfirmationCode}
        signUp={signUp}
      />,
    )

    typeInto('メールアドレス', 'new@example.com')
    typeInto('パスワード（8文字以上・英大小+数字）', 'Passw0rd1')
    fireEvent.click(screen.getByRole('button', { name: '登録' }))

    await screen.findByRole('button', { name: '確認してログイン画面へ' })
    fireEvent.click(screen.getByRole('button', { name: '確認コードを再送信' }))

    await waitFor(() => {
      expect(resendConfirmationCode).toHaveBeenCalledWith('new@example.com')
    })
    expect(screen.getByText('確認コードを再送信しました。')).toBeInTheDocument()
  })
})
