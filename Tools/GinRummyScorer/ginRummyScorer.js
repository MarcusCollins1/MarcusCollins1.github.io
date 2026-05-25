const ROUND_COUNT = 13;
const STORAGE_KEY = 'gin-rummy-13-round-scorekeeper-v1';

const els = {
    name1: document.getElementById('name1'),
    name2: document.getElementById('name2'),
    cardName1: document.getElementById('cardName1'),
    cardName2: document.getElementById('cardName2'),
    total1: document.getElementById('total1'),
    total2: document.getElementById('total2'),
    sum1: document.getElementById('sum1'),
    sum2: document.getElementById('sum2'),
    leadText: document.getElementById('leadText'),
    gameStatus: document.getElementById('gameStatus'),
    roundsCount: document.getElementById('roundsCount'),
    scoreBody: document.getElementById('scoreBody'),
    h1: document.getElementById('h1'),
    h2: document.getElementById('h2'),
};

function makeRow(round) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td class="round-col">${round}</td>
        <td><input class="num-input p1" type="number" min="0" step="1" inputmode="numeric" placeholder="0"></td>
        <td><input class="num-input p2" type="number" min="0" step="1" inputmode="numeric" placeholder="0"></td>
        <td class="center"><span class="winner">-</span></td>
        <td class="right"><span class="rt1">0</span></td>
        <td class="right"><span class="rt2">0</span></td>
    `;
    return tr;
}

function allRows() {
    return Array.from(els.scoreBody.querySelectorAll("tr"));
}

function valueOf(input) {
    const n = Number(input.value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function calculate() {
    let total1 = 0;
    let total2 = 0;
    let roundsEntered = 0;

    allRows().forEach((row) => {
        const p1 = row.querySelector(".p1");
        const p2 = row.querySelector(".p2");
        const rt1 = row.querySelector(".rt1");
        const rt2 = row.querySelector(".rt2");
        const winner = row.querySelector(".winner");

        const s1 = valueOf(p1);
        const s2 = valueOf(p2);
        total1 += s1;
        total2 += s2;

        if (s1 > 0 || s2 > 0) roundsEntered += 1;

        rt1.textContent = total1.toString();
        rt2.textContent = total2.toString();

        if (s1 > s2) {
            winner.textContent = els.name1.value || "Player 1";
            winner.className = "winner p1";
        } else if (s2 > s1) {
            winner.textContent = els.name2.value || "Player 2";
            winner.className = "winner p2";
        } else if (s1 == 0 && s2 == 0) {
            winner.textContent = "-";
            winner.className = "winner";
        } else {
            winner.textContent = "Tie";
            winner.className = "winner";
        }
    });

    els.total1.textContent = total1.toString();
    els.total2.textContent = total2.toString();
    els.sum1.textContent = total1.toString();
    els.sum2.textContent = total2.toString();
    els.roundsCount.textContent = `${roundsEntered} / ${ROUND_COUNT} rounds entered`;

    const p1Name = els.name1.value || 'Player 1';
    const p2Name = els.name2.value || 'Player 2';
    els.cardName1.textContent = p1Name;
    els.cardName2.textContent = p2Name;
    els.h1.textContent = p1Name;
    els.h2.textContent = p2Name;

    const diff = Math.abs(total1 - total2);
    if (total1 === total2) {
        els.leadText.textContent = "Tied";
        els.gameStatus.textContent = roundsEntered === ROUND_COUNT ? "Final tie" : "Game in progress";
        els.gameStatus.className = "status-pill status-warn";
    } else if (total1 > total2) {
        els.leadText.textContent = `${p1Name} by ${diff}`;
        els.gameStatus.textContent = roundsEntered === ROUND_COUNT ? `${p1Name} wins` : `${p1Name} leading`;
        els.gameStatus.className = roundsEntered === ROUND_COUNT ? 'status-pill status-good' : 'status-pill status-warn';
    } else {
        els.leadText.textContent = `${p2Name} by ${diff}`;
        els.gameStatus.textContent = roundsEntered === ROUND_COUNT ? `${p2Name} wins` : `${p2Name} leading`;
        els.gameStatus.className = roundsEntered === ROUND_COUNT ? 'status-pill status-good' : 'status-pill status-warn';
    }

    saveState();
}

function saveState() {
    const state = {
        name1: els.name1.value,
        name2: els.name2.value,
        rounds: allRows().map(row => ({
            p1: row.querySelector('.p1').value,
            p2: row.querySelector('.p2').value,
        })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const state = JSON.parse(raw);
        if (typeof state.name1 === 'string') els.name1.value = state.name1;
        if (typeof state.name2 === 'string') els.name2.value = state.name2;
        if (Array.isArray(state.rounds)) {
            allRows().forEach((row, i) => {
                const data = state.rounds[i] || {};
                row.querySelector('.p1').value = data.p1 ?? '';
                row.querySelector('.p2').value = data.p2 ?? '';
            });
        }
    } catch(e) {
        console.warn('Could not load saved state', e);
    }
}

function clearScores(keepNames = true) {
    allRows().forEach(row => {
        row.querySelector('.p1').value = '';
        row.querySelector('.p2').value = '';
    });
    if (!keepNames) {
        els.name1.textContent = "Player 1";
        els.name2.textContent = "Player 2";
    }
    calculate();
}

function fillSample() {
    const sample = [
        [12, 0], [0, 18], [25, 0], [0, 9], [6, 0], [0, 14], [8, 0],
        [0, 21], [10, 0], [0, 7], [16, 0], [0, 12], [5, 0]
    ];
    allRows().forEach((row, i) => {
        const pair = sample[i] || [0, 0];
        row.querySelector('.p1').value = pair[0];
        row.querySelector('.p2').value = pair[1];
    });
    calculate();
}

function swapNames() {
    const a = els.name1.value;
    els.name1.value = els.name2.value;
    els.name2.value = a;

    allRows().forEach(row => {
        const p1 = row.querySelector('.p1');
        const p2 = row.querySelector('.p2');
        const tmp = p1.value;
        p1.value = p2.value;
        p2.value = tmp;
    });
    calculate();
}

function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    els.name1.value = "Player 1";
    els.name2.value = "Player 2";
    clearScores();
}

for (let i = 1; i <= ROUND_COUNT; i++) {
    els.scoreBody.appendChild(makeRow(i));
}

loadState();

document.addEventListener("input", (e) => {
    if (e.target.matches("#name1, #name2, .p1, .p2")) calculate();
});

document.getElementById('fillExample').addEventListener('click', fillSample);
document.getElementById('clearScores').addEventListener('click', () => clearScores(true));
document.getElementById('swapNames').addEventListener('click', swapNames);
document.getElementById('resetAll').addEventListener('click', resetAll);

calculate();