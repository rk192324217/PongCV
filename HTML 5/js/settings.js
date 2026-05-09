/* js/settings.js — Settings module, persists to localStorage */

const Settings = (() => {

  const DEFAULTS = {
    // Game
    gameMode:    'ai',
    aiLevel:     'medium',
    winScore:    10,
    // Ball
    ballSkin:    'classic',
    ballSpeed:   6,
    ballSize:    10,
    trailLen:    12,
    particles:   'high',
    // Paddle
    paddleH:     90,
    paddleGlow:  20,
    // Vision
    sensitivity: 0.75,
    deadZone:    0.10,
    smoothing:   0.25,
    // Renderer
    theme:       'dark',
  };

  const BALL_SKINS = [
    { id: 'classic',  label: 'Classic',  type: 'solid',  color: '#ffffff', emoji: null },
    { id: 'fire',     label: 'Fire',     type: 'emoji',  color: '#ff6b35', emoji: '🔥' },
    { id: 'ice',      label: 'Ice',      type: 'emoji',  color: '#88ccff', emoji: '🧊' },
    { id: 'disco',    label: 'Disco',    type: 'rainbow', color: null,     emoji: '✨' },
    { id: 'neon',     label: 'Neon',     type: 'solid',  color: '#39ff14', emoji: null },
    { id: 'skull',    label: 'Skull',    type: 'emoji',  color: '#aaaaaa', emoji: '💀' },
    { id: 'star',     label: 'Star',     type: 'emoji',  color: '#ffe600', emoji: '⭐' },
    { id: 'eyeball',  label: 'Eye',      type: 'emoji',  color: '#ffffff', emoji: '👁️' },
  ];

  let current = { ...DEFAULTS };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem('visionpong_settings') || '{}');
      current = { ...DEFAULTS, ...saved };
    } catch(e) {
      current = { ...DEFAULTS };
    }
    applyToUI();
  }

  function save() {
    try {
      localStorage.setItem('visionpong_settings', JSON.stringify(current));
    } catch(e) {}
  }

  function set(key, val) {
    current[key] = val;
    save();
  }

  function get(key) {
    return key ? current[key] : { ...current };
  }

  function reset() {
    current = { ...DEFAULTS };
    save();
    applyToUI();
  }

  function applyToUI() {
    // Sync all range inputs
    const map = {
      setBallSpeed:    ['ballSpeed',   v => v],
      setBallSize:     ['ballSize',    v => v+'px'],
      setPaddleH:      ['paddleH',     v => v+'px'],
      setPaddleGlow:   ['paddleGlow',  v => v],
      setSensitivity:  ['sensitivity', v => Math.round(v*100)+'%'],
      setDeadZone:     ['deadZone',    v => Math.round(v*100)+'%'],
      setSmoothing:    ['smoothing',   v => Math.round(v*100)+'%'],
      setWinScore:     ['winScore',    v => v],
      setTrail:        ['trailLen',    v => v],
    };
    for (const [inputId, [key, fmt]] of Object.entries(map)) {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = current[key];
        const valEl = document.getElementById(inputId + 'Val');
        if (valEl) valEl.textContent = fmt(current[key]);
      }
    }

    // Selects
    safeSet('setParticles', current.particles);
    safeSet('setTheme', current.theme);

    // Win score display
    const wsd = document.getElementById('winScoreDisplay');
    if (wsd) wsd.textContent = current.winScore;
    const wsv = document.getElementById('setWinScoreVal');
    if (wsv) wsv.textContent = current.winScore;

    // Render ball pickers
    renderBallPickers();
  }

  function safeSet(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function renderBallPickers() {
    ['ballPicker', 'spBallPicker'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '';
      BALL_SKINS.forEach(skin => {
        const btn = document.createElement('div');
        btn.className = 'ball-option' + (current.ballSkin === skin.id ? ' selected' : '');
        btn.title = skin.label;
        btn.onclick = () => {
          current.ballSkin = skin.id;
          save();
          document.querySelectorAll('.ball-option').forEach(b => b.classList.remove('selected'));
          document.querySelectorAll(`[data-skin="${skin.id}"]`).forEach(b => b.classList.add('selected'));
          btn.classList.add('selected');
          // Also deselect in the other picker
          renderBallPickers();
        };
        btn.setAttribute('data-skin', skin.id);

        if (skin.emoji) {
          btn.textContent = skin.emoji;
          btn.style.background = 'rgba(255,255,255,0.05)';
          btn.style.fontSize = '1.4rem';
        } else if (skin.type === 'rainbow') {
          btn.style.background = 'conic-gradient(red,orange,yellow,green,blue,violet,red)';
          btn.style.boxShadow = '0 0 8px rgba(255,255,255,0.3)';
        } else {
          btn.style.background = skin.color;
          btn.style.boxShadow = `0 0 10px ${skin.color}66`;
        }

        el.appendChild(btn);
      });
    });
  }

  function getSkinById(id) {
    return BALL_SKINS.find(s => s.id === id) || BALL_SKINS[0];
  }

  // Expose
  return { load, save, set, get, reset, applyToUI, getSkinById, BALL_SKINS };

})();
