import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'



export default function HUD() {
  const { selectedBook } = useAppStore()
  const [xrSupported, setXrSupported] = useState(false)

  // We still detect support for showing/hiding the button
  useEffect(() => {
    if ('xr' in navigator && navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-vr')
        .then((ok) => setXrSupported(ok))
        .catch(() => setXrSupported(false))
    }
  }, [])

  return (
    <>
      {/* ── Top bar ── */}
      <header className="hud-header">
        <div className="hud-logo">
          <span className="hud-logo-icon">📚</span>
          <div>
            <div className="hud-logo-name">圖書館夏日悅讀空間</div>
            <div className="hud-logo-sub">在陽光沙灘上，發現你的下一本好書</div>
          </div>
        </div>
        {xrSupported && <span className="hud-xr-badge left">🥽 VR 已就緒</span>}
      </header>

      {/* ── Bottom hint (hidden when book panel open) ── */}
      {!selectedBook && (
        <footer className="hud-hint">
          <span>🖱️ 拖曳旋轉視角</span>
          <span className="hint-sep">·</span>
          <span>🔍 滾輪縮放</span>
          <span className="hint-sep">·</span>
          <span>👆 點選書卡查看詳情</span>
          {xrSupported && <span className="hint-sep">·</span>}
          {xrSupported && <span>🥽 按「進入 VR」體驗沉浸式閱讀</span>}
        </footer>
      )}
    </>
  )
}
