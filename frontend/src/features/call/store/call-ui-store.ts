import { create } from 'zustand'

export type ConnectionPhase =
  | 'idle'
  | 'authenticating'
  | 'prejoin'
  | 'joining'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'leaving'

type CallUiState = {
  connectionPhase: ConnectionPhase
  isDeviceSettingsOpen: boolean
  isCameraEnabled: boolean
  isMicEnabled: boolean
  isScreenSharing: boolean
  participantPage: number
  pinnedParticipantId: string | null
  setDeviceSettingsOpen: (isOpen: boolean) => void
  selectedAudioInputId: string | null
  selectedAudioOutputId: string | null
  selectedVideoInputId: string | null
  setConnectionPhase: (phase: ConnectionPhase) => void
  setParticipantPage: (page: number) => void
  setPinnedParticipantId: (participantId: string | null) => void
  setSelectedAudioInputId: (deviceId: string | null) => void
  setSelectedAudioOutputId: (deviceId: string | null) => void
  setSelectedVideoInputId: (deviceId: string | null) => void
  toggleCamera: () => void
  toggleMic: () => void
  toggleScreenShare: () => void
}

export const useCallUiStore = create<CallUiState>(() => ({
  connectionPhase: 'idle',
  isDeviceSettingsOpen: false,
  isCameraEnabled: true,
  isMicEnabled: true,
  isScreenSharing: false,
  participantPage: 0,
  pinnedParticipantId: null,
  setDeviceSettingsOpen: (isDeviceSettingsOpen) => {
    useCallUiStore.setState({ isDeviceSettingsOpen })
  },
  selectedAudioInputId: null,
  selectedAudioOutputId: null,
  selectedVideoInputId: null,
  setConnectionPhase: (connectionPhase) => {
    useCallUiStore.setState({ connectionPhase })
  },
  setParticipantPage: (participantPage) => {
    useCallUiStore.setState({ participantPage })
  },
  setPinnedParticipantId: (pinnedParticipantId) => {
    useCallUiStore.setState({ pinnedParticipantId })
  },
  setSelectedAudioInputId: (selectedAudioInputId) => {
    useCallUiStore.setState({ selectedAudioInputId })
  },
  setSelectedAudioOutputId: (selectedAudioOutputId) => {
    useCallUiStore.setState({ selectedAudioOutputId })
  },
  setSelectedVideoInputId: (selectedVideoInputId) => {
    useCallUiStore.setState({ selectedVideoInputId })
  },
  toggleCamera: () => {
    useCallUiStore.setState((state) => ({ isCameraEnabled: !state.isCameraEnabled }))
  },
  toggleMic: () => {
    useCallUiStore.setState((state) => ({ isMicEnabled: !state.isMicEnabled }))
  },
  toggleScreenShare: () => {
    useCallUiStore.setState((state) => ({ isScreenSharing: !state.isScreenSharing }))
  },
}))
