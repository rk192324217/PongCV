import { useState } from 'react'
import GameCanvas from '../components/GameCanvas.jsx'

export default function Game() {
  const [screen,   setScreen]   = useState('setup')
  const [mode,     setMode]     = useState('ai')
  const [aiLevel,  setAiLevel]  = useState('medium')
  const [winScore, setWinScore] = useState(10)

  if (screen === 'playing') {
    return (
      <div className="game-page">
        <GameCanvas
          mode={mode}
          aiLevel={aiLevel}
          winScore={winScore}
          onQuit={() => setScreen('setup')}
        />
      </div>
    )
  }

  return (
    <div className="setup-page">
      <h1 className="setup-title">VISION PONG</h1>
      <p className="setup-sub">Control paddles with your hands</p>

      <div className="setup-card">

        <div className="setup-section">
          <div className="setup-label">MODE</div>
          <div className="mode-tabs">
            {['ai', 'pvp'].map((m) => (
              <button
                key={m}
                className={`mode-tab ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m === 'ai' ? '🤖 VS AI' : '🤝 2 Players'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'ai' && (
          <div className="setup-section">
            <div className="setup-label">DIFFICULTY</div>
            <div className="diff-pills">
              {['easy', 'medium', 'hard', 'insane'].map((d) => (
                <button
                  key={d}
                  className={`diff-pill ${aiLevel === d ? 'active' : ''}`}
                  onClick={() => setAiLevel(d)}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="setup-section">
          <div className="setup-label">WIN SCORE: {winScore}</div>
          <input
            type="range" min="3" max="21" step="1"
            value={winScore}
            onChange={(e) => setWinScore(+e.target.value)}
            className="range-slider"
          />
        </div>

        <button
          className="btn-play-big"
          onClick={() => setScreen('playing')}
        >
          PLAY NOW →
        </button>

      </div>
    </div>
  )
}