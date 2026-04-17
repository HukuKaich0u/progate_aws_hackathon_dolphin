import { screen, waitFor } from '@testing-library/react'
import { render } from '../..//test/render'
import { CallbackPage } from './callback-page'

describe('CallbackPage', () => {
  it('completes sign in and redirects to the saved route', async () => {
    const completeAuthCallback = vi
      .fn<(_: URLSearchParams) => Promise<{ redirectTo: string }>>()
      .mockResolvedValue({ redirectTo: '/rooms/room-1' })
    const navigate = vi.fn()

    render(
      <CallbackPage
        searchParams={new URLSearchParams('code=auth-code&state=opaque-state')}
        completeAuthCallback={completeAuthCallback}
        navigate={navigate}
      />,
    )

    expect(screen.getByText('Signing you in...')).toBeInTheDocument()

    await waitFor(() => {
      expect(completeAuthCallback).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/rooms/room-1')
    })
  })
})
