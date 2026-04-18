import { Avatar } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import type { Participant } from '../model/participant'

type ParticipantTileProps = {
  participant: Participant
}

export function ParticipantTile({ participant }: ParticipantTileProps) {
  return (
    <article>
      <Avatar fallback={participant.displayName} />
      <p>{participant.displayName}</p>
      {participant.isSpeaking ? <Badge>Speaking</Badge> : null}
    </article>
  )
}
