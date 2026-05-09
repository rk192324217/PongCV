/* js/ui.js — Screen management, settings panel, countdown */

const UI = (() => {

  let currentScreen = 'menu';

  // ─── Screen transitions ─────────────────────────────────
  function showScreen(name) {
    const screens = {
      menu:   'screen-menu',
      perm:   'screen-perm',
      load:   'screen-load',
      game:   'screen-game',
      win:    'screen-win',
    };

    const oldEl = document.getElementById(`screen-${currentScreen}`);
    const newEl = document.getElementById(screens[name] ? `screen-${name}` : name);

    if (oldEl) {
      oldEl.classList.remove('active');
      oldEl.classList.add('exiting');
      setTimeout(() => oldEl.classList.remove('exiting'), 400);
    }

    if (newEl) {
      newEl.classList.add('active');
      currentScreen = name;
    }
  }

  // ─── Mode / difficulty ──────────────────────────────────
  function selectMode(mode, btn) {
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const diffRow    = document.getElementById('diff-row');
    const playersTip = document.getElementById('players-tip');

    if (mode === 'friend') {
      diffRow.classList.add('hidden');
      playersTip.classList.remove('hidden');
    } else {
      diffRow.classList.remove('hidden');
      playersTip.classList.add('hidden');
    }

    Settings.set('gameMode', mode);
  }

  function selectDiff(d, btn) {
    document.querySelectorAll('.diff-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Settings.set('aiLevel', d);
  }

  // ─── Camera / load flow ─────────────────────────────────
  function goToCamera() {
    showScreen('perm');
  }

  // ─── Countdown ──────────────────────────────────────────
  function countdown(from, callback) {
    const overlay = document.getElementById('countdownOverlay');
    const num     = document.getElementById('cdNum');
    if (!overlay) { callback(); return; }

    overlay.classList.remove('hidden');
    let current = from;

    const show = (n) => {
      if (n <= 0) {
        overlay.classList.add('hidden');
        callback();
        return;
      }
      num.textContent = n;
      num.style.animation = 'none';
      // Force reflow
      void num.offsetWidth;
      num.style.animation = 'cdAnim 0.9s ease-out';
      setTimeout(() => show(n - 1), 950);
    };

    show(current);
  }

  // ─── Settings panel ─────────────────────────────────────
  function openSettings() {
    Settings.applyToUI();
    document.getElementById('settingsPanel').classList.add('open');
  }

  function closeSettings() {
    document.getElementById('settingsPanel').classList.remove('open');
    // If in game, apply changed paddle height
    const gs = Engine.getState();
    if (gs) gs.PAD_H = Settings.get('paddleH');
  }

  // ─── HUD updates ────────────────────────────────────────
  let prevP1 = 0, prevP2 = 0;

  function updateHUD(gs) {
    if (!gs) return;

    // Scores
    const s1 = document.getElementById('hudScoreP1');
    const s2 = document.getElementById('hudScoreP2');
    if (s1 && gs.p1.score !== prevP1) {
      s1.textContent = gs.p1.score;
      s1.classList.add('bump');
      setTimeout(() => s1.classList.remove('bump'), 300);
      prevP1 = gs.p1.score;
    }
    if (s2 && gs.p2.score !== prevP2) {
      s2.textContent = gs.p2.score;
      s2.classList.add('bump');
      setTimeout(() => s2.classList.remove('bump'), 300);
      prevP2 = gs.p2.score;
    }
  }

  function resetHUD() {
    prevP1 = 0; prevP2 = 0;
    const s1 = document.getElementById('hudScoreP1');
    const s2 = document.getElementById('hudScoreP2');
    if (s1) s1.textContent = '0';
    if (s2) s2.textContent = '0';
  }

  function setHUDNames(p1, p2) {
    const n1 = document.getElementById('hudP1Name');
    const n2 = document.getElementById('hudP2Name');
    if (n1) n1.textContent = p1;
    if (n2) n2.textContent = p2;
  }

  function updateFPS(fps) {
    const el = document.getElementById('hudFps');
    if (el) el.textContent = fps + ' fps';
  }

  // ─── Win screen ─────────────────────────────────────────
  function showWin(gs, mode) {
    const p1Wins      = gs.p1.score >= Settings.get('winScore');
    const winnerName  = p1Wins ? 'PLAYER 1' : (mode === 'friend' ? 'PLAYER 2' : 'AI');
    const pClass      = p1Wins ? 'p1' : 'p2';

    document.getElementById('winPlayerName').textContent = winnerName;
    document.getElementById('winPlayerName').className   = `win-player-name ${pClass}`;
    document.getElementById('wsbS1').textContent  = gs.p1.score;
    document.getElementById('wsbS2').textContent  = gs.p2.score;
    document.getElementById('wsbP1Name').textContent = 'P1';
    document.getElementById('wsbP2Name').textContent  = mode === 'friend' ? 'P2' : 'AI';

    Renderer.spawnConfetti(document.getElementById('winConfetti'));
    showScreen('win');
  }

  return {
    showScreen, selectMode, selectDiff, goToCamera,
    countdown, openSettings, closeSettings,
    updateHUD, resetHUD, setHUDNames, updateFPS, showWin,
  };

})();
