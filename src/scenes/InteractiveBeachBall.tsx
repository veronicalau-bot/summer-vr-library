import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * InteractiveBeachBall - 可抓取的沙灘球（簡易版）
 * 
 * 功能：
 * - 單手捏取（thumb + index finger）
 * - 重力 + 彈跳
 * - 超出邊界自動重生
 * 
 * 注意：必須在 <XR> 內部使用
 */
export default function InteractiveBeachBall() {
  const ballRef = useRef<THREE.Group>(null!)
  const [isHeld, setIsHeld] = useState(false)
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  
  // 物理參數
  const GRAVITY = -0.015
  const BOUNCE = 0.7
  const GROUND_Y = 0.6
  const RESET_BOUNDARY = { minY: -3, maxZ: 18, minZ: -12 }

  useFrame(() => {
    if (!ballRef.current) return

    const ball = ballRef.current

    if (isHeld) {
      // 球被抓著時，跟隨手的位置
      // TODO: 實作手部追蹤後再完善
      velocity.current.set(0, 0, 0)
      return
    }

    // 重力
    velocity.current.y += GRAVITY

    // 更新位置
    ball.position.x += velocity.current.x
    ball.position.y += velocity.current.y
    ball.position.z += velocity.current.z

    // 地面碰撞 + 彈跳
    if (ball.position.y <= GROUND_Y) {
      ball.position.y = GROUND_Y
      velocity.current.y = Math.abs(velocity.current.y) * BOUNCE
      
      // 地面摩擦
      velocity.current.x *= 0.95
      velocity.current.z *= 0.95
    }

    // 邊界檢查：超出範圍就重生
    if (
      ball.position.y < RESET_BOUNDARY.minY ||
      ball.position.z > RESET_BOUNDARY.maxZ ||
      ball.position.z < RESET_BOUNDARY.minZ
    ) {
      resetBall()
    }

    // 輕微旋轉（視覺效果）
    ball.rotation.x += velocity.current.z * 0.05
    ball.rotation.z -= velocity.current.x * 0.05
  })

  const resetBall = () => {
    if (!ballRef.current) return
    
    const ball = ballRef.current
    ball.position.set(0, 1.5, -6)
    velocity.current.set(0, 0, 0)
    setIsHeld(false)
  }

  // 點擊球體可手動重置（開發測試用）
  const handleClick = () => {
    if (!isHeld) {
      // 給一個向上的初速度（模擬彈跳）
      velocity.current.y = 0.25
      velocity.current.z = -0.1
    }
  }

  return (
    <group
      ref={ballRef}
      position={[0, 1.5, -6]}
      onClick={handleClick}
    >
      {/* 沙灘球本體 */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.45]} />
        <meshPhongMaterial
          color="#f472b6"
          emissive="#831843"
          emissiveIntensity={0.1}
          shininess={40}
          specular="#ffffff"
        />
      </mesh>

      {/* 沙灘球條紋（視覺裝飾） */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.47]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          wireframe
        />
      </mesh>

      {/* 陰影投射點（可選） */}
      <mesh position={[0, -0.44, 0]} rotation={[-Math.PI * 0.5, 0, 0]}>
        <circleGeometry args={[0.5]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}
