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
import type { Room } from '../../features/room/types'
import { useMemo } from 'react'

type RoomRouteComponentProps = {
  fetchRoom?: (roomId: string) => Promise<Room>
  roomId?: string
}

export function RoomRouteComponent({
  fetchRoom = getRoom,
  roomId = 'room-1',
}: RoomRouteComponentProps) {
  const roomQuery = useQuery(roomQueryOptions(roomId, fetchRoom))
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
    return <RoomErrorState />
  }

  return (
    <CallControllerProvider controller={controller}>
      <ConnectionBanner />
      <PrejoinPanel onJoin={() => void joinRoom(roomId)} room={roomQuery.data} />
      <ControlBar />
      <DeviceSheet />
    </CallControllerProvider>
  )
}
