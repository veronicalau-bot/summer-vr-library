/**
 * OceanAudio – generates looping ocean-wave sound + soft seagull calls
 * entirely via Web Audio API. No external audio files required.
 */
export class OceanAudio {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private _volume = 0.3
  private _muted = false

  async start(): Promise<void> {
    if (this.ctx) return

    this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    const sampleRate = this.ctx.sampleRate
    const loopSecs = 10
    const frameCount = sampleRate * loopSecs

    // --- Generate pink noise (Voss-McCartney algorithm) ---
    const buffer = this.ctx.createBuffer(2, frameCount, sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      }
    }

    // --- Build audio graph: source → lowpass → waveLFO gain → master gain ---
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Low-pass filter – makes it feel like distant surf
    const lpf = this.ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 700
    lpf.Q.value = 0.8

    // Wave LFO – slowly amplitude-modulates to mimic incoming/outgoing waves
    const lfoBuffer = this.ctx.createBuffer(1, frameCount, sampleRate)
    const lfoData = lfoBuffer.getChannelData(0)
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate
      lfoData[i] = 0.55 + 0.45 * Math.sin(t * 0.6) * Math.sin(t * 0.37)
    }
    const lfoSource = this.ctx.createBufferSource()
    lfoSource.buffer = lfoBuffer
    lfoSource.loop = true

    const waveGain = this.ctx.createGain()
    waveGain.gain.value = 0
    lfoSource.connect(waveGain.gain)

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this._muted ? 0 : this._volume

    source.connect(lpf)
    lpf.connect(waveGain)
    waveGain.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)

    source.start()
    lfoSource.start()

    // --- Soft seagull calls (synthesized) ---
    this.scheduleSeagullCalls()
  }

  /** Periodically play soft seagull-like chirps */
  private scheduleSeagullCalls() {
    if (!this.ctx) return

    const playSeagull = () => {
      if (!this.ctx || !this.masterGain || this._muted) return

      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      osc.type = 'sawtooth'
      osc.frequency.value = 820 + Math.random() * 180

      filter.type = 'bandpass'
      filter.frequency.value = 900
      filter.Q.value = 4

      gain.gain.value = 0
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.035, now + 0.06)
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.9 + Math.random() * 0.4)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain)

      osc.start(now)
      osc.stop(now + 1.6)

      // Schedule next call (8–20 seconds apart)
      const nextDelay = 8000 + Math.random() * 12000
      setTimeout(playSeagull, nextDelay)
    }

    // First call after 6–12 seconds
    setTimeout(playSeagull, 6000 + Math.random() * 6000)
  }

  setVolume(vol: number): void {
    this._volume = vol
    if (this.masterGain && this.ctx && !this._muted) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1)
    }
  }

  setMuted(muted: boolean): void {
    this._muted = muted
    if (this.masterGain && this.ctx) {
      const target = muted ? 0 : this._volume
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15)
    }
  }

  stop(): void {
    this.ctx?.close()
    this.ctx = null
    this.masterGain = null
  }
}

// Singleton – shared across the entire app
export const oceanAudio = new OceanAudio()
