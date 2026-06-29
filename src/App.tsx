import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore, useXR } from '@react-three/xr'
import BeachScene from './scenes/BeachScene'
import InfoPanel from './components/InfoPanel'
import AudioControls from './components/AudioControls'
import HUD from './components/HUD'
import LoadingScreen from './components/LoadingScreen'
import BookList from './components/BookList'
import NewsTicker from './components/NewsTicker'
import WeatherWidget from './components/WeatherWidget'

// Create a single XR store instance for the app
const xrStore = createXRStore({
  offerSession: 'immersive-vr',
  handTracking: true,
})

// Component that hides HTML overlays while inside an XR session
function XRSessionGuard({ children }: { children: React.ReactNode }) {
  const { session } = useXR()
  // When session is truthy we are inside VR/AR → hide DOM UI
  if (session) return null
  return <>{children}</>
}

export default function App() {
  return (
    <div className="app-root">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 72, near: 0.1, far: 500 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.toneMapping = 4 /* THREE.ACESFilmicToneMapping */
          gl.toneMappingExposure = 1.45
        }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <BeachScene />
          </Suspense>
        </XR>
      </Canvas>

      {/* All HTML UI is automatically hidden when an XR session is active.
          Inside the headset the user only sees the 3D beach + controllers. */}
      <XRSessionGuard>
        <LoadingScreen />
        <HUD />
        <BookList />
        <NewsTicker />
        <WeatherWidget />
        <InfoPanel />
        <AudioControls />

        {/* Desktop-only VR entry button (hidden inside VR too) */}
        <button
          className="hud-xr-btn"
          onClick={() => xrStore.enterVR()}
          style={{ top: '120px', left: '18px' }}
        >
          🥽 進入 VR
        </button>
      </XRSessionGuard>
    </div>
  )
}


