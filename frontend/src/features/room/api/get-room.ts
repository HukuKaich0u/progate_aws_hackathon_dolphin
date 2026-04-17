import type { Room } from '../types'

export async function getRoom(_roomId: string): Promise<Room> {
  return {
    hasActiveMeeting: false,
    id: 'stub-room',
    name: 'Stub room',
  }
}
