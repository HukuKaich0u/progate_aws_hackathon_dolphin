import { useCallUiStore } from '../store/call-ui-store'

export function DeviceSheet() {
  const isDeviceSettingsOpen = useCallUiStore((state) => state.isDeviceSettingsOpen)
  const setDeviceSettingsOpen = useCallUiStore((state) => state.setDeviceSettingsOpen)
  const selectedAudioInputId = useCallUiStore((state) => state.selectedAudioInputId)
  const selectedVideoInputId = useCallUiStore((state) => state.selectedVideoInputId)

  if (!isDeviceSettingsOpen) {
    return null
  }

  return (
    <section>
      <p>Audio input: {selectedAudioInputId ?? 'default'}</p>
      <p>Video input: {selectedVideoInputId ?? 'default'}</p>
      <button onClick={() => setDeviceSettingsOpen(false)} type="button">
        Close devices
      </button>
    </section>
  )
}
