export type XRSessionModeCompat = 'immersive-vr' | 'immersive-ar'

export interface XRDeviceCapabilities {
  supportsXR: boolean
  supportsImmersiveVR: boolean
  supportsImmersiveAR: boolean
  preferredMode: XRSessionModeCompat | null
}

async function isModeSupported(mode: XRSessionModeCompat): Promise<boolean> {
  if (!('xr' in navigator) || !navigator.xr) return false
  try {
    return await navigator.xr.isSessionSupported(mode)
  } catch {
    return false
  }
}

export async function detectXRCapabilities(): Promise<XRDeviceCapabilities> {
  const supportsXR = 'xr' in navigator && !!navigator.xr
  if (!supportsXR) {
    return {
      supportsXR: false,
      supportsImmersiveVR: false,
      supportsImmersiveAR: false,
      preferredMode: null,
    }
  }

  const [supportsImmersiveVR, supportsImmersiveAR] = await Promise.all([
    isModeSupported('immersive-vr'),
    isModeSupported('immersive-ar'),
  ])

  return {
    supportsXR,
    supportsImmersiveVR,
    supportsImmersiveAR,
    preferredMode: supportsImmersiveVR
      ? 'immersive-vr'
      : supportsImmersiveAR
        ? 'immersive-ar'
        : null,
  }
}
