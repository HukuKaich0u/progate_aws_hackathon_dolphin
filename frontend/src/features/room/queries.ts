import { queryOptions } from '@tanstack/react-query'
import { getRoom } from './api/get-room'
import type { Room } from './types'

export function roomQueryOptions(
  roomId: string,
  fetchRoom: (roomId: string) => Promise<Room> = getRoom,
) {
  return queryOptions({
    queryFn: () => fetchRoom(roomId),
    queryKey: ['room', roomId],
  })
}
