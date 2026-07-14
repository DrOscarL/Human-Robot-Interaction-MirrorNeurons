/**
 * app.js — Application controller
 * - MediaPipe Hands setup
 * - Main animation loop
 * - UI controls + keyboard shortcuts
 * - Tab switching
 */

// ── State ─────────────────────────────────────────
let currentCameraIndex = 0;
let availableCameras   = [];
let cameraStream       = null;
let gestureCount       = 0;
let currentLandmarks   = null;
let loopId             = null;
let handsDetector      = null;

// ── Tab switching ─────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
}

// ── Status pill ────────────────────────────────────
function setStatus(text, state) {
  document.getElementById('statusText').textContent = text;
  const dot = document.getElementById('statusDot');
  dot.className = 'status-dot ' + (state || '');
}

// ── MediaPipe Hands ────────────────────────────────
async function initMediaPipe() {
  setStatus('Cargando MediaPipe…');

  handsDetector = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  handsDetector.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });

  handsDetector.onResults(onHandResults);

  await initCamera();
}

async function initCamera() {
  setStatus('Accediendo a cámara…');
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras = devices.filter(d => d.kind === 'videoinput');

    if (availableCameras.length === 0) {
      setStatus('Sin cámara', 'error');
      return;
    }

    const deviceId = availableCameras[currentCameraIndex]?.deviceId;
    const constraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
      audio: false
    };

    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('inputVideo');
    video.srcObject = cameraStream;
    await video.play();

    setStatus('Detectando…', 'live');
    startLoop(video);
  } catch (err) {
    console.error('Camera error:', err);
    setStatus('Error de cámara', 'error');
    // Run in demo mode without camera
    startDemoMode();
  }
}

// ── Detection loop ─────────────────────────────────
function startLoop(video) {
  if (loopId) cancelAnimationFrame(loopId);

  const overlayCanvas = document.getElementById('overlayCanvas');
  const overlayCtx    = overlayCanvas.getContext('2d');

  async function loop() {
    if (video.readyState >= 2) {
      overlayCanvas.width  = video.videoWidth  || 640;
      overlayCanvas.height = video.videoHeight || 480;
      await handsDetector.send({ image: video });
    }
    drawOverlay(overlayCtx, overlayCanvas.width, overlayCanvas.height);
    updateModel();
    loopId = requestAnimationFrame(loop);
  }
  loop();
}

// ── Demo mode (no camera) ─────────────────────────
function startDemoMode() {
  setStatus('Modo demo (sin cámara)', '');
  let t = 0;
  function demoLoop() {
    // Synthesize a slowly varying gesture
    t += 0.02;
    const fakeLM = Array.from({ length: 21 }, (_, i) => ({
      x: 0.5 + 0.15 * Math.sin(t + i * 0.3),
      y: 0.5 + 0.12 * Math.cos(t * 0.7 + i * 0.25),
      z: 0
    }));
    currentLandmarks = fakeLM;
    updateModel();
    loopId = requestAnimationFrame(demoLoop);
  }
  demoLoop();
}

// ── MediaPipe callback ─────────────────────────────
function onHandResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    currentLandmarks = results.multiHandLandmarks[0];
    gestureCount++;
    document.getElementById('gestureCount').textContent = gestureCount;
    setStatus('Mano detectada ✓', 'live');
  } else {
    currentLandmarks = null;
    setStatus('Buscando mano…', 'live');
  }
}

// ── Draw skeleton overlay on video ────────────────
function drawOverlay(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  if (!currentLandmarks) return;

  const lm = currentLandmarks;
  // Connections (MediaPipe hand skeleton)
  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];

  ctx.strokeStyle = 'rgba(0,229,255,0.7)';
  ctx.lineWidth = 2;
  for (const [a, b] of connections) {
    ctx.beginPath();
    ctx.moveTo(lm[a].x * W, lm[a].y * H);
    ctx.lineTo(lm[b].x * W, lm[b].y * H);
    ctx.stroke();
  }

  // Landmarks
  for (let i = 0; i < lm.length; i++) {
    const isFingerTip = [4, 8, 12, 16, 20].includes(i);
    ctx.fillStyle = isFingerTip ? '#ff6b9d' : '#00e5ff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = isFingerTip ? 8 : 4;
    ctx.beginPath();
    ctx.arc(lm[i].x * W, lm[i].y * H, isFingerTip ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ── Model update + rendering ───────────────────────
let frameCounter = 0;
function updateModel() {
  const result = model.step(currentLandmarks);
  const { x, m, q, errNorm } = result;

  // Avatar
  avatarRenderer.draw(Array.from(q).map(v => (v + 1) / 2));

  // Error display
  document.getElementById('errorNorm').textContent = errNorm.toFixed(3);

  // Vector bars (interaction tab)
  drawVectorBars('vecX', x, '#00e5ff');
  drawVectorBars('vecM', m.slice(0, 8), '#ff6b9d');
  drawVectorBars('vecQ', q.map(v => (v + 1) / 2), '#39ff85');

  // Charts (math tab, every 3 frames for perf)
  frameCounter++;
  if (frameCounter % 3 === 0) {
    pushToTimeSeries(x, m, q);
    pushToErrorChart(errNorm);
    drawHeatmap(model.W_SM, 16, 8);
  }
}

// ── UI Controls ───────────────────────────────────
function toggleLearning() {
  const isOn = model.toggleLearning();
  const btns = document.querySelectorAll('#btnLearn, .math-controls .ctrl-btn');

  // Update all learn buttons
  document.querySelectorAll('.ctrl-btn').forEach(b => {
    if (b.textContent.includes('Aprender') || b.textContent.includes('Aprendizaje')) {
      b.classList.toggle('learning-on', isOn);
    }
  });

  const chip = document.getElementById('learningChip');
  const stat = document.getElementById('learningStatus');
  stat.textContent = isOn ? 'ON' : 'OFF';
  chip.classList.toggle('on', isOn);
}

function cycleCamera() {
  if (availableCameras.length <= 1) return;
  currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
  initCamera();
}

function perturbMatrix() {
  model.perturb(0.6);
  setStatus('W_SM perturbada ⚡', 'live');
  setTimeout(() => setStatus('Detectando…', 'live'), 1500);
}

function resetModel() {
  model.reset();
  gestureCount = 0;
  document.getElementById('gestureCount').textContent = '0';
  document.getElementById('errorNorm').textContent = '0.000';
  document.getElementById('learningStatus').textContent = 'OFF';
  document.getElementById('learningChip').classList.remove('on');
  setStatus('Modelo reiniciado ↺', 'live');
}

function updateParam(name, value) {
  model.setParam(name, value);
  if (name === 'alpha') document.getElementById('alphaVal').textContent = parseFloat(value).toFixed(2);
  if (name === 'eta')   document.getElementById('etaVal').textContent   = parseFloat(value).toFixed(3);
}

// ── Keyboard shortcuts ─────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key.toUpperCase()) {
    case 'L': toggleLearning(); break;
    case 'P': perturbMatrix();  break;
    case 'R': resetModel();     break;
    case 'C': cycleCamera();    break;
    case 'TAB':
      e.preventDefault();
      const tabs = ['interaction', 'math'];
      const active = document.querySelector('.tab-btn.active').dataset.tab;
      const next = tabs[(tabs.indexOf(active) + 1) % tabs.length];
      switchTab(next);
      break;
  }
});

// ── Boot ───────────────────────────────────────────
window.addEventListener('load', () => {
  initCharts();
  initMediaPipe();
});
