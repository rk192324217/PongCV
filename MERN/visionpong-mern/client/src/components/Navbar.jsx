import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'
import api from '../lib/api.js'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-v">V</span>ISION PONG
      </Link>

      <div className="navbar-links">
        <Link to="/leaderboard">Leaderboard</Link>

        {user ? (
          <>
            <Link to={`/profile/${user.username}`}>{user.username}</Link>
            <Link to="/game" className="btn-play">Play</Link>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn-register">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
