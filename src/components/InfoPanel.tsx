import { useAppStore } from '../store/useAppStore'
import { ebooks } from '../data/ebooks'

export default function InfoPanel() {
  const { selectedBook, setSelectedBook } = useAppStore()

  if (!selectedBook) return null

  const currentIndex = ebooks.findIndex((e) => e.id === selectedBook.id)
  const goPrev = () => {
    const prev = currentIndex > 0 ? ebooks[currentIndex - 1] : ebooks[ebooks.length - 1]
    setSelectedBook(prev)
  }
  const goNext = () => {
    const next = currentIndex < ebooks.length - 1 ? ebooks[currentIndex + 1] : ebooks[0]
    setSelectedBook(next)
  }

  const b = selectedBook
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&color=000000&bgcolor=ffffff&data=${encodeURIComponent(b.qrContent)}`

  return (
    <>
      {/* Left / Right navigation arrows beside the panel */}
      <button className="panel-nav-btn left" onClick={goPrev} aria-label="上一本書">◀</button>
      <button className="panel-nav-btn right" onClick={goNext} aria-label="下一本書">▶</button>

      <aside className="info-panel info-panel-landscape" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button className="panel-close" onClick={() => setSelectedBook(null)} aria-label="關閉">✕</button>

      {/* Left cover pane (landscape split) */}
      <div
        className="panel-cover-landscape"
        style={{ background: `linear-gradient(145deg, ${b.coverColor}, ${b.coverColor}dd)` }}
      >
        <div className="cover-meta">
          <span className="panel-category" style={{ background: b.accentColor }}>{b.category}</span>
          <span className="cover-pages">{b.pages} 頁</span>
        </div>
        <span className="cover-title-large">{b.title}</span>
        <span className="cover-author">{b.author}</span>
      </div>

      {/* Right content pane */}
      <div className="panel-body-landscape">
        <div className="body-scroll">
          <div className="panel-tags">
            {b.tags.map((t) => (
              <span key={t} className="panel-tag">#{t}</span>
            ))}
          </div>

          <p className="panel-desc">{b.description}</p>
        </div>

        {/* Borrow section inline */}
        <div className="panel-borrow-row">
          <div className="panel-qr-small">
            <img src={qrUrl} alt="借閱 QR Code" width={92} height={92} />
            <small>掃描借閱</small>
          </div>
          <a
            href={b.borrowUrl}
            className="panel-borrow-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            📚 立即借閱
          </a>
        </div>
      </div>
    </aside>
    </>
  )
}
