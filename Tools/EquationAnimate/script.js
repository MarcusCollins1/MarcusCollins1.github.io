
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

const EPS = 1e-9;
const DURATION = 900;
const STEP_DELAY = 2800;

let steps = [];
let currentStep = 0;
let playing = false;
let timer = null;
let animations = [];
let ghosts = [];

// Format numbers neatly
function fmt(n) {
    if (Math.abs(n) < EPS) return "0";
    return String(Number(n.toFixed(8)));
}

function gcd(a, b) {
    while (b !== 0) {
        const remainder = a % b;
        a = b;
        b = remainder;
    }

    return a;
}

// Convert a decimal into a fraction where possible
function rational(n) {
    if (Math.abs(n - Math.round(n)) < EPS) {
        return fmt(Math.round(n));
    }

    for (let denominator = 1; denominator <= 10000; denominator++) {
        const numerator = Math.round(n * denominator);

        if (Math.abs(n - numerator / denominator) < EPS) {
            const divisor = gcd(Math.abs(numerator), denominator);

            return fraction(
                fmt(numerator / divisor),
                fmt(denominator / divisor)
            );
        }
    }

    return fmt(n);
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
        throw Error("Only linear equations are currently supported.");
    }

    return linear(
        p.a * q.b + p.b * q.a,
        p.b * q.b
    );
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

    // Insert implicit multiplication
    const result = [];

    for (const token of tokens) {
        const prev = result[result.length - 1];

        const leftEnd = prev && (
            /^(?:\d|\.)/.test(prev) ||
            prev === "x" ||
            prev === ")"
        );

        const rightStart = (
            /^(?:\d|\.)/.test(token) ||
            token === "x" ||
            token === "("
        );

        if (leftEnd && rightStart) {
            result.push("*");
        }

        result.push(token);
    }

    return result;
}

// Parse expressions containing brackets and fractions
function parseExpression(source) {
    const tokens = tokenize(source);
    let pos = 0;

    function peek() {
        return tokens[pos];
    }

    function primary() {
        const t = tokens[pos++];

        if (t === "+") return primary();
        if (t === "-") return scale(primary(), -1);

        if (t === "(") {
            const value = expression();

            if (tokens[pos++] !== ")") {
                throw Error("Missing closing bracket.");
            }

            return value;
        }

        if (t === "x") return linear(1, 0);

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

            value = op === "*"
                ? multiply(value, right)
                : divide(value, right);
        }

        return value;
    }

    function expression() {
        let value = term();

        while (peek() === "+" || peek() === "-") {
            const op = tokens[pos++];
            const right = term();

            value = op === "+"
                ? add(value, right)
                : add(value, scale(right, -1));
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
function xTerm(a) {
    if (Math.abs(a) < EPS) return "0";
    if (Math.abs(a - 1) < EPS) return "x";
    if (Math.abs(a + 1) < EPS) return "-x";

    return fmt(a) + "x";
}

function formatLinear(a, b) {
    let output = "";

    if (Math.abs(a) > EPS) {
        output = xTerm(a);
    }

    if (Math.abs(b) > EPS) {
        if (output) {
            output += b > 0 ? " + " : " - ";
            output += fmt(Math.abs(b));
        } else {
            output = fmt(b);
        }
    }

    return output || "0";
}

function appendConstant(expr, n) {
    if (Math.abs(n) < EPS) return expr;

    return expr +
        (n > 0 ? " + " : " - ") +
        fmt(Math.abs(n));
}

function appendX(expr, coefficient) {
    if (Math.abs(coefficient) < EPS) return expr;

    return expr +
        (coefficient > 0 ? " + " : " - ") +
        xTerm(Math.abs(coefficient));
}

// Fraction notation for the renderer
function fraction(top, bottom) {
    return `[[${top}|${bottom}]]`;
}

function addStep(equation, message, answer = false, merges = []) {
    const previous = steps[steps.length - 1];

    if (previous && previous.equation === equation) {
        if (answer) {
            previous.answer = true;
            previous.message = message;
        }

        return;
    }

    steps.push({ equation, message, answer, merges });
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

    let a = L.a;
    let b = L.b;
    let c = R.a;
    let d = R.b;

    if (![a, b, c, d].every(Number.isFinite)) {
        throw Error("The numbers are too large.");
    }

    const original = source
        .replace(/−/g, "-")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/\s+/g, " ")
        .trim();

    addStep(original, "Start with the original equation.");

    const simplified = formatLinear(a, b) + " = " + formatLinear(c, d);

    if (original.replace(/\s/g, "") !== simplified.replace(/\s/g, "")) {
        addStep(simplified, "Expand brackets and simplify both sides.");
    }

    // Add or subtract x terms from both sides
    if (Math.abs(c) > EPS) {
        const left = formatLinear(a, b);
        const right = formatLinear(c, d);

        addStep(
            appendX(left, -c) + " = " + appendX(right, -c),
            (c > 0 ? "Subtract " : "Add ") +
            xTerm(Math.abs(c)) + " on both sides."
        );

        const oldA = a;
        const oldC = c;

        a -= c;
        c = 0;

        addStep(formatLinear(a, b) + " = " + fmt(d), "Combine the x terms on both sides.", false, [
            { side: "left", type: "variable", values: [oldA, -oldC] },
            { side: "right", type: "variable", values: [oldC, -oldC] }
        ]);
    }

    // Add or subtract constants from both sides
    if (Math.abs(b) > EPS) {
        const left = formatLinear(a, b);
        const right = fmt(d);

        addStep(
            appendConstant(left, -b) + " = " + appendConstant(right, -b),
            (b > 0 ? "Subtract " : "Add ") +
            fmt(Math.abs(b)) + " on both sides."
        );

        const oldB = b;
        const oldD = d;

        d -= b;
        b = 0;

        addStep(xTerm(a) + " = " + fmt(d), "Combine the constants and simplify.", false, [
            { side: "left", type: "constant", values: [oldB, -oldB] },
            { side: "right", type: "constant", values: [oldD, -oldB] }
        ]);
    }

    // Check special cases
    if (Math.abs(a) < EPS) {
        if (Math.abs(d) < EPS) {
            addStep(
                "0 = 0",
                "Both sides are identical. Every real value of x is a solution.",
                true
            );
        } else {
            addStep(
                "0 = " + fmt(d),
                "This is a contradiction. There is no solution.",
                true
            );
        }

        return;
    }

    const answer = d / a;

    if (!Number.isFinite(answer)) {
        throw Error("The answer is outside the supported range.");
    }

    // Divide both sides using proper fractions
    if (Math.abs(a - 1) > EPS) {
        addStep(
            fraction(xTerm(a), fmt(a)) + " = " + fraction(fmt(d), fmt(a)),
            "Divide both sides by " + fmt(a) + "."
        );
    }

    addStep(
        "x = " + rational(answer),
        "Solved! The value of x is " + fmt(answer) + ".",
        true
    );
}

// Create individual mathematical tokens
function makeToken(text, type = "number") {
    const el = document.createElement("span");

    el.className = "math-token " + type;
    el.textContent = text;
    el.dataset.value = text;

    return el;
}

function tokenClass(token) {
    if (token === "x") return "variable";
    if (token === "=") return "equals";
    if (["+", "-", "*", "/"].includes(token)) return "operator";
    if (token === "(" || token === ")") return "bracket";

    return "number";
}

// Render ordinary mathematical terms
function renderTextTokens(text, container) {
    const tokens = text.match(
        /(?:\d+(?:\.\d+)?|\.\d+)|x|[=+\-*/()]|[^\s]/g
    ) || [];

    for (const token of tokens) {
        container.appendChild(
            makeToken(token, tokenClass(token))
        );
    }
}

// Create a vertically stacked fraction
function renderFraction(top, bottom) {
    const wrapper = document.createElement("span");
    wrapper.className = "math-token math-fraction";
    wrapper.dataset.value = `frac:${top}/${bottom}`;

    const numerator = document.createElement("span");
    numerator.className = "fraction-top";

    const denominator = document.createElement("span");
    denominator.className = "fraction-bottom";

    renderTextTokens(top, numerator);
    renderTextTokens(bottom, denominator);

    wrapper.appendChild(numerator);
    wrapper.appendChild(denominator);

    return wrapper;
}

// Render the complete equation
function renderEquation(equation) {
    const fragment = document.createDocumentFragment();
    const parts = equation.split(/(\[\[[^\]]+\]\])/g);

    for (const part of parts) {
        if (!part) continue;

        if (part.startsWith("[[") && part.endsWith("]]")) {
            const contents = part.slice(2, -2);
            const separator = contents.indexOf("|");

            if (separator === -1) continue;

            const top = contents.slice(0, separator);
            const bottom = contents.slice(separator + 1);

            fragment.appendChild(renderFraction(top, bottom));
        } else {
            renderTextTokens(part, fragment);
        }
    }

    return fragment;
}

// Get the main tokens without including fraction children
function getTokens() {
    return [...display.children].filter(
        el => el.classList.contains("math-token")
    );
}

// Stop animations before changing steps
function clearAnimations() {
    for (const animation of animations) {
        animation.cancel();
    }

    for (const ghost of ghosts) {
        ghost.remove();
    }

    animations = [];
    ghosts = [];
}

// Match terms based on their value and position
function matchTokens(oldItems, newItems) {
    const matches = new Map();
    const used = new Set();

    // Match identical terms first
    newItems.forEach((item, newIndex) => {
        let bestIndex = -1;
        let bestDistance = Infinity;

        oldItems.forEach((old, oldIndex) => {
            if (used.has(oldIndex)) return;
            if (old.value !== item.value) return;

            const distance =
                Math.abs(old.rect.left - item.rect.left) +
                Math.abs(old.rect.top - item.rect.top) * 2;

            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = oldIndex;
            }
        });

        if (bestIndex !== -1) {
            matches.set(newIndex, bestIndex);
            used.add(bestIndex);
        }
    });

    // Match changed numbers only when they are nearby
    newItems.forEach((item, newIndex) => {
        if (matches.has(newIndex)) return;
        if (!/^\d/.test(item.value)) return;

        let bestIndex = -1;
        let bestDistance = Infinity;

        oldItems.forEach((old, oldIndex) => {
            if (used.has(oldIndex)) return;
            if (!/^\d/.test(old.value)) return;

            const distance =
                Math.abs(old.rect.left - item.rect.left) +
                Math.abs(old.rect.top - item.rect.top) * 2;

            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = oldIndex;
            }
        });

        if (bestIndex !== -1 && bestDistance < 90) {
            matches.set(newIndex, bestIndex);
            used.add(bestIndex);
        }
    });

    return { matches, used };
}

// Find the terms belonging to each side of the equation
function getSideTokens(items, side) {
    const equalsIndex = items.findIndex(item => item.value === "=");

    if (equalsIndex === -1) return [];

    return side === "left"
        ? items.slice(0, equalsIndex)
        : items.slice(equalsIndex + 1);
}

// Find the mathematical terms to combine
function findMergeTerms(items, merge) {
    const sideItems = getSideTokens(items, merge.side);
    const candidates = [];

    for (let i = 0; i < sideItems.length; i++) {
        const item = sideItems[i];

        if (merge.type === "variable" && item.value === "x") {
            candidates.push(item);
        }

        if (merge.type === "constant" && /^\d/.test(item.value)) {
            candidates.push(item);
        }
    }

    return candidates.slice(-2);
}

// Animate one term moving on top of another
function animateMerge(source, target) {
    if (!source || !target) return Promise.resolve();

    const sourceRect = source.element.getBoundingClientRect();
    const targetRect = target.element.getBoundingClientRect();

    const dx = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

    const animation = source.element.animate([
        {
            transform: "translate(0px, 0px) scale(1)",
            opacity: 1
        },
        {
            transform: `translate(${dx}px, ${dy}px) scale(1.1)`,
            opacity: 1,
            offset: 0.75
        },
        {
            transform: `translate(${dx}px, ${dy}px) scale(0.4)`,
            opacity: 0
        }
    ], {
        duration: 850,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
    });

    animations.push(animation);

    return animation.finished.catch(() => {});
}

// Animate the equation and merge like terms
async function animateEquation(equation, isAnswer, merges = []) {
    clearAnimations();

    const oldItems = getTokens().map(el => ({
        value: el.dataset.value,
        rect: el.getBoundingClientRect(),
        element: el
    }));

    // Merge terms before changing the equation
    if (merges.length > 0) {
        const mergeAnimations = [];

        for (const merge of merges) {
            const terms = findMergeTerms(oldItems, merge);

            if (terms.length === 2) {
                mergeAnimations.push(
                    animateMerge(terms[1], terms[0])
                );
            }
        }

        await Promise.all(mergeAnimations);
    }

    // Record positions after the merge
    const previousItems = getTokens().map(el => ({
        value: el.dataset.value,
        rect: el.getBoundingClientRect(),
        element: el
    }));

    // Create visual copies of the previous equation
    for (const item of previousItems) {
        const ghost = item.element.cloneNode(true);
        const rect = item.rect;

        ghost.classList.add("animation-ghost");

        Object.assign(ghost.style, {
            left: rect.left + "px",
            top: rect.top + "px",
            width: rect.width + "px",
            height: rect.height + "px",
            fontSize: getComputedStyle(item.element).fontSize,
            color: getComputedStyle(item.element).color
        });

        document.body.appendChild(ghost);
        ghosts.push(ghost);
    }

    display.replaceChildren(renderEquation(equation));
    display.classList.toggle("is-answer", isAnswer);

    const newItems = getTokens().map(el => ({
        value: el.dataset.value,
        rect: el.getBoundingClientRect(),
        element: el
    }));

    if (!previousItems.length) {
        for (const item of newItems) {
            animations.push(item.element.animate([
                { opacity: 0 },
                { opacity: 1 }
            ], {
                duration: 450,
                easing: "ease-out"
            }));
        }

        return;
    }

    const { matches, used } = matchTokens(previousItems, newItems);

    newItems.forEach((item, newIndex) => {
        const oldIndex = matches.get(newIndex);

        if (oldIndex === undefined) {
            animations.push(item.element.animate([
                {
                    opacity: 0,
                    transform: "scale(0.9)"
                },
                {
                    opacity: 1,
                    transform: "scale(1)"
                }
            ], {
                duration: DURATION * 0.7,
                easing: "ease-out"
            }));

            return;
        }

        const old = previousItems[oldIndex];

        const dx = old.rect.left - item.rect.left;
        const dy = old.rect.top - item.rect.top;

        animations.push(item.element.animate([
            {
                transform: `translate(${dx}px, ${dy}px)`,
                opacity: 1
            },
            {
                transform: "translate(0px, 0px)",
                opacity: 1
            }
        ], {
            duration: DURATION,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)"
        }));

        ghosts[oldIndex].style.opacity = "0";
    });

    ghosts.forEach((ghost, index) => {
        if (used.has(index)) return;

        animations.push(ghost.animate([
            {
                opacity: 1,
                transform: "scale(1)"
            },
            {
                opacity: 0,
                transform: "scale(0.85)"
            }
        ], {
            duration: DURATION * 0.65,
            easing: "ease-in",
            fill: "forwards"
        }));
    });

    const currentGhosts = [...ghosts];

    Promise.all(
        animations.map(animation => animation.finished.catch(() => {}))
    ).then(() => {
        currentGhosts.forEach(ghost => ghost.remove());
    });
}

// Show the selected step
function showStep() {
    const step = steps[currentStep];

    animateEquation(step.equation, step.answer, step.merges || []);

    explanation.textContent = step.message;
    stepCount.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    progressBar.style.width = ((currentStep + 1) / steps.length * 100) + "%";

    previousBtn.disabled = currentStep === 0;
    nextBtn.disabled = currentStep === steps.length - 1;

    if (currentStep === steps.length - 1) {
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
    }, STEP_DELAY);
}

// Solve button
function solve() {
    stopPlaying();
    errorBox.textContent = "";

    try {
        buildSteps(input.value);

        currentStep = 0;
        clearAnimations();
        display.replaceChildren();
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
