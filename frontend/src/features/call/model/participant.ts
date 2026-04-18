export type Participant = {
  audioMuted: boolean
  avatarUrl: string | null
  displayName: string
  id: string
  isLocal: boolean
  isScreenSharing: boolean
  isSpeaking: boolean
  networkQuality: 'excellent' | 'good' | 'poor'
  videoEnabled: boolean
}
