import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { useAuthStore } from './store/authStore.js'

// Expose auth store to the axios interceptor in lib/api.js
// Avoids circular import: api.js → authStore.js → api.js
window.__authStore = useAuthStore

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
