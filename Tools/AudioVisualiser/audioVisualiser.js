const startBtn = document.getElementById('startBtn');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let audioContext;
let analyser;
let dataArray;
let bufferLength;
let animationId;

function resizeCanvas() {
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

startBtn.addEventListener('click', async () => {
    try {
        statusEl.textContent = "Requesting microphone access...";

        audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });

        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);

        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        statusEl.textContent = "Microphone active";
        draw();
    } catch (err) {
        console.error(err);
        statusEl.textContent = "Microphone access denied or unavailable";
    }
});

function formatFrequencyLabel(hz) {
    if (hz >= 1000) {
        return `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)} kHz`;
    }
    return `${Math.round(hz)} Hz`;
}

function drawAxes(w, h, margin, sampleRate) {

    const plotLeft = margin;
    const plotRight = w - margin;
    const plotTop = margin;
    const plotBottom = h - margin;

    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    // ==============================
    // AXES
    // ==============================

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotTop);
    ctx.lineTo(plotLeft, plotBottom);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotBottom);
    ctx.lineTo(plotRight, plotBottom);
    ctx.stroke();

    // ==============================
    // AXIS LABELS
    // ==============================

    ctx.fillStyle = "#ffffff";
    ctx.font = "14px Arial";
    ctx.textBaseline = "alphabetic";

    // Y-axis title
    ctx.fillText("Amplitude (%)", 10, plotTop - 15);

    // X-axis title
    ctx.fillText("Frequency (Hz)", plotRight - 130, h - 10);

    // ==============================
    // GRID + SCALE LABELS
    // ==============================

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "12px Arial"
    
    // ==============================
    // Y-axis scale
    // ==============================

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const t = i / yTicks;

        const y = plotBottom - t * plotHeight;

        const value = Math.round(t * 100);

        // Tick mark
        ctx.beginPath();
        ctx.moveTo(plotLeft - 6, y);
        ctx.lineTo(plotLeft, y);
        ctx.stroke();

        // Label
        ctx.fillText(`${value}`, 12, y + 4);

        // Grid line
        if (i !== 0 && i !== yTicks) {
            ctx.beginPath();
            ctx.moveTo(plotLeft, y);
            ctx.lineTo(plotRight, y);
            ctx.stroke();
        }
    }

    // ==============================
    // X-axis scale
    // ==============================

    const maxFrequency = sampleRate / 2;
    const xTicks = 5;

    for (let i = 0; i <= xTicks; i++) {
        const t = i / xTicks;

        const x = plotLeft + t * plotWidth;

        const hz = maxFrequency * t;

        const label = formatFrequencyLabel(hz);

        // Tick mark
        ctx.beginPath();
        ctx.moveTo(x, plotBottom);
        ctx.lineTo(x, plotBottom + 6);
        ctx.stroke();

        // Label
        ctx.save();

        ctx.translate(x, plotBottom + 18);

        ctx.textAlign = 
            i === 0 ? "left" :
            i === xTicks ? "right" :
            "center";
        
        ctx.fillText(label, 0, 0);

        ctx.restore();

        // Grid line
        if (i !== 0 && i !== xTicks) {
            ctx.beginPath();
            ctx.moveTo(x, plotTop);
            ctx.lineTo(x, plotBottom);
            ctx.stroke();
        }
    }
}

function draw() {
    animationId = requestAnimationFrame(draw);

    if (!analyser || !dataArray) {
        return;
    }

    analyser.getByteFrequencyData(dataArray);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const sampleRate = audioContext?.sampleRate || 44100;

    ctx.clearRect(0, 0, w, h);

    const margin = 60;

    drawAxes(w, h, margin, sampleRate);

    const graphWidth = w - margin * 2;
    const graphHeight = h - margin * 2;

    const barWidth = graphWidth / bufferLength;

    for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] / 255;

        const barHeight = value * graphHeight;

        const x = margin + i * barWidth;
        const y = h - margin - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, h - margin);
        gradient.addColorStop(0, "#7c3aed");
        gradient.addColorStop(1, "#22d3ee");

        ctx.fillStyle = gradient;
        ctx.fillRect(
            x,
            y,
            barWidth - 2,
            barHeight
        );
    }
}
