import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../store/useAppStore'

export default function VRBookInfo() {
  const { selectedBook, setSelectedBook } = useAppStore()

  if (!selectedBook) return null

  const handleBorrow = () => {
    if (selectedBook.borrowUrl && selectedBook.borrowUrl !== '#') {
      window.open(selectedBook.borrowUrl, '_blank')
    }
  }

  const handleClose = () => {
    setSelectedBook(null)
  }

  return (
    <group position={[0, 1.6, -2.2]}>
      {/* Background panel */}
      <mesh>
        <planeGeometry args={[3.2, 2.1]} />
        <meshLambertMaterial color="#111827" transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>

      {/* Accent bar */}
      <mesh position={[-1.5, 0, 0.01]}>
        <planeGeometry args={[0.08, 2.1]} />
        <meshLambertMaterial color={selectedBook.accentColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Title */}
      <Text
        position={[0, 0.72, 0.02]}
        fontSize={0.13}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.8}
        textAlign="center"
      >
        {selectedBook.title}
      </Text>

      {/* Author & meta */}
      <Text
        position={[0, 0.42, 0.02]}
        fontSize={0.08}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {selectedBook.author}  ·  {selectedBook.year}  ·  {selectedBook.pages} 頁
      </Text>

      {/* Description (truncated) */}
      <Text
        position={[0, 0.05, 0.02]}
        fontSize={0.055}
        color="#cbd5e1"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.6}
        textAlign="center"
      >
        {selectedBook.description.length > 110
          ? selectedBook.description.slice(0, 107) + '…'
          : selectedBook.description}
      </Text>

      {/* Borrow button */}
      <group position={[-0.7, -0.65, 0.03]} onClick={handleBorrow}>
        <mesh>
          <planeGeometry args={[1.1, 0.38]} />
          <meshLambertMaterial color="#00c878" />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.08}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          借閱此書
        </Text>
      </group>

      {/* Close button */}
      <group position={[0.7, -0.65, 0.03]} onClick={handleClose}>
        <mesh>
          <planeGeometry args={[1.1, 0.38]} />
          <meshLambertMaterial color="#475569" />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.08}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
        >
          關閉
        </Text>
      </group>
    </group>
  )
}
