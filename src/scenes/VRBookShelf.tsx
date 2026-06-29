import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../store/useAppStore'
import { ebooks } from '../data/ebooks'

interface VRBookProps {
  book: (typeof ebooks)[number]
  position: [number, number, number]
  rotation: [number, number, number]
}

function VRBook({ book, position, rotation }: VRBookProps) {
  const { selectedBook, setSelectedBook } = useAppStore()
  const isSelected = selectedBook?.id === book.id

  return (
    <group position={position} rotation={rotation}>
      {/* Book body */}
      <mesh
        onClick={() => setSelectedBook(book)}
        onPointerOver={(e) => {
          e.object.scale.setScalar(1.05)
        }}
        onPointerOut={(e) => {
          e.object.scale.setScalar(1)
        }}
      >
        <boxGeometry args={[0.58, 0.92, 0.09]} />
        <meshLambertMaterial color={book.coverColor} />
      </mesh>

      {/* Accent stripe on spine */}
      <mesh position={[0.3, 0, 0]}>
        <boxGeometry args={[0.02, 0.92, 0.1]} />
        <meshLambertMaterial color={book.accentColor} />
      </mesh>

      {/* Title */}
      <Text
        position={[0, 0.28, 0.055]}
        fontSize={0.055}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.48}
        textAlign="center"
      >
        {book.title.length > 18 ? book.title.slice(0, 17) + '…' : book.title}
      </Text>

      {/* Author */}
      <Text
        position={[0, 0.12, 0.055]}
        fontSize={0.04}
        color="#e0e0e0"
        anchorX="center"
        anchorY="middle"
      >
        {book.author}
      </Text>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0, -0.12]} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.42, 0.48, 32]} />
          <meshBasicMaterial color="#00ffaa" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

export default function VRBookShelf() {
  // Arrange 8 books in a gentle arc in front of the user
  const books = useMemo(() => {
    const radius = 2.6
    const startAngle = -0.7 // radians
    const endAngle = 0.7
    const step = (endAngle - startAngle) / (ebooks.length - 1)

    return ebooks.map((book, index) => {
      const angle = startAngle + step * index
      const x = Math.sin(angle) * radius
      const z = -Math.cos(angle) * radius - 0.8 // push slightly forward
      const y = 1.35
      const rotY = -angle * 0.9
      return {
        book,
        position: [x, y, z] as [number, number, number],
        rotation: [0, rotY, 0] as [number, number, number],
      }
    })
  }, [])

  return (
    <group>
      {books.map((item, idx) => (
        <VRBook
          key={idx}
          book={item.book}
          position={item.position}
          rotation={item.rotation}
        />
      ))}
    </group>
  )
}
