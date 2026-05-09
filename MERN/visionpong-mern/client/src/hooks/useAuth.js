import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api.js'
import { useAuthStore } from '../store/authStore.js'

// useAuth wraps all auth API calls and connects them to the Zustand store.
// Components just call login(email, password) and don't touch axios directly.
export function useAuth() {
  const { setAuth, logout: storeLogout, user, isLoggedIn } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const navigate = useNavigate()

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/auth/login', { email, password })
      setAuth(res.data.user, res.data.accessToken)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const register = async (username, email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/auth/register', { username, email, password })
      setAuth(res.data.user, res.data.accessToken)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await storeLogout()
    navigate('/login')
  }

  return { login, register, logout, user, isLoggedIn, loading, error }
}
