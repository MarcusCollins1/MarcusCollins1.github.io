const signalSelect = document.getElementById('signalType');
const sampleSlider = document.getElementById('sampleCount');
const sampleValue = document.getElementById('sampleCountValue');
const iterSlider = document.getElementById('iterationCount');
const iterValue = document.getElementById('iterationCountValue');
const recomputeBtn = document.getElementById('recomputeBtn');
const statsEl = document.getElementById('stats');

const signalCanvas = document.getElementById('signalCanvas');
const spectrumCanvas = document.getElementById('spectrumCanvas');
const signalCtx = signalCanvas.getContext('2d');
const spectrumCtx = spectrumCanvas.getContext('2d');

function generateSignal(type, n) {
  const data = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = (2 * Math.PI * i) / n;
    let y = 0;

    switch (type) {
      case 'sine':
        y = Math.sin(3 * x);
        break;
      case 'square':
        y = Math.sign(Math.sin(5 * x)) || 1;
        break;
      case 'sawtooth':
        y = 2 * (i / n) - 1;
        break;
      case 'composite':
      default:
        y = 0.8 * Math.sin(2 * x) + 0.35 * Math.sin(5 * x + 0.7) + 0.2 * Math.cos(9 * x);
        break;
    }

    data[i] = y;
  }
  return data;
}

function dft(signal) {
  const n = signal.length;
  const out = new Array(n);

  for (let k = 0; k < n; k++) {
    let re = 0;
    let im = 0;

    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      re += signal[t] * Math.cos(angle);
      im += signal[t] * Math.sin(angle);
    }

    out[k] = {
      re,
      im,
      mag: Math.hypot(re, im) / n,
      freq: k <= n / 2 ? k : k - n,
    };
  }

  return out.sort((a, b) => a.freq - b.freq);
}

function idftPartial(coeffs, iterations) {
  const n = coeffs.length;
  const result = new Array(n).fill(0);
  const limited = coeffs.filter((c) => Math.abs(c.freq) <= iterations);

  for (let t = 0; t < n; t++) {
    let sum = 0;
    for (const c of limited) {
      const angle = (2 * Math.PI * c.freq * t) / n;
      sum += c.re * Math.cos(angle) - c.im * Math.sin(angle);
    }
    result[t] = sum / n;
  }

  return result;
}

function meanAbsoluteError(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    total += Math.abs(a[i] - b[i]);
  }
  return total / a.length;
}

function rootMeanSquareError(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    total += diff * diff;
  }
  return Math.sqrt(total / a.length);
}

function drawAxes(ctx, width, height, padding) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height / 2);
  ctx.lineTo(width - padding, height / 2);
  ctx.stroke();
  ctx.restore();
}

function drawSignalPlot(original, reconstructed) {
  const ctx = signalCtx;
  const width = signalCanvas.width;
  const height = signalCanvas.height;
  const padding = 42;

  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height, padding);

  const allValues = original.concat(reconstructed);
  const min = Math.min(...allValues, -1);
  const max = Math.max(...allValues, 1);
  const range = max - min || 1;

  const toX = (i) => padding + (i / (original.length - 1)) * (width - 2 * padding);
  const toY = (v) => height - padding - ((v - min) / range) * (height - 2 * padding);

  ctx.lineWidth = 2.5;

  ctx.strokeStyle = '#7aa2ff';
  ctx.beginPath();
  original.forEach((v, i) => {
    const x = toX(i);
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = '#7df0c7';
  ctx.beginPath();
  reconstructed.forEach((v, i) => {
    const x = toX(i);
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#7aa2ff';
  ctx.fillRect(width - 250, 20, 12, 12);
  ctx.fillStyle = '#edf1ff';
  ctx.font = '14px sans-serif';
  ctx.fillText('Original', width - 230, 30);

  ctx.fillStyle = '#7df0c7';
  ctx.fillRect(width - 160, 20, 12, 12);
  ctx.fillStyle = '#edf1ff';
  ctx.fillText('Reconstruction', width - 140, 30);
}

function drawSpectrum(coeffs, iterations) {
  const ctx = spectrumCtx;
  const width = spectrumCanvas.width;
  const height = spectrumCanvas.height;
  const padding = 42;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  ctx.restore();

  const mags = coeffs.map((c) => c.mag);
  const maxMag = Math.max(...mags) || 1;
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  const barWidth = plotWidth / coeffs.length;

  coeffs.forEach((c, i) => {
    const barHeight = (c.mag / maxMag) * plotHeight;
    const x = padding + i * barWidth;
    const y = height - padding - barHeight;
    const withinIteration = Math.abs(c.freq) <= iterations;

    ctx.fillStyle = withinIteration ? 'rgba(125, 240, 199, 0.9)' : 'rgba(122, 162, 255, 0.35)';
    ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
  });

  ctx.fillStyle = '#edf1ff';
  ctx.font = '14px sans-serif';
  ctx.fillText('Kept harmonics are highlighted in green', padding, 24);
}

function updateStats(signal, reconstruction, coeffs, iterations) {
  const rmse = rootMeanSquareError(signal, reconstruction).toFixed(4);
  const mae = meanAbsoluteError(signal, reconstruction).toFixed(4);
  const kept = coeffs.filter((c) => Math.abs(c.freq) <= iterations).length;
  const total = coeffs.length;

  statsEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Harmonics kept</span>
      <div class="stat-value">${kept} / ${total}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">RMSE</span>
      <div class="stat-value">${rmse}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">MAE</span>
      <div class="stat-value">${mae}</div>
    </div>
  `;
}

function render() {
  const sampleCount = Number(sampleSlider.value);
  const iterations = Number(iterSlider.value);
  const type = signalSelect.value;

  sampleValue.textContent = String(sampleCount);
  iterValue.textContent = String(iterations);

  const signal = generateSignal(type, sampleCount);
  const coeffs = dft(signal);
  const reconstruction = idftPartial(coeffs, iterations);

  drawSignalPlot(signal, reconstruction);
  drawSpectrum(coeffs, iterations);
  updateStats(signal, reconstruction, coeffs, iterations);
}

sampleSlider.addEventListener('input', () => {
  const sampleCount = Number(sampleSlider.value);
  const maxIter = Math.max(1, Math.floor(sampleCount / 2));
  iterSlider.max = String(maxIter);
  if (Number(iterSlider.value) > maxIter) {
    iterSlider.value = String(Math.min(8, maxIter));
  }
  render();
});

iterSlider.addEventListener('input', render);
signalSelect.addEventListener('change', render);
recomputeBtn.addEventListener('click', render);
window.addEventListener('resize', render);

// Keep the iteration slider in range for the default sample size.
iterSlider.max = String(Math.floor(Number(sampleSlider.value) / 2));
render();