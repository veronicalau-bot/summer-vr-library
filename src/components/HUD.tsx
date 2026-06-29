import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'



export default function HUD() {
  const { selectedBook } = useAppStore()
  const [xrSupported, setXrSupported] = useState(false)
  const [xrActive, setXrActive] = useState(false)

  useEffect(() => {
    if ('xr' in navigator && navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-vr')
        .then((ok) => setXrSupported(ok))
        .catch(() => setXrSupported(false))
    }
  }, [])

  const enterVR = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const xr = (navigator as any).xr
      if (!xr) return
      const session = await xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      })
      setXrActive(true)

      session.addEventListener('end', () => {
        setXrActive(false)
      })
    } catch (err) {
      console.error('Failed to enter VR:', err)
      alert('無法進入 VR 模式，請確認裝置支援 WebXR')
    }
  }

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
        {xrSupported && !xrActive && (
          <button className="hud-xr-btn" onClick={enterVR}>
            🥽 進入 VR
          </button>
        )}
        {xrActive && <span className="hud-xr-badge active">🥽 VR 模式</span>}
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
