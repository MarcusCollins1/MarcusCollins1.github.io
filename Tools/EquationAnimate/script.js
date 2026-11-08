const $ = (id) => document.getElementById(id);

const input = $("equation");
const solveBtn = $("solveBtn");
const errorBox = $("error");
const workspace = $("workspace");
const display = $("equationDisplay");
const explanation = $("explanation");
const stepCount = $("stepCount");
const progressBar = $("progressBar");
const solutionNote = $("solutionNote");

const previousBtn = $("previousBtn");
const nextBtn = $("nextBtn");
const playBtn = $("playBtn");

const EPS = 1e-9;
const DURATION = 850;
const STEP_DELAY = 3000;

let steps = [];
let currentStep = 0;
let playing = false;
let timer = null;
let animations = [];
let ghosts = [];
let animationVersion = 0;

// Format numbers neatly
function fmt(n) {
    if (Math.abs(n) < EPS) return "0";
    return String(Number(n.toFixed(8)));
}

function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);

    while (b !== 0) {
        const remainder = a % b;
        a = b;
        b = remainder;
    }

    return a;
}

function fraction(top, bottom) {
    return `[[${top}|${bottom}]]`;
}

function rational(n) {
    if (Math.abs(n - Math.round(n)) < EPS) {
        return fmt(Math.round(n));
    }

    for (let denominator = 1; denominator <= 1000; denominator++) {
        const numerator = Math.round(n * denominator);

        if (Math.abs(n - numerator / denominator) < 1e-10) {
            const divisor = gcd(numerator, denominator);

            return fraction(
                fmt(numerator / divisor),
                fmt(denominator / divisor)
            );
        }
    }

    return fmt(n);
}

// Create equation steps
function addStep(equation, message, answer = false, merges = [], tokens = null) {
    const previous = steps[steps.length - 1];

    if (previous && previous.equation === equation) {
        if (answer) {
            previous.answer = true;
            previous.message = message;
        }

        return;
    }

    steps.push({
        equation,
        message,
        answer,
        merges,
        tokens
    });
}

// Format linear expressions
function xTerm(a) {
    if (Math.abs(a) < EPS) return "0";
    if (Math.abs(a - 1) < EPS) return "x";
    if (Math.abs(a + 1) < EPS) return "-x";

    return fmt(a) + "x";
}

function formatLinear(a, b) {
    let result = "";

    if (Math.abs(a) > EPS) {
        result = xTerm(a);
    }

    if (Math.abs(b) > EPS) {
        if (result) {
            result += b > 0 ? " + " : " - ";
            result += fmt(Math.abs(b));
        } else {
            result = fmt(b);
        }
    }

    return result || "0";
}

// Represent signed terms as single objects
function signedTerm(n, variable = false) {
    const value = variable ? xTerm(Math.abs(n)) : fmt(Math.abs(n));

    return {
        value: (n < 0 ? "-" : "+") + value,
        type: variable ? "variable" : "number"
    };
}

function plainTerm(value) {
    return {
        value: String(value),
        type: String(value).includes("x") ? "variable" : "number"
    };
}

function linearTerms(a, b) {
    const result = [];

    if (Math.abs(a) > EPS) {
        result.push(plainTerm(xTerm(a)));
    }

    if (Math.abs(b) > EPS) {
        if (result.length) {
            result.push(signedTerm(b));
        } else {
            result.push(plainTerm(fmt(b)));
        }
    }

    if (!result.length) {
        result.push(plainTerm("0"));
    }

    return result;
}

function equationTokens(left, right) {
    return [
        ...left,
        { value: "=", type: "equals" },
        ...right
    ];
}

function tokensText(tokens) {
    return tokens.map(token => token.value).join(" ");
}

// Create an explicit operation step
function operationStep(left, right, message) {
    const tokens = equationTokens(left, right);

    addStep(tokensText(tokens), message, false, [], tokens);
}

// Create a simplification step with merge instructions
function mergeStep(left, right, message, merges) {
    const tokens = equationTokens(left, right);

    addStep(tokensText(tokens), message, false, merges, tokens);
}

// Validate mathematical expressions
function parseSide(source) {
    const allowedFunctions = new Set([
        "sin", "cos", "tan", "asin", "acos", "atan",
        "exp", "log", "log10", "sqrt", "abs"
    ]);

    const node = math.parse(source);

    node.traverse((child, path, parent) => {
        if (child.isSymbolNode) {
            const name = child.name;

            if (name === "x" || name === "pi" || name === "e") return;

            if (parent && parent.isFunctionNode &&
                parent.fn === child && allowedFunctions.has(name)) {
                return;
            }

            throw Error("Unsupported symbol: " + name);
        }

        if (child.isFunctionNode) {
            if (!child.fn.isSymbolNode ||
                !allowedFunctions.has(child.fn.name)) {
                throw Error("Unsupported function.");
            }
        }

        if (!child.isConstantNode &&
            !child.isSymbolNode &&
            !child.isOperatorNode &&
            !child.isParenthesisNode &&
            !child.isFunctionNode) {
            throw Error("Unsupported expression.");
        }

        if (child.isOperatorNode &&
            !["+", "-", "*", "/", "^"].includes(child.op)) {
            throw Error("Unsupported operator.");
        }
    });

    return node;
}

// Polynomial arithmetic
function polyAdd(a, b) {
    const length = Math.max(a.length, b.length);
    const result = [];

    for (let i = 0; i < length; i++) {
        result.push((a[i] || 0) + (b[i] || 0));
    }

    return result;
}

function polyScale(a, n) {
    return a.map(value => value * n);
}

function polyMultiply(a, b) {
    const result = Array(a.length + b.length - 1).fill(0);

    for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
            result[i + j] += a[i] * b[j];
        }
    }

    if (result.length > 9) return null;

    return result;
}

function polyPower(a, n) {
    if (!Number.isInteger(n) || n < 0 || n > 8) return null;

    let result = [1];

    for (let i = 0; i < n; i++) {
        result = polyMultiply(result, a);

        if (!result) return null;
    }

    return result;
}

// Extract polynomial coefficients from a Math.js expression
function getPolynomial(node) {
    if (node.isParenthesisNode) {
        return getPolynomial(node.content);
    }

    if (node.isConstantNode) {
        const value = Number(node.value);

        return Number.isFinite(value) ? [value] : null;
    }

    if (node.isSymbolNode) {
        if (node.name === "x") return [0, 1];

        if (node.name === "pi") return [Math.PI];
        if (node.name === "e") return [Math.E];

        return null;
    }

    if (!node.isOperatorNode) return null;

    const args = node.args.map(getPolynomial);

    if (args.some(arg => arg === null)) return null;

    if (node.op === "+") {
        return args.length === 1 ? args[0] : polyAdd(args[0], args[1]);
    }

    if (node.op === "-") {
        return args.length === 1
            ? polyScale(args[0], -1)
            : polyAdd(args[0], polyScale(args[1], -1));
    }

    if (node.op === "*") {
        return polyMultiply(args[0], args[1]);
    }

    if (node.op === "/") {
        if (args[1].length !== 1 || Math.abs(args[1][0]) < EPS) {
            return null;
        }

        return polyScale(args[0], 1 / args[1][0]);
    }

    if (node.op === "^") {
        if (args[1].length !== 1) return null;

        return polyPower(args[0], args[1][0]);
    }

    return null;
}

function trimPolynomial(p) {
    const result = [...p];

    while (result.length > 1 &&
        Math.abs(result[result.length - 1]) < EPS) {
        result.pop();
    }

    return result;
}

// Solve linear equations with explicit merging steps
function solveLinear(L, R) {
    let a = L[1] || 0;
    let b = L[0] || 0;
    let c = R[1] || 0;
    let d = R[0] || 0;

    const simplified = formatLinear(a, b) + " = " + formatLinear(c, d);

    if (steps[steps.length - 1].equation.replace(/\s/g, "") !==
        simplified.replace(/\s/g, "")) {
        addStep(simplified, "Expand and collect terms on each side.");
    }

    // Collect x terms
    if (Math.abs(c) > EPS) {
        const left = linearTerms(a, b);
        const right = linearTerms(c, d);

        left.push(signedTerm(-c, true));
        right.push(signedTerm(-c, true));

        operationStep(
            left,
            right,
            (c > 0 ? "Subtract " : "Add ") +
            xTerm(Math.abs(c)) + " on both sides."
        );

        const leftX = left.findIndex(term => term.value.includes("x"));
        const rightX = right.findIndex(term => term.value.includes("x"));

        const merges = [];

        if (leftX !== -1 && leftX !== left.length - 1) {
            merges.push({
                side: "left",
                source: left.length - 1,
                target: leftX
            });
        }

        if (rightX !== -1) {
            merges.push({
                side: "right",
                source: right.length - 1,
                target: rightX
            });
        }

        a -= c;
        c = 0;

        mergeStep(
            linearTerms(a, b),
            [plainTerm(fmt(d))],
            "Merge the x terms together.",
            merges
        );
    }

    // Collect constants
    if (Math.abs(b) > EPS) {
        const left = linearTerms(a, b);
        const right = [plainTerm(fmt(d))];

        const constantIndex = left.findIndex(
            term => !term.value.includes("x")
        );

        left.push(signedTerm(-b));
        right.push(signedTerm(-b));

        operationStep(
            left,
            right,
            (b > 0 ? "Subtract " : "Add ") +
            fmt(Math.abs(b)) + " on both sides."
        );

        const merges = [];

        if (constantIndex !== -1) {
            merges.push({
                side: "left",
                source: left.length - 1,
                target: constantIndex
            });
        }

        merges.push({
            side: "right",
            source: right.length - 1,
            target: 0
        });

        d -= b;
        b = 0;

        mergeStep(
            linearTerms(a, 0),
            [plainTerm(fmt(d))],
            "Move each term onto its matching term and combine.",
            merges
        );
    }

    // Special cases
    if (Math.abs(a) < EPS) {
        if (Math.abs(d) < EPS) {
            addStep(
                "0 = 0",
                "Every real number is a solution.",
                true
            );
        } else {
            addStep(
                "0 = " + fmt(d),
                "There are no solutions.",
                true
            );
        }

        return;
    }

    // Divide both sides
    if (Math.abs(a - 1) > EPS) {
        addStep(
            fraction(xTerm(a), fmt(a)) +
            " = " +
            fraction(fmt(d), fmt(a)),
            "Divide both sides by " + fmt(a) + "."
        );
    }

    addStep(
        "x = " + rational(d / a),
        "The equation has been solved.",
        true
    );
}

// Solve quadratic equations
function solveQuadratic(p) {
    const a = p[2];
    const b = p[1] || 0;
    const c = p[0] || 0;

    const discriminant = b * b - 4 * a * c;

    addStep(
        "a = " + fmt(a) + ", b = " + fmt(b) + ", c = " + fmt(c),
        "Identify the coefficients of the quadratic."
    );

    addStep(
        "D = " + fmt(b) + "^2 - 4(" + fmt(a) + ")(" + fmt(c) + ")",
        "Calculate the discriminant."
    );

    addStep(
        "D = " + fmt(discriminant),
        "Simplify the discriminant."
    );

    if (discriminant < -EPS) {
        addStep(
            "D < 0",
            "There are no real solutions.",
            true
        );

        return;
    }

    addStep(
        "x = " + fraction("-b +/- sqrt(D)", "2a"),
        "Use the quadratic formula."
    );

    const root = Math.sqrt(Math.max(0, discriminant));
    const x1 = (-b + root) / (2 * a);
    const x2 = (-b - root) / (2 * a);

    if (Math.abs(x1 - x2) < EPS) {
        addStep(
            "x = " + rational(x1),
            "The quadratic has one repeated real root.",
            true
        );
    } else {
        addStep(
            "x = " + rational(x1) + " or x = " + rational(x2),
            "These are the two real roots.",
            true
        );
    }
}

// Evaluate an equation numerically
function makeFunction(left, right) {
    const leftCode = left.compile();
    const rightCode = right.compile();

    return x => {
        try {
            const scope = { x };
            const a = leftCode.evaluate(scope);
            const b = rightCode.evaluate(scope);
            const result = a - b;

            return typeof result === "number" &&
                Number.isFinite(result) ? result : NaN;
        } catch (err) {
            return NaN;
        }
    };
}

// Find roots within a finite interval
function findRoots(fn, min = -50, max = 50) {
    const roots = [];
    const count = 4000;
    const step = (max - min) / count;

    function addRoot(x) {
        if (!Number.isFinite(x)) return;

        const value = fn(x);

        if (!Number.isFinite(value) || Math.abs(value) > 1e-6) {
            return;
        }

        if (!roots.some(root => Math.abs(root - x) < 1e-4)) {
            roots.push(x);
        }
    }

    for (let i = 0; i <= count; i++) {
        const x = min + i * step;
        const y = fn(x);

        if (!Number.isFinite(y)) continue;

        if (Math.abs(y) < 1e-8) {
            addRoot(x);
        }

        if (i === count) continue;

        let lo = x;
        let hi = x + step;
        let flo = y;
        const fhi = fn(hi);

        if (!Number.isFinite(fhi) || flo * fhi >= 0) {
            continue;
        }

        // Bisection
        for (let j = 0; j < 65; j++) {
            const mid = (lo + hi) / 2;
            const fm = fn(mid);

            if (!Number.isFinite(fm)) break;

            if (flo * fm <= 0) {
                hi = mid;
            } else {
                lo = mid;
                flo = fm;
            }
        }

        addRoot((lo + hi) / 2);
    }

    return roots.sort((a, b) => a - b);
}

// Numerical solution for more complicated equations
function solveNumerically(left, right, polynomial = false) {
    const fn = makeFunction(left, right);
    const roots = findRoots(fn);

    addStep(
        "f(x) = 0",
        "Move everything to one side and define a function."
    );

    addStep(
        "f(x) -> 0",
        "Search for real roots numerically using interval scanning and bisection."
    );

    if (!roots.length) {
        addStep(
            "No roots found",
            "No real roots were detected in the search interval.",
            true
        );

        solutionNote.textContent =
            "Search interval: -50 to 50. Roots outside this range, repeated roots or roots without a sign change may be missed.";

        return;
    }

    const result = roots.map(root => "x ≈ " + fmt(root)).join(" ; ");

    addStep(
        result,
        "These are the approximate real roots detected.",
        true
    );

    solutionNote.textContent =
        "Numerical search from -50 to 50. " +
        (polynomial ? "Higher-degree polynomial roots may be missed. " : "") +
        "Trigonometric equations may have infinitely many solutions. " +
        "Only detected roots in this interval are displayed.";
}

// Choose the solving method
function buildSteps(source) {
    steps = [];
    solutionNote.textContent = "";

    if (typeof math === "undefined") {
        throw Error("Math.js could not load. Check your internet connection.");
    }

    const sides = source.split("=");

    if (sides.length !== 2) {
        throw Error("Enter exactly one equals sign.");
    }

    if (!sides[0].trim() || !sides[1].trim()) {
        throw Error("Both sides of the equation are required.");
    }

    if (!/[xX]/.test(source)) {
        throw Error("The equation must contain x.");
    }

    const left = parseSide(sides[0].replace(/−/g, "-"));
    const right = parseSide(sides[1].replace(/−/g, "-"));

    addStep(
        source.trim(),
        "Start with the original equation."
    );

    const L = getPolynomial(left);
    const R = getPolynomial(right);

    if (L && R) {
        const difference = trimPolynomial(
            polyAdd(L, polyScale(R, -1))
        );

        if (difference.length <= 2) {
            solveLinear(L, R);
            return;
        }

        if (difference.length === 3) {
            solveQuadratic(difference);
            return;
        }

        solveNumerically(left, right, true);
        return;
    }

    solveNumerically(left, right);
}

// Create a mathematical term
function makeTerm(value, type = "number") {
    const el = document.createElement("span");

    el.className = "math-term " + type;
    el.dataset.value = value;
    el.textContent = value;

    return el;
}

// Render a stacked fraction
function renderFraction(top, bottom) {
    const wrapper = document.createElement("span");
    wrapper.className = "math-term math-fraction";
    wrapper.dataset.value = `frac:${top}/${bottom}`;

    const numerator = document.createElement("span");
    numerator.className = "fraction-top";

    const denominator = document.createElement("span");
    denominator.className = "fraction-bottom";

    renderText(top, numerator);
    renderText(bottom, denominator);

    wrapper.appendChild(numerator);
    wrapper.appendChild(denominator);

    return wrapper;
}

// Render a mathematical expression
function renderText(text, container) {
    const parts = text.match(
        /\[\[[^\]]+\]\]|(?:\d+(?:\.\d+)?|\.\d+)|[a-zA-Z]+|[^\s]/g
    ) || [];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part.startsWith("[[") && part.endsWith("]]")) {
            const contents = part.slice(2, -2);
            const separator = contents.indexOf("|");

            if (separator !== -1) {
                container.appendChild(
                    renderFraction(
                        contents.slice(0, separator),
                        contents.slice(separator + 1)
                    )
                );
            }

            continue;
        }

        // Render powers as superscripts
        if (part === "^" && i > 0 && i + 1 < parts.length) {
            const previous = container.lastElementChild;

            if (previous) {
                const power = document.createElement("span");
                power.className = "math-term math-power";
                power.dataset.value = previous.dataset.value + "^" + parts[i + 1];

                const base = document.createElement("span");
                base.className = "power-base";
                base.appendChild(previous.cloneNode(true));

                const exponent = document.createElement("span");
                exponent.className = "power-exponent";
                exponent.textContent = parts[i + 1];

                power.appendChild(base);
                power.appendChild(exponent);

                previous.replaceWith(power);
                i++;
                continue;
            }
        }

        let type = "number";

        if (part === "x") type = "variable";
        else if (part === "=") type = "equals";
        else if (["+", "-", "*", "/", "±"].includes(part)) type = "operator";
        else if (["(", ")"].includes(part)) type = "bracket";
        else if (/^[a-zA-Z]+$/.test(part)) type = "function";

        container.appendChild(makeTerm(part, type));
    }
}

// Render a step
function renderStep(step) {
    const fragment = document.createDocumentFragment();

    if (step.tokens) {
        for (const token of step.tokens) {
            const el = document.createElement("span");

            el.className = "math-term " + token.type;
            el.dataset.value = token.value;
            el.textContent = token.value;

            fragment.appendChild(el);
        }
    } else {
        renderText(step.equation, fragment);
    }

    return fragment;
}

// Stop running animations
function clearAnimations() {
    animationVersion++;

    for (const animation of animations) {
        animation.cancel();
    }

    for (const ghost of ghosts) {
        ghost.remove();
    }

    animations = [];
    ghosts = [];
}

function getTerms() {
    return [...display.children];
}

// Get tokens on a particular side
function getSideItems(items, side) {
    const index = items.findIndex(item => item.value === "=");

    if (index === -1) return [];

    return side === "left"
        ? items.slice(0, index)
        : items.slice(index + 1);
}

// Match tokens by value and nearby position
function matchTerms(oldItems, newItems, excluded = new Set()) {
    const matches = new Map();
    const used = new Set(excluded);

    newItems.forEach((item, newIndex) => {
        let best = -1;
        let distance = Infinity;

        oldItems.forEach((old, oldIndex) => {
            if (used.has(oldIndex)) return;
            if (old.value !== item.value) return;

            const delta =
                Math.abs(old.rect.left - item.rect.left) +
                Math.abs(old.rect.top - item.rect.top) * 2;

            if (delta < distance) {
                distance = delta;
                best = oldIndex;
            }
        });

        if (best !== -1) {
            matches.set(newIndex, best);
            used.add(best);
        }
    });

    return { matches, used };
}

// Animate one term moving directly on top of another
function animateMerge(source, target) {
    const a = source.element.getBoundingClientRect();
    const b = target.element.getBoundingClientRect();

    const dx = b.left + b.width / 2 - a.left - a.width / 2;
    const dy = b.top + b.height / 2 - a.top - a.height / 2;

    source.element.classList.add("merge-source");
    target.element.classList.add("merge-target");

    const animation = source.element.animate([
        {
            transform: "translate(0px, 0px) scale(1)",
            opacity: 1
        },
        {
            transform: `translate(${dx}px, ${dy}px) scale(1)`,
            opacity: 1,
            offset: 0.75
        },
        {
            transform: `translate(${dx}px, ${dy}px) scale(0.65)`,
            opacity: 0
        }
    ], {
        duration: DURATION,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
    });

    animations.push(animation);

    return animation.finished.catch(() => {});
}

// Animate the entire equation
async function animateEquation(step) {
    clearAnimations();

    const version = animationVersion;

    const oldItems = getTerms().map(el => ({
        value: el.dataset.value,
        rect: el.getBoundingClientRect(),
        element: el
    }));

    // Make copies of old terms
    for (const item of oldItems) {
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

    const oldGhostItems = ghosts.map((el, index) => ({
        value: oldItems[index].value,
        rect: oldItems[index].rect,
        element: el
    }));

    // Merge specified terms before displaying the result
    const mergedSources = new Set();

    if (step.merges && step.merges.length) {
        const tasks = [];

        for (const merge of step.merges) {
            const sideItems = getSideItems(oldGhostItems, merge.side);
            const source = sideItems[merge.source];
            const target = sideItems[merge.target];

            if (!source || !target || source === target) continue;

            const sourceIndex = oldGhostItems.indexOf(source);
            mergedSources.add(sourceIndex);

            tasks.push(animateMerge(source, target));
        }

        await Promise.all(tasks);

        if (version !== animationVersion) return;
    }

    // Display the new equation
    display.replaceChildren(renderStep(step));
    display.classList.toggle("is-answer", step.answer);

    const newItems = getTerms().map(el => ({
        value: el.dataset.value,
        rect: el.getBoundingClientRect(),
        element: el
    }));

    const { matches, used } = matchTerms(
        oldItems,
        newItems,
        mergedSources
    );

    // Animate each term to its new location
    newItems.forEach((item, index) => {
        const oldIndex = matches.get(index);

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
                duration: DURATION,
                easing: "ease-out"
            }));

            return;
        }

        const old = oldItems[oldIndex];

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

    // Fade away removed terms
    ghosts.forEach((ghost, index) => {
        if (used.has(index) || mergedSources.has(index)) return;

        animations.push(ghost.animate([
            { opacity: 1 },
            { opacity: 0 }
        ], {
            duration: DURATION * 0.7,
            fill: "forwards"
        }));
    });

    const currentGhosts = [...ghosts];
    const currentAnimations = [...animations];

    await Promise.all(
        currentAnimations.map(animation => animation.finished.catch(() => {}))
    );

    currentGhosts.forEach(ghost => ghost.remove());
}

// Show the selected step
function showStep() {
    const step = steps[currentStep];

    animateEquation(step);

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