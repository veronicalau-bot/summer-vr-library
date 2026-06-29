/**
 * OceanAudio – plays real ocean + seagull sound from external audio file.
 * Uses HTMLAudioElement for reliable looping playback.
 *
 * To use the Pixabay sound "nature-sea-and-seagull-wave-5932":
 * 1. Download from https://pixabay.com/sound-effects/nature-sea-and-seagull-wave-5932/
 * 2. Place the MP3 file in public/audio/ as "nature-sea-and-seagull-wave-5932.mp3"
 */
export class OceanAudio {
  private audio: HTMLAudioElement | null = null
  private _volume = 0.5
  private _muted = false

  // Pixabay audio file path (user should download and place here)
  private readonly AUDIO_URL = '/audio/nature-sea-and-seagull-wave-5932.mp3'

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
