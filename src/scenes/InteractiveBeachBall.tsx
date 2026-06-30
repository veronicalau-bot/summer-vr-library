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

  // Hand tracking requires <Hands /> component in the XR tree (App.tsx)
  // useXR() returns hands when <Hands /> is rendered
  const xrState = useXR() as any
  const hands: any[] = xrState.hands || xrState.inputSources?.filter((s: any) => s.hand) || []

  // 獲取手掌位置（使用 wrist joint）
  const getPalmPosition = (hand: any): THREE.Vector3 | null => {
    if (!hand?.inputSource?.hand) return null
    const wrist = hand.inputSource.hand.get('wrist')
    if (!wrist) return null
    return new THREE.Vector3().copy(wrist.position)
  }

  // 偵測手掌拍擊（向下速度）
  const detectSlap = (prevPos: THREE.Vector3 | null, currPos: THREE.Vector3): number => {
    if (!prevPos) return 0
    return prevPos.y - currPos.y // 向下為正值
  }

  // 儲存上一幀手掌位置（用於計算速度）
  const prevPalmPositions = useRef<Map<number, THREE.Vector3>>(new Map())

  useFrame(() => {
    if (!ballRef.current) return

    const ball = ballRef.current

    // 如果被抱著，跟隨手的中間位置
    if (isHeld && hands.length >= 2) {
      const palm0 = getPalmPosition(hands[0])
      const palm1 = getPalmPosition(hands[1])
      if (palm0 && palm1) {
        const midX = (palm0.x + palm1.x) / 2
        const midY = (palm0.y + palm1.y) / 2
        const midZ = (palm0.z + palm1.z) / 2
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

    // ===== Vision Pro 手勢互動 =====
    if (hands.length === 0) return

    const palmPositions: THREE.Vector3[] = []
    hands.forEach((hand: any, idx: number) => {
      const pos = getPalmPosition(hand)
      if (pos) {
        palmPositions.push(pos)
        
        // 偵測拍擊
        const prevPos = prevPalmPositions.current.get(idx)
        const slapSpeed = detectSlap(prevPos || null, pos)
        
        // 手掌在球上方且向下速度大於閾值
        if (
          slapSpeed > SLAP_THRESHOLD &&
          pos.y > ball.position.y &&
          pos.distanceTo(ball.position) < 1.0
        ) {
          // 拍擊：給向下的力
          velocity.current.y = -slapSpeed * 0.4
          velocity.current.x = (pos.x - ball.position.x) * 0.3
          velocity.current.z = (pos.z - ball.position.z) * 0.3
        }
        
        prevPalmPositions.current.set(idx, pos.clone())
      }
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

    // 雙手分開或離開球體 → 釋放
    if (isHeld && palmPositions.length >= 2) {
      const dist = palmPositions[0].distanceTo(palmPositions[1])
      if (dist > HOLD_DISTANCE * 1.5) {
        setIsHeld(false)
        // 釋放時給一點向上的初速度
        velocity.current.y = 0.1
      }
    }
  })

  const resetBall = () => {
    if (!ballRef.current) return
    
    const ball = ballRef.current
    ball.position.set(0, 1.5, -6)
    velocity.current.set(0, 0, 0)
    setIsHeld(false)
    prevPalmPositions.current.clear()
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
