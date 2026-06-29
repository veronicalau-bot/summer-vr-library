import { ebooks } from '../data/ebooks'
import BookCard from './BookCard'

export default function BookWall() {
  // 2 rows × 4 columns flat table layout
  const cols = 4
  const spacingX = 0.95
  const spacingZ = 1.15
  const startX = -((cols - 1) * spacingX) / 2
  const startZ = -0.4

  return (
    <group position={[0, -5.2, 0]}>
      {ebooks.map((book, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = startX + col * spacingX
        const z = startZ + row * spacingZ
        // Nearly flat on table with slight readable tilt toward viewer
        const tilt = -Math.PI * 0.47
        return (
          <BookCard
            key={book.id}
            book={book}
            position={[x, 0, z]}
            rotationY={0}
            rotationX={tilt}
          />
        )
      })}
    </group>
  )
}
