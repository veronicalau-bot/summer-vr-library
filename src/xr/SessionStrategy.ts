import type { XRDeviceCapabilities, XRSessionModeCompat } from './DeviceCapabilities'

export interface SessionStrategy {
  mode: XRSessionModeCompat | null
  buttonLabel: string
  readyText: string
}

export function getSessionStrategy(cap: XRDeviceCapabilities): SessionStrategy {
  if (!cap.supportsXR || !cap.preferredMode) {
    return {
      mode: null,
      buttonLabel: '此裝置不支援 XR',
      readyText: 'XR 不支援',
    }
  }

  if (cap.preferredMode === 'immersive-vr') {
    return {
      mode: 'immersive-vr',
      buttonLabel: '戴上VR裝置, 進來Chill一下',
      readyText: 'VR 已就緒',
    }
  }

  return {
    mode: 'immersive-ar',
    buttonLabel: '戴上裝置, 進入空間模式',
    readyText: 'AR 已就緒',
  }
}
