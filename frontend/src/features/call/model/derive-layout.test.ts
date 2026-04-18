import { deriveLayout } from './derive-layout'
import type { Participant } from './participant'

function createParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    audioMuted: false,
    avatarUrl: null,
    displayName: overrides.id ?? 'Participant',
    id: 'participant',
    isLocal: false,
    isScreenSharing: false,
    isSpeaking: false,
    networkQuality: 'good',
    videoEnabled: true,
    ...overrides,
  }
}

describe('deriveLayout', () => {
  it('uses pinned participant as stage', () => {
    const participants = [
      createParticipant({ id: 'local', isLocal: true }),
      createParticipant({ id: 'remote-1', isSpeaking: true }),
      createParticipant({ id: 'remote-2' }),
    ]

    const layout = deriveLayout({
      page: 0,
      pageSize: 4,
      participants,
      pinnedParticipantId: 'remote-2',
    })

    expect(layout.stageParticipant?.id).toBe('remote-2')
  })

  it('falls back to active speaker when nothing pinned', () => {
    const participants = [
      createParticipant({ id: 'local', isLocal: true }),
      createParticipant({ id: 'speaker', isSpeaking: true }),
      createParticipant({ id: 'listener' }),
    ]

    const layout = deriveLayout({
      page: 0,
      pageSize: 4,
      participants,
      pinnedParticipantId: null,
    })

    expect(layout.stageParticipant?.id).toBe('speaker')
  })

  it('pages overflow participants after visible limit', () => {
    const participants = Array.from({ length: 8 }, (_, index) =>
      createParticipant({ id: `participant-${index}` }),
    )

    const layout = deriveLayout({
      page: 1,
      pageSize: 3,
      participants,
      pinnedParticipantId: null,
    })

    expect(layout.visibleParticipants.map((participant) => participant.id)).toEqual([
      'participant-4',
      'participant-5',
      'participant-6',
    ])
    expect(layout.overflowCount).toBe(1)
  })
})
