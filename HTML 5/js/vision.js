/* js/vision.js — Hand tracking via MediaPipe Hands */

const Vision = (() => {

  let handsDetector = null;
  let videoStream   = null;
  let running       = false;
  let onReadyCb     = null;

  // Smoothed positions (0..1, null = not detected)
  const raw      = { left: null, right: null };
  const smoothed = { left: null, right: null };

  // ─── PUBLIC: request camera, then init MP ───────────────
  async function requestCamera() {
    UI.showScreen('load');
    setStage('mediapipe', 'running');

    const vid = document.getElementById('camVideo');

    // Try to get camera
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      vid.srcObject = videoStream;
      await new Promise(res => { vid.onloadedmetadata = res; });
      await vid.play();
    } catch(e) {
      UI.showScreen('perm');
      const hint = document.getElementById('loadHint');
      if (hint) hint.textContent = '⚠ Camera denied: ' + e.message;
      return;
    }

    // Size cam canvas to match video
    const cc = document.getElementById('camCanvas');
    cc.width  = vid.videoWidth  || 640;
    cc.height = vid.videoHeight || 480;

    setStage('mediapipe', 'done');
    setProgress(30);

    await initMediaPipe();
  }

  // ─── INTERNAL: init MediaPipe ───────────────────────────
  async function initMediaPipe() {
    setStage('model', 'running');
    updateHint('Loading hand detection model…');

    // Wait up to 18s for Hands constructor
    let tries = 0;
    while (typeof Hands === 'undefined' && tries < 60) {
      await sleep(300);
      tries++;
    }

    if (typeof Hands === 'undefined') {
      // Try fallback CDN
      updateHint('Primary CDN failed, trying fallback…');
      try {
        await loadScript('https://unpkg.com/@mediapipe/hands@0.4.1646424915/hands.js');
        await sleep(1000);
      } catch(e) {}
    }

    if (typeof Hands === 'undefined') {
      updateHint('⚠ Failed to load MediaPipe. Refresh and try again.');
      return;
    }

    handsDetector = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });

    handsDetector.setOptions({
      maxNumHands:            2,
      modelComplexity:        1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence:  0.55,
    });

    handsDetector.onResults(onHandResults);

    setStage('model', 'done');
    setProgress(65);

    // Warm up
    setStage('warmup', 'running');
    updateHint('Warming up (first frame takes longer)…');

    const vid = document.getElementById('camVideo');
    try {
      await handsDetector.send({ image: vid });
    } catch(e) {}

    setStage('warmup', 'done');
    setProgress(100);
    updateHint('Ready! Starting game…');

    await sleep(400);

    // Signal ready
    if (onReadyCb) onReadyCb();
  }

  // ─── INTERNAL: MediaPipe callback ───────────────────────
  function onHandResults(results) {
    const vid    = document.getElementById('camVideo');
    const canvas = document.getElementById('camCanvas');
    const ctx    = canvas.getContext('2d');

    canvas.width  = vid.videoWidth  || 640;
    canvas.height = vid.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset detections
    raw.left  = null;
    raw.right = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const lm   = results.multiHandLandmarks[i];
        const hand = results.multiHandedness[i].label; // 'Left'|'Right' in MP space
        // Camera is mirrored → swap left/right
        const side = hand === 'Left' ? 'right' : 'left';

        // Use average of wrist(0) + index knuckle(5) + pinky knuckle(17) for stability
        const yAvg = (lm[0].y + lm[5].y + lm[17].y) / 3;
        raw[side]  = yAvg;

        drawSkeleton(ctx, lm, canvas.width, canvas.height, side);
      }
    }

    // Smooth
    const s = Settings.get('smoothing');
    ['left','right'].forEach(side => {
      if (raw[side] !== null) {
        if (smoothed[side] === null) smoothed[side] = raw[side];
        else smoothed[side] += (raw[side] - smoothed[side]) * (1 - s);
      } else {
        smoothed[side] = null;
      }
    });

    // Update debug UI
    updateDebugUI();
  }

  // ─── Draw skeleton overlay ──────────────────────────────
  function drawSkeleton(ctx, lm, w, h, side) {
    const color = side === 'left' ? '#3bf5c0' : '#f53b7e';
    const CONNS = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12],
      [9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20],[0,17]
    ];

    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.8;
    for (const [a, b] of CONNS) {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
      ctx.stroke();
    }

    ctx.fillStyle   = color;
    ctx.globalAlpha = 1;
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wrist highlight
    ctx.beginPath();
    ctx.arc(lm[0].x * w, lm[0].y * h, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ─── Debug position bars ────────────────────────────────
  function updateDebugUI() {
    ['left','right'].forEach(side => {
      const row  = document.getElementById(`hd-${side}`);
      const bar  = document.getElementById(`hdb-${side}`);
      const val  = document.getElementById(`hdv-${side}`);
      const dot  = document.getElementById(`hdot-p${side === 'left' ? '1' : '2'}`);

      if (!row) return;
      const y = smoothed[side];
      if (y !== null) {
        row.classList.add('active');
        if (bar) bar.style.width = (y * 100).toFixed(0) + '%';
        if (val) val.textContent = (y * 100).toFixed(0);
        if (dot) dot.classList.add('detected');
      } else {
        row.classList.remove('active');
        if (bar) bar.style.width = '50%';
        if (val) val.textContent = '--';
        if (dot) dot.classList.remove('detected');
      }
    });
  }

  // ─── Get paddle target Y (0..gameHeight) ────────────────
  // Returns null if hand not detected
  function getPaddleY(side, gameHeight) {
    const y = smoothed[side];
    if (y === null) return null;

    const s  = Settings.get('sensitivity');  // 0.3 - 1.0
    const dz = Settings.get('deadZone');     // top dead zone fraction

    // Map y through dead zone and sensitivity
    // sensitivity < 1 means the mapping is compressed to center range
    // e.g. sensitivity=0.75 means hand needs to occupy middle 75% of frame
    const margin = (1 - s) / 2;
    const yNorm  = Math.max(0, Math.min(1, (y - margin) / s));

    // Dead zone at top: ignore top dz% of frame
    const yAdj  = Math.max(0, Math.min(1, (yNorm - dz) / (1 - dz)));

    return yAdj * gameHeight;
  }

  // ─── Vision loop ────────────────────────────────────────
  async function startLoop() {
    running = true;
    const vid = document.getElementById('camVideo');
    const loop = async () => {
      if (!running) return;
      if (vid.readyState >= 2 && handsDetector) {
        try { await handsDetector.send({ image: vid }); } catch(e) {}
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  function stopLoop() {
    running = false;
  }

  function stopCamera() {
    stopLoop();
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
    }
    raw.left = raw.right = null;
    smoothed.left = smoothed.right = null;
    handsDetector = null;
  }

  // ─── Utilities ──────────────────────────────────────────
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function setStage(id, state) {
    const el = document.getElementById(`ls-${id}`);
    if (!el) return;
    el.className = `load-stage ${state}`;
    const st = document.getElementById(`lss-${id}`);
    if (st) st.textContent = state === 'running' ? 'loading…' : state === 'done' ? '✓ done' : 'waiting…';
  }

  function setProgress(pct) {
    const bar = document.getElementById('loadBarFill');
    if (bar) bar.style.width = pct + '%';
  }

  function updateHint(text) {
    const el = document.getElementById('loadHint');
    if (el) el.textContent = text;
  }

  function onReady(cb) { onReadyCb = cb; }

  return { requestCamera, startLoop, stopLoop, stopCamera, getPaddleY, onReady, get smoothed() { return smoothed; } };

})();
