let stateChart = null;
const historyLength = 120;

function vectorNorm(vector) {
  let sum = 0;
  for (const value of vector) sum += value * value;
  return Math.sqrt(sum);
}

function initStateChart() {
  const context = document.getElementById("stateChart").getContext("2d");

  stateChart = new Chart(context, {
    type: "line",
    data: {
      labels: Array(historyLength).fill(""),
      datasets: [
        {
          label: "‖x[k]‖",
          data: Array(historyLength).fill(0),
          borderColor: "#2878d0",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.28
        },
        {
          label: "‖m[k]‖",
          data: Array(historyLength).fill(0),
          borderColor: "#1b9b65",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.28
        },
        {
          label: "‖q[k]‖",
          data: Array(historyLength).fill(0),
          borderColor: "#a65eb7",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.28
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            boxWidth: 8
          }
        }
      },
      scales: {
        x: { display: false },
        y: {
          beginAtZero: true,
          grid: { color: "#e3eaf1" },
          ticks: { maxTicksLimit: 5 }
        }
      }
    }
  });
}

function pushStateChart(x, m, q) {
  if (!stateChart) return;

  const values = [vectorNorm(x), vectorNorm(m), vectorNorm(q)];
  stateChart.data.datasets.forEach((dataset, index) => {
    dataset.data.push(values[index]);
    if (dataset.data.length > historyLength) dataset.data.shift();
  });
  stateChart.update("none");
}

function drawHeatmap(matrix) {
  const canvas = document.getElementById("heatmapCanvas");
  const width = Math.max(380, canvas.clientWidth);
  const cell = Math.floor(width / DIM);

  canvas.width = cell * DIM;
  canvas.height = cell * DIM;

  const context = canvas.getContext("2d");

  for (let row = 0; row < DIM; row += 1) {
    for (let col = 0; col < DIM; col += 1) {
      const value = Math.max(-1, Math.min(1, matrix[row * DIM + col]));
      let red;
      let green;
      let blue;

      if (value >= 0) {
        red = Math.round(238 - 198 * value);
        green = Math.round(243 - 123 * value);
        blue = Math.round(248 - 40 * value);
      } else {
        const magnitude = Math.abs(value);
        red = Math.round(238 - 34 * magnitude);
        green = Math.round(243 - 160 * magnitude);
        blue = Math.round(248 - 150 * magnitude);
      }

      context.fillStyle = `rgb(${red},${green},${blue})`;
      context.fillRect(col * cell, row * cell, cell - 2, cell - 2);
    }
  }
}

window.initStateChart = initStateChart;
window.pushStateChart = pushStateChart;
window.drawHeatmap = drawHeatmap;
