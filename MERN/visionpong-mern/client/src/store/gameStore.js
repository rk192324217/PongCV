import { create } from 'zustand'

// gameStore holds runtime game state shared between components.
// It does NOT hold physics state — that lives in GameRoom.js (server)
// or engine.js (client-side AI mode). This is UI-level state only.
export const useGameStore = create((set) => ({
  // Game config chosen on menu
  mode:     'ai',       // 'ai' | 'pvp'
  aiLevel:  'medium',
  winScore: 10,
  side:     'p1',       // which side this client is ('p1' | 'p2')
  roomId:   null,

  // Live scores — updated when server broadcasts gameState
  scoreP1: 0,
  scoreP2: 0,

  // Game lifecycle
  phase: 'menu',   // 'menu' | 'countdown' | 'playing' | 'paused' | 'over'
  winner: null,    // 'p1' | 'p2' | null

  // Setters
  setConfig: (mode, aiLevel, winScore) => set({ mode, aiLevel, winScore }),
  setRoom:   (roomId, side) => set({ roomId, side }),
  setScores: (p1, p2) => set({ scoreP1: p1, scoreP2: p2 }),
  setPhase:  (phase)  => set({ phase }),
  setWinner: (winner) => set({ winner, phase: 'over' }),
  reset: () => set({
    scoreP1: 0, scoreP2: 0,
    phase: 'menu', winner: null, roomId: null,
  }),
}))
