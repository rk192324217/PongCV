import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api.js'

export default function Profile() {
  const { username } = useParams()
  const [profile, setProfile]   = useState(null)
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/users/${username}`),
      api.get('/matches/me'),
    ])
      .then(([profileRes, matchRes]) => {
        setProfile(profileRes.data)
        setMatches(matchRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return <div className="page-loading">Loading profile…</div>
  if (!profile) return <div className="page-loading">Player not found</div>

  const winRate = profile.stats.totalMatches
    ? ((profile.stats.wins / profile.stats.totalMatches) * 100).toFixed(1)
    : 0

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">{profile.username[0].toUpperCase()}</div>
        <div className="profile-info">
          <h1 className="profile-name">{profile.username}</h1>
          <p className="profile-joined">
            Joined {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-val">{profile.stats.wins}</div>
          <div className="stat-label">Wins</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{profile.stats.losses}</div>
          <div className="stat-label">Losses</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{profile.stats.totalMatches}</div>
          <div className="stat-label">Matches</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{winRate}%</div>
          <div className="stat-label">Win Rate</div>
        </div>
      </div>

      <div className="match-history">
        <h2 className="section-title">Recent Matches</h2>
        {matches.length === 0 && <p className="muted">No matches yet.</p>}
        {matches.map((m) => {
          const won = m.winner?.username === profile.username
          return (
            <div key={m._id} className={`match-row ${won ? 'won' : 'lost'}`}>
              <span className="match-result">{won ? 'WIN' : 'LOSS'}</span>
              <span className="match-score">{m.score.p1} – {m.score.p2}</span>
              <span className="match-mode">{m.mode === 'ai' ? `vs AI (${m.aiLevel})` : 'vs Player'}</span>
              <span className="match-date">{new Date(m.createdAt).toLocaleDateString()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
