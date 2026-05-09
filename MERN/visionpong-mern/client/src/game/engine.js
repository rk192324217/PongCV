// engine.js — CLIENT-SIDE physics for AI mode only.
// When playing vs AI, the server is not involved in physics at all.
// This mirrors the logic in server/game/GameRoom.js intentionally —
// if you fix a bug in one, fix it in the other too.
// In PvP mode, this file is not used — the server's GameRoom.js runs instead.

const GW = 900, GH = 550
const PAD_W = 14
const AI_SPEED = { easy: 2.5, medium: 4.5, hard: 7, insane: 11 }

let state = null
let winScore = 10

export function create(mode, aiLevel, ws, settings) {
  winScore = ws
  state = {
    W: GW, H: GH, PAD_W, PAD_H: settings.paddleH,
    mode, aiLevel,
    p1: { y: GH / 2 - settings.paddleH / 2, score: 0 },
    p2: { y: GH / 2 - settings.paddleH / 2, score: 0 },
    ball: freshBall(1, settings.ballSpeed, settings.ballSize),
    trail: [],
    particles: [],
    phase: 'playing',
    scoredPause: 0,
    lastScorer: null,
    rallyHits: 0,
  }
}

export function destroy() { state = null }
export function getState() { return state }

// Called every frame from GameCanvas with dt (delta time in seconds) and localY (hand position)
export function update(dt, localY) {
  if (!state || state.phase === 'over') return
  const s = state
  const dtTick = dt * 60 // convert to "ticks" (at 60fps, dt≈1/60, dtTick≈1)

  if (s.phase === 'scored') {
    s.scoredPause -= dtTick
    updateParticles(dtTick)
    if (s.scoredPause <= 0) {
      s.ball = freshBall(s.lastScorer === 'p1' ? -1 : 1, 6, s.ball.r)
      s.phase = 'playing'
    }
    return
  }

  updatePaddles(s, localY, dtTick)
  updateBall(s, dtTick)
  updateParticles(dtTick)
  updateTrail(s)
}

function updatePaddles(s, localY, dt) {
  // P1 — hand controlled
  const p1Target = localY * s.H - s.PAD_H / 2
  s.p1.y += (p1Target - s.p1.y) * 0.3
  s.p1.y  = clamp(s.p1.y, 0, s.H - s.PAD_H)

  // AI
  const aiSpeed = AI_SPEED[s.aiLevel] || 4.5
  const center  = s.p2.y + s.PAD_H / 2
  const noise   = s.aiLevel !== 'insane' ? (Math.random() - 0.5) * 8 : 0
  const diff    = s.ball.y - center + noise
  s.p2.y += Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed * dt)
  s.p2.y  = clamp(s.p2.y, 0, s.H - s.PAD_H)
}

function updateBall(s, dt) {
  const b = s.ball
  b.x += b.dx * dt
  b.y += b.dy * dt

  // Walls
  if (b.y - b.r <= 0)    { b.y = b.r;      b.dy =  Math.abs(b.dy); spawnParticles(s, b.x, 0) }
  if (b.y + b.r >= s.H)  { b.y = s.H - b.r; b.dy = -Math.abs(b.dy); spawnParticles(s, b.x, s.H) }

  // P1 paddle
  const p1x = 28
  if (b.dx < 0 && b.x - b.r <= p1x + s.PAD_W && b.x + b.r >= p1x) {
    if (b.y + b.r >= s.p1.y && b.y - b.r <= s.p1.y + s.PAD_H) {
      b.x = p1x + s.PAD_W + b.r + 1
      reflect(b, s.p1.y, s.PAD_H, 1)
      spawnParticles(s, b.x, b.y, '#3bf5c0')
      s.rallyHits++
    }
  }

  // P2 paddle
  const p2x = s.W - 28 - s.PAD_W
  if (b.dx > 0 && b.x + b.r >= p2x && b.x - b.r <= p2x + s.PAD_W) {
    if (b.y + b.r >= s.p2.y && b.y - b.r <= s.p2.y + s.PAD_H) {
      b.x = p2x - b.r - 1
      reflect(b, s.p2.y, s.PAD_H, -1)
      spawnParticles(s, b.x, b.y, '#f53b7e')
      s.rallyHits++
    }
  }

  // Score
  if (b.x < 0)     score(s, 'p2')
  else if (b.x > s.W) score(s, 'p1')
}

function reflect(ball, padY, padH, dirX) {
  const rel   = (ball.y - (padY + padH / 2)) / (padH / 2)
  const angle = rel * (50 * Math.PI / 180)
  ball.speed  = Math.min(ball.speed * 1.04, 14)
  ball.dx     = Math.cos(angle) * ball.speed * dirX
  ball.dy     = Math.sin(angle) * ball.speed
}

function score(s, who) {
  s[who].score++
  s.lastScorer  = who
  s.rallyHits   = 0
  s.scoredPause = 90
  s.phase = s[who].score >= winScore ? 'over' : 'scored'
  spawnParticles(s, who === 'p1' ? s.W : 0, s.H / 2, who === 'p1' ? '#3bf5c0' : '#f53b7e', 40)
}

function freshBall(dir, speed = 6, r = 10) {
  const angle = (Math.random() * 30 - 15) * (Math.PI / 180)
  return { x: GW/2, y: GH/2 + (Math.random()*60-30), dx: Math.cos(angle)*speed*dir, dy: Math.sin(angle)*speed, speed, r }
}

function updateTrail(s) {
  s.trail.push({ x: s.ball.x, y: s.ball.y })
  while (s.trail.length > 14) s.trail.shift()
}

function updateParticles(dt) {
  if (!state) return
  state.particles = state.particles.filter((p) => p.life > 0)
  for (const p of state.particles) {
    p.x += p.vx; p.y += p.vy
    p.vy += 0.12; p.vx *= 0.97
    p.life -= dt * 1.5
  }
}

function spawnParticles(s, x, y, color = '#fff', count = 12) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const v = Math.random() * 5 + 2
    s.particles.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, color, life: 70, maxLife: 70, size: Math.random()*3+1 })
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
