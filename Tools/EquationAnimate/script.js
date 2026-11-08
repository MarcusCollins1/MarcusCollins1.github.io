const $ = (id) => document.getElementById(id);

const input = $("equation");
const solveBtn = $("solveBtn");
const errorBox = $("error");
const workspace = $("workspace");
const display = $("equationDisplay");
const explanation = $("explanation");
const stepCount = $("stepCount");
const progressBar = $("progressBar");

const previousBtn = $("previousBtn");
const nextBtn = $("nextBtn");
const playBtn = $("playBtn");

let steps = [];
let currentStep = 0;
let playing = false;
let timer = null;

const EPS = 1e-9;

// Format numbers neatly
function fmt(n) {
    if (Math.abs(n) < EPS) return "0";
    return String(Number(n.toFixed(6)));
}

// Represent a linear expression as ax + b
function linear(a = 0, b = 0) {
    return { a, b };
}

function add(p, q) {
    return linear(p.a + q.a, p.b + q.b);
}

function scale(p, n) {
    return linear(p.a * n, p.b * n);
}

function multiply(p, q) {
    if (Math.abs(p.a * q.a) > EPS) {
        throw Error("This equation is not linear.");
    }

    return linear(p.a * q.b + p.b * q.a, p.b * q.b)
}

function divide(p, q) {
    if (Math.abs(q.a) > EPS) {
        throw Error("Division by an expression containing x is not supported.");
    }

    if (Math.abs(q.b) < EPS) {
        throw Error("Division by zero.");
    }

    return scale(p, 1 / q.b);
}

// Convert input into tokens
function tokenize(source) {
    source = source
        .replace(/\s/g, "")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .toLowerCase();

    if (!source) throw Error("Enter an equation.");

    const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|x|[()+\-*/]/g);

    if (!tokens || tokens.join("") !== source) {
        throw Error("The equation contains unsupported characters.");
    }

    // Insert implicit multiplication: 3x, 2(x+1), (x+1)2
    const result = [];

    for (const token of tokens) {
        const prev = result[result.length - 1];

        const leftEnd = prev && (/^(?:\d|\.)/.test(prev) || prev === "x" || prev === ")");
        const rightStart = (/^(?:\d|\.)/.test(token) || token === "x" || token === "(");

        if (leftEnd && rightStart) {
            result.push("*");
        }

        result.push(token);
    }

    return result;
}

// Recursive parser: supports +, -, *, / and brackets
function parseExpression(source) {
    const tokens = tokenize(source);
    let pos = 0;

    function peek() {
        return tokens[pos];
    }

    function primary() {
        const t = tokens[pos++];

        if (t == "+") return primary();
        if (t == "-") return scale(primary, -1);

        if (t == "(") {
            const value = expression();

            if (tokens[pos++] !== ")") {
                throw Error("Missing closing bracket.");
            }
            
            return value;
        }

        if (t == "x") return linear(1, 0);

        if (t !== undefined && !isNaN(Number(t))) {
            return linear(0, Number(t));
        }

        throw Error("Invalid expression.");
    }

    function term() {
        let value = primary();

        while (peek() === "*" || peek() === "/") {
            const op = tokens[pos++];
            const right = primary();

            value = op === "*" ? multiply(value, right) : divide(value, right);
        }

        return value;
    }

    function expression() {
        let value = term();

        while (peek() === "+" || peek() === "-") {
            const op = tokens[pos++];
            const right = term();

            value = op === "+" ? add(value, right) : add(value, scale(right, -1));
        }

        return value;
    }

    const result = expression();

    if (pos !== tokens.length) {
        throw Error("Could not read the whole expression.");
    }

    return result;
}

// Display ax + b in readable form
function formatLinear(a, b) {
    let output = "";

    if (Math.abs(a) > EPS) {
        if (Math.abs(a - 1) < EPS) output = "x";
        else if (Math.abs(a + 1) < EPS) output = "-x";
        else output = fmt(a) + "x";
    }

    if (Math.abs(b) > EPS) {
        if (output) {
            output += b > 0 ? " + " : " - ";
            output += fmt(Math.abs(b));
        } else {
            output += fmt(b);
        }
    }

    return output || "0";
}

function addStep(equation, message, answer = false) {
    steps.push({ equation, message, answer });
}

// Build algebra steps
function buildSteps(source) {
    steps = [];

    const sides = source.split("=");

    if (sides.length !== 2) {
        throw Error("Use exactly one equals sign (=).");
    }

    if (!sides[0].trim() || !sides[1].trim()) {
        throw Error("Both sides of the equation are required.");
    }

    if (!/[xX]/.test(source)) {
        throw Error("Include the variable x.");
    }

    const L = parseExpression(sides[0]);
    const R = parseExpression(sides[1]);

    if (![L.a, L.b, R.a, R.b].every(Number.isFinite)) {
        throw Error("The numbers are too large.");
    }

    addStep(source.replace(/\s+/g, " ").trim(), "Start with the original equation.");

    let a = L.a;
    let b = L.b;
    let c = R.a;
    let d = R.b;

    const simplified = formatLinear(a, b) + " = " + formatLinear(c, d);

    if (simplified.replace(/\s/g, "") !== source.replace(/\s/g, "").replace(/−/g, "-")) {
        addStep(simplified, "Expand brackets and simplify both sides.");
    }

    // Move x terms to the left
    if (Math.abs(c) > EPS) {
        a -= c;
        addStep(formatLinear(a, b) + " = " + fmt(d), "Subtract " + formatLinear(c, 0) + " from both sides to collect the x terms.");
    }

    // Move constants to the right
    if (Math.abs(b) > EPS) {
        const oldB = b;
        d -= b;
        b = 0;
        addStep(formatLinear(a, 0) + " = " + fmt(d), (oldB > 0 ? "Subtract " : "Add ") + fmt(Math.abs(oldB)) + " on both sides.");
    }

    // Check special cases
    if (Math.abs(a) < EPS) {
        if (Math.abs(d) < EPS) {
            addStep("0 = 0", "Both sides are identical. Every real value of x is a solution.", true);
        } else {
            addStep("0 = " + fmt(d), "This is a contradiction. There is no solution.", true);
        }

        return;
    }

    const answer = d / a;

    if (!Number.isFinite(answer)) {
        throw Error("The answer is outside the supported range.");
    }

    if (Math.abs(a - 1) > EPS) {
        addStep("x = " + fmt(d) + " / " + fmt(a), "Divide both sides by " + fmt(a) + ".");
    }

    addStep("x = " + fmt(answer), "Solved! The value of x is " + fmt(answer) + ".", true);
}

// Break equation into animated pieces
function splitTokens(equation) {
    return equation.match(/(?:\d+(?:\.\d+)?|\.\d+)|[a-zA-Z]+|[=+\-*/()]|[^\s]/g) || [];
}

function tokenClass(token, isAnswer) {
    if (isAnswer) return "answer";
    if (token === "x") return "variable";
    if (token === "=") return "equals";
    if ("+-*/()".includes(token)) return "operator";
    return "number";
}

// Animate between equation states
function animateEquation(equation, isAnswer) {
    const oldTokens = [...display.querySelectorAll(".token")];

    const oldPositions = oldTokens.map(el => ({
        text: el.textContent,
        rect: el.getBoundingClientRect()
    }));

    const newTokens = splitTokens(equation);
    display.innerHTML = "";

    const used = new Set();

    newTokens.forEach((token, index) => {
        const el = document.createElement("span");

        el.className = "token " + tokenClass(token, isAnswer);
        el.textContent = token;

        display.appendChild(el);

        // Match the same token from the previous equation
        let match = oldPositions.findIndex((item, i) => !used.has(i) && item.text === token);

        // If a number changed, match a nearby old number
        if (match === -1 && /^\d/.test(token)) {
            match = oldPositions.findIndex((item, i) => !used.has(i) && /^\d/.test(item.text));
        }

        if (match !== -1) {
            used.add(match);

            const oldRect = oldPositions[match].rect;
            const newRect = el.getBoundingClientRect();

            const dx = oldRect.left - newRect.left;
            const dy = oldRect.top - newRect.top;

            el.animate([
                {
                    transform: `translate(${dx}px, ${dy}px) scale(.94)`,
                    opacity: .6
                },
                {
                    transform: "translate(0, 0) scale(1)",
                    opacity: 1
                }
            ], {
                duration: 750,
                easing: "cubic-bezier(.2,.8,.2,1)"
            });
        } else {
            el.animate([
                { opacity: 0, transform: "translateY(16px) scale(.8)" },
                { opacity: 1, transform: "translateY(0) scale(1)" }
            ], {
                duration: 650,
                easing: "ease-out"
            });
        }
    });
}

// Show the selected step
function showStep() {
    const step = steps[currentStep];

    animateEquation(step.equation, steps.answer);

    explanation.textContent = step.message;
    stepCount.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    progressBar.style.width = ((currentStep + 1) / steps.length * 100) + "%";
    previousBtn.disabled = currentStep === 0;
    nextBtn.disabled = currentStep === steps.length - 1;

    if (currentStep == steps.length - 1) {
        stopPlaying();
    }
}

function stopPlaying() {
    playing = false;
    clearInterval(timer);
    timer = null;
    playBtn.textContent = "Play";
}

function startPlaying() {
    if (currentStep === steps.length - 1) {
        currentStep = 0;
        showStep();
    }

    playing = true;
    playBtn.textContent = "Pause";

    clearInterval(timer);

    timer = setInterval(() => {
        if (currentStep < steps.length - 1) {
            currentStep++;
            showStep();
        } else {
            stopPlaying();
        }
    }, 2200);
}

// Solve button
function solve() {
    stopPlaying();
    errorBox.textContent = "";

    try {
        buildSteps(input.value);

        currentStep = 0;
        display.innerHTML = "";
        workspace.hidden = false;

        showStep();
        startPlaying();

        workspace.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    } catch (err) {
        workspace.hidden = true;
        errorBox.textContent = err.message;
    }
}

solveBtn.addEventListener("click", solve);

input.addEventListener("keydown", e => {
    if (e.key === "Enter") solve();
});

previousBtn.addEventListener("click", () => {
    stopPlaying();

    if (currentStep > 0) {
        currentStep--;
        showStep();
    }
});

nextBtn.addEventListener("click", () => {
    stopPlaying();

    if (currentStep < steps.length - 1) {
        currentStep++;
        showStep();
    }
});

playBtn.addEventListener("click", () => {
    if (playing) {
        stopPlaying();
    } else {
        startPlaying();
    }
});

// Example buttons
document.querySelectorAll(".example").forEach(button => {
    button.addEventListener("click", () => {
        input.value = button.dataset.equation;
        solve();
    });
});