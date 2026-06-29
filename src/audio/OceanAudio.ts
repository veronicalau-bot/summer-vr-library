/**
 * OceanAudio – plays real ocean + seagull sound from GitHub raw URL.
 * Uses HTMLAudioElement for reliable looping playback.
 *
 * Audio source: Pixabay "nature-sea-and-seagull-wave-5932"
 * https://pixabay.com/sound-effects/nature-sea-and-seagull-wave-5932/
 */
export class OceanAudio {
  private audio: HTMLAudioElement | null = null
  private _volume = 0.5
  private _muted = false

  // Direct GitHub raw URL (reliable CDN, works across deployments)
  // Format: https://github.com/<owner>/<repo>/raw/refs/heads/<branch>/<path>
  private readonly AUDIO_URL =
    'https://github.com/veronicalau-bot/summer-vr-library/raw/refs/heads/main/public/audio/nature-sea-and-seagull-wave-5932.mp3'

  async start(): Promise<void> {
    if (this.audio) return

    this.audio = new Audio(this.AUDIO_URL)
    this.audio.loop = true
    this.audio.volume = this._muted ? 0 : this._volume

    try {
      await this.audio.play()
    } catch (err) {
      console.warn('[OceanAudio] Failed to play audio. Make sure the file exists at', this.AUDIO_URL)
      console.error(err)
    }
  }

  setVolume(vol: number): void {
    this._volume = vol
    if (this.audio && !this._muted) {
      this.audio.volume = vol
    }
  }

  setMuted(muted: boolean): void {
    this._muted = muted
    if (this.audio) {
      this.audio.volume = muted ? 0 : this._volume
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio = null
    }
  }
}

// Singleton – shared across the entire app
export const oceanAudio = new OceanAudio()
