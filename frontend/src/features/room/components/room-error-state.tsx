import type { RoomErrorVariant } from '../types'

type RoomErrorStateProps = {
  variant: RoomErrorVariant
}

const messages: Record<RoomErrorVariant, string> = {
  'access-denied': 'Access denied.',
  'join-failed': 'Unable to join call.',
  'not-found': 'Room not found.',
  'temporary-error': 'Temporary error. Please try again.',
}

export function RoomErrorState({ variant }: RoomErrorStateProps) {
  return <p>{messages[variant]}</p>
}
