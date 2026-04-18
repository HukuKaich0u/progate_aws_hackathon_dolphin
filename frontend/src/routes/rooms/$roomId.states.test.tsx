import { fireEvent, screen } from '@testing-library/react'
import { renderWithQueryClient } from '../../test/render'
import { useCallUiStore } from '../../features/call/store/call-ui-store'
import { RoomRequestError } from '../../features/room/types'
import { RoomRouteComponent } from './$roomId'

describe('RoomRouteComponent states', () => {
  beforeEach(() => {
    useCallUiStore.setState({
      connectionPhase: 'idle',
      isCameraEnabled: true,
      isDeviceSettingsOpen: false,
      isMicEnabled: true,
      isScreenSharing: false,
      participantPage: 0,
      pinnedParticipantId: null,
      selectedAudioInputId: null,
      selectedAudioOutputId: null,
      selectedVideoInputId: null,
    })
  })

  it('renders not found state distinctly', async () => {
    renderWithQueryClient(
      <RoomRouteComponent
        fetchRoom={async () => {
          throw new RoomRequestError('not-found')
        }}
      />,
    )

    expect(await screen.findByText(/room not found/i)).toBeInTheDocument()
  })

  it('renders denied state distinctly', async () => {
    renderWithQueryClient(
      <RoomRouteComponent
        fetchRoom={async () => {
          throw new RoomRequestError('access-denied')
        }}
      />,
    )

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument()
  })

  it('renders join failed state distinctly', async () => {
    renderWithQueryClient(
      <RoomRouteComponent
        fetchRoom={async () => ({
          hasActiveMeeting: false,
          id: 'room-1',
          name: 'Ocean room',
        })}
        joinRoomRequest={async () => {
          throw new Error('join failed')
        }}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /join now/i }))

    expect(await screen.findByText(/unable to join call/i)).toBeInTheDocument()
  })

  it('renders reconnecting banner without dropping the room scene', async () => {
    useCallUiStore.setState({
      connectionPhase: 'reconnecting',
    })

    renderWithQueryClient(
      <RoomRouteComponent
        fetchRoom={async () => ({
          hasActiveMeeting: false,
          id: 'room-1',
          name: 'Ocean room',
        })}
      />,
    )

    expect(await screen.findByRole('button', { name: /join now/i })).toBeInTheDocument()
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument()
  })
})
