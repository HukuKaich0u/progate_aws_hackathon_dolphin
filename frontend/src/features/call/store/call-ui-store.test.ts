import { useCallUiStore } from './call-ui-store'

describe('useCallUiStore', () => {
  beforeEach(() => {
    useCallUiStore.setState({
      connectionPhase: 'idle',
      isCameraEnabled: true,
      isMicEnabled: true,
      isScreenSharing: false,
      participantPage: 0,
      pinnedParticipantId: null,
      selectedAudioInputId: null,
      selectedAudioOutputId: null,
      selectedVideoInputId: null,
    })
  })

  it('toggles mic, camera, and screen sharing state', () => {
    useCallUiStore.getState().toggleMic()
    useCallUiStore.getState().toggleCamera()
    useCallUiStore.getState().toggleScreenShare()

    expect(useCallUiStore.getState()).toMatchObject({
      isCameraEnabled: false,
      isMicEnabled: false,
      isScreenSharing: true,
    })
  })

  it('stores pinned participant, page, and connection phase', () => {
    useCallUiStore.getState().setPinnedParticipantId('participant-2')
    useCallUiStore.getState().setParticipantPage(2)
    useCallUiStore.getState().setConnectionPhase('reconnecting')

    expect(useCallUiStore.getState()).toMatchObject({
      connectionPhase: 'reconnecting',
      participantPage: 2,
      pinnedParticipantId: 'participant-2',
    })
  })
})
