// renderer.js — ALL canvas drawing lives here. No game logic, just rendering.
// draw() uses client-side engine state (AI mode).
// drawFromServer() uses server-broadcast state (PvP mode).

const THEMES = {
  dark:  { bg: '#0c0c0f', grid: 'rgba(255,255,255,0.025)', mid: 'rgba(255,255,255,0.1)',  p1: '#3bf5c0', p2: '#f53b7e' },
  neon:  { bg: '#000408', grid: 'rgba(0,255,180,0.04)',    mid: 'rgba(0,255,180,0.18)',   p1: '#00ffb4', p2: '#ff00aa' },
  glass: { bg: '#0d1117', grid: 'rgba(120,160,255,0.04)',  mid: 'rgba(120,160,255,0.15)', p1: '#88aaff', p2: '#ffaa88' },
  retro: { bg: '#0a0800', grid: 'rgba(255,180,0,0.04)',    mid: 'rgba(255,180,0,0.2)',    p1: '#ffcc00', p2: '#ff6600' },
}

const BALL_SKINS = {
  classic: { type: 'solid', color: '#ffffff' },
  neon:    { type: 'solid', color: '#39ff14' },
  fire:    { type: 'emoji', emoji: '🔥', color: '#ff6b35' },
  ice:     { type: 'emoji', emoji: '🧊', color: '#88ccff' },
  skull:   { type: 'emoji', emoji: '💀', color: '#aaa' },
  star:    { type: 'emoji', emoji: '⭐', color: '#ffe600' },
  disco:   { type: 'rainbow' },
}

let discoHue = 0

// ── AI mode draw ──────────────────────────────────────────────────────────────
export function draw(canvas, state, settings) {
  const ctx = canvas.getContext('2d')
  const T   = THEMES[settings.theme] || THEMES.dark
  discoHue  = (discoHue + 2) % 360

  const { W, H, p1, p2, ball, trail, particles, phase, lastScorer, scoredPause } = state

  drawBackground(ctx, W, H, T)
  drawParticles(ctx, particles)
  drawTrail(ctx, trail, ball, settings, T, discoHue)
  drawBall(ctx, ball, settings, discoHue)
  drawPaddle(ctx, 28, p1.y, state.PAD_W, state.PAD_H, T.p1, settings.paddleGlow)
  drawPaddle(ctx, W - 28 - state.PAD_W, p2.y, state.PAD_W, state.PAD_H, T.p2, settings.paddleGlow)
  drawGhostScore(ctx, p1.score, p2.score, W, H, T)

  if (phase === 'scored') {
    const alpha = Math.sin((scoredPause / 90) * Math.PI) * 0.7
    ctx.globalAlpha = alpha
    ctx.fillStyle   = lastScorer === 'p1' ? T.p1 : T.p2
    ctx.font        = `bold ${H * 0.18}px 'Bebas Neue', sans-serif`
    ctx.textAlign   = 'center'
    ctx.fillText('POINT', W / 2, H / 2 + 20)
    ctx.globalAlpha = 1
  }
}

// ── PvP mode draw (uses server state) ────────────────────────────────────────
export function drawFromServer(canvas, serverState, localY, side, settings) {
  const ctx = canvas.getContext('2d')
  const T   = THEMES[settings.theme] || THEMES.dark
  const W = 900, H = 550, PAD_W = 14, PAD_H = settings.paddleH

  const ball = { x: serverState.bx * W, y: serverState.by * H, r: settings.ballSize }

  // For your own paddle, use localY (instant, from hand tracking) for zero-lag feel.
  // For opponent's paddle, use server value.
  const p1y = side === 'p1'
    ? localY * H - PAD_H / 2
    : serverState.p1y * H - PAD_H / 2
  const p2y = side === 'p2'
    ? localY * H - PAD_H / 2
    : serverState.p2y * H - PAD_H / 2

  drawBackground(ctx, W, H, T)
  drawBall(ctx, ball, settings, discoHue)
  drawPaddle(ctx, 28, p1y, PAD_W, PAD_H, T.p1, settings.paddleGlow)
  drawPaddle(ctx, W - 28 - PAD_W, p2y, PAD_W, PAD_H, T.p2, settings.paddleGlow)
  drawGhostScore(ctx, serverState.s1, serverState.s2, W, H, T)
}

// ── Drawing primitives ────────────────────────────────────────────────────────
function drawBackground(ctx, W, H, T) {
  ctx.fillStyle = T.bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = T.grid
  ctx.lineWidth   = 1
  for (let x = 0; x <= W; x += 45) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (let y = 0; y <= H; y += 45) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
  ctx.setLineDash([10, 12])
  ctx.strokeStyle = T.mid
  ctx.lineWidth   = 2
  ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke()
  ctx.setLineDash([])
}

function drawTrail(ctx, trail, ball, settings, T, hue) {
  const skin  = BALL_SKINS[settings.ballSkin] || BALL_SKINS.classic
  const color = skin.type === 'rainbow' ? `hsl(${hue},100%,60%)` : skin.color
  for (let i = 0; i < trail.length; i++) {
    const ratio = (i + 1) / trail.length
    ctx.globalAlpha = ratio * 0.4
    ctx.fillStyle   = color
    ctx.beginPath()
    ctx.arc(trail[i].x, trail[i].y, ball.r * ratio * 0.75, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawBall(ctx, ball, settings, hue) {
  const skin  = BALL_SKINS[settings.ballSkin] || BALL_SKINS.classic
  const color = skin.type === 'rainbow' ? `hsl(${hue},100%,60%)` : skin.color

  if (skin.emoji) {
    ctx.font         = `${ball.r * 2.5}px serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(skin.emoji, ball.x, ball.y)
    ctx.textBaseline = 'alphabetic'
    return
  }

  // Glow
  const grd = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r * 3.5)
  grd.addColorStop(0, color + '55'); grd.addColorStop(1, color + '00')
  ctx.fillStyle = grd
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r * 3.5, 0, Math.PI * 2); ctx.fill()

  ctx.shadowColor = color
  ctx.shadowBlur  = settings.paddleGlow
  ctx.fillStyle   = color
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur  = 0

  // Specular
  ctx.globalAlpha = 0.45
  ctx.fillStyle   = '#fff'
  ctx.beginPath(); ctx.arc(ball.x - ball.r*0.3, ball.y - ball.r*0.3, ball.r*0.28, 0, Math.PI*2); ctx.fill()
  ctx.globalAlpha = 1
}

function drawPaddle(ctx, x, y, w, h, color, glow) {
  ctx.shadowColor = color
  ctx.shadowBlur  = glow
  const g = ctx.createLinearGradient(x, y, x+w, y+h)
  g.addColorStop(0, color + 'aa'); g.addColorStop(0.5, color); g.addColorStop(1, color + 'aa')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill()
  ctx.shadowBlur  = 0
  ctx.globalAlpha = 0.12
  ctx.fillStyle   = '#fff'
  ctx.beginPath(); ctx.roundRect(x, y, w, h*0.4, [5,5,0,0]); ctx.fill()
  ctx.globalAlpha = 1
}

function drawGhostScore(ctx, s1, s2, W, H, T) {
  ctx.font      = `bold ${H * 0.55}px 'Bebas Neue', sans-serif`
  ctx.textAlign = 'center'
  ctx.fillStyle  = T.text || 'rgba(255,255,255,0.05)'
  ctx.fillText(s1, W * 0.25, H * 0.72)
  ctx.fillText(s2, W * 0.75, H * 0.72)
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle   = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}
