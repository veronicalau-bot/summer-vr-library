import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { oceanAudio } from '../audio/OceanAudio'

export default function AudioControls() {
  const { audioStarted, setAudioStarted, audioMuted, audioVolume, toggleMute, setVolume } =
    useAppStore()

  // Start audio on first user interaction anywhere on the page (default on)
  // Browsers block autoplay without user gesture; this captures the first click/tap/key
  useEffect(() => {
    if (audioStarted) return

    const startOnFirstInteraction = async () => {
      try {
        await oceanAudio.start()
        setAudioStarted(true)
      } catch (err) {
        console.warn('[AudioControls] Failed to start audio on interaction:', err)
      }
      // Remove listeners after first successful attempt
      window.removeEventListener('click', startOnFirstInteraction)
      window.removeEventListener('keydown', startOnFirstInteraction)
      window.removeEventListener('touchstart', startOnFirstInteraction)
    }

    window.addEventListener('click', startOnFirstInteraction, { once: true })
    window.addEventListener('keydown', startOnFirstInteraction, { once: true })
    window.addEventListener('touchstart', startOnFirstInteraction, { once: true })

    return () => {
      window.removeEventListener('click', startOnFirstInteraction)
      window.removeEventListener('keydown', startOnFirstInteraction)
      window.removeEventListener('touchstart', startOnFirstInteraction)
    }
  }, [audioStarted, setAudioStarted])

  // Sync mute state with audio engine whenever it changes
  useEffect(() => {
    if (audioStarted) oceanAudio.setMuted(audioMuted)
  }, [audioMuted, audioStarted])

  // Sync volume with audio engine
  useEffect(() => {
    if (audioStarted) oceanAudio.setVolume(audioVolume)
  }, [audioVolume, audioStarted])

  const handleStart = async () => {
    await oceanAudio.start()
    setAudioStarted(true)
  }

  return (
    <div className="audio-controls">
      {!audioStarted ? (
        <button className="audio-btn start" onClick={handleStart} title="播放海浪（Pixabay）">
          🌊 播放海浪
        </button>
      ) : (
        <>
          <button
            className="audio-btn icon"
            onClick={toggleMute}
            title={audioMuted ? '取消靜音' : '靜音'}
            aria-label={audioMuted ? '取消靜音' : '靜音'}
          >
            {audioMuted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            className="volume-slider"
            min={0}
            max={1}
            step={0.05}
            value={audioVolume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="音量"
          />
        </>
      )}
    </div>
  )
}
