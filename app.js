const video = document.getElementById("inputVideo");
const overlay = document.getElementById("overlayCanvas");
const overlayContext = overlay.getContext("2d");
const avatar = new AvatarRenderer(document.getElementById("avatarCanvas"));
const model = window.mirrorModel;

let faceMesh = null;
let cameraStream = null;
let cameras = [];
let cameraIndex = 0;
let processing = false;
let running = false;
let latestLandmarks = null;
let neutralBaseline = null;
let lastFrameTime = performance.now();
let frameSamples = [];
let chartCounter = 0;

let autonomyEnabled = false;
let autonomyPhase = 0;
let autonomousBlink = 0;
let autonomousBrow = 0;
let autonomousMouth = 0;
let autonomousLookX = 0;
let autonomousLookY = 0;
let lastAutonomousEvent = performance.now();


const FEATURE_CONFIG = FEATURE_NAMES.map((name, index) => ({
  name,
  index
}));

function setStatus(text, mode = "") {
  document.getElementById("statusText").textContent = text;
  document.getElementById("statusDot").className = `status-dot ${mode}`;
}

function distance(landmarks, a, b) {
  const dx = landmarks[a].x - landmarks[b].x;
  const dy = landmarks[a].y - landmarks[b].y;
  return Math.hypot(dx, dy);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function estimateSignals(landmarks) {
  const interocular = Math.max(0.001, distance(landmarks, 33, 263));

  const mouthOpenRaw = distance(landmarks, 13, 14) / interocular;
  const mouthWidthRaw = distance(landmarks, 61, 291) / interocular;

  const eyeLeftRaw = mean([
    distance(landmarks, 159, 145),
    distance(landmarks, 158, 153)
  ]) / interocular;

  const eyeRightRaw = mean([
    distance(landmarks, 386, 374),
    distance(landmarks, 385, 380)
  ]) / interocular;

  const browLeftRaw = mean([
    distance(landmarks, 70, 159),
    distance(landmarks, 63, 158),
    distance(landmarks, 105, 157)
  ]) / interocular;

  const browRightRaw = mean([
    distance(landmarks, 300, 386),
    distance(landmarks, 293, 385),
    distance(landmarks, 334, 384)
  ]) / interocular;

  const cornerY = (landmarks[61].y + landmarks[291].y) * 0.5;
  const mouthCenterY = (landmarks[13].y + landmarks[14].y) * 0.5;
  const smileLiftRaw = (mouthCenterY - cornerY) / interocular;

  const cheekRaw = mean([
    distance(landmarks, 116, 61),
    distance(landmarks, 345, 291)
  ]) / interocular;

  return {
    mouthOpenRaw,
    mouthWidthRaw,
    eyeLeftRaw,
    eyeRightRaw,
    browLeftRaw,
    browRightRaw,
    smileLiftRaw,
    cheekRaw
  };
}

function defaultBaseline(signals) {
  return {
    mouthOpenRaw: signals.mouthOpenRaw,
    mouthWidthRaw: signals.mouthWidthRaw,
    eyeLeftRaw: signals.eyeLeftRaw,
    eyeRightRaw: signals.eyeRightRaw,
    browLeftRaw: signals.browLeftRaw,
    browRightRaw: signals.browRightRaw,
    smileLiftRaw: signals.smileLiftRaw,
    cheekRaw: signals.cheekRaw
  };
}

function extractFeatures(landmarks) {
  const signals = estimateSignals(landmarks);

  if (!neutralBaseline) neutralBaseline = defaultBaseline(signals);
  const b = neutralBaseline;

  const mouthOpen = clamp01((signals.mouthOpenRaw - b.mouthOpenRaw) / 0.12);
  const smileWidth = clamp01((signals.mouthWidthRaw - b.mouthWidthRaw) / 0.16);
  const smileLift = clamp01((signals.smileLiftRaw - b.smileLiftRaw) / 0.055);
  const smile = clamp01(0.55 * smileWidth + 0.45 * smileLift);

  const frown = clamp01((b.smileLiftRaw - signals.smileLiftRaw) / 0.050);

  const eyeLeftRatio = signals.eyeLeftRaw / Math.max(0.001, b.eyeLeftRaw);
  const eyeRightRatio = signals.eyeRightRaw / Math.max(0.001, b.eyeRightRaw);
  const eyeRatio = 0.5 * (eyeLeftRatio + eyeRightRatio);

  const blink = clamp01((0.72 - eyeRatio) / 0.42);
  const eyeWide = clamp01((eyeRatio - 1.08) / 0.50);

  const browRatio = 0.5 * (
    signals.browLeftRaw / Math.max(0.001, b.browLeftRaw) +
    signals.browRightRaw / Math.max(0.001, b.browRightRaw)
  );
  const browUp = clamp01((browRatio - 1.04) / 0.35);
  const browDown = clamp01((0.96 - browRatio) / 0.28);

  const pucker = clamp01(
    (b.mouthWidthRaw - signals.mouthWidthRaw) / 0.15 +
    mouthOpen * 0.12
  );

  const cheek = clamp01(
    smile * 0.75 +
    clamp01((b.cheekRaw - signals.cheekRaw) / 0.08) * 0.25
  );

  return new Float32Array([
    smile,
    frown,
    blink,
    eyeWide,
    browUp,
    browDown,
    mouthOpen,
    pucker,
    cheek
  ]);
}

function estimatePose(landmarks) {
  const minX = Math.min(...landmarks.map(point => point.x));
  const maxX = Math.max(...landmarks.map(point => point.x));
  const minY = Math.min(...landmarks.map(point => point.y));
  const maxY = Math.max(...landmarks.map(point => point.y));

  const centerX = 0.5 * (minX + maxX);
  const centerY = 0.5 * (minY + maxY);

  return {
    x: Math.max(-1, Math.min(1, (centerX - 0.5) * 2.3)),
    y: Math.max(-1, Math.min(1, (centerY - 0.5) * 2.3))
  };
}

function resizeOverlay() {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  if (overlay.width !== width || overlay.height !== height) {
    overlay.width = width;
    overlay.height = height;
  }
}

function drawFaceOverlay(landmarks) {
  resizeOverlay();
  overlayContext.clearRect(0, 0, overlay.width, overlay.height);
  if (!landmarks) return;

  const paths = [
    [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
    [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 61],
    [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
    [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362]
  ];

  overlayContext.lineWidth = 1.5;
  overlayContext.strokeStyle = "rgba(70, 180, 240, 0.88)";

  for (const path of paths) {
    overlayContext.beginPath();
    path.forEach((index, position) => {
      const point = landmarks[index];
      const x = point.x * overlay.width;
      const y = point.y * overlay.height;
      if (position === 0) overlayContext.moveTo(x, y);
      else overlayContext.lineTo(x, y);
    });
    overlayContext.stroke();
  }

  overlayContext.fillStyle = "#f2f8fc";
  for (const index of [13, 14, 61, 291, 70, 300, 159, 145, 386, 374]) {
    const point = landmarks[index];
    overlayContext.beginPath();
    overlayContext.arc(point.x * overlay.width, point.y * overlay.height, 2.6, 0, Math.PI * 2);
    overlayContext.fill();
  }
}

function onResults(results) {
  latestLandmarks = results.multiFaceLandmarks?.[0] ?? null;

  if (latestLandmarks) {
    setStatus("Rostro detectado", "live");
    document.getElementById("faceState").textContent = "SÍ";
    document.getElementById("cameraHint").style.display = "none";
  } else {
    setStatus("Buscando rostro", "live");
    document.getElementById("faceState").textContent = "NO";
  }

  drawFaceOverlay(latestLandmarks);
}

async function initFaceMesh() {
  if (faceMesh) return;

  faceMesh = new FaceMesh({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.55,
    minTrackingConfidence: 0.55
  });

  faceMesh.onResults(onResults);
  await faceMesh.initialize();
}

async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  cameras = devices.filter(device => device.kind === "videoinput");
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Cámara no disponible", "error");
    alert("El navegador no permite acceso a cámara. Abra el sitio mediante HTTPS o localhost.");
    return;
  }

  try {
    setStatus("Inicializando MediaPipe");
    await initFaceMesh();
    await listCameras();

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    const selected = cameras[cameraIndex];
    const videoConstraints = selected?.deviceId
      ? {
          deviceId: { exact: selected.deviceId },
          width: { ideal: 960 },
          height: { ideal: 720 }
        }
      : {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 720 }
        };

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false
    });

    video.srcObject = cameraStream;
    await video.play();

    running = true;
    document.getElementById("startButton").textContent = "Cámara activa";
    document.getElementById("cameraHint").style.display = "none";
    setStatus("Cámara activa", "live");
    requestAnimationFrame(processLoop);
  } catch (error) {
    console.error(error);
    setStatus("Error de cámara", "error");
    document.getElementById("cameraHint").style.display = "block";
    document.getElementById("cameraHint").textContent =
      "No fue posible iniciar la cámara. Revise permisos y abra el sitio mediante HTTPS.";
  }
}

async function processLoop() {
  if (!running) return;

  if (video.readyState >= 2 && !processing) {
    processing = true;
    try {
      await faceMesh.send({ image: video });
    } catch (error) {
      console.error("Error de MediaPipe:", error);
      setStatus("Error de procesamiento", "error");
    } finally {
      processing = false;
    }
  }

  requestAnimationFrame(processLoop);
}


function applyAutonomousBehavior(output, pose, now) {
  if (!autonomyEnabled) return { output, pose };

  const elapsed = now - lastAutonomousEvent;

  // Cada cierto tiempo se genera una microconducta nueva.
  if (elapsed > 1800 + Math.random() * 2200) {
    lastAutonomousEvent = now;
    autonomyPhase = (autonomyPhase + 1) % 4;

    autonomousLookX = (Math.random() - 0.5) * 0.75;
    autonomousLookY = (Math.random() - 0.5) * 0.45;
    autonomousBlink = 1;
    autonomousBrow = Math.random() * 0.35;
    autonomousMouth = Math.random() * 0.16;
  }

  autonomousBlink *= 0.82;
  autonomousBrow *= 0.97;
  autonomousMouth *= 0.96;

  // Solo domina cuando no hay rostro. Con rostro, actúa como microcomportamiento.
  const faceWeight = latestLandmarks ? 0.18 : 0.72;

  const q = Float32Array.from(output.q);
  q[2] = clamp01(q[2] + autonomousBlink * faceWeight);
  q[4] = clamp01(q[4] + autonomousBrow * faceWeight);
  q[6] = clamp01(q[6] + autonomousMouth * faceWeight);

  const mixedPose = {
    x: pose.x * (1 - faceWeight) + autonomousLookX * faceWeight,
    y: pose.y * (1 - faceWeight) + autonomousLookY * faceWeight
  };

  return {
    output: { ...output, q },
    pose: mixedPose
  };
}

function updateSystem() {
  const now = performance.now();
  const delta = now - lastFrameTime;
  lastFrameTime = now;

  frameSamples.push(delta);
  if (frameSamples.length > 30) frameSamples.shift();
  const averageDelta = mean(frameSamples);
  const fps = averageDelta > 0 ? 1000 / averageDelta : 0;
  document.getElementById("fpsValue").textContent = fps.toFixed(0);

  let output;
  let pose = { x: 0, y: 0 };

  if (latestLandmarks) {
    const features = extractFeatures(latestLandmarks);
    output = model.step(features);
    pose = estimatePose(latestLandmarks);
  } else {
    output = model.decay();
  }

  const autonomous = applyAutonomousBehavior(output, pose, now);
  output = autonomous.output;
  pose = autonomous.pose;

  avatar.draw(output.q, pose);
  updateDisplays(output);

  chartCounter += 1;
  if (chartCounter % 4 === 0) {
    pushStateChart(output.x, output.m, output.q);
    pushTrainingChart(output.error, output.associationScore);
    drawHeatmap(model.W);
  }

  requestAnimationFrame(updateSystem);
}

function buildBars() {
  const container = document.getElementById("activationBars");
  const vectorContainers = {
    x: document.getElementById("vectorX"),
    m: document.getElementById("vectorM"),
    q: document.getElementById("vectorQ")
  };

  for (const feature of FEATURE_CONFIG) {
    const row = document.createElement("div");
    row.className = "activation-row";
    row.innerHTML = `
      <label>${feature.name}</label>
      <div class="bar-track"><div class="bar-fill" data-activation="${feature.index}"></div></div>
      <span class="activation-value" data-activation-value="${feature.index}">0.00</span>
    `;
    container.appendChild(row);

    for (const [vectorName, vectorContainer] of Object.entries(vectorContainers)) {
      const vectorRow = document.createElement("div");
      vectorRow.className = "vector-row";
      vectorRow.innerHTML = `
        <span>${feature.name}</span>
        <div class="vector-mini-track"><div class="vector-mini-fill" data-vector="${vectorName}-${feature.index}"></div></div>
        <span data-vector-value="${vectorName}-${feature.index}">0.00</span>
      `;
      vectorContainer.appendChild(vectorRow);
    }
  }
}

function updateDisplays(output) {
  document.getElementById("errorValue").textContent = output.error.toFixed(3);
  document.getElementById("learningState").textContent = model.learning ? "ON" : "OFF";
  document.getElementById("associationValue").textContent =
    output.associationScore.toFixed(3);
  document.getElementById("trainingProgress").textContent =
    `${(output.progress * 100).toFixed(0)} %`;
  document.getElementById("autonomyState").textContent =
    autonomyEnabled ? "ON" : "OFF";

  document.getElementById("mathError").textContent = output.error.toFixed(3);
  document.getElementById("mathAssociation").textContent =
    output.associationScore.toFixed(3);
  document.getElementById("trainingSteps").textContent =
    String(model.trainingSteps);

  output.x.forEach((value, index) => {
    const activationBar = document.querySelector(`[data-activation="${index}"]`);
    const activationValue = document.querySelector(`[data-activation-value="${index}"]`);
    activationBar.style.width = `${clamp01(value) * 100}%`;
    activationValue.textContent = value.toFixed(2);
  });

  const vectors = { x: output.x, m: output.m, q: output.q };
  for (const [name, vector] of Object.entries(vectors)) {
    vector.forEach((value, index) => {
      const fill = document.querySelector(`[data-vector="${name}-${index}"]`);
      const label = document.querySelector(`[data-vector-value="${name}-${index}"]`);
      fill.style.width = `${clamp01(value) * 100}%`;
      label.textContent = value.toFixed(2);
    });
  }
}

function toggleAutonomy() {
  autonomyEnabled = !autonomyEnabled;

  const button = document.getElementById("autonomyButton");
  button.textContent = `Autonomía: ${autonomyEnabled ? "ON" : "OFF"}`;
  button.classList.toggle("active", autonomyEnabled);

  document.getElementById("autonomyState").textContent =
    autonomyEnabled ? "ON" : "OFF";

  setStatus(
    autonomyEnabled ? "Comportamientos autónomos activos" : "Autonomía desactivada",
    "live"
  );
}

function switchTab(tab) {
  document.querySelectorAll(".tab-button").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  document.getElementById("interactionView").classList.toggle("active", tab === "interaction");
  document.getElementById("mathView").classList.toggle("active", tab === "math");

  if (tab === "math") {
    setTimeout(() => {
      stateChart?.resize();
      drawHeatmap(model.W);
      if (window.renderMathInElement) {
        renderMathInElement(document.getElementById("mathView"), {
          delimiters: [
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false }
          ]
        });
      }
    }, 80);
  }
}

function toggleLearning() {
  model.learning = !model.learning;
  document.getElementById("learningButton").textContent =
    `Aprendizaje: ${model.learning ? "ON" : "OFF"}`;
  document.getElementById("learningButton").classList.toggle("active", model.learning);
  document.getElementById("learningState").textContent = model.learning ? "ON" : "OFF";
}

async function cycleCamera() {
  await listCameras();
  if (cameras.length < 2) {
    setStatus("Solo se detectó una cámara", "live");
    return;
  }
  cameraIndex = (cameraIndex + 1) % cameras.length;
  await startCamera();
}

function calibrateNeutral() {
  if (!latestLandmarks) {
    setStatus("No hay rostro para calibrar", "error");
    return;
  }
  neutralBaseline = defaultBaseline(estimateSignals(latestLandmarks));
  setStatus("Rostro neutro calibrado", "live");
}

function resetModel() {
  model.reset();
  neutralBaseline = null;
  document.getElementById("learningButton").textContent = "Aprendizaje: OFF";
  document.getElementById("learningButton").classList.remove("active");
  drawHeatmap(model.W);
  setStatus("Modelo reiniciado", "live");
}

document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

document.getElementById("startButton").addEventListener("click", startCamera);
document.getElementById("cameraButton").addEventListener("click", cycleCamera);
document.getElementById("calibrateButton").addEventListener("click", calibrateNeutral);
document.getElementById("learningButton").addEventListener("click", toggleLearning);
document.getElementById("autonomyButton").addEventListener("click", toggleAutonomy);

document.getElementById("perturbButton").addEventListener("click", () => {
  model.perturb();
  drawHeatmap(model.W);
  setStatus("Matriz W perturbada", "live");
});

document.getElementById("resetButton").addEventListener("click", resetModel);

document.getElementById("alphaSlider").addEventListener("input", event => {
  model.alpha = Number(event.target.value);
  document.getElementById("alphaLabel").textContent = model.alpha.toFixed(2);
});

document.getElementById("etaSlider").addEventListener("input", event => {
  model.eta = Number(event.target.value);
  document.getElementById("etaLabel").textContent = model.eta.toFixed(3);
});

document.addEventListener("keydown", event => {
  if (event.target instanceof HTMLInputElement) return;

  switch (event.key.toLowerCase()) {
    case "tab": {
      event.preventDefault();
      const mathActive = document.getElementById("mathView").classList.contains("active");
      switchTab(mathActive ? "interaction" : "math");
      break;
    }
    case "l":
      toggleLearning();
      break;
    case "p":
      model.perturb();
      drawHeatmap(model.W);
      break;
    case "r":
      resetModel();
      break;
    case "c":
      cycleCamera();
      break;
    case "a":
      toggleAutonomy();
      break;
  }
});

window.addEventListener("load", () => {
  buildBars();
  initStateChart();
  initTrainingChart();
  drawHeatmap(model.W);
  avatar.draw(model.q, { x: 0, y: 0 });
  requestAnimationFrame(updateSystem);

  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ]
    });
  }
});
