import { screen } from '@testing-library/react'
import { render } from '../test/render'
import { AppProviders } from './providers'

describe('AppProviders', () => {
  it('renders router shell with a visible landing page', async () => {
    render(<AppProviders />)

    expect(screen.getByTestId('app-root')).toBeInTheDocument()
    expect(await screen.findByText(/room-centered video calls/i)).toBeInTheDocument()
  })
})
