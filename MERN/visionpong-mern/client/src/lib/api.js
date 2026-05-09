import axios from 'axios'

// One shared axios instance for the whole app.
// baseURL means every call like api.post('/auth/login')
// actually hits /api/auth/login — Vite proxies that to localhost:5000 in dev.
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // sends cookies (refresh token) on every request
})

// ── REQUEST INTERCEPTOR ───────────────────────────────────────────────────────
// Automatically attach the access token to every request.
// We read it from the Zustand store rather than localStorage directly
// so it stays in sync with the in-memory state.
api.interceptors.request.use((config) => {
  // Dynamic import avoids circular dependency (api.js ← authStore.js → api.js)
  const { accessToken } = window.__authStore?.getState() || {}
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ── RESPONSE INTERCEPTOR ──────────────────────────────────────────────────────
// If any request gets a 401 (token expired), automatically try to refresh.
// If refresh succeeds, retry the original request transparently.
// If refresh fails, the user needs to log in again.
let isRefreshing = false
let failedQueue = []  // hold requests that came in while refresh was in progress

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const newToken = res.data.accessToken

        // Update the store
        window.__authStore?.getState().setAuth(
          window.__authStore.getState().user,
          newToken
        )

        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr)
        window.__authStore?.getState().logout()
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
