const signalSelect = document.getElementById('signalType');
const functionInput = document.getElementById('functionInput');
const lowerBoundInput = document.getElementById('lowerBound');
const upperBoundInput = document.getElementById('upperBound');
const sampleSlider = document.getElementById('sampleCount');
const sampleValue = document.getElementById('sampleCountValue');
const iterSlider = document.getElementById('iterationCount');
const iterValue = document.getElementById('iterationCountValue');
const recomputeBtn = document.getElementById('recomputeBtn');
const statsEl = document.getElementById('stats');
const formulaOutput = document.getElementById('formulaOutput');
const coeffOutput = document.getElementById('coeffOutput');
const seriesStatus = document.getElementById('seriesStatus');

const signalCanvas = document.getElementById('signalCanvas');
const spectrumCanvas = document.getElementById('spectrumCanvas');
const signalCtx = signalCanvas.getContext('2d');
const spectrumCtx = spectrumCanvas.getContext('2d');

const PRESET_EXPRESSIONS = {
  sine: 'sin(2*pi*x)',
  square: 'sign(sin(5*pi*x))',
  sawtooth: '2*(x-floor(x)) - 1',
  composite: '0.8*sin(2*pi*x) + 0.35*sin(5*pi*x + 0.7) + 0.2*cos(9*pi*x)'
};

function formatNumber(value, digits = 6) {
  if (!Number.isFinite(value)) return 'NaN';
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs >= 1e5 || abs < 1e-4) return value.toExponential(3);
  return Number(value.toFixed(digits)).toString();
}

function formatSigned(value) {
  return value >= 0 ? `+ ${formatNumber(value)}` : `- ${formatNumber(Math.abs(value))}`;
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildFunctionEvaluator(expression) {
  const normalized = expression
    .replaceAll('^', '**')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/gi, 'Math.E');

  const allowed = {
    sin: 'Math.sin',
    cos: 'Math.cos',
    tan: 'Math.tan',
    asin: 'Math.asin',
    acos: 'Math.acos',
    atan: 'Math.atan',
    atan2: 'Math.atan2',
    abs: 'Math.abs',
    ceil: 'Math.ceil',
    floor: 'Math.floor',
    round: 'Math.round',
    max: 'Math.max',
    min: 'Math.min',
    pow: 'Math.pow',
    sqrt: 'Math.sqrt',
    log: 'Math.log',
    exp: 'Math.exp',
    sign: 'Math.sign',
    log10: 'Math.log10',
    log2: 'Math.log2',
    sinh: 'Math.sinh',
    cosh: 'Math.cosh',
    tanh: 'Math.tanh'
  };

  let safe = normalized;
  for (const [name, replacement] of Object.entries(allowed)) {
    safe = safe.replace(new RegExp(`\\b${name}\\b`, 'g'), replacement);
  }

  // eslint-disable-next-line no-new-func
  return new Function('x', `const pi = Math.PI; const e = Math.E; return (${safe});`);
}

function getActiveExpression() {
  const preset = signalSelect.value;
  if (preset !== 'custom') {
    return PRESET_EXPRESSIONS[preset];
  }
  return functionInput.value.trim();
}

function setPresetExpression(preset) {
  if (preset in PRESET_EXPRESSIONS) {
    functionInput.value = PRESET_EXPRESSIONS[preset];
  }
}

function evaluateFunctionAt(x, expression) {
  const fn = buildFunctionEvaluator(expression);
  const value = fn(x);
  if (!Number.isFinite(value)) {
    throw new Error('Function returned a non-finite value.');
  }
  return value;
}

function computeFourierCoefficients(expression, lower, upper, harmonics, integrationSamples = 4096) {
  const T = upper - lower;
  const dx = T / integrationSamples;
  const anAccum = new Array(harmonics).fill(0);
  const bnAccum = new Array(harmonics).fill(0);
  const fn = buildFunctionEvaluator(expression);

  let a0Sum = 0;
  for (let i = 0; i <= integrationSamples; i++) {
    const x = lower + i * dx;
    const weight = i === 0 || i === integrationSamples ? 0.5 : 1;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      throw new Error(`Function returned a non-finite value at x = ${formatNumber(x, 4)}.`);
    }

    a0Sum += weight * y;
    for (let n = 1; n <= harmonics; n++) {
      const angle = (2 * Math.PI * n * (x - lower)) / T;
      anAccum[n - 1] += weight * y * Math.cos(angle);
      bnAccum[n - 1] += weight * y * Math.sin(angle);
    }
  }

  const scale = (2 / T) * dx;
  const a0 = a0Sum * scale;
  const an = anAccum.map((value) => value * scale);
  const bn = bnAccum.map((value) => value * scale);

  return { a0, an, bn, T };
}

function evaluateSeries(x, lower, coefficients, harmonics) {
  const { a0, an, bn, T } = coefficients;
  let total = a0 / 2;
  const shiftedX = x - lower;

  for (let n = 1; n <= harmonics; n++) {
    const angle = (2 * Math.PI * n * shiftedX) / T;
    total += an[n - 1] * Math.cos(angle) + bn[n - 1] * Math.sin(angle);
  }

  return total;
}

function rootMeanSquareError(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    total += diff * diff;
  }
  return Math.sqrt(total / a.length);
}

function meanAbsoluteError(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    total += Math.abs(a[i] - b[i]);
  }
  return total / a.length;
}

function drawCartesianAxes(ctx, width, height, padding, xMin, xMax, yMin, yMax, xLabel, yLabel) {
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  const xAxisY = yMin <= 0 && yMax >= 0 ? height - padding - ((0 - yMin) / (yMax - yMin)) * plotHeight : height - padding;
  const yAxisX = xMin <= 0 && xMax >= 0 ? padding + ((0 - xMin) / (xMax - xMin)) * plotWidth : padding;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.fillStyle = 'rgba(237,241,255,0.7)';
  ctx.lineWidth = 1;
  ctx.font = '12px sans-serif';

  ctx.beginPath();
  ctx.moveTo(padding, xAxisY);
  ctx.lineTo(width - padding, xAxisY);
  ctx.moveTo(yAxisX, padding);
  ctx.lineTo(yAxisX, height - padding);
  ctx.stroke();

  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const x = padding + (i / tickCount) * plotWidth;
    const xValue = xMin + (i / tickCount) * (xMax - xMin);
    ctx.beginPath();
    ctx.moveTo(x, xAxisY - 5);
    ctx.lineTo(x, xAxisY + 5);
    ctx.stroke();
    const label = formatNumber(xValue, 3);
    ctx.fillText(label, x - ctx.measureText(label).width / 2, xAxisY + 20);
  }

  for (let i = 0; i <= tickCount; i++) {
    const y = height - padding - (i / tickCount) * plotHeight;
    const yValue = yMin + (i / tickCount) * (yMax - yMin);
    ctx.beginPath();
    ctx.moveTo(yAxisX - 5, y);
    ctx.lineTo(yAxisX + 5, y);
    ctx.stroke();
    const label = formatNumber(yValue, 3);
    ctx.fillText(label, yAxisX - 10 - ctx.measureText(label).width, y + 4);
  }

  ctx.fillText(xLabel, width - padding - 20, xAxisY - 8);
  ctx.fillText(yLabel, yAxisX + 10, padding + 14);
  ctx.restore();
}

function drawSignalPlot(original, reconstruction, lower, upper) {
  const ctx = signalCtx;
  const width = signalCanvas.width;
  const height = signalCanvas.height;
  const padding = 46;

  ctx.clearRect(0, 0, width, height);

  const allValues = original.concat(reconstruction, [0]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const pad = (max - min) * 0.1 || 1;
  const yMin = min - pad;
  const yMax = max + pad;

  drawCartesianAxes(ctx, width, height, padding, lower, upper, yMin, yMax, 'x', 'f(x)');

  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  const toX = (i) => padding + (i / (original.length - 1)) * plotWidth;
  const toY = (v) => height - padding - ((v - yMin) / (yMax - yMin)) * plotHeight;

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
  reconstruction.forEach((v, i) => {
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

function drawSpectrum(coeffs, harmonics) {
  const ctx = spectrumCtx;
  const width = spectrumCanvas.width;
  const height = spectrumCanvas.height;
  const padding = 46;

  ctx.clearRect(0, 0, width, height);
  const bars = [
    { n: 0, mag: Math.abs(coeffs.a0 / 2) },
    ...coeffs.an.map((value, index) => ({ n: index + 1, mag: Math.hypot(value, coeffs.bn[index]) }))
  ];
  const yMin = 0;
  const yMax = Math.max(...bars.map((c) => c.mag), 1);
  const xMin = 0;
  const xMax = Math.max(bars.length - 1, 1);

  drawCartesianAxes(ctx, width, height, padding, xMin, xMax, yMin, yMax, 'harmonic n', '|c_n|');

  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  const barWidth = plotWidth / bars.length;

  bars.forEach((c, i) => {
    const barHeight = (c.mag / yMax) * plotHeight;
    const x = padding + i * barWidth;
    const y = height - padding - barHeight;
    const kept = c.n <= harmonics;

    ctx.fillStyle = kept ? 'rgba(125, 240, 199, 0.9)' : 'rgba(122, 162, 255, 0.35)';
    ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
  });

  ctx.save();
  ctx.fillStyle = '#edf1ff';
  ctx.font = '14px sans-serif';
  ctx.fillText('Kept harmonics are highlighted in green', padding, 24);
  ctx.restore();
}

function renderFormula(coefficients, harmonics, lower, upper) {
  const { a0, an, bn, T } = coefficients;
  const keptTerms = Math.min(harmonics, an.length);
  const shifted = `x - ${formatNumber(lower, 4)}`;

  const seriesPieces = [];
  for (let n = 1; n <= keptTerms; n++) {
    const cosine = `${formatSigned(an[n - 1])} cos(2π·${n}(${shifted})/${formatNumber(T, 4)})`;
    const sine = `${formatSigned(bn[n - 1])} sin(2π·${n}(${shifted})/${formatNumber(T, 4)})`;
    seriesPieces.push(`${cosine} ${sine}`);
  }

  formulaOutput.innerHTML = `
    <div><code>f(x) ≈ a<sub>0</sub>/2 + Σ<sub>n=1</sub><sup>${keptTerms}</sup> [a<sub>n</sub> cos(2πn(${escapeHtml(shifted)})/T) + b<sub>n</sub> sin(2πn(${escapeHtml(shifted)})/T)]</code></div>
    <div class="formula-detail"><code>a<sub>0</sub>/2 = ${formatNumber(a0 / 2)}</code></div>
    ${seriesPieces.length ? `<div class="formula-detail"><code>${seriesPieces.join('<br>')}</code></div>` : ''}
  `;

  const coefficientLines = [
    `T = ${formatNumber(T)} on [${formatNumber(lower)}, ${formatNumber(upper)}]`,
    `a0 = ${formatNumber(a0)}`,
    ...an.slice(0, keptTerms).map((value, index) => `a${index + 1} = ${formatNumber(value)}`),
    ...bn.slice(0, keptTerms).map((value, index) => `b${index + 1} = ${formatNumber(value)}`)
  ];

  coeffOutput.innerHTML = `<code>${escapeHtml(coefficientLines.join('    '))}</code>`;
}

function updateStats(signal, reconstruction, coeffs, harmonics) {
  const rmse = rootMeanSquareError(signal, reconstruction).toFixed(6);
  const mae = meanAbsoluteError(signal, reconstruction).toFixed(6);
  const kept = Math.min(harmonics, coeffs.an.length);
  const total = coeffs.an.length;

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
    <div class="stat-card">
      <span class="stat-label">Interval</span>
      <div class="stat-value">[${formatNumber(Number(lowerBoundInput.value))}, ${formatNumber(Number(upperBoundInput.value))}]</div>
    </div>
  `;
}

function render() {
  const sampleCount = Number(sampleSlider.value);
  const harmonics = Number(iterSlider.value);
  const lower = Number(lowerBoundInput.value);
  const upper = Number(upperBoundInput.value);
  const expression = getActiveExpression();

  sampleValue.textContent = String(sampleCount);
  iterValue.textContent = String(harmonics);

  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) {
    seriesStatus.textContent = 'Upper bound must be greater than lower bound.';
    return;
  }

  let signal;
  let reconstruction;
  let coeffs;

  try {
    coeffs = computeFourierCoefficients(expression, lower, upper, Math.max(harmonics, 1));
    signal = new Array(sampleCount);
    reconstruction = new Array(sampleCount);

    const fn = buildFunctionEvaluator(expression);
    for (let i = 0; i < sampleCount; i++) {
      const x = lower + (i / (sampleCount - 1)) * (upper - lower);
      signal[i] = fn(x);
      reconstruction[i] = evaluateSeries(x, lower, coeffs, harmonics);
    }

    drawSignalPlot(signal, reconstruction, lower, upper);
    drawSpectrum(
      (() => {
        const spectrum = [];
        spectrum.push({ freq: 0, mag: Math.abs(coeffs.a0 / 2) });
        for (let n = 1; n <= coeffs.an.length; n++) {
          const mag = Math.hypot(coeffs.an[n - 1], coeffs.bn[n - 1]);
          spectrum.push({ freq: -n, mag });
          spectrum.push({ freq: n, mag });
        }
        spectrum.sort((a, b) => a.freq - b.freq);
        return spectrum;
      })(),
      harmonics
    );
    renderFormula(coeffs, harmonics, lower, upper);
    updateStats(signal, reconstruction, coeffs, harmonics);
    seriesStatus.textContent = 'Computed successfully.';
  } catch (error) {
    seriesStatus.textContent = error.message;
    statsEl.innerHTML = '';
    formulaOutput.innerHTML = `<code>${escapeHtml(error.message)}</code>`;
    coeffOutput.innerHTML = '';
    const ctx = signalCtx;
    ctx.clearRect(0, 0, signalCanvas.width, signalCanvas.height);
    ctx.fillStyle = '#edf1ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('Could not compute the series.', 40, 60);
  }
}

signalSelect.addEventListener('change', () => {
  setPresetExpression(signalSelect.value);
  render();
});
functionInput.addEventListener('input', render);
lowerBoundInput.addEventListener('input', render);
upperBoundInput.addEventListener('input', render);
sampleSlider.addEventListener('input', render);
iterSlider.addEventListener('input', render);
recomputeBtn.addEventListener('click', render);
window.addEventListener('resize', render);

setPresetExpression(signalSelect.value);
render();
