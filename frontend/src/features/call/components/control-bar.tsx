import { useCallController } from '../media/call-controller-context'
import { useCallUiStore } from '../store/call-ui-store'

export function ControlBar() {
  const controller = useCallController()
  const isCameraEnabled = useCallUiStore((state) => state.isCameraEnabled)
  const isMicEnabled = useCallUiStore((state) => state.isMicEnabled)
  const isScreenSharing = useCallUiStore((state) => state.isScreenSharing)
  const setDeviceSettingsOpen = useCallUiStore((state) => state.setDeviceSettingsOpen)

  return (
    <div>
      <button onClick={() => void controller.toggleMicrophone()} type="button">
        {isMicEnabled ? 'Mic on' : 'Mic off'}
      </button>
      <button onClick={() => void controller.toggleCamera()} type="button">
        {isCameraEnabled ? 'Camera on' : 'Camera off'}
      </button>
      <button onClick={() => controller.toggleScreenShare()} type="button">
        {isScreenSharing ? 'Stop share' : 'Share screen'}
      </button>
      <button onClick={() => setDeviceSettingsOpen(true)} type="button">
        Devices
      </button>
    </div>
  )
}
