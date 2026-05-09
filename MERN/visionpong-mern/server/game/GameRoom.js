// GameRoom.js — ONE instance = ONE active game
// Runs an authoritative physics loop at 60Hz on the server.
// Clients send paddle Y positions. Server owns the ball. Nobody can cheat.

const GW = 900, GH = 550
const PAD_W = 14
const TICK_MS = 1000 / 60  // 16.67ms per tick = 60Hz

const AI_SPEED = { easy: 2.5, medium: 4.5, hard: 7, insane: 11 }

export class GameRoom {
  constructor(roomId, io, options = {}) {
    this.roomId  = roomId
    this.io      = io       // Socket.io server instance — used to broadcast to the room
    this.mode    = options.mode || 'ai'
    this.aiLevel = options.aiLevel || 'medium'
    this.winScore = options.winScore || 10

    // Player socket IDs — set when they join
    this.p1SocketId = null
    this.p2SocketId = null

    // Latest paddle positions received from clients (0..1 normalised)
    this.p1PaddleY = 0.5
    this.p2PaddleY = 0.5

    this.state = this._freshState()
    this.intervalId = null  // holds the setInterval reference so we can clear it
    this.startTime = null

    // Stats tracking
    this.totalRallies = 0
    this.currentRally = 0
    this.maxRally = 0
  }

  // ── Fresh game state ──────────────────────────────────────────────────────
  _freshState() {
    return {
      p1: { y: GH / 2 - 45, score: 0 },
      p2: { y: GH / 2 - 45, score: 0 },
      ball: this._freshBall(1),
      phase: 'playing',  // 'playing' | 'scored' | 'over'
      scoredPause: 0,
    }
  }

  _freshBall(dir = 1) {
    const angle = (Math.random() * 30 - 15) * (Math.PI / 180)
    return {
      x: GW / 2, y: GH / 2 + (Math.random() * 60 - 30),
      dx: Math.cos(angle) * 6 * dir,
      dy: Math.sin(angle) * 6,
      speed: 6,
    }
  }

  // ── Start / stop ──────────────────────────────────────────────────────────
  start() {
    this.startTime = Date.now()
    // setInterval fires every 16.67ms — this IS the game loop
    this.intervalId = setInterval(() => this._tick(), TICK_MS)
    console.log(`🎮 Room ${this.roomId} started`)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log(`🛑 Room ${this.roomId} stopped`)
  }

  // ── Receive paddle input from client ──────────────────────────────────────
  // socketId lets us validate which player is sending
  setPaddleY(socketId, normY) {
    const y = Math.max(0, Math.min(1, normY)) // clamp to 0..1
    if (socketId === this.p1SocketId) this.p1PaddleY = y
    if (socketId === this.p2SocketId) this.p2PaddleY = y
  }

  // ── Core tick — runs 60x per second ───────────────────────────────────────
  _tick() {
    const s = this.state
    if (s.phase === 'over') return

    if (s.phase === 'scored') {
      s.scoredPause--
      if (s.scoredPause <= 0) {
        s.ball = this._freshBall(s.p1.score > s.p2.score ? -1 : 1)
        s.phase = 'playing'
      }
    } else {
      this._updatePaddles()
      this._updateBall()
    }

    // Broadcast authoritative state to BOTH players in this room
    // io.to(roomId) sends to every socket that has joined the room
    this.io.to(this.roomId).emit('gameState', {
      bx: s.ball.x, by: s.ball.y,
      p1y: s.p1.y,  p2y: s.p2.y,
      s1: s.p1.score, s2: s.p2.score,
      phase: s.phase,
    })
  }

  // ── Paddle physics ────────────────────────────────────────────────────────
  _updatePaddles() {
    const s = this.state
    const paddleH = 90

    // P1 — always human. Map normalised Y to canvas pixels.
    const p1Target = this.p1PaddleY * GH - paddleH / 2
    s.p1.y += (p1Target - s.p1.y) * 0.3
    s.p1.y = Math.max(0, Math.min(GH - paddleH, s.p1.y))

    if (this.mode === 'pvp') {
      const p2Target = this.p2PaddleY * GH - paddleH / 2
      s.p2.y += (p2Target - s.p2.y) * 0.3
      s.p2.y = Math.max(0, Math.min(GH - paddleH, s.p2.y))
    } else {
      // AI — moves towards ball centre with imperfection
      const aiSpeed = AI_SPEED[this.aiLevel]
      const center  = s.p2.y + paddleH / 2
      const diff    = s.ball.y - center
      const noise   = this.aiLevel !== 'insane' ? (Math.random() - 0.5) * 8 : 0
      const move    = Math.sign(diff) * Math.min(Math.abs(diff + noise), aiSpeed)
      s.p2.y = Math.max(0, Math.min(GH - paddleH, s.p2.y + move))
    }
  }

  // ── Ball physics ──────────────────────────────────────────────────────────
  _updateBall() {
    const s = this.state
    const b = s.ball
    const paddleH = 90

    b.x += b.dx
    b.y += b.dy

    // Top/bottom walls
    if (b.y - 10 <= 0)  { b.y = 10;       b.dy = Math.abs(b.dy) }
    if (b.y + 10 >= GH) { b.y = GH - 10;  b.dy = -Math.abs(b.dy) }

    // P1 paddle (left)
    const p1x = 28
    if (b.dx < 0 && b.x - 10 <= p1x + PAD_W && b.x + 10 >= p1x) {
      if (b.y >= s.p1.y - 10 && b.y <= s.p1.y + paddleH + 10) {
        b.x = p1x + PAD_W + 11
        this._reflect(b, s.p1.y, paddleH, 1)
        this.currentRally++
      }
    }

    // P2 paddle (right)
    const p2x = GW - 28 - PAD_W
    if (b.dx > 0 && b.x + 10 >= p2x && b.x - 10 <= p2x + PAD_W) {
      if (b.y >= s.p2.y - 10 && b.y <= s.p2.y + paddleH + 10) {
        b.x = p2x - 11
        this._reflect(b, s.p2.y, paddleH, -1)
        this.currentRally++
      }
    }

    // Scoring
    if (b.x < 0) {
      this._score('p2')
    } else if (b.x > GW) {
      this._score('p1')
    }
  }

  _reflect(ball, paddleY, paddleH, dirX) {
    const rel   = (ball.y - (paddleY + paddleH / 2)) / (paddleH / 2)
    const angle = rel * (50 * Math.PI / 180)
    ball.speed  = Math.min(ball.speed * 1.04, 14)
    ball.dx     = Math.cos(angle) * ball.speed * dirX
    ball.dy     = Math.sin(angle) * ball.speed
  }

  _score(who) {
    const s = this.state
    s[who].score++
    this.totalRallies++
    this.maxRally = Math.max(this.maxRally, this.currentRally)
    this.currentRally = 0

    if (s[who].score >= this.winScore) {
      s.phase = 'over'
      this.stop()
      // Notify players that the game is over with full result
      this.io.to(this.roomId).emit('gameOver', {
        winner: who,
        score: { p1: s.p1.score, p2: s.p2.score },
        totalRallies: this.totalRallies,
        maxRally: this.maxRally,
        durationSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      })
    } else {
      s.phase = 'scored'
      s.scoredPause = 90 // ~1.5 seconds at 60Hz before ball resets
    }
  }

  getPlayerCount() {
    return (this.p1SocketId ? 1 : 0) + (this.p2SocketId ? 1 : 0)
  }
}
