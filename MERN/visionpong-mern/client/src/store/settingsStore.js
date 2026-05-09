import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      ballSkin:    'classic',
      ballSpeed:   6,
      ballSize:    10,
      trailLen:    12,
      particles:   'high',
      paddleH:     90,
      paddleGlow:  20,
      sensitivity: 0.75,
      deadZone:    0.10,
      smoothing:   0.25,
      theme:       'dark',

      set: (key, val) => set({ [key]: val }),

      reset: () => set({
        ballSkin: 'classic', ballSpeed: 6, ballSize: 10,
        trailLen: 12, particles: 'high', paddleH: 90,
        paddleGlow: 20, sensitivity: 0.75, deadZone: 0.10,
        smoothing: 0.25, theme: 'dark',
      }),
    }),
    { name: 'visionpong-settings' }
  )
)
