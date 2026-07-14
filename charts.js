/**
 * charts.js — Real-time visualization layer
 * - Time series: x[k], m[k], q[k] (sampled mean)
 * - Heatmap: W_SM matrix
 * - Error chart: ‖m* - m‖ over time
 * - Vector bar charts for interaction tab
 */

const CHART_LEN = 100;

// ── Chart.js global defaults ─────────────────────
Chart.defaults.color = '#5a7a99';
Chart.defaults.borderColor = '#1e3048';
Chart.defaults.font.family = "'JetBrains Mono', monospace";
Chart.defaults.font.size = 10;

// ── Helper: make time-series dataset ─────────────
function makeDataset(label, color, data = []) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    pointRadius: 0,
    tension: 0.3,
  };
}

// ── Time Chart (tab: math) ────────────────────────
let timeChart;
function initTimeChart() {
  const ctx = document.getElementById('timeChart').getContext('2d');
  timeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(CHART_LEN).fill(''),
      datasets: [
        makeDataset('‖x‖', '#00e5ff', Array(CHART_LEN).fill(0)),
        makeDataset('‖m‖', '#ff6b9d', Array(CHART_LEN).fill(0)),
        makeDataset('‖q‖', '#39ff85', Array(CHART_LEN).fill(0)),
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 10, padding: 8 } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { display: false },
        y: {
          min: 0,
          grid: { color: '#1e3048' },
          ticks: { maxTicksLimit: 5 }
        }
      }
    }
  });
}

// ── Error Chart ────────────────────────────────────
let errorChart;
function initErrorChart() {
  const ctx = document.getElementById('errorChart').getContext('2d');
  errorChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(CHART_LEN).fill(''),
      datasets: [
        makeDataset('‖m* − m‖', '#ffb830', Array(CHART_LEN).fill(0))
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { display: false },
        y: {
          min: 0,
          grid: { color: '#1e3048' },
          ticks: { maxTicksLimit: 5 }
        }
      }
    }
  });
}

// ── Update time chart ─────────────────────────────
function pushToTimeSeries(x, m, q) {
  if (!timeChart) return;
  const norm = v => Math.sqrt(v.reduce((s, vi) => s + vi * vi, 0));

  const ds = timeChart.data.datasets;
  [ds[0].data, ds[1].data, ds[2].data].forEach((arr, i) => {
    arr.push([norm(x), norm(m), norm(q)][i]);
    if (arr.length > CHART_LEN) arr.shift();
  });
  timeChart.update('none');
}

function pushToErrorChart(errNorm) {
  if (!errorChart) return;
  const arr = errorChart.data.datasets[0].data;
  arr.push(errNorm);
  if (arr.length > CHART_LEN) arr.shift();
  errorChart.update('none');
}

// ── Heatmap: W_SM ────────────────────────────────
function drawHeatmap(W, rows, cols) {
  const canvas = document.getElementById('heatmapCanvas');
  if (!canvas) return;

  const cellW = Math.max(4, Math.floor(canvas.offsetWidth / cols));
  const cellH = Math.max(6, 12);
  canvas.width  = cols * cellW;
  canvas.height = rows * cellH;

  const ctx = canvas.getContext('2d');

  // Find range
  let mn = Infinity, mx = -Infinity;
  for (let v of W) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const range = Math.max(0.001, Math.max(Math.abs(mn), Math.abs(mx)));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = W[r * cols + c] / range; // [-1, 1]
      ctx.fillStyle = v > 0
        ? `rgba(255,107,157,${Math.abs(v) * 0.9 + 0.1})`
        : `rgba(0,229,255,${Math.abs(v) * 0.9 + 0.1})`;
      ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
    }
  }
}

// ── Vector bar mini-charts (interaction tab) ──────
function drawVectorBars(canvasId, vec, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 200;
  const H = 60;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = '#070b12';
  ctx.fillRect(0, 0, W, H);

  const n = vec.length;
  const barW = Math.floor(W / n) - 2;

  for (let i = 0; i < n; i++) {
    const v = Math.min(1, Math.max(0, vec[i]));
    const bh = v * (H - 8);
    const x = i * (barW + 2) + 2;

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, 4, barW, H - 8);

    // Value bar
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, H - 4 - bh, barW, bh);
    ctx.globalAlpha = 1;

    // Index label
    ctx.fillStyle = '#2a4a66';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(i, x + barW / 2, H - 1);
  }
}

// ── Init all charts ────────────────────────────────
function initCharts() {
  initTimeChart();
  initErrorChart();
}
