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
  isCameraEnabled: boolean
  isMicEnabled: boolean
  isScreenSharing: boolean
  participantPage: number
  pinnedParticipantId: string | null
  selectedAudioInputId: string | null
  selectedAudioOutputId: string | null
  selectedVideoInputId: string | null
  setConnectionPhase: (phase: ConnectionPhase) => void
  setParticipantPage: (page: number) => void
  setPinnedParticipantId: (participantId: string | null) => void
  toggleCamera: () => void
  toggleMic: () => void
  toggleScreenShare: () => void
}

export const useCallUiStore = create<CallUiState>(() => ({
  connectionPhase: 'idle',
  isCameraEnabled: true,
  isMicEnabled: true,
  isScreenSharing: false,
  participantPage: 0,
  pinnedParticipantId: null,
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
