import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api.js'

// Zustand is simpler than Redux — just an object with state + functions.
// persist saves to localStorage so the user stays logged in on refresh.
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:        null,   // { id, username, email, stats }
      accessToken: null,

      setAuth: (user, accessToken) => set({ user, accessToken }),

      logout: async () => {
        try { await api.post('/auth/logout') } catch {}
        set({ user: null, accessToken: null })
      },

      // Called on app load to silently refresh the access token using the cookie
      refreshToken: async () => {
        try {
          const res = await api.post('/auth/refresh')
          set({ accessToken: res.data.accessToken })
          return true
        } catch {
          set({ user: null, accessToken: null })
          return false
        }
      },

      isLoggedIn: () => !!get().user,
    }),
    {
      name: 'visionpong-auth',
      // Only persist user, not the access token (security best practice)
      partialize: (state) => ({ user: state.user }),
    }
  )
)
