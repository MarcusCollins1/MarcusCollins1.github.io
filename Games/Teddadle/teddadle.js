document.addEventListener("DOMContentLoaded", () => {
    const boardEl = document.getElementById("board");
    const keyboardEl = document.getElementById("keyboard");

    const ROWS = 6;
    const COLS = 5;
    const TARGET_WORD = "TEDDA";

    async function loadValidWords() {
        const response = await fetch("English words.txt");
        const text = await response.text();
        const VALID_ENGLISH_WORDS = text.split("\n").map(w => w.trim().toUpperCase()).filter(w => w.length === COLS);
        return VALID_ENGLISH_WORDS;
    }
    const VALID_ENGLISH_WORDS = await loadValidWords();

    let currentRow = 0;
    let currentCol = 0;
    let gameOver = false;

    const guesses = Array.from({ length: ROWS }, () => Array(COLS).fill(""));

    const rows = Array.from(boardEl.querySelectorAll(".row"));
    const tiles = rows.map(row => Array.from(row.querySelectorAll(".tile")));

    const keyPriority = {
        absent: 1,
        present: 2,
        correct: 3
    };

    const keyStatus = {};

    function updateKey(letter, status) {
        const key = Array.from(keyboardEl.querySelectorAll(".key")).find(k => k.textContent.trim().toUpperCase() === letter.toUpperCase());
        
        if (!key) return;
        
        const current = keyStatus[letter] || "absent";
        if (keyPriority[status] > keyPriority[current]) {
            keyStatus[letter] = status;
            key.classList.remove("absent", "present", "correct");
            key.classList.add(status);
        }
    }

    function addLetter(letter) {
        if (gameOver) return;
        if (currentCol >= COLS) return;

        guesses[currentRow][currentCol] = letter.toUpperCase();
        tiles[currentRow][currentCol].textContent = letter.toUpperCase();
        currentCol++;
    }

    function deleteLetter() {
        if (gameOver) return;
        if (currentCol <= 0) return;

        currentCol--;
        guesses[currentRow][currentCol] = "";
        tiles[currentRow][currentCol].textContent = "";
        tiles[currentRow][currentCol].classList.remove("absent", "present", "correct");
    }

    function evaluateGuess(guess) {
        const answer = TARGET_WORD.toUpperCase();
        const result = Array(COLS).fill("absent");
        const remaining = {};

        // First pass: mark correct letters
        for (let i = 0; i < COLS; i++) {
            if (guess[i] === answer[i]) {
                result[i] = "correct";
            } else {
                remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
            }
        }
        // Second pass: mark present letters
        for (let i = 0; i < COLS; i++) {
            if (result[i] === "correct") continue;

            const letter = guess[i];
            if (remaining[letter] > 0) {
                result[i] = "present";
                remaining[letter]--;
            }
        }

        return result;
    }

    function submitGuess() {
        if (gameOver) return;
        if (currentCol < COLS) {
            alert("Not enough letters!");
            return;
        }

        const guess = guesses[currentRow].join("");

        if (!VALID_ENGLISH_WORDS.includes(guess.toUpperCase())) return

        const result = evaluateGuess(guess);

        for (let i = 0; i < COLS; i++) {
            tiles[currentRow][i].classList.add(result[i]);
            updateKey(guess[i], result[i]);
        }

        if (guess.toUpperCase() === TARGET_WORD) {
            gameOver = true;
            setTimeout(() => alert("Congratulations! You guessed the word!"), 100);
            return;
        }

        currentRow++;
        currentCol = 0;

        if (currentRow >= ROWS) {
            gameOver = true;
            setTimeout(() => alert(`Game Over! The word was: ${TARGET_WORD}`), 100);
        }
    }
    
    function handleInput(key) {
        if (/^[a-zA-Z]$/.test(key)) {
            addLetter(key);
        } else if (key === "Enter") {
            submitGuess();
        } else if (key === "Backspace" || key === "⌫") {
            deleteLetter();
        }
    }

    // Physical keyboard support
    document.addEventListener("keydown", (e) => {
        handleInput(e.key);
    });

    // On-screen keyboard support
    keyboardEl.addEventListener("click", (e) => {
        const button = e.target.closest(".key");
        if (!button) return;

        const text = button.textContent.trim();

        if (text === "⌫") {
            handleInput("⌫");
        } else {
            handleInput(text);
        }
    })
})
