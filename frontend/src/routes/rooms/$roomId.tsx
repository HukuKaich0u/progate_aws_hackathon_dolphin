import { useQuery } from '@tanstack/react-query'
import { ConnectionBanner } from '../../features/call/components/connection-banner'
import { ControlBar } from '../../features/call/components/control-bar'
import { DeviceSheet } from '../../features/call/components/device-sheet'
import { CallController } from '../../features/call/media/call-controller'
import { CallControllerProvider } from '../../features/call/media/call-controller-context'
import { createBrowserDeviceManager } from '../../features/call/media/device-manager'
import { useCallUiStore } from '../../features/call/store/call-ui-store'
import { getRoom } from '../../features/room/api/get-room'
import { joinRoom } from '../../features/room/api/join-room'
import { PrejoinPanel } from '../../features/room/components/prejoin-panel'
import { RoomErrorState } from '../../features/room/components/room-error-state'
import { roomQueryOptions } from '../../features/room/queries'
import { RoomRequestError, type Room } from '../../features/room/types'
import { useMemo, useState } from 'react'

type RoomRouteComponentProps = {
  fetchRoom?: (roomId: string) => Promise<Room>
  joinRoomRequest?: (roomId: string) => Promise<unknown>
  roomId?: string
}

export function RoomRouteComponent({
  fetchRoom = getRoom,
  joinRoomRequest = joinRoom,
  roomId = 'room-1',
}: RoomRouteComponentProps) {
  const roomQuery = useQuery(roomQueryOptions(roomId, fetchRoom))
  const [joinError, setJoinError] = useState(false)
  const controller = useMemo(
    () =>
      new CallController({
        deviceManager: createBrowserDeviceManager(),
        store: useCallUiStore,
      }),
    [],
  )

  if (roomQuery.isPending) {
    return <p>Loading room...</p>
  }

  if (roomQuery.isError) {
    const errorVariant =
      roomQuery.error instanceof RoomRequestError ? roomQuery.error.variant : 'temporary-error'

    return <RoomErrorState variant={errorVariant} />
  }

  return (
    <CallControllerProvider controller={controller}>
      <main className="room-page">
        <section className="room-stage">
          <div className="stage-panel">
            <p className="eyebrow">Active stage</p>
            <h1 className="stage-title">{roomQuery.data.name}</h1>
            <p className="stage-copy">
              Main participant stage, pinned speaker area, and realtime call surfaces land here.
            </p>
          </div>
          <div className="participant-grid">
            <div className="participant-tile">Local preview</div>
            <div className="participant-tile participant-tile--muted">Remote participant</div>
            <div className="participant-tile participant-tile--muted">Overflow slot</div>
            <div className="participant-tile participant-tile--muted">Overflow slot</div>
          </div>
        </section>
        <ConnectionBanner />
        {joinError ? <RoomErrorState variant="join-failed" /> : null}
        <PrejoinPanel
          onJoin={() => {
            void joinRoomRequest(roomId).catch(() => {
              setJoinError(true)
            })
          }}
          room={roomQuery.data}
        />
        <ControlBar />
        <DeviceSheet />
      </main>
    </CallControllerProvider>
  )
}
