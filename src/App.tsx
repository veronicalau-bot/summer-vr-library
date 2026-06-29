import { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import BeachScene from './scenes/BeachScene'
import InfoPanel from './components/InfoPanel'
import AudioControls from './components/AudioControls'
import HUD from './components/HUD'
import LoadingScreen from './components/LoadingScreen'
import BookList from './components/BookList'
import NewsTicker from './components/NewsTicker'
import WeatherWidget from './components/WeatherWidget'

// Lives OUTSIDE Canvas so it renders as a real DOM button
function VRButton({ glRef }: { glRef: React.RefObject<THREE.WebGLRenderer | null> }) {
  const [supported, setSupported] = useState(false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if ('xr' in navigator && navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then(setSupported).catch(() => {})
    }
  }, [])

  const enterVR = async () => {
    const gl = glRef.current
    if (!gl) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      })
      // Properly bind the session to Three.js renderer
      await gl.xr.setSession(session)
      setActive(true)
      session.addEventListener('end', () => setActive(false))
    } catch (err) {
      console.error('VR session failed:', err)
      alert('無法進入 VR 模式，請確認裝置支援 WebXR')
    }
  }

  if (!supported) return null

  return (
    <button className={`hud-xr-btn${active ? ' active' : ''}`} onClick={enterVR}>
      🥽 {active ? 'VR 模式中' : '進入 VR'}
    </button>
  )
}

export default function App() {
  const glRef = useRef<THREE.WebGLRenderer | null>(null)

  return (
    <div className="app-root">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 72, near: 0.1, far: 500 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.xr.enabled = true           // ← required for WebXR to take over the render loop
          gl.toneMapping = 4             /* THREE.ACESFilmicToneMapping */
          gl.toneMappingExposure = 1.45
          glRef.current = gl             // share renderer with VRButton
        }}
      >
        <Suspense fallback={null}>
          <BeachScene />
        </Suspense>
      </Canvas>

      <LoadingScreen />
      <HUD />
      <VRButton glRef={glRef} />
      <BookList />
      <NewsTicker />
      <WeatherWidget />
      <InfoPanel />
      <AudioControls />
    </div>
  )
}


