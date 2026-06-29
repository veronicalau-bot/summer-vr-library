import { create } from 'zustand'
import type { EBook } from '../data/ebooks'

interface AppState {
  selectedBook: EBook | null
  setSelectedBook: (book: EBook | null) => void
  audioStarted: boolean
  setAudioStarted: (v: boolean) => void
  audioMuted: boolean
  audioVolume: number
  toggleMute: () => void
  setVolume: (vol: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedBook: null,
  setSelectedBook: (book) => set({ selectedBook: book }),
  audioStarted: false,
  setAudioStarted: (v) => set({ audioStarted: v }),
  audioMuted: false,
  audioVolume: 0.5,
  toggleMute: () => set((s) => ({ audioMuted: !s.audioMuted })),
  setVolume: (vol) => set({ audioVolume: vol }),
}))
