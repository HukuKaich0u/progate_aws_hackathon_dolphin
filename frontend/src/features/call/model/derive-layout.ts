import type { Participant } from './participant'

type DeriveLayoutOptions = {
  page: number
  pageSize: number
  participants: Participant[]
  pinnedParticipantId: string | null
}

function getStageParticipant(
  participants: Participant[],
  pinnedParticipantId: string | null,
) {
  if (pinnedParticipantId) {
    const pinnedParticipant = participants.find(
      (participant) => participant.id === pinnedParticipantId,
    )

    if (pinnedParticipant) {
      return pinnedParticipant
    }
  }

  return participants.find((participant) => participant.isSpeaking) ?? participants[0] ?? null
}

export function deriveLayout({
  page,
  pageSize,
  participants,
  pinnedParticipantId,
}: DeriveLayoutOptions) {
  const stageParticipant = getStageParticipant(participants, pinnedParticipantId)
  const nonStageParticipants = stageParticipant
    ? participants.filter((participant) => participant.id !== stageParticipant.id)
    : participants
  const start = page * pageSize
  const visibleParticipants = nonStageParticipants.slice(start, start + pageSize)
  const overflowParticipants = nonStageParticipants.slice(start + pageSize)

  return {
    overflowCount: overflowParticipants.length,
    overflowParticipants,
    stageParticipant,
    visibleParticipants,
  }
}
