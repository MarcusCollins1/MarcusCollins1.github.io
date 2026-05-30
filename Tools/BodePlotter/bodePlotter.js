const tfInput = document.getElementById("tfInput");
const wMinInput = document.getElementById("wMin");
const wMaxInput = document.getElementById("wMax");
const pointsInput = document.getElementById("points");
const plotBtn = document.getElementById("plotBtn");
const errorBox = document.getElementById("error");

function logSpace(min, max, points) {
    const values = [];
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);

    for (let i = 0; i < points; i++) {
        const t = i / (points - 1);
        values.push(Math.pow(10, logMin + t * (logMax - logMin)));
    }

    return values;
}

function unwrapPhase(phasesDeg) {
    if (phasesDeg.length === 0) return [];

    const unwrapped = [phasesDeg[0]];
    let offset = 0;

    for (let i = 1; i < phasesDeg.length; i++) {
        let delta = phasesDeg[i] - phasesDeg[i - 1];

        if (delta > 180) {
            offset -= 360;
        } else if (delta < -180) {
            offset += 360;
        }

        unwrapped.push(phasesDeg[i] + offset);
    }

    return unwrapped;
}

function formatError(err) {
    if (!err) return "Unknown error.";
    return err.message || String(err);
}

function evaluateTransferFunction(expression, w) {
    const s = math.complex(0, w);
    const scope = { s };
    return math.evaluate(expression, scope);
}

function plotBode() {
    errorBox.textContent = "";

    const expression = tfInput.value.trim();
    const wMin = Number(wMinInput.value);
    const wMax = Number(wMaxInput.value);
    const points = Number(pointsInput.value);

    if (!expression) {
        errorBox.textContent = "Please enter a transfer function.";
        return;
    }

    if (!(wMin > 0) || !(wMax > 0) || wMax <= wMin) {
        errorBox.textContent = "Frequency limits must be positive, and max must be greater than min.";
        return;
    }

    if (!(points >= 10)) {
        errorBox.textContent = "Points must be at least 10.";
        return;
    }

    let frequencies;
    try {
        frequencies = logSpace(wMin, wMax, points);
    } catch (err) {
        errorBox.textContent = "Could not generate frequency range: " + formatError(err);
        return;
    }

    const magnitudeDb = [];
    const phaseDeg = [];

    try {
        for (const w of frequencies) {
            const h = evaluateTransferFunction(expression, w);

            const mag = math.abs(h);
            const phase = math.arg(h) * 180 / Math.PI;

            magnitudeDb.push(20 * Math.log10(mag));
            phaseDeg.push(phase);
        }
    } catch (err) {
        errorBox.textContent =
            "Could not evaluate the transfer function. " +
            "Use math syntax with s, for example: 1 / (s * (s + 1))";
        console.error(err);
        return;
    }

    const unwrappedPhase = unwrapPhase(phaseDeg);

    const magTrace = {
        x: frequencies,
        y: magnitudeDb,
        type: "scatter",
        mode: "lines",
        name: "Magnitude (dB)"
    };

    const phaseTrace = {
        x: frequencies,
        y: unwrappedPhase,
        type: "scatter",
        mode: "lines",
        name: "Phase (deg)"
    };

    const commonLayout = {
        paper_bgcolor: "#111827",
        plot_bgcolor: "#111827",
        font: { color: "#e2e8f0" },
        margin: { l: 70, r: 20, t: 50, b: 60 },
        xaxis: {
            type: "log",
            title: "Frequency (rad/s)",
            gridcolor: "#334155",
            zerolinecolor: "#334155"
        }
    };

    Plotly.newPlot("magnitudePlot", [magTrace], {
        ...commonLayout,
        title: "Bode Magnitude",
        yaxis: {
            title: "Magnitude (dB)",
            gridcolor: "#334155",
            zerolinecolor: "#334155"
        }
    }, { responsive: true });

    Plotly.newPlot("phasePlot", [phaseTrace], {
        ...commonLayout,
        title: "Bode Phase",
        yaxis: {
            title: "Phase (degrees)",
            gridcolor: "#334155",
            zerolinecolor: "#334155"
        }
    }, { responsive: true });
}

plotBtn.addEventListener("click", plotBode);
tfInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        plotBode();
    }
});

plotBode();