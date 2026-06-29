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
  const [breathText, setBreathText] = useState('吸氣')

  // 呼吸動畫 + 文字完全同步（使用同一時間來源 state.clock.elapsedTime）
  useFrame((state) => {
    if (!groupRef.current) return

    const t = state.clock.elapsedTime

    if (active) {
      const scale = 1 + Math.sin(t * 0.8) * 0.18
      groupRef.current.scale.setScalar(scale)

      // 文字與球體縮放完全同步
      const newText = Math.sin(t * 0.8) > 0 ? '吸氣' : '呼氣'
      if (newText !== breathText) setBreathText(newText)
    } else {
      groupRef.current.scale.setScalar(1)
      if (breathText !== '已暫停') setBreathText('已暫停')
    }
  })

  const handleClick = () => {
    setActive((prev) => !prev)
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

      {/* 引導文字 - 浮動在球體上方，與呼吸同步 */}
      <Text
        position={[0, 1.1, 0]}
        fontSize={0.28}
        color="#e0f2fe"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#0f172a"
      >
        {breathText}
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
