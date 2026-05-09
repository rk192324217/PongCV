/* js/renderer.js — All canvas rendering. Themes, ball skins, effects. */

const Renderer = (() => {

  let canvas = null;
  let ctx    = null;
  let discoHue = 0;
  let flashTimer = 0;

  // ─── Theme definitions ──────────────────────────────────
  const THEMES = {
    dark: {
      bg:         '#0c0c0f',
      grid:       'rgba(255,255,255,0.025)',
      midline:    'rgba(255,255,255,0.1)',
      p1:         '#3bf5c0',
      p2:         '#f53b7e',
      text:       'rgba(255,255,255,0.06)',
      flash:      'rgba(255,255,255,0.04)',
    },
    neon: {
      bg:         '#000408',
      grid:       'rgba(0,255,180,0.04)',
      midline:    'rgba(0,255,180,0.18)',
      p1:         '#00ffb4',
      p2:         '#ff00aa',
      text:       'rgba(0,255,180,0.07)',
      flash:      'rgba(0,255,180,0.06)',
    },
    glass: {
      bg:         '#0d1117',
      grid:       'rgba(120,160,255,0.04)',
      midline:    'rgba(120,160,255,0.15)',
      p1:         '#88aaff',
      p2:         '#ffaa88',
      text:       'rgba(120,160,255,0.07)',
      flash:      'rgba(120,160,255,0.05)',
    },
    retro: {
      bg:         '#0a0800',
      grid:       'rgba(255,180,0,0.04)',
      midline:    'rgba(255,180,0,0.2)',
      p1:         '#ffcc00',
      p2:         '#ff6600',
      text:       'rgba(255,180,0,0.07)',
      flash:      'rgba(255,180,0,0.06)',
    },
  };

  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx    = canvas.getContext('2d');
    canvas.width  = Engine.GW;
    canvas.height = Engine.GH;
    fitCanvas();
    window.addEventListener('resize', fitCanvas);
  }

  function fitCanvas() {
    if (!canvas) return;
    const wrap = document.getElementById('gameCanvasWrap');
    if (!wrap) return;
    const aw = wrap.clientWidth  - 32;
    const ah = wrap.clientHeight - 32;
    const s  = Math.min(aw / Engine.GW, ah / Engine.GH);
    canvas.style.width  = Math.floor(Engine.GW * s) + 'px';
    canvas.style.height = Math.floor(Engine.GH * s) + 'px';
    canvas.style.borderRadius = '8px';
  }

  // ─── Main draw ──────────────────────────────────────────
  function draw(dt) {
    if (!canvas) return;
    const gs = Engine.getState();
    if (!gs) return;

    const T = THEMES[Settings.get('theme')] || THEMES.dark;
    discoHue = (discoHue + dt * 2) % 360;
    if (flashTimer > 0) flashTimer -= dt;

    const W = gs.W, H = gs.H;

    // Background
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle CRT grain for retro theme
    if (Settings.get('theme') === 'retro') drawGrain(W, H);

    drawGrid(W, H, T);
    drawMidline(W, H, T);
    drawGhostScore(gs, W, H, T);
    drawTrail(gs, T);
    drawParticles(gs);
    drawBall(gs, T);
    drawPaddle(gs.p1.y, gs.PAD_H, 28, T.p1, gs.W, gs.H, 'left');
    drawPaddle(gs.p2.y, gs.PAD_H, W - 28 - gs.PAD_W, T.p2, gs.W, gs.H, 'right');

    if (gs.phase === 'scored') drawScoredFlash(gs, W, H, T);

    // No-hand warnings inside canvas
    drawHandWarnings(gs, W, H);

    // Score flash overlay
    if (flashTimer > 0) {
      ctx.fillStyle = T.flash;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ─── Grid ───────────────────────────────────────────────
  function drawGrid(W, H, T) {
    ctx.strokeStyle = T.grid;
    ctx.lineWidth   = 1;
    for (let x = 0; x <= W; x += 45) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 45) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  // ─── Midline ────────────────────────────────────────────
  function drawMidline(W, H, T) {
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = T.midline;
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ─── Ghost score (large, behind everything) ─────────────
  function drawGhostScore(gs, W, H, T) {
    ctx.font      = `bold ${H * 0.55}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle  = T.text;
    ctx.fillText(gs.p1.score, W * 0.25, H * 0.7);
    ctx.fillText(gs.p2.score, W * 0.75, H * 0.7);
  }

  // ─── Trail ──────────────────────────────────────────────
  function drawTrail(gs, T) {
    const { trail, ball } = gs;
    const skin = Settings.getSkinById(Settings.get('ballSkin'));
    const color = skin.type === 'rainbow' ? `hsl(${discoHue},100%,60%)` :
                  skin.type === 'solid'   ? skin.color : skin.color;

    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const p = (i + 1) / trail.length;
      ctx.globalAlpha = p * 0.45;
      ctx.fillStyle   = color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * p * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─── Ball ───────────────────────────────────────────────
  function drawBall(gs, T) {
    const { ball } = gs;
    const skin = Settings.getSkinById(Settings.get('ballSkin'));
    const color = skin.type === 'rainbow' ? `hsl(${discoHue},100%,60%)` : skin.color;

    if (skin.emoji) {
      // Emoji ball
      ctx.font      = `${ball.r * 2.4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(skin.emoji, ball.x, ball.y);
      ctx.textBaseline = 'alphabetic';
    } else {
      // Glow halo
      const grd = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r * 3.5);
      grd.addColorStop(0, color + '55');
      grd.addColorStop(1, color + '00');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Ball core
      ctx.shadowColor = color;
      ctx.shadowBlur  = Settings.get('paddleGlow');
      ctx.fillStyle   = color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      // Specular
      ctx.globalAlpha = 0.5;
      ctx.fillStyle   = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x - ball.r*0.3, ball.y - ball.r*0.3, ball.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
    }
  }

  // ─── Paddles ────────────────────────────────────────────
  function drawPaddle(y, h, x, color, W, H, side) {
    const glow = Settings.get('paddleGlow');

    // Glow behind
    ctx.shadowColor = color;
    ctx.shadowBlur  = glow;

    // Gradient fill
    const grad = ctx.createLinearGradient(x, y, x + Engine.getState().PAD_W, y + h);
    grad.addColorStop(0,   hexAlpha(color, 0.7));
    grad.addColorStop(0.4, color);
    grad.addColorStop(1,   hexAlpha(color, 0.7));
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(x, y, Engine.getState().PAD_W, h, 5);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Scan-line shimmer on paddle
    ctx.globalAlpha = 0.12;
    ctx.fillStyle   = '#fff';
    ctx.beginPath();
    ctx.roundRect(x, y, Engine.getState().PAD_W, h * 0.38, [5, 5, 0, 0]);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Edge line
    ctx.strokeStyle = hexAlpha(color, 0.5);
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, Engine.getState().PAD_W, h, 5);
    ctx.stroke();
  }

  // ─── Particles ──────────────────────────────────────────
  function drawParticles(gs) {
    for (const p of gs.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─── "POINT!" flash ─────────────────────────────────────
  function drawScoredFlash(gs, W, H, T) {
    const p    = Math.max(0, gs.scoredTimer / 90);
    const fade = Math.sin(p * Math.PI);
    ctx.globalAlpha = fade * 0.7;
    ctx.fillStyle   = gs.lastScorer === 'p1' ? '#3bf5c0' : '#f53b7e';
    ctx.font        = `bold ${H * 0.18}px 'Bebas Neue', sans-serif`;
    ctx.textAlign   = 'center';
    ctx.fillText('POINT', W / 2, H / 2 + H * 0.06);
    ctx.globalAlpha = 1;
  }

  // ─── Warnings ───────────────────────────────────────────
  function drawHandWarnings(gs, W, H) {
    const { left, right } = Vision.smoothed;
    const mode            = gs.mode;

    ctx.font        = `500 13px 'DM Mono', monospace`;
    ctx.globalAlpha = 0.55;

    if (left === null) {
      ctx.fillStyle = '#f5c23b';
      ctx.textAlign = 'left';
      ctx.fillText('✋  show left hand', 38, H - 18);
    }

    if (mode === 'friend' && right === null) {
      ctx.fillStyle = '#f5c23b';
      ctx.textAlign = 'right';
      ctx.fillText('show right hand  🤚', W - 38, H - 18);
    }

    ctx.globalAlpha = 1;
  }

  // ─── CRT grain ──────────────────────────────────────────
  function drawGrain(W, H) {
    const imageData = ctx.createImageData(W, H);
    const data      = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v    = Math.random() * 18;
      data[i]    = v;
      data[i+1]  = v * 0.9;
      data[i+2]  = 0;
      data[i+3]  = 10;
    }
    ctx.putImageData(imageData, 0, 0);

    // Scanline overlay
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < H; y += 2) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  // ─── Menu background animation ──────────────────────────
  let menuBalls = null;
  function initMenuBg() {
    const c = document.getElementById('bgCanvas');
    if (!c) return;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
    menuBalls = Array.from({length: 6}, () => ({
      x:  Math.random() * c.width,
      y:  Math.random() * c.height,
      dx: (Math.random() - 0.5) * 1.2,
      dy: (Math.random() - 0.5) * 1.2,
      r:  Math.random() * 60 + 20,
      hue: Math.random() * 360,
    }));
    animMenuBg();
  }

  function animMenuBg() {
    if (document.getElementById('screen-menu')?.classList.contains('active')) {
      drawMenuBg();
      requestAnimationFrame(animMenuBg);
    }
  }

  function drawMenuBg() {
    const c = document.getElementById('bgCanvas');
    if (!c) return;
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    if (!menuBalls) return;
    for (const b of menuBalls) {
      b.x += b.dx; b.y += b.dy;
      if (b.x < -b.r) b.x = c.width + b.r;
      if (b.x > c.width + b.r)  b.x = -b.r;
      if (b.y < -b.r) b.y = c.height + b.r;
      if (b.y > c.height + b.r) b.y = -b.r;
      b.hue = (b.hue + 0.3) % 360;

      const g = x.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, `hsla(${b.hue},80%,60%,0.07)`);
      g.addColorStop(1, `hsla(${b.hue},80%,60%,0)`);
      x.fillStyle = g;
      x.beginPath();
      x.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      x.fill();
    }
  }

  // ─── Confetti ───────────────────────────────────────────
  function spawnConfetti(container) {
    container.innerHTML = '';
    const colors = ['#3bf5c0','#f53b7e','#f5c23b','#ffffff','#88aaff'];
    for (let i = 0; i < 80; i++) {
      const d = document.createElement('div');
      Object.assign(d.style, {
        position: 'absolute',
        width:    (Math.random() * 8 + 4) + 'px',
        height:   (Math.random() * 4 + 2) + 'px',
        background: colors[Math.floor(Math.random()*colors.length)],
        left:     Math.random() * 100 + '%',
        top:      '-20px',
        borderRadius: '2px',
        animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.8}s forwards`,
        transform: `rotate(${Math.random()*360}deg)`,
      });
      container.appendChild(d);
    }
    // Inject keyframe if not present
    if (!document.getElementById('confettiStyle')) {
      const style = document.createElement('style');
      style.id = 'confettiStyle';
      style.textContent = `@keyframes confettiFall {
        to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }`;
      document.head.appendChild(style);
    }
  }

  function triggerScoreFlash() { flashTimer = 8; }

  // ─── Helpers ────────────────────────────────────────────
  function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return { init, draw, fitCanvas, initMenuBg, spawnConfetti, triggerScoreFlash };

})();
