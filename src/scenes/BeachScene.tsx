import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { useAppStore } from '../store/useAppStore'
import InteractiveBeachBall from './InteractiveBeachBall'

const PANORAMA_GLB_URL = 'https://firebasestorage.googleapis.com/v0/b/orientation2026-5dcd5.firebasestorage.app/o/free_hdri_background_realistic_beach.glb?alt=media&token=37f8ab43-808c-4ae4-8d53-e6cb08f3c662'

/**
 * ProceduralEnvironment - a fully self-contained sky + sea that renders
 * INSTANTLY without any network request. Guarantees every headset (including
 * standalone HTC Vive) always shows a proper environment, even if the remote
 * panorama GLB is slow, too large, or fails to load.
 */
function ProceduralEnvironment() {
  // Vertical gradient sky via a cheap CanvasTexture (works on every GPU)
  const skyTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, '#2f7fd1') // zenith blue
    grad.addColorStop(0.55, '#8ec9e8') // mid sky
    grad.addColorStop(0.8, '#d9eef7') // horizon haze
    grad.addColorStop(1, '#f3e6c4') // warm sand horizon
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 16, 256)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  return (
    <group>
      {/* Sky dome - always behind everything */}
      <mesh scale={[-1, 1, 1]} renderOrder={-10}>
        <sphereGeometry args={[300, 32, 16]} />
        <meshBasicMaterial
          map={skyTexture}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Sea / ground plane - always present */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -2.5, 0]} renderOrder={-9}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#3f92b5" roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  )
}

function PanoramaBackground({ onReady }: { onReady: (ok: boolean) => void }) {
  const { scene } = useThree()

  useEffect(() => {
    let cancelled = false
    let loadToken = 0
    const panoramaRoot = new THREE.Group()
    scene.add(panoramaRoot)

    const loader = new GLTFLoader()
    loader.setCrossOrigin('anonymous')

    const tryLoad = (retriesLeft: number) => {
      const token = ++loadToken
      const timeoutId = window.setTimeout(() => {
        if (cancelled || token !== loadToken) return
        if (retriesLeft > 0) {
          tryLoad(retriesLeft - 1)
        } else {
          onReady(false)
        }
      }, 8000)

      loader.load(
        PANORAMA_GLB_URL,
        (gltf) => {
          if (cancelled || token !== loadToken) return
          clearTimeout(timeoutId)

          const panorama = gltf.scene
          panorama.position.set(0, -1.5, -40)
          panorama.scale.setScalar(25)
          panorama.rotation.y = Math.PI / 2

          panorama.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return

            const mesh = obj as THREE.Mesh
            mesh.renderOrder = -1
            mesh.castShadow = false
            mesh.receiveShadow = false

            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach((mat) => {
              mat.side = THREE.DoubleSide
              mat.depthWrite = false
              mat.needsUpdate = true
            })
          })

          panoramaRoot.clear()
          panoramaRoot.add(panorama)
          onReady(true)
        },
        undefined,
        () => {
          clearTimeout(timeoutId)
          if (cancelled || token !== loadToken) return
          if (retriesLeft > 0) {
            tryLoad(retriesLeft - 1)
          } else {
            onReady(false)
          }
        }
      )
    }

    tryLoad(1)

    return () => {
      cancelled = true
      scene.remove(panoramaRoot)
      panoramaRoot.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return

        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => mat.dispose())
      })
    }
  }, [scene, onReady])

  return null
}

// ─── Main BeachScene ──────────────────────────────────────────────────────────
export default function BeachScene() {
  const { setSelectedBook } = useAppStore()
  const [, setPanoramaReady] = useState(false)

  return (
    <>
      {/* Always-on self-contained environment (guarantees Vive/standalone sees a world) */}
      <ProceduralEnvironment />

      {/* Remote panorama loads on top as an enhancement; failure is harmless */}
      <PanoramaBackground onReady={setPanoramaReady} />

      {/* 可互動的沙灘球 - 單手抓取 + 重力彈跳 */}
      <InteractiveBeachBall />

      {/* Lighting */}
      <ambientLight intensity={1.2} color="#ffffff" />
      <directionalLight position={[12, 22, -8]} intensity={1.2} color="#fffbf0" />
      <directionalLight position={[-8, 10, 12]} intensity={0.9} color="#d6edff" />
      <directionalLight position={[0, -4, 0]} intensity={0.35} color="#f8e8c0" />

      {/* 3-D book wall removed — books now shown as HTML overlay (BookList) */}

      {/* Invisible click-plane to deselect books */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -2.48, 0]}
        visible={false}
        onClick={() => setSelectedBook(null)}
      >
        <planeGeometry args={[160, 160]} />
        <meshBasicMaterial />
      </mesh>

      <OrbitControls
        target={[0, 0, -4]}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.62}
        minDistance={1}
        maxDistance={14}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  )
}
