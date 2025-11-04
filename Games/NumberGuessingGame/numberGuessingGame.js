(function() {
    const $ = sel => document.querySelector(sel);
    const minInput = $('#min');
    const maxInput = $('#max');
    const guessInput = $('#guess');
    const submitBtn = $('#submit');
    const newRangeBtn = $('#newRange');
    const playAgainBtn = $('#playAgain');
    const hintBtn = $('#hint');
    const resetBestBtn = $('#resetAll');

    const msg = $('#message');
    const attemptsEl = $('#attempts');
    const pastEl = $('#past');
    const bestEl = $('#best');

    // state
    let min = 1;
    let max = 100;
    let secret = null;
    let attempts = 0;
    let pastGuesses = [];
    const BEST_KEY = 'ngg_best_score';

    // helpers
    function randBetween(a, b) {
        a = Math.ceil(a);
        b = Math.floor(b);
        return Math.floor(Math.random() * (b - a + 1)) + a;
    }
    
    function loadBest() {
        const v = localStorage.getItem(BEST_KEY);
        return v ? parseInt(v, 10) : null;
    }

    function saveBest(n) {
        localStorage.setItem(BEST_KEY, String(n));
    }

    function renderBest() {
        const b = loadBest();
        bestEl.textContent = b === null ? '-' : b;
    }

    function startNewGame(newMin, newMax) {
        min = Number(newMin);
        max = Number(newMax);
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            alert('Please enter valid numbers for min and max.');
            return;
        }
        if (min >= max) {
            alert('Min must be less than Max.');
            return;
        }

        secret = randBetween(min, max);
        attempts = 0;
        pastGuesses = [];
        guessInput.value = '';
        guessInput.min = String(min);
        guessInput.max = String(max);
        attemptsEl.textContent = attempts;
        pastEl.innerHTML = '';
        msg.textContent = `New range set: ${min} to ${max}. Good luck!`;
        msg.className = '';
        renderBest();
        guessInput.focus();
        // console.log(`Secret number is ${secret}`); // for debugging
    }

    function updatePast() {
        pastEl.innerHTML = '';
        pastGuesses.forEach(g => {
            const span = document.createElement('span');
            span.className = 'chip';
            span.textContent = g;
            pastEl.appendChild(span);
        });
    }

    function onGuess() {
        const raw = guessInput.value.trim();
        if (!raw) return;
        const g = Number(raw);
        if (!Number.isFinite(g)) {
            msg.textContent = 'Please enter a valid number.';
            msg.className = '';
            return;
        }
        if (g < min || g > max) {
            msg.textContent = `Out of range — pick between ${min} and ${max}.`;
            msg.className = 'danger';
            return;
        }

        attempts++;
        attemptsEl.textContent = attempts;
        pastGuesses.unshift(g);
        updatePast();

        if (g === secret) {
            msg.textContent = `🎉 Correct! The number was ${secret}. You took ${attempts} attempt${attempts>1?'s':''}.`;
            msg.className = 'success';
            // best score logic: fewest attempts wins
            const currentBest = loadBest();
            if (currentBest === null || attempts < currentBest) {
                saveBest(attempts);
                msg.textContent += ' New best score — nice!';
            }
        } else if (g < secret) {
            msg.textContent = 'Too low — try a larger number.';
            msg.className = '';
        } else {
            msg.textContent = 'Too high — try a smaller number.';
            msg.className = '';
        }

        renderBest();
        guessInput.value = '';
        guessInput.focus();
    }
    
    // hint: provide a helpful hint (range narrowing) not the exact number
    function onHint() {
        // Give a reasonably useful hint: divisible by? or close/far
        const rangeSize = max - min + 1;
        let hintText = '';
        if (rangeSize > 1000) {
            hintText = 'The number is within the chosen range.';
        } else {
            const mid = Math.floor((min + max) / 2);
            hintText = secret >= mid ? `It is in the upper half (≥ ${mid}).` : `It is in the lower half (≤ ${mid}).`;
        }
        // extra: simple divisibility hint if applicable
        if (secret % 2 === 0) hintText += ' It is an even number.';
        else hintText += ' It is an odd number.';
        msg.textContent = hintText;
        msg.className = '';
    }

    submitBtn.addEventListener('click', onGuess);
    hintBtn.addEventListener('click', onHint);
    newRangeBtn.addEventListener('click', () => {
        startNewGame(minInput.value || 1, maxInput.value || 100);
    });
    playAgainBtn.addEventListener('click', () => {
        startNewGame(min, max);
    });
    resetBestBtn.addEventListener('click', () => {
        if (confirm('Reset stored best score?')) {
            localStorage.removeItem(BEST_KEY);
            renderBest();
        }
    });

    // allow Enter in guess input
    guessInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            onGuess();
        }
    });

    // initialize
    (function init(){
        renderBest();
        startNewGame(minInput.value, maxInput.value);
    })();

    window.addEventListener('load', () => {guessInput.focus();})
})();
