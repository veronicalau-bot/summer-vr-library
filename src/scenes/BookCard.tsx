import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../store/useAppStore'
import type { EBook } from '../data/ebooks'

// ─── Canvas texture helpers ──────────────────────────────────────────────────

function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) + amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt))
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt))
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch }
    else cur += ch
  }
  if (cur) lines.push(cur)
  return lines
}

function makeCoverTexture(book: EBook): THREE.CanvasTexture {
  const W = 256, H = 384
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, book.coverColor)
  grad.addColorStop(1, shadeHex(book.coverColor, -50))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Top + bottom accent bars
  ctx.fillStyle = book.accentColor
  ctx.fillRect(0, 0, W, 7)
  ctx.fillRect(0, H - 7, W, 7)

  // Category pill
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath(); ctx.roundRect(16, 18, W - 32, 26, 13); ctx.fill()
  ctx.fillStyle = book.accentColor
  ctx.font = 'bold 13px "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(book.category, W / 2, 35)

  // Title
  ctx.font = 'bold 32px "Segoe UI", "Noto Sans TC", sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  const titleLines = wrapText(ctx, book.title, W - 32)
  const titleStartY = 160 - (titleLines.length - 1) * 22
  titleLines.forEach((line, i) => ctx.fillText(line, W / 2, titleStartY + i * 44))

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(40, 230); ctx.lineTo(W - 40, 230); ctx.stroke()

  // Author
  ctx.font = '15px "Segoe UI", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(book.author, W / 2, 256)

  // Year · Pages
  ctx.font = '13px "Segoe UI", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText(`${book.year}  ·  ${book.pages} 頁`, W / 2, 278)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeSpineTexture(book: EBook): THREE.CanvasTexture {
  const W = 48, H = 384
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = shadeHex(book.coverColor, -30)
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = book.accentColor
  ctx.fillRect(0, 0, 5, H)

  // Vertical title text
  ctx.save()
  ctx.translate(W / 2 + 2, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.font = 'bold 13px "Segoe UI", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.textAlign = 'center'
  ctx.fillText(book.title.slice(0, 8), 0, 0)
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface BookCardProps {
  book: EBook
  position: [number, number, number]
  rotationY: number
  rotationX?: number
}

export default function BookCard({ book, position, rotationY, rotationX = 0 }: BookCardProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const { selectedBook, setSelectedBook } = useAppStore()
  const isSelected = selectedBook?.id === book.id

  const coverTex = useMemo(() => makeCoverTexture(book), [book])
  const spineTex = useMemo(() => makeSpineTexture(book), [book])

  // 6-face material array: [+x, -x, +y, -y, +z(front), -z(back)]
  const mats = useMemo(() => [
    new THREE.MeshStandardMaterial({ map: spineTex }),
    new THREE.MeshStandardMaterial({ map: spineTex }),
    new THREE.MeshStandardMaterial({ color: '#f5efe0', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#e0d8cc', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: coverTex }),
    new THREE.MeshStandardMaterial({ color: shadeHex(book.coverColor, -60) }),
  ], [coverTex, spineTex, book.coverColor])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    // Flat-lay pop-up instead of vertical lift: gentle y rise + slight tilt toward camera
    const targetY = isSelected ? 0.14 : hovered ? 0.08 : 0
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y, targetY, Math.min(delta * 8, 1)
    )
    // Gentle tilt toward viewer when selected/hovered
    const targetTilt = isSelected ? -0.18 : hovered ? -0.08 : 0
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, targetTilt, Math.min(delta * 6, 1)
    )
    // Gentle yaw sway when selected
    groupRef.current.rotation.y = isSelected
      ? Math.sin(state.clock.elapsedTime * 1.5) * 0.04
      : THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, Math.min(delta * 5, 1))
  })

  return (
    <group position={position} rotation-y={rotationY} rotation-x={rotationX}>
      <group ref={groupRef}>
        {/* Book mesh */}
        <mesh
          castShadow
          material={mats}
          onClick={(e) => { e.stopPropagation(); setSelectedBook(isSelected ? null : book) }}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
        >
          <boxGeometry args={[0.72, 1.08, 0.13]} />
        </mesh>

        {/* Hover glow outline */}
        {(hovered || isSelected) && (
          <mesh>
            <boxGeometry args={[0.74, 1.10, 0.135]} />
            <meshBasicMaterial
              color={book.accentColor}
              transparent
              opacity={isSelected ? 0.35 : 0.18}
              side={THREE.BackSide}
            />
          </mesh>
        )}

        {/* Selection ring just above table surface */}
        {isSelected && (
          <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
            <ringGeometry args={[0.42, 0.54, 32]} />
            <meshBasicMaterial color={book.accentColor} transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </group>
  )
}
