import { useQuery } from '@tanstack/react-query'
import { getRoom } from '../../features/room/api/get-room'
import { joinRoom } from '../../features/room/api/join-room'
import { PrejoinPanel } from '../../features/room/components/prejoin-panel'
import { RoomErrorState } from '../../features/room/components/room-error-state'
import { roomQueryOptions } from '../../features/room/queries'
import type { Room } from '../../features/room/types'

type RoomRouteComponentProps = {
  fetchRoom?: (roomId: string) => Promise<Room>
  roomId?: string
}

export function RoomRouteComponent({
  fetchRoom = getRoom,
  roomId = 'room-1',
}: RoomRouteComponentProps) {
  const roomQuery = useQuery(roomQueryOptions(roomId, fetchRoom))

  if (roomQuery.isPending) {
    return <p>Loading room...</p>
  }

  if (roomQuery.isError) {
    return <RoomErrorState />
  }

  return <PrejoinPanel onJoin={() => void joinRoom(roomId)} room={roomQuery.data} />
}
