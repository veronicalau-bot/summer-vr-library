import { Suspense, useState, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import BeachScene from './scenes/BeachScene'
import InfoPanel from './components/InfoPanel'
import AudioControls from './components/AudioControls'
import HUD from './components/HUD'
import LoadingScreen from './components/LoadingScreen'
import BookList from './components/BookList'
import NewsTicker from './components/NewsTicker'
import WeatherWidget from './components/WeatherWidget'

function VRButton() {
  const { gl } = useThree()
  const [supported, setSupported] = useState(false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if ('xr' in navigator && navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then(setSupported)
    }
  }, [])

  const enterVR = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const xr = (navigator as any).xr
      if (!xr) return
      const session = await xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      })
      await gl.xr.setSession(session)
      setActive(true)
      session.addEventListener('end', () => setActive(false))
    } catch (err) {
      console.error('Failed to enter VR:', err)
      alert('無法進入 VR 模式，請確認裝置支援 WebXR')
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={enterVR}
      style={{
        position: 'absolute',
        top: '120px',
        left: '18px',
        zIndex: 30,
        padding: '8px 18px',
        borderRadius: '999px',
        background: active
          ? 'rgba(0,200,120,0.35)'
          : 'linear-gradient(135deg, #00c878, #00a86b)',
        color: 'white',
        border: active ? '1px solid rgba(0,220,130,0.65)' : 'none',
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0,200,120,0.35)',
      }}
    >
      {active ? '🥽 VR 模式' : '🥽 進入 VR'}
    </button>
  )
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
        <Suspense fallback={null}>
          <BeachScene />
          <VRButton />
        </Suspense>
      </Canvas>

      <LoadingScreen />
      <HUD />
      <BookList />
      <NewsTicker />
      <WeatherWidget />
      <InfoPanel />
      <AudioControls />
    </div>
  )
}
