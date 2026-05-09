import { useRef, useEffect, useState, useCallback } from 'react'
import { useHandTracking } from '../hooks/useHandTracking.js'
import { useGameLoop }     from '../hooks/useGameLoop.js'
import { useSocket }       from '../hooks/useSocket.js'
import { useGameStore }    from '../store/gameStore.js'
import { useSettingsStore } from '../store/settingsStore.js'
import { useAuthStore }    from '../store/authStore.js'
import api                 from '../lib/api.js'
import * as Engine   from '../game/engine.js'
import * as Renderer from '../game/renderer.js'

export default function GameCanvas({ mode, aiLevel, winScore, onQuit }) {
  // ── Refs ────────────────────────────────────────────────────────────────────
  const gameCanvasRef = useRef(null)
  const videoRef      = useRef(null)
  const camCanvasRef  = useRef(null)

  // ── Local state ─────────────────────────────────────────────────────────────
  const [gameActive,   setGameActive]   = useState(false)
  const [countdown,    setCountdown]    = useState(null)
  const [fps,          setFps]          = useState(0)
  const [serverState,  setServerState]  = useState(null)
  const [phase,        setPhase]        = useState('countdown') // local phase
  const [scores,       setScores]       = useState({ p1: 0, p2: 0 })
  const [winner,       setWinner]       = useState(null)

  // ── Stores ──────────────────────────────────────────────────────────────────
  const settings = useSettingsStore()
  const user     = useAuthStore((s) => s.user)
  const { roomId, side } = useGameStore()

  // ── Hand tracking ───────────────────────────────────────────────────────────
  const { getPaddleY, handsDetected } = useHandTracking(videoRef, camCanvasRef)

  // ── Socket (PvP only) ───────────────────────────────────────────────────────
  const { createRoom, sendPaddleY } = useSocket({
    mode,
    onGameState: (state) => {
      setServerState(state)
      setScores({ p1: state.s1, p2: state.s2 })
    },
    onGameOver: async (result) => {
      setWinner(result.winner)
      setPhase('over')
      setGameActive(false)
      if (user) {
        try {
          await api.post('/matches', {
            mode,
            aiLevel,
            score: { p1: result.score.p1, p2: result.score.p2 },
            durationSeconds: result.durationSeconds,
            totalRallies: result.totalRallies,
            maxRally: result.maxRally,
            winnerId: result.winner === 'p1' ? user.id : null,
          })
        } catch (e) { console.error('Match save failed:', e) }
      }
    },
    onPlayerLeft: () => {
      setPhase('over')
      setGameActive(false)
      alert('Opponent disconnected')
    },
  })

  // ── FPS counter ─────────────────────────────────────────────────────────────
  const fpsRef = useRef({ frames: 0, last: performance.now() })

  // ── Camera setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    let stream = null
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (e) {
        console.error('Camera error:', e)
        alert('Camera access denied. Please allow camera and refresh.')
      }
    }
    startCamera()
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  // ── Game init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'ai') {
      Engine.create(mode, aiLevel, winScore, settings)
    } else {
      createRoom({ mode: 'pvp', winScore })
    }
    startCountdown()
    return () => Engine.destroy()
  }, [])

  function startCountdown() {
    let n = 3
    setCountdown(n)
    const id = setInterval(() => {
      n--
      if (n <= 0) {
        clearInterval(id)
        setCountdown(null)
        setGameActive(true)
        setPhase('playing')
      } else {
        setCountdown(n)
      }
    }, 1000)
  }

  // ── Game loop ───────────────────────────────────────────────────────────────
  const gameTick = useCallback((dt) => {
    const canvas = gameCanvasRef.current
    if (!canvas) return

    // FPS
    const f = fpsRef.current
    f.frames++
    const now = performance.now()
    if (now - f.last >= 1000) {
      setFps(f.frames)
      f.frames = 0
      f.last = now
    }

    // Hand position — left hand for P1, right for P2
    const handSide = mode === 'pvp' && side === 'p2' ? 'right' : 'left'
    const localY = getPaddleY(handSide) ?? 0.5

    if (mode === 'ai') {
      Engine.update(dt, localY)
      const state = Engine.getState()
      if (!state) return

      // Update scores display
      setScores({ p1: state.p1.score, p2: state.p2.score })

      // Check game over
      if (state.phase === 'over' && phase !== 'over') {
        setWinner(state.lastScorer)
        setPhase('over')
        setGameActive(false)
        // Save match if logged in
        if (user) {
          api.post('/matches', {
            mode,
            aiLevel,
            score: { p1: state.p1.score, p2: state.p2.score },
            durationSeconds: 0,
            totalRallies: state.totalRallies || 0,
            maxRally: state.maxRally || 0,
            winnerId: state.lastScorer === 'p1' ? user.id : null,
          }).catch(console.error)
        }
      }

      Renderer.draw(canvas, state, settings)
    } else {
      // PvP — send paddle, render server state
      if (roomId) sendPaddleY(roomId, localY)
      if (serverState) {
        Renderer.drawFromServer(canvas, serverState, localY, side, settings)
      }
    }
  }, [mode, side, roomId, serverState, phase, getPaddleY, sendPaddleY, settings, user])

  useGameLoop(gameTick, gameActive)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="game-layout">

      {/* Camera sidebar */}
      <div className="cam-panel">
        <div className="cam-label">CAMERA</div>
        <div className="cam-preview">
          <video ref={videoRef} autoPlay playsInline muted className="cam-video" />
          <canvas ref={camCanvasRef} className="cam-canvas" />
          <div className="cam-corner tl" />
          <div className="cam-corner tr" />
          <div className="cam-corner bl" />
          <div className="cam-corner br" />
        </div>

        <div className="hand-indicators">
          <div className={`hand-ind ${handsDetected.left ? 'detected' : ''}`}>
            ✋ <span>{handsDetected.left ? 'detected' : 'show hand'}</span>
          </div>
          <div className={`hand-ind right ${handsDetected.right ? 'detected' : ''}`}>
            🤚 <span>{handsDetected.right ? 'detected' : 'show hand'}</span>
          </div>
        </div>

        <div className="cam-scores">
          <span className="cs-p1">{scores.p1}</span>
          <span className="cs-div">:</span>
          <span className="cs-p2">{scores.p2}</span>
        </div>

        <div className="cam-fps">{fps} fps</div>

        <button className="btn-quit" onClick={onQuit}>✕ Quit</button>
      </div>

      {/* Game canvas */}
      <div className="game-canvas-wrap">
        <canvas
          ref={gameCanvasRef}
          width={900}
          height={550}
          className="game-canvas"
        />

        {/* Countdown */}
        {countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-num">{countdown}</div>
          </div>
        )}

        {/* Game over */}
        {phase === 'over' && (
          <div className="game-over-overlay">
            <div className="game-over-box">
              <div className="game-over-crown">
                {winner === 'p1' ? '🏆' : '🤖'}
              </div>
              <h2 className="game-over-title">
                {winner === 'p1' ? 'YOU WIN!' : mode === 'ai' ? 'AI WINS!' : 'PLAYER 2 WINS!'}
              </h2>
              <div className="game-over-score">
                {scores.p1} — {scores.p2}
              </div>
              <div className="game-over-actions">
                <button
                  className="btn-primary"
                  onClick={() => {
                    setPhase('countdown')
                    setWinner(null)
                    setScores({ p1: 0, p2: 0 })
                    setGameActive(false)
                    if (mode === 'ai') Engine.create(mode, aiLevel, winScore, settings)
                    startCountdown()
                  }}
                >
                  Play Again
                </button>
                <button className="btn-ghost" onClick={onQuit}>
                  Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No hand warning */}
        {gameActive && !handsDetected.left && (
          <div className="no-hand-warn">
            ✋ Show your left hand to the camera
          </div>
        )}
      </div>
    </div>
  )
}