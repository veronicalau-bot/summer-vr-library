import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Sky, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { useAppStore } from '../store/useAppStore'

const PANORAMA_GLB_URL = 'https://firebasestorage.googleapis.com/v0/b/orientation2026-5dcd5.firebasestorage.app/o/free_hdri_background_realistic_beach.glb?alt=media&token=37f8ab43-808c-4ae4-8d53-e6cb08f3c662'

function PanoramaBackground({ onReady }: { onReady: (ok: boolean) => void }) {
  const { scene } = useThree()

  useEffect(() => {
    let cancelled = false
    const panoramaRoot = new THREE.Group()
    scene.add(panoramaRoot)

    const loader = new GLTFLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(
      PANORAMA_GLB_URL,
      (gltf) => {
        if (cancelled) return

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

        panoramaRoot.add(panorama)
        onReady(true)
      },
      undefined,
      () => {
        if (!cancelled) onReady(false)
      }
    )

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
  const [panoramaReady, setPanoramaReady] = useState(false)

  return (
    <>
      <PanoramaBackground onReady={setPanoramaReady} />

      {/* Render Sky only as fallback when panorama GLB is unavailable. */}
      {!panoramaReady && (
        <Sky
          distance={450000}
          sunPosition={[0.9, 0.9, -1]}
          inclination={0.45}
          azimuth={0.22}
          rayleigh={0.35}
          turbidity={1.8}
          mieCoefficient={0.002}
          mieDirectionalG={0.98}
        />
      )}

      {/* Lighting */}
      <ambientLight intensity={1.6} color="#ffffff" />
      <directionalLight position={[12, 22, -8]} intensity={1.8} color="#fffbf0" />
      <directionalLight position={[-8, 10, 12]} intensity={0.9} color="#d6edff" />
      <directionalLight position={[0, -4, 0]} intensity={0.6} color="#f8e8c0" />

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
