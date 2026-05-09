/* js/engine.js — Pure game physics. No DOM, no rendering. */

const Engine = (() => {

  const GW = 900;
  const GH = 550;
  const PAD_W = 14;

  const AI_SPEEDS = { easy: 2.2, medium: 4.2, hard: 6.5, insane: 10 };

  let state = null;

  // ─── Particle pool ──────────────────────────────────────
  function mkParticle(x, y, color) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    return { x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 55+Math.random()*35, maxLife: 90, size: Math.random()*3+1, color };
  }

  // ─── Create / reset ─────────────────────────────────────
  function create(mode, aiLevel) {
    const s = Settings.get();
    state = {
      W: GW, H: GH,
      PAD_W,
      PAD_H:     s.paddleH,
      mode,
      aiLevel,
      p1: { y: GH/2 - s.paddleH/2, score: 0, targetY: GH/2 - s.paddleH/2 },
      p2: { y: GH/2 - s.paddleH/2, score: 0, targetY: GH/2 - s.paddleH/2 },
      ball: freshBall(1),
      trail:     [],
      particles: [],
      phase:     'countdown', // 'countdown'|'playing'|'paused'|'scored'|'over'
      scoredTimer: 0,
      paused:    false,
      rallyHits: 0,
      lastScorer: null,
    };
    return state;
  }

  function freshBall(dir) {
    const s    = Settings.get();
    const spd  = s.ballSpeed;
    const angle = (Math.random() * 30 - 15) * (Math.PI/180);
    return {
      x:   GW / 2,
      y:   GH / 2 + (Math.random() * 80 - 40),
      dx:  Math.cos(angle) * spd * dir,
      dy:  Math.sin(angle) * spd,
      r:   s.ballSize,
      speed: spd,
    };
  }

  // ─── Main update (called each frame) ────────────────────
  function update(dt) {
    if (!state || state.phase !== 'playing') return;
    const s = Settings.get();

    updatePaddles(dt, s);
    updateBall(dt, s);
    updateParticles(dt);
    updateTrail();
  }

  // ─── Paddles ────────────────────────────────────────────
  function updatePaddles(dt, s) {
    const { p1, p2, H, ball, mode, aiLevel } = state;

    // P1 — hand controlled
    const p1y = Vision.getPaddleY('left', H);
    if (p1y !== null) {
      p1.targetY = p1y - state.PAD_H / 2;
    }
    // Smooth follow
    p1.y += (p1.targetY - p1.y) * 0.3;
    p1.y  = clamp(p1.y, 0, H - state.PAD_H);

    // P2 — hand (friend) or AI
    if (mode === 'friend') {
      const p2y = Vision.getPaddleY('right', H);
      if (p2y !== null) {
        p2.targetY = p2y - state.PAD_H / 2;
      }
      p2.y += (p2.targetY - p2.y) * 0.3;
      p2.y  = clamp(p2.y, 0, H - state.PAD_H);
    } else {
      const aiSpeed = AI_SPEEDS[aiLevel] || 4.2;
      const center  = p2.y + state.PAD_H / 2;
      const target  = ball.y;
      const diff    = target - center;

      // Add slight imperfection for non-insane levels
      const noise = aiLevel !== 'insane' ? (Math.random() - 0.5) * 6 : 0;
      const move  = Math.sign(diff) * Math.min(Math.abs(diff + noise), aiSpeed * dt);
      p2.y = clamp(p2.y + move, 0, H - state.PAD_H);
    }
  }

  // ─── Ball ───────────────────────────────────────────────
  function updateBall(dt, s) {
    const { ball, p1, p2, H, W } = state;

    ball.x += ball.dx * dt;
    ball.y += ball.dy * dt;

    // Top / bottom
    if (ball.y - ball.r <= 0) {
      ball.y  = ball.r;
      ball.dy = Math.abs(ball.dy);
      spawnHitParticles(ball.x, 0);
    }
    if (ball.y + ball.r >= H) {
      ball.y  = H - ball.r;
      ball.dy = -Math.abs(ball.dy);
      spawnHitParticles(ball.x, H);
    }

    // P1 paddle (left side: x = 28)
    const p1x = 28;
    if (ball.dx < 0 && ball.x - ball.r <= p1x + PAD_W && ball.x + ball.r >= p1x) {
      if (ball.y + ball.r >= p1.y && ball.y - ball.r <= p1.y + state.PAD_H) {
        ball.x = p1x + PAD_W + ball.r + 1;
        reflectOffPaddle(ball, p1, 1);
        spawnHitParticles(ball.x, ball.y, '#3bf5c0');
        state.rallyHits++;
      }
    }

    // P2 paddle (right side: x = W - 28 - PAD_W)
    const p2x = W - 28 - PAD_W;
    if (ball.dx > 0 && ball.x + ball.r >= p2x && ball.x - ball.r <= p2x + PAD_W) {
      if (ball.y + ball.r >= p2.y && ball.y - ball.r <= p2.y + state.PAD_H) {
        ball.x = p2x - ball.r - 1;
        reflectOffPaddle(ball, p2, -1);
        spawnHitParticles(ball.x, ball.y, '#f53b7e');
        state.rallyHits++;
      }
    }

    // Scored
    if (ball.x + ball.r < 0) {
      triggerScore('p2');
    } else if (ball.x - ball.r > W) {
      triggerScore('p1');
    }
  }

  function reflectOffPaddle(ball, paddle, dirX) {
    const relHit  = (ball.y - (paddle.y + state.PAD_H / 2)) / (state.PAD_H / 2);
    const maxBounce = 55 * (Math.PI / 180);
    const angle   = relHit * maxBounce;

    // Speed increases slightly with each rally hit, capped
    const maxSpeed  = Settings.get('ballSpeed') * 1.6;
    const newSpeed  = Math.min(ball.speed * 1.04, maxSpeed);
    ball.speed      = newSpeed;

    ball.dx = Math.cos(angle) * newSpeed * dirX;
    ball.dy = Math.sin(angle) * newSpeed;
  }

  function triggerScore(scorer) {
    state[scorer].score++;
    state.lastScorer  = scorer;
    state.phase       = 'scored';
    state.scoredTimer = 90;
    state.trail       = [];
    state.rallyHits   = 0;

    spawnScoreParticles(scorer === 'p1' ? state.W : 0, state.H/2, scorer);

    const ws = Settings.get('winScore');
    if (state.p1.score >= ws || state.p2.score >= ws) {
      state.phase = 'over';
    }
  }

  function tickScored(dt) {
    if (state.phase !== 'scored') return;
    state.scoredTimer -= dt;
    updateParticles(dt);
    if (state.scoredTimer <= 0) {
      const dir = state.lastScorer === 'p1' ? -1 : 1;
      state.ball  = freshBall(dir);
      state.phase = 'playing';
    }
  }

  // ─── Trail ──────────────────────────────────────────────
  function updateTrail() {
    const { ball, trail } = state;
    const maxLen = Settings.get('trailLen');
    trail.push({ x: ball.x, y: ball.y });
    while (trail.length > maxLen) trail.shift();
  }

  // ─── Particles ──────────────────────────────────────────
  function updateParticles(dt) {
    state.particles = state.particles.filter(p => p.life > 0);
    for (const p of state.particles) {
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.12;
      p.vx   *= 0.96;
      p.life -= dt * 1.5;
    }
  }

  function spawnHitParticles(x, y, color = '#ffffff') {
    if (Settings.get('particles') === 'off') return;
    const count = Settings.get('particles') === 'high' ? 14 : 6;
    for (let i = 0; i < count; i++) {
      state.particles.push(mkParticle(x, y, color));
    }
  }

  function spawnScoreParticles(x, y, scorer) {
    if (Settings.get('particles') === 'off') return;
    const color = scorer === 'p1' ? '#3bf5c0' : '#f53b7e';
    const count = Settings.get('particles') === 'high' ? 40 : 15;
    for (let i = 0; i < count; i++) {
      state.particles.push(mkParticle(x, y, color));
    }
  }

  // ─── Utils ──────────────────────────────────────────────
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function getState()   { return state; }
  function setState(s)  { state = s; }
  function setPhase(p)  { if (state) state.phase = p; }
  function isPaused()   { return state && state.phase === 'paused'; }

  return { create, update, tickScored, getState, setPhase, spawnScoreParticles, GW, GH };

})();
