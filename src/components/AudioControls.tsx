import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { oceanAudio } from '../audio/OceanAudio'

export default function AudioControls() {
  const { audioStarted, setAudioStarted, audioMuted, audioVolume, toggleMute, setVolume } =
    useAppStore()

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
        <button className="audio-btn start" onClick={handleStart} title="播放海浪 + 海鷗聲">
          🌊 播放海浪 + 海鷗聲
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
