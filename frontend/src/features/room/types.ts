export type RoomErrorVariant =
  | 'access-denied'
  | 'join-failed'
  | 'not-found'
  | 'temporary-error'

export type Room = {
  hasActiveMeeting: boolean
  id: string
  name: string
}

export class RoomRequestError extends Error {
  constructor(public readonly variant: Exclude<RoomErrorVariant, 'join-failed'>) {
    super(variant)
    this.name = 'RoomRequestError'
  }
}
