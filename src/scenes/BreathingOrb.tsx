import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * BreathingOrb - 呼吸之球（靜觀練習）
 * 這個元件只會被渲染在 <XR> 樹內，因此只在 VR headset 中可見。
 * 點擊球體可啟用/停用呼吸動畫，並顯示引導文字「吸氣 / 呼氣」。
 */
export default function BreathingOrb() {
  const groupRef = useRef<THREE.Group>(null!)
  const [active, setActive] = useState(true)

  // 呼吸動畫：約 6 秒一個完整呼吸週期
  useFrame((state) => {
    if (!active || !groupRef.current) return

    const t = state.clock.elapsedTime
    const scale = 1 + Math.sin(t * 0.8) * 0.18
    groupRef.current.scale.setScalar(scale)
  })

  const handleClick = () => {
    setActive((prev) => !prev)
  }

  // 根據 sin 波即時計算引導文字（避免在 useFrame 中 setState）
  const getBreathText = () => {
    if (!active) return '已暫停'
    const t = performance.now() / 1000
    return Math.sin(t * 0.8) > 0 ? '吸氣' : '呼氣'
  }

  return (
    <group
      ref={groupRef}
      position={[0, 1.4, -7]}
      onClick={handleClick}
    >
      {/* 核心發光球體 */}
      <mesh>
        <sphereGeometry args={[0.55]} />
        <meshPhongMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={0.7}
          shininess={30}
          specular="#ffffff"
        />
      </mesh>

      {/* 外層柔和光暈 */}
      <mesh>
        <sphereGeometry args={[0.72]} />
        <meshBasicMaterial color="#a5f3fc" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* 最外層極淡光暈 */}
      <mesh>
        <sphereGeometry args={[0.9]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      {/* 引導文字 - 浮動在球體上方 */}
      <Text
        position={[0, 1.1, 0]}
        fontSize={0.28}
        color="#e0f2fe"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#0f172a"
      >
        {getBreathText()}
      </Text>

      {/* 副標題 */}
      <Text
        position={[0, 0.75, 0]}
        fontSize={0.12}
        color="#bae6fd"
        anchorX="center"
        anchorY="middle"
      >
        點擊球體 開始 / 暫停
      </Text>
    </group>
  )
}
