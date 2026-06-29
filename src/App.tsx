import { Suspense } from 'react'
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
const xrStore = createXRStore({
  offerSession: 'immersive-vr',
  handTracking: true,
})

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

      <LoadingScreen />
      <HUD />
      <BookList />
      <NewsTicker />
      <WeatherWidget />
      <InfoPanel />
      <AudioControls />

      {/* Official XR button from @react-three/xr - handles everything automatically */}
      <button
        className="hud-xr-btn"
        onClick={() => xrStore.enterVR()}
        style={{ top: '120px', left: '18px' }}
      >
        🥽 進入 VR
      </button>
    </div>
  )
}


