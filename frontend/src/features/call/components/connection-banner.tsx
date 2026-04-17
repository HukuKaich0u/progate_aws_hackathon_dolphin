import { useCallUiStore } from '../store/call-ui-store'

export function ConnectionBanner() {
  const connectionPhase = useCallUiStore((state) => state.connectionPhase)

  if (connectionPhase !== 'reconnecting') {
    return null
  }

  return <p>Reconnecting...</p>
}
