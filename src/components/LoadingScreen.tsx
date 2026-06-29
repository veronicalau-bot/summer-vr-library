import { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [fadeOut, setFadeOut] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Show splash for at least 2s, then fade
    const t = setTimeout(() => setFadeOut(true), 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!fadeOut) return
    const t = setTimeout(() => setHidden(true), 800)
    return () => clearTimeout(t)
  }, [fadeOut])

  if (hidden) return null

  return (
    <div className={`loading-screen${fadeOut ? ' fade-out' : ''}`}>
      <div className="loading-content">
        <div className="loading-icon">🏖️</div>
        <h1 className="loading-title">夏日悅讀空間</h1>
        <p className="loading-subtitle">大學圖書館 · 沉浸式電子書展覽</p>
        <div className="loading-dots">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
