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

let lastCustomExpression = functionInput.value.trim();

function formatNumber(value, digits = 6) {
  if (!Number.isFinite(value)) return 'NaN';
  if (Math.abs(value) < 1e-12) return '0';
  if (Math.abs(value) >= 1e5 || Math.abs(value) < 1e-4) {
    return value.toExponential(3);
  }
  return Number(value.toFixed(digits)).toString();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getExpressionFromUI() {
  if (signalSelect.value === 'custom') {
    return functionInput.value.trim();
  }
  return PRESET_EXPRESSIONS[signalSelect.value] || functionInput.value.trim();
}

function setExpressionForPreset(preset) {
  if (preset in PRESET_EXPRESSIONS) {
    functionInput.value = PRESET_EXPRESSIONS[preset];
  }
}

function buildMathEvaluator(expression, variableName = 'x') {
  const normalized = String(expression)
    .replaceAll('^', '**')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/gi, 'Math.E');

  const replacements = {
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
  for (const [name, replacement] of Object.entries(replacements)) {
    safe = safe.replace(new RegExp(`\\b${name}\\b`, 'g'), replacement);
  }

  // eslint-disable-next-line no-new-func
  return new Function(variableName, `const pi = Math.PI; const e = Math.E; return (${safe});`);
}

function parseBoundExpression(raw) {
  const text = String(raw).trim();
  if (!text) {
    throw new Error('Bounds cannot be empty.');
  }

  const fn = buildMathEvaluator(text, '_');
  const value = fn(0);
  if (!Number.isFinite(value)) {
    throw new Error(`Could not evaluate bound: ${text}`);
  }
  return value;
}

function trapezoidFourierCoefficients(expression, lower, upper, harmonics, integrationSamples = 4096) {
  const T = upper - lower;
  const dx = T / integrationSamples;
  const fn = buildMathEvaluator(expression, 'x');

  const an = new Array(harmonics).fill(0);
  const bn = new Array(harmonics).fill(0);
  let a0Integral = 0;

  for (let i = 0; i <= integrationSamples; i++) {
    const x = lower + i * dx;
    const weight = i === 0 || i === integrationSamples ? 0.5 : 1;
    const y = fn(x);

    if (!Number.isFinite(y)) {
      throw new Error(`Function returned a non-finite value at x = ${formatNumber(x, 4)}.`);
    }

    a0Integral += weight * y;

    for (let n = 1; n <= harmonics; n++) {
      const angle = (2 * Math.PI * n * (x - lower)) / T;
      an[n - 1] += weight * y * Math.cos(angle);
      bn[n - 1] += weight * y * Math.sin(angle);
    }
  }

  const scale = (2 / T) * dx;
  return {
    a0: a0Integral * scale,
    an: an.map((value) => value * scale),
    bn: bn.map((value) => value * scale),
    T
  };
}

function evaluateFourierSeries(x, lower, coefficients, harmonics) {
  const { a0, an, bn, T } = coefficients;
  let result = a0 / 2;

  for (let n = 1; n <= harmonics; n++) {
    const angle = (2 * Math.PI * n * (x - lower)) / T;
    result += an[n - 1] * Math.cos(angle) + bn[n - 1] * Math.sin(angle);
  }

  return result;
}

function rootMeanSquareError(a, b) {
  if (!a.length || a.length !== b.length) return NaN;
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    total += diff * diff;
  }
  return Math.sqrt(total / a.length);
}

function meanAbsoluteError(a, b) {
  if (!a.length || a.length !== b.length) return NaN;
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    total += Math.abs(a[i] - b[i]);
  }
  return total / a.length;
}

function drawAxes(ctx, width, height, padding, xMin, xMax, yMin, yMax, xLabel, yLabel) {
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  const xZero = (0 - xMin) / (xMax - xMin);
  const yZero = (0 - yMin) / (yMax - yMin);

  const xAxisY = Number.isFinite(yZero) && yZero >= 0 && yZero <= 1
    ? height - padding - yZero * plotHeight
    : height - padding;

  const yAxisX = Number.isFinite(xZero) && xZero >= 0 && xZero <= 1
    ? padding + xZero * plotWidth
    : padding;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.fillStyle = 'rgba(237,241,255,0.78)';
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
    const value = xMin + (i / tickCount) * (xMax - xMin);
    ctx.beginPath();
    ctx.moveTo(x, xAxisY - 5);
    ctx.lineTo(x, xAxisY + 5);
    ctx.stroke();
    const label = formatNumber(value, 3);
    ctx.fillText(label, x - ctx.measureText(label).width / 2, xAxisY + 18);
  }

  for (let i = 0; i <= tickCount; i++) {
    const y = height - padding - (i / tickCount) * plotHeight;
    const value = yMin + (i / tickCount) * (yMax - yMin);
    ctx.beginPath();
    ctx.moveTo(yAxisX - 5, y);
    ctx.lineTo(yAxisX + 5, y);
    ctx.stroke();
    const label = formatNumber(value, 3);
    ctx.fillText(label, yAxisX - 10 - ctx.measureText(label).width, y + 4);
  }

  ctx.fillText(xLabel, width - padding - 20, xAxisY - 10);
  ctx.fillText(yLabel, yAxisX + 10, padding + 14);
  ctx.restore();
}

function drawSignalPlot(original, reconstruction, lower, upper) {
  const ctx = signalCtx;
  const width = signalCanvas.width;
  const height = signalCanvas.height;
  const padding = 48;

  ctx.clearRect(0, 0, width, height);

  const values = original.concat(reconstruction, [0]);
  let yMin = Math.min(...values);
  let yMax = Math.max(...values);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  } else {
    const margin = (yMax - yMin) * 0.12;
    yMin -= margin;
    yMax += margin;
  }

  drawAxes(ctx, width, height, padding, lower, upper, yMin, yMax, 'x', 'f(x)');

  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  const toX = (i) => padding + (i / (original.length - 1)) * plotWidth;
  const toY = (value) => height - padding - ((value - yMin) / (yMax - yMin)) * plotHeight;

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#7aa2ff';
  ctx.beginPath();
  original.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = '#7df0c7';
  ctx.beginPath();
  reconstruction.forEach((value, index) => {
    const x = toX(index);
    const y = toY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#7aa2ff';
  ctx.fillRect(width - 248, 18, 12, 12);
  ctx.fillStyle = '#edf1ff';
  ctx.font = '14px sans-serif';
  ctx.fillText('Original', width - 228, 29);

  ctx.fillStyle = '#7df0c7';
  ctx.fillRect(width - 158, 18, 12, 12);
  ctx.fillStyle = '#edf1ff';
  ctx.fillText('Reconstruction', width - 138, 29);
}

function drawSpectrum(coefficients, keptHarmonics) {
  const ctx = spectrumCtx;
  const width = spectrumCanvas.width;
  const height = spectrumCanvas.height;
  const padding = 48;

  ctx.clearRect(0, 0, width, height);

  const bars = [{ n: 0, mag: Math.abs(coefficients.a0 / 2) }];
  for (let n = 1; n <= coefficients.an.length; n++) {
    bars.push({ n, mag: Math.hypot(coefficients.an[n - 1], coefficients.bn[n - 1]) });
  }

  let yMax = Math.max(...bars.map((bar) => bar.mag), 1);
  if (yMax === 0) yMax = 1;

  const xMin = 0;
  const xMax = Math.max(bars.length - 1, 1);

  drawAxes(ctx, width, height, padding, xMin, xMax, 0, yMax, 'harmonic n', '|c_n|');

  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  const barWidth = plotWidth / bars.length;

  bars.forEach((bar, index) => {
    const barHeight = (bar.mag / yMax) * plotHeight;
    const x = padding + index * barWidth;
    const y = height - padding - barHeight;
    const isKept = bar.n <= keptHarmonics;

    ctx.fillStyle = isKept ? 'rgba(125, 240, 199, 0.9)' : 'rgba(122, 162, 255, 0.35)';
    ctx.fillRect(x + 2, y, Math.max(1, barWidth - 4), barHeight);
  });

  ctx.save();
  ctx.fillStyle = '#edf1ff';
  ctx.font = '14px sans-serif';
  ctx.fillText('Green bars are included in the reconstruction', padding, 24);
  ctx.restore();
}

function renderFormula(coefficients, harmonics, lower, upper) {
  const { a0, an, bn, T } = coefficients;
  const count = Math.min(harmonics, an.length);
  const pieces = [];

  for (let n = 1; n <= count; n++) {
    const cosPart = `${formatNumber(an[n - 1])} cos(2π${n}(x - ${formatNumber(lower, 4)})/${formatNumber(T, 4)})`;
    const sinPart = `${formatNumber(Math.abs(bn[n - 1]))} sin(2π${n}(x - ${formatNumber(lower, 4)})/${formatNumber(T, 4)})`;
    const sign = bn[n - 1] >= 0 ? '+' : '-';
    pieces.push(`<div><code>${escapeHtml(cosPart)} ${sign} ${escapeHtml(sinPart)}</code></div>`);
  }

  formulaOutput.innerHTML = `
    <div><code>f(x) = a<sub>0</sub>/2 + Σ<sub>n=1</sub><sup>${count}</sup> [a<sub>n</sub> cos(2πn(x - L)/T) + b<sub>n</sub> sin(2πn(x - L)/T)]</code></div>
    <div class="formula-detail"><code>a<sub>0</sub>/2 = ${formatNumber(a0 / 2)}</code></div>
    <div class="formula-detail">${pieces.length ? pieces.join('') : '<code>No harmonics selected.</code>'}</div>
  `;

  const lines = [
    `T = ${formatNumber(T)} on [${formatNumber(lower)}, ${formatNumber(upper)}]`,
    `a0 = ${formatNumber(a0)}`,
    ...an.slice(0, count).map((value, index) => `a${index + 1} = ${formatNumber(value)}`),
    ...bn.slice(0, count).map((value, index) => `b${index + 1} = ${formatNumber(value)}`)
  ];

  coeffOutput.innerHTML = `<code>${escapeHtml(lines.join('    '))}</code>`;
}

function updateStats(original, reconstruction, coefficients, harmonics, lower, upper) {
  const rmse = rootMeanSquareError(original, reconstruction);
  const mae = meanAbsoluteError(original, reconstruction);
  const count = Math.min(harmonics, coefficients.an.length);

  statsEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Harmonics kept</span>
      <div class="stat-value">${count} / ${coefficients.an.length}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">RMSE</span>
      <div class="stat-value">${formatNumber(rmse, 6)}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">MAE</span>
      <div class="stat-value">${formatNumber(mae, 6)}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">Interval</span>
      <div class="stat-value">[${formatNumber(lower)}, ${formatNumber(upper)}]</div>
    </div>
  `;
}

function setStatus(message, isError = false) {
  seriesStatus.textContent = message;
  seriesStatus.style.color = isError ? '#ffb4b4' : '#7df0c7';
}

function readBounds() {
  const lower = parseBoundExpression(lowerBoundInput.value);
  const upper = parseBoundExpression(upperBoundInput.value);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    throw new Error('Bounds must evaluate to finite numbers.');
  }
  return { lower, upper };
}

function render() {
  const sampleCount = Number(sampleSlider.value);
  const harmonics = Number(iterSlider.value);
  const expression = getExpressionFromUI();

  sampleValue.textContent = String(sampleCount);
  iterValue.textContent = String(harmonics);

  let lower;
  let upper;

  try {
    ({ lower, upper } = readBounds());
  } catch (error) {
    setStatus(error.message, true);
    statsEl.innerHTML = '';
    formulaOutput.innerHTML = `<code>${escapeHtml(error.message)}</code>`;
    coeffOutput.innerHTML = '';
    return;
  }

  if (upper <= lower) {
    setStatus('Upper bound must be greater than lower bound.', true);
    statsEl.innerHTML = '';
    formulaOutput.innerHTML = '<code>Invalid interval.</code>';
    coeffOutput.innerHTML = '';
    return;
  }

  if (!expression) {
    setStatus('Enter a function to continue.', true);
    statsEl.innerHTML = '';
    formulaOutput.innerHTML = '<code>Enter a function.</code>';
    coeffOutput.innerHTML = '';
    return;
  }

  try {
    const coefficients = trapezoidFourierCoefficients(expression, lower, upper, Math.max(harmonics, 1));
    const original = new Array(sampleCount);
    const reconstruction = new Array(sampleCount);
    const fn = buildMathEvaluator(expression, 'x');

    for (let i = 0; i < sampleCount; i++) {
      const x = lower + (i / (sampleCount - 1)) * (upper - lower);
      const y = fn(x);
      if (!Number.isFinite(y)) {
        throw new Error(`Function returned a non-finite value at x = ${formatNumber(x, 4)}.`);
      }
      original[i] = y;
      reconstruction[i] = evaluateFourierSeries(x, lower, coefficients, harmonics);
    }

    drawSignalPlot(original, reconstruction, lower, upper);
    drawSpectrum(coefficients, harmonics);
    renderFormula(coefficients, harmonics, lower, upper);
    updateStats(original, reconstruction, coefficients, harmonics, lower, upper);
    setStatus('Computed successfully.');
  } catch (error) {
    setStatus(error.message || 'Could not compute the series.', true);
    statsEl.innerHTML = '';
    formulaOutput.innerHTML = `<code>${escapeHtml(error.message || 'Could not compute the series.')}</code>`;
    coeffOutput.innerHTML = '';

    signalCtx.clearRect(0, 0, signalCanvas.width, signalCanvas.height);
    spectrumCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
    signalCtx.fillStyle = '#edf1ff';
    signalCtx.font = '16px sans-serif';
    signalCtx.fillText('Could not compute the series.', 40, 60);
  }
}

signalSelect.addEventListener('change', () => {
  if (signalSelect.value === 'custom') {
    functionInput.value = lastCustomExpression || functionInput.value;
  } else {
    setExpressionForPreset(signalSelect.value);
  }
  render();
});

functionInput.addEventListener('input', () => {
  if (signalSelect.value === 'custom') {
    lastCustomExpression = functionInput.value;
  }
  render();
});

lowerBoundInput.addEventListener('input', render);
upperBoundInput.addEventListener('input', render);
sampleSlider.addEventListener('input', render);
iterSlider.addEventListener('input', render);
recomputeBtn.addEventListener('click', render);
window.addEventListener('resize', render);

setExpressionForPreset(signalSelect.value);
render();
