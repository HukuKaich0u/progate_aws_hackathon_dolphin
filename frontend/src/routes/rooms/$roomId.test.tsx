import { screen } from '@testing-library/react'
import { renderWithQueryClient } from '../../test/render'
import { RoomRouteComponent } from './$roomId'

describe('RoomRouteComponent', () => {
  it('shows prejoin panel after room loads', async () => {
    renderWithQueryClient(
      <RoomRouteComponent
        fetchRoom={async () => ({
          hasActiveMeeting: false,
          id: 'room-1',
          name: 'Ocean room',
        })}
        roomId="room-1"
      />,
    )

    expect(await screen.findByRole('button', { name: /join now/i })).toBeVisible()
  })
})
