type RoomErrorStateProps = {
  message?: string
}

export function RoomErrorState({ message = 'Unable to load room.' }: RoomErrorStateProps) {
  return <p>{message}</p>
}
