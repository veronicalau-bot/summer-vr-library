import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import * as THREE from 'three'

/**
 * InteractiveBeachBall - Vision Pro 手勢互動沙灘球
 * 
 * 功能：
 * - 手掌拍球（手掌在球體上方向下移動 → 拍擊）
 * - 雙手抱球（兩手同時靠近球體且距離小於閾值）
 * - 重力 + 彈跳
 * - 超出邊界自動重生
 * 
 * 注意：必須在 <XR> 內部使用（Vision Pro hand tracking）
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

  // 手勢互動參數（Vision Pro）
  const SLAP_THRESHOLD = 0.8          // 向下速度大於此值視為拍擊
  const HOLD_DISTANCE = 0.7           // 兩手距離小於此值視為抱球
  const HOLD_RADIUS = 1.2             // 手與球中心的最大距離

  // 從 XR session 獲取手掌位置（Vision Pro）
  const xr = useXR() as any
  
  // 儲存上一幀手掌位置（用於計算拍擊速度）
  const prevLeftPalm = useRef<THREE.Vector3 | null>(null)
  const prevRightPalm = useRef<THREE.Vector3 | null>(null)

  // 從 inputSources 獲取手掌 wrist joint 位置
  const getHandPositions = (): { left: THREE.Vector3 | null; right: THREE.Vector3 | null } => {
    const result = { left: null as THREE.Vector3 | null, right: null as THREE.Vector3 | null }
    
    const inputSources = xr.session?.inputSources
    if (!inputSources) return result

    Array.from(inputSources).forEach((source: any) => {
      if (source.hand) {
        const handedness = source.handedness
        const wrist = source.hand.get?.('wrist')
        if (wrist && handedness) {
          if (handedness === 'left') result.left = new THREE.Vector3().copy(wrist.position)
          if (handedness === 'right') result.right = new THREE.Vector3().copy(wrist.position)
        }
      }
    })

    return result
  }

  useFrame(() => {
    if (!ballRef.current) return
    const ball = ballRef.current

    // 如果被雙手抱著，跟隨手的中間位置
    if (isHeld) {
      const { left, right } = getHandPositions()
      if (left && right) {
        const midX = (left.x + right.x) / 2
        const midY = (left.y + right.y) / 2
        const midZ = (left.z + right.z) / 2
        ball.position.set(midX, midY, midZ)
      }
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

    // ===== Vision Pro 手勢互動 =====
    const { left: leftPalm, right: rightPalm } = getHandPositions()
    const palmPositions: THREE.Vector3[] = []
    if (leftPalm) palmPositions.push(leftPalm)
    if (rightPalm) palmPositions.push(rightPalm)

    // 偵測拍擊（單手）
    ;[
      { pos: leftPalm, prev: prevLeftPalm },
      { pos: rightPalm, prev: prevRightPalm }
    ].forEach(({ pos, prev }) => {
      if (!pos) return

      const prevPos = prev.current
      if (prevPos) {
        const slapSpeed = prevPos.y - pos.y // 向下為正

        // 手掌在球上方且向下速度大於閾值
        if (
          slapSpeed > SLAP_THRESHOLD &&
          pos.y > ball.position.y &&
          pos.distanceTo(ball.position) < 1.0
        ) {
          // 拍擊：給向下的力 + 少量水平偏移
          velocity.current.y = -slapSpeed * 0.4
          velocity.current.x = (pos.x - ball.position.x) * 0.3
          velocity.current.z = (pos.z - ball.position.z) * 0.3
        }
      }
      prev.current = pos.clone()
    })

    // 雙手抱球判斷
    if (palmPositions.length >= 2) {
      const dist = palmPositions[0].distanceTo(palmPositions[1])
      const ballDist0 = palmPositions[0].distanceTo(ball.position)
      const ballDist1 = palmPositions[1].distanceTo(ball.position)

      if (
        dist < HOLD_DISTANCE &&
        ballDist0 < HOLD_RADIUS &&
        ballDist1 < HOLD_RADIUS &&
        !isHeld
      ) {
        setIsHeld(true)
      }
    }

    // 雙手分開 → 釋放
    if (isHeld && palmPositions.length >= 2) {
      const dist = palmPositions[0].distanceTo(palmPositions[1])
      if (dist > HOLD_DISTANCE * 1.5) {
        setIsHeld(false)
        velocity.current.y = 0.1 // 釋放時給一點向上的初速度
      }
    }
  })

  const resetBall = () => {
    if (!ballRef.current) return
    
    const ball = ballRef.current
    ball.position.set(0, 1.5, -6)
    velocity.current.set(0, 0, 0)
    setIsHeld(false)
    prevLeftPalm.current = null
    prevRightPalm.current = null
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
