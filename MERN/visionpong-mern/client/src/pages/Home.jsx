import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

export default function Home() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-logo">
          <span className="logo-v">V</span>ISION<br />
          <span className="logo-pong">PONG</span>
        </div>
        <p className="home-tagline">Play with your hands — literally</p>
        <div className="home-actions">
          <Link to="/game" className="btn-hero-play">
            {user ? 'Play Now →' : 'Play as Guest →'}
          </Link>
          {!user && (
            <Link to="/register" className="btn-hero-register">
              Create Account
            </Link>
          )}
        </div>
      </div>

      <div className="home-features">
        <div className="feature-card">
          <div className="feature-icon">✋</div>
          <div className="feature-title">Hand Tracking</div>
          <div className="feature-body">MediaPipe AI detects your hand in real-time. No controllers needed.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <div className="feature-title">Privacy First</div>
          <div className="feature-body">Only hand position is sent online. Your camera feed never leaves your device.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <div className="feature-title">60Hz Server</div>
          <div className="feature-body">Authoritative game server runs at 60Hz. Fair, cheat-proof, low-latency.</div>
        </div>
      </div>
    </div>
  )
}
