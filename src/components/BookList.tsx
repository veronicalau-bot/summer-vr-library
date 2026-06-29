import { useRef } from 'react'
import { ebooks } from '../data/ebooks'
import { useAppStore } from '../store/useAppStore'

const CATEGORY_ICON: Record<string, string> = {
  '自然科學': '🌊',
  '資訊科技': '🤖',
  '心理學': '🧠',
  '環境科學': '🌿',
  '設計': '✏️',
  '歷史': '🌍',
  '物理': '⚛️',
  '文學': '📖',
}

const SCROLL_AMOUNT = 260

export default function BookList() {
  const { selectedBook, setSelectedBook } = useAppStore()
  const stripRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    const el = stripRef.current
    if (!el) return
    const amount = direction === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <div className="book-list-overlay">
      <p className="book-list-label">📚 沙灘閱讀桌 — 點選書卡開始閱讀</p>

      <div className="book-list-wrapper">
        <button
          className="book-nav-btn left"
          onClick={() => scroll('left')}
          aria-label="向左滑動書卡"
        >
          ◀
        </button>

        <div className="book-list-strip" ref={stripRef}>
          {ebooks.map((book) => {
            const isSelected = selectedBook?.id === book.id
            return (
              <button
                key={book.id}
                className={`book-card-chip${isSelected ? ' selected' : ''}`}
                style={{ '--accent': book.accentColor } as React.CSSProperties}
                onClick={() => setSelectedBook(isSelected ? null : book)}
              >
                <span className="chip-icon">{CATEGORY_ICON[book.category] ?? '📗'}</span>
                <div className="chip-text">
                  <span className="chip-title">{book.title}</span>
                  <span className="chip-meta">{book.author}&nbsp;·&nbsp;{book.year}</span>
                </div>
                <span className="chip-badge" style={{ background: book.accentColor }}>
                  {book.category}
                </span>
              </button>
            )
          })}
        </div>

        <button
          className="book-nav-btn right"
          onClick={() => scroll('right')}
          aria-label="向右滑動書卡"
        >
          ▶
        </button>
      </div>
    </div>
  )
}
