import { useCallUiStore } from '../store/call-ui-store'
import { CallController } from './call-controller'

function createFakeTrack(kind: 'audio' | 'video') {
  return {
    enabled: true,
    kind,
    stop: vi.fn(),
  } as unknown as MediaStreamTrack
}

function createFakeStream(audioTrack: MediaStreamTrack, videoTrack: MediaStreamTrack) {
  return {
    getAudioTracks: () => [audioTrack],
    getTracks: () => [audioTrack, videoTrack],
    getVideoTracks: () => [videoTrack],
  } as unknown as MediaStream
}

describe('CallController', () => {
  beforeEach(() => {
    useCallUiStore.setState({
      connectionPhase: 'prejoin',
      isCameraEnabled: true,
      isDeviceSettingsOpen: false,
      isMicEnabled: true,
      isScreenSharing: false,
      participantPage: 0,
      pinnedParticipantId: null,
      selectedAudioInputId: null,
      selectedAudioOutputId: null,
      selectedVideoInputId: null,
    })
  })

  it('toggles microphone intent and disables local audio track', async () => {
    const audioTrack = createFakeTrack('audio')
    const videoTrack = createFakeTrack('video')
    const deviceManager = {
      getUserMedia: vi.fn().mockResolvedValue(createFakeStream(audioTrack, videoTrack)),
    }
    const controller = new CallController({
      deviceManager,
      store: useCallUiStore,
    })

    await controller.initializePreview()
    await controller.toggleMicrophone()

    expect(useCallUiStore.getState().isMicEnabled).toBe(false)
    expect(audioTrack.enabled).toBe(false)
  })

  it('changes selected input device and rebinds preview stream', async () => {
    const firstAudioTrack = createFakeTrack('audio')
    const firstVideoTrack = createFakeTrack('video')
    const secondAudioTrack = createFakeTrack('audio')
    const secondVideoTrack = createFakeTrack('video')
    const firstStream = createFakeStream(firstAudioTrack, firstVideoTrack)
    const secondStream = createFakeStream(secondAudioTrack, secondVideoTrack)
    const deviceManager = {
      getUserMedia: vi
        .fn()
        .mockResolvedValueOnce(firstStream)
        .mockResolvedValueOnce(secondStream),
    }
    const controller = new CallController({
      deviceManager,
      store: useCallUiStore,
    })

    await controller.initializePreview()
    await controller.setAudioInput('mic-2')

    expect(useCallUiStore.getState().selectedAudioInputId).toBe('mic-2')
    expect(deviceManager.getUserMedia).toHaveBeenLastCalledWith({
      audio: {
        deviceId: {
          exact: 'mic-2',
        },
      },
      video: true,
    })
    expect(controller.getPreviewStream()).toBe(secondStream)
  })
})
