import { Button } from '../../../components/ui/button'
import type { Room } from '../types'

type PrejoinPanelProps = {
  onJoin?: () => void
  room: Room
}

export function PrejoinPanel({ onJoin, room }: PrejoinPanelProps) {
  return (
    <section className="prejoin-panel">
      <div>
        <p className="eyebrow">Pre-join</p>
        <h2 className="prejoin-title">{room.name}</h2>
        <p className="prejoin-copy">
          {room.hasActiveMeeting
            ? 'A live meeting is already running. Rejoin when you are ready.'
            : 'Camera, microphone, and device controls are available before entering the room.'}
        </p>
      </div>
      <div className="prejoin-meta">
        <div className="prejoin-stat">
          <span>Status</span>
          <strong>{room.hasActiveMeeting ? 'Live now' : 'Waiting'}</strong>
        </div>
        <div className="prejoin-stat">
          <span>Room ID</span>
          <strong>{room.id}</strong>
        </div>
      </div>
      <Button onClick={onJoin} type="button">
        Join now
      </Button>
    </section>
  )
}
