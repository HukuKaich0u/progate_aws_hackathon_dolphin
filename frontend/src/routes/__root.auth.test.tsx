import { screen, waitFor } from '@testing-library/react'
import { renderWithQueryClient } from '../test/render'
import { RootLayout } from './__root'

describe('RootLayout auth shell', () => {
  it('shows signed-in shell state when current user exists', async () => {
    renderWithQueryClient(
      <RootLayout
        fetchCurrentUser={vi.fn().mockResolvedValue({
          email: 'user@example.com',
          groups: ['member'],
          userId: 'user-123',
        })}
        outlet={<p>room</p>}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Signed in as user@example.com')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('falls back to signed-out shell state after unauthorized current-user fetch', async () => {
    renderWithQueryClient(<RootLayout fetchCurrentUser={vi.fn().mockResolvedValue(null)} outlet={<p>room</p>} />)

    await waitFor(() => {
      expect(screen.getByText('Not signed in')).toBeInTheDocument()
    })
  })
})
