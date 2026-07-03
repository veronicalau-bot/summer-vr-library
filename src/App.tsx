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
import { detectXRCapabilities } from './xr/DeviceCapabilities'
import { getSessionStrategy } from './xr/SessionStrategy'

// Create a single XR store instance for the app
const xrStore = createXRStore()

export default function App() {
  // Track XR session state OUTSIDE the <XR> tree
  const [inXR, setInXR] = useState(false)
  const [xrError, setXRError] = useState<string | null>(null)
  const [xrReadyText, setXRReadyText] = useState('XR 檢測中...')
  const [entryMode, setEntryMode] = useState<'immersive-vr' | 'immersive-ar' | null>(null)

  useEffect(() => {
    // Subscribe to session changes from the store (safe outside <XR>)
    const unsub = xrStore.subscribe((state) => {
      setInXR(!!state.session)
    })
    return unsub
  }, [])

  useEffect(() => {
    let active = true

    detectXRCapabilities()
      .then((cap) => {
        if (!active) return
        const strategy = getSessionStrategy(cap)
        setXRReadyText(strategy.readyText)
        setEntryMode(strategy.mode)
      })
      .catch(() => {
        if (!active) return
        setXRReadyText('XR 不支援')
        setEntryMode(null)
      })

    return () => {
      active = false
    }
  }, [])

  const enterXR = async () => {
    setXRError(null)
    if (!entryMode) {
      setXRError('此裝置或瀏覽器目前不支援 WebXR')
      return
    }

    try {
      const store = xrStore as unknown as {
        enterVR: () => Promise<void>
        enterAR?: () => Promise<void>
      }

      if (entryMode === 'immersive-vr') {
        await store.enterVR()
        return
      }

      if (store.enterAR) {
        await store.enterAR()
      } else {
        setXRError('目前 XR 模式與此裝置不相容')
      }
    } catch {
      setXRError('進入 XR 失敗，請確認裝置連線與瀏覽器權限')
    }
  }

  return (
    <div className="app-root">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 72, near: 0.1, far: 500 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.toneMapping = 4 /* THREE.ACESFilmicToneMapping */
          gl.toneMappingExposure = 1.1
        }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <BeachScene />
          </Suspense>
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
            onClick={enterXR}
            disabled={!entryMode}
          >
            🥽 {entryMode === 'immersive-ar' ? '戴上裝置, 進入空間模式' : '戴上VR裝置, 進來Chill一下'}
          </button>
          <div style={{ position: 'absolute', top: 'calc(50% + 64px)', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 13, zIndex: 41, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
            {xrError ?? xrReadyText}
          </div>
        </>
      )}
    </div>
  )
}


