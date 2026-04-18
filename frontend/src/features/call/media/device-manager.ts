export type DeviceManager = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
}

export function createBrowserDeviceManager(): DeviceManager {
  return {
    getUserMedia(constraints) {
      return navigator.mediaDevices.getUserMedia(constraints)
    },
  }
}
