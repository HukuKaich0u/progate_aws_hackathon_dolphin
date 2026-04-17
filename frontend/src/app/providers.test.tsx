import { screen } from '@testing-library/react'
import { render } from '../test/render'
import { AppProviders } from './providers'

describe('AppProviders', () => {
  it('renders router outlet shell', () => {
    render(<AppProviders />)

    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })
})
