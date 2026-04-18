import { Button } from '../../../components/ui/button'
import { useCallController } from '../media/call-controller-context'
import { useCallUiStore } from '../store/call-ui-store'

export function ControlBar() {
  const controller = useCallController()
  const isCameraEnabled = useCallUiStore((state) => state.isCameraEnabled)
  const isMicEnabled = useCallUiStore((state) => state.isMicEnabled)
  const isScreenSharing = useCallUiStore((state) => state.isScreenSharing)
  const setDeviceSettingsOpen = useCallUiStore((state) => state.setDeviceSettingsOpen)

  return (
    <div className="control-bar">
      <Button onClick={() => void controller.toggleMicrophone()} type="button">
        {isMicEnabled ? 'Mic on' : 'Mic off'}
      </Button>
      <Button onClick={() => void controller.toggleCamera()} type="button">
        {isCameraEnabled ? 'Camera on' : 'Camera off'}
      </Button>
      <Button onClick={() => controller.toggleScreenShare()} type="button">
        {isScreenSharing ? 'Stop share' : 'Share screen'}
      </Button>
      <Button onClick={() => setDeviceSettingsOpen(true)} type="button">
        Devices
      </Button>
    </div>
  )
}
