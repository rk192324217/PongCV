import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api.js'

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/leaderboard')
      .then((res) => setPlayers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">Loading leaderboard…</div>

  return (
    <div className="leaderboard-page">
      <h1 className="page-title">LEADERBOARD</h1>

      <div className="leaderboard-table">
        <div className="lb-header">
          <span>#</span>
          <span>Player</span>
          <span>Wins</span>
          <span>Matches</span>
          <span>Win Rate</span>
          <span>Avg Rally</span>
        </div>

        {players.map((p, i) => (
          <div key={p._id} className={`lb-row ${i < 3 ? 'lb-top' : ''}`}>
            <span className="lb-rank">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            <span className="lb-name">
              <Link to={`/profile/${p.username}`}>{p.username}</Link>
            </span>
            <span className="lb-wins">{p.wins}</span>
            <span>{p.totalMatches}</span>
            <span className="lb-winrate">{p.winRate}%</span>
            <span>{p.avgRallies}</span>
          </div>
        ))}

        {players.length === 0 && (
          <div className="lb-empty">No players yet. Be the first!</div>
        )}
      </div>
    </div>
  )
}
