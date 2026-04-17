import type { Room } from '../types'

type PrejoinPanelProps = {
  onJoin?: () => void
  room: Room
}

export function PrejoinPanel({ onJoin, room }: PrejoinPanelProps) {
  return (
    <section>
      <p>{room.name}</p>
      <button onClick={onJoin} type="button">
        Join now
      </button>
    </section>
  )
}
