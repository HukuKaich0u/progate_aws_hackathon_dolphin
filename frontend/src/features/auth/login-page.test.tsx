import { fireEvent, screen, waitFor } from '@testing-library/react'
import { render } from '../../test/render'
import { LoginPage } from './login-page'

function typeInto(placeholder: string, value: string) {
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } })
}

describe('LoginPage', () => {
  it('calls signIn with trimmed email and navigates to redirectTo on success', async () => {
    const signIn = vi.fn().mockResolvedValue({ accessToken: 'x' })
    const navigate = vi.fn()

    render(<LoginPage navigate={navigate} redirectTo="/rooms/42" signIn={signIn} />)

    typeInto('携帯電話番号またはメールアドレス', '  test@example.com  ')
    typeInto('パスワード', 'Passw0rd1')
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('test@example.com', 'Passw0rd1')
    })
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/rooms/42')
    })
  })

  it('shows a localized error message when signIn rejects', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('メールアドレスまたはパスワードが正しくありません。'))
    const navigate = vi.fn()

    render(<LoginPage navigate={navigate} signIn={signIn} />)

    typeInto('携帯電話番号またはメールアドレス', 'test@example.com')
    typeInto('パスワード', 'wrong')
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'メールアドレスまたはパスワードが正しくありません。',
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('links the create-account CTA to /signup', () => {
    render(<LoginPage signIn={vi.fn()} navigate={vi.fn()} />)

    expect(screen.getByRole('link', { name: '新しいアカウントを作成' })).toHaveAttribute(
      'href',
      '/signup',
    )
  })
})
