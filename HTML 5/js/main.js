/* js/main.js — Entry point. Wires all modules together. */

const Main = (() => {

  let animFrame  = null;
  let lastTime   = 0;
  let fpsCounter = 0;
  let fpsTimer   = 0;
  let fps        = 0;
  let gameMode   = 'ai';

  // ─── Init on DOM ready ──────────────────────────────────
  function init() {
    Settings.load();
    Settings.applyToUI();
    Renderer.initMenuBg();

    // Wire vision → game start
    Vision.onReady(() => {
      beginGame();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('pauseOverlay');
        if (overlay && !overlay.classList.contains('hidden')) {
          togglePause();
        } else {
          const sp = document.getElementById('settingsPanel');
          if (sp && sp.classList.contains('open')) {
            UI.closeSettings();
          }
        }
      }
      if (e.key === ' ' || e.key === 'p') {
        const gs = Engine.getState();
        if (gs && (gs.phase === 'playing' || gs.phase === 'paused')) {
          togglePause();
        }
      }
    });
  }

  // ─── Begin game (after vision ready) ───────────────────
  function beginGame() {
    gameMode = Settings.get('gameMode');
    const aiLevel = Settings.get('aiLevel');

    UI.showScreen('game');
    UI.resetHUD();
    UI.setHUDNames('PLAYER 1', gameMode === 'friend' ? 'PLAYER 2' : 'AI');

    Renderer.init();

    Engine.create(gameMode, aiLevel);
    Engine.setPhase('countdown');

    Vision.startLoop();

    UI.countdown(3, () => {
      Engine.setPhase('playing');
      lastTime = performance.now();
      animFrame = requestAnimationFrame(loop);
    });
  }

  // ─── Main loop ──────────────────────────────────────────
  function loop(ts) {
    const raw = ts - lastTime;
    lastTime  = ts;
    // dt: capped to prevent spiral of death on tab switch
    const dt  = Math.min(raw / 16.667, 3.0);

    // FPS
    fpsCounter++;
    fpsTimer += raw;
    if (fpsTimer >= 1000) {
      fps = fpsCounter;
      fpsCounter = 0;
      fpsTimer   = 0;
      UI.updateFPS(fps);
    }

    const gs = Engine.getState();

    if (gs.phase === 'playing') {
      Engine.update(dt);
    } else if (gs.phase === 'scored') {
      Engine.tickScored(dt);
      if (gs.lastScorer) Renderer.triggerScoreFlash();
    }

    Renderer.draw(dt);
    UI.updateHUD(gs);

    if (gs.phase === 'over') {
      cancelAnimationFrame(animFrame);
      setTimeout(() => UI.showWin(gs, gameMode), 600);
      return;
    }

    if (gs.phase !== 'paused') {
      animFrame = requestAnimationFrame(loop);
    }
  }

  // ─── Pause ──────────────────────────────────────────────
  function togglePause() {
    const gs      = Engine.getState();
    if (!gs) return;
    const overlay = document.getElementById('pauseOverlay');
    const btn     = document.getElementById('pauseBtn');

    if (gs.phase === 'playing' || gs.phase === 'scored') {
      gs.phase = 'paused';
      overlay?.classList.remove('hidden');
      if (btn) btn.textContent = '▶';
    } else if (gs.phase === 'paused') {
      gs.phase = 'playing';
      overlay?.classList.add('hidden');
      if (btn) btn.textContent = '⏸';
      lastTime  = performance.now();
      animFrame = requestAnimationFrame(loop);
    }
  }

  // ─── Restart ────────────────────────────────────────────
  function restart() {
    cancelAnimationFrame(animFrame);
    const gs = Engine.getState();
    const mode    = gs ? gs.mode    : Settings.get('gameMode');
    const aiLevel = gs ? gs.aiLevel : Settings.get('aiLevel');

    Engine.create(mode, aiLevel);
    Engine.setPhase('countdown');

    UI.resetHUD();
    UI.showScreen('game');

    const overlay = document.getElementById('pauseOverlay');
    overlay?.classList.add('hidden');
    document.getElementById('pauseBtn').textContent = '⏸';

    Vision.startLoop();

    UI.countdown(3, () => {
      Engine.setPhase('playing');
      lastTime  = performance.now();
      animFrame = requestAnimationFrame(loop);
    });
  }

  // ─── Quit to menu ───────────────────────────────────────
  function quit() {
    cancelAnimationFrame(animFrame);
    Vision.stopCamera();
    const overlay = document.getElementById('pauseOverlay');
    overlay?.classList.add('hidden');
    document.getElementById('pauseBtn').textContent = '⏸';
    UI.showScreen('menu');
    Renderer.initMenuBg();
  }

  // ─── Boot ───────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { togglePause, restart, quit };

})();
