import type { StoreApi, UseBoundStore } from 'zustand'
import type { DeviceManager } from './device-manager'
import type { ConnectionPhase } from '../store/call-ui-store'

type CallUiState = {
  connectionPhase: ConnectionPhase
  isCameraEnabled: boolean
  isMicEnabled: boolean
  isScreenSharing: boolean
  selectedAudioInputId: string | null
  selectedVideoInputId: string | null
  setConnectionPhase: (phase: ConnectionPhase) => void
  setSelectedAudioInputId: (deviceId: string | null) => void
  setSelectedVideoInputId: (deviceId: string | null) => void
  toggleCamera: () => void
  toggleMic: () => void
  toggleScreenShare: () => void
}

type CallControllerOptions = {
  deviceManager: DeviceManager
  store: UseBoundStore<StoreApi<CallUiState>>
}

export class CallController {
  private previewStream: MediaStream | null = null

  constructor(private readonly options: CallControllerOptions) {}

  private applyTrackState() {
    const previewStream = this.previewStream
    if (!previewStream) {
      return
    }

    const state = this.options.store.getState()

    for (const track of previewStream.getAudioTracks()) {
      track.enabled = state.isMicEnabled
    }

    for (const track of previewStream.getVideoTracks()) {
      track.enabled = state.isCameraEnabled
    }
  }

  private buildConstraints(): MediaStreamConstraints {
    const state = this.options.store.getState()

    return {
      audio: state.selectedAudioInputId
        ? {
            deviceId: {
              exact: state.selectedAudioInputId,
            },
          }
        : true,
      video: state.selectedVideoInputId
        ? {
            deviceId: {
              exact: state.selectedVideoInputId,
            },
          }
        : true,
    }
  }

  private replacePreviewStream(nextStream: MediaStream) {
    if (this.previewStream) {
      for (const track of this.previewStream.getTracks()) {
        track.stop()
      }
    }

    this.previewStream = nextStream
    this.applyTrackState()
  }

  async initializePreview() {
    const previewStream = await this.options.deviceManager.getUserMedia(this.buildConstraints())

    this.replacePreviewStream(previewStream)

    return previewStream
  }

  getPreviewStream() {
    return this.previewStream
  }

  async setAudioInput(deviceId: string) {
    this.options.store.getState().setSelectedAudioInputId(deviceId)

    return this.initializePreview()
  }

  async toggleCamera() {
    this.options.store.getState().toggleCamera()
    this.applyTrackState()
  }

  async toggleMicrophone() {
    this.options.store.getState().toggleMic()
    this.applyTrackState()
  }

  toggleScreenShare() {
    this.options.store.getState().toggleScreenShare()
  }
}
