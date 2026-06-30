import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import BeachScene from './scenes/BeachScene'
import InfoPanel from './components/InfoPanel'
import AudioControls from './components/AudioControls'
import HUD from './components/HUD'
import LoadingScreen from './components/LoadingScreen'
import BookList from './components/BookList'
import NewsTicker from './components/NewsTicker'
import WeatherWidget from './components/WeatherWidget'

// Create a single XR store instance for the app
// Removed 'offerSession' to disable the default Meta Quest "Enter XR" button on desktop
const xrStore = createXRStore({
  handTracking: true,
})

export default function App() {
  // Track XR session state OUTSIDE the <XR> tree
  const [inXR, setInXR] = useState(false)

  useEffect(() => {
    // Subscribe to session changes from the store (safe outside <XR>)
    const unsub = xrStore.subscribe((state) => {
      setInXR(!!state.session)
    })
    return unsub
  }, [])

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
          {/* 
            TODO: Add hand tracking support
            For Vision Pro hand tracking, add: <Hands />
            For controller support (Vive/Quest), add: <Controllers />
            Note: @react-three/xr v6 API may differ - check docs for correct usage
          */}
        </XR>
      </Canvas>

      {/* Hide all DOM overlays when inside an XR session.
          Only the 3D beach + controllers are visible inside the headset. */}
      {!inXR && (
        <>
          <LoadingScreen />
          <HUD />
          <BookList />
          <NewsTicker />
          <WeatherWidget />
          <InfoPanel />
          <AudioControls />

          {/* Desktop-only VR entry button - centered, large, overlays the breathing orb */}
          <button
            className="vr-enter-btn"
            onClick={() => xrStore.enterVR()}
          >
            🥽 戴上VR裝置, 進來Chill一下
          </button>
        </>
      )}
    </div>
  )
}


