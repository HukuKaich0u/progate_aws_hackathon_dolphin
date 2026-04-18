import { screen } from '@testing-library/react'
import { render } from '../../../test/render'
import { useCallUiStore } from '../store/call-ui-store'
import { ConnectionBanner } from './connection-banner'

describe('ConnectionBanner', () => {
  it('shows reconnecting banner without dropping room scene', () => {
    useCallUiStore.setState({
      connectionPhase: 'reconnecting',
    })

    render(
      <>
        <div>Room scene</div>
        <ConnectionBanner />
      </>,
    )

    expect(screen.getByText('Room scene')).toBeInTheDocument()
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument()
  })
})
