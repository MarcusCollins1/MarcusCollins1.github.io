
// FACTORWANG
// Prime Factorisation Game

const numberDisplay = document.getElementById("number");
const answerInput = document.getElementById("answer");
const answerForm = document.getElementById("answer-form");
const feedback = document.getElementById("feedback");

const scoreDisplay = document.getElementById("score");
const streakDisplay = document.getElementById("streak");
const bestDisplay = document.getElementById("best");

const hintBtn = document.getElementById("hint-btn");
const skipBtn = document.getElementById("skip-btn");
const nextBtn = document.getElementById("next-btn");
const difficultySelect = document.getElementById("difficulty");
const submitBtn = document.querySelector(".submit-btn");

// GAME STATE

let currentNumber = 0;
let currentFactors = [];

let score = 0;
let streak = 0;
let best = 0;

let hintUsed = false;
let roundFinished = false;

// LOAD HIGH SCORE

try {
  best = Number(localStorage.getItem("factorwangBest")) || 0;
} catch (error) {
  best = 0;
}

bestDisplay.textContent = best;

// PRIME FACTORISATION

function primeFactors(number) {
  const factors = [];
  let n = number;

  for (let i = 2; i * i <= n; i++) {
    while (n % i === 0) {
      factors.push(i);
      n /= i;
    }
  }

  if (n > 1) {
    factors.push(n);
  }

  return factors;
}

// DIFFICULTY

function getMaximum() {
  switch (difficultySelect.value) {
    case "easy":
      return 100;

    case "medium":
      return 500;

    case "hard":
      return 2000;

    case "expert":
      return 10000;

    default:
      return 500;
  }
}

// GENERATE A NEW NUMBER

function newRound() {
  const max = getMaximum();

  // Generate a random composite number.
  // Avoid repeating the previous number.

  let newNumber;

  do {
    newNumber = Math.floor(Math.random() * (max - 3)) + 4;
  } while (
    primeFactors(newNumber).length < 2 ||
    newNumber === currentNumber
  );

  currentNumber = newNumber;
  currentFactors = primeFactors(currentNumber);

  numberDisplay.textContent = currentNumber;

  answerInput.value = "";
  answerInput.disabled = false;
  submitBtn.disabled = false;

  feedback.textContent = "";
  feedback.className = "feedback";

  hintUsed = false;
  roundFinished = false;

  hintBtn.hidden = false;
  skipBtn.hidden = false;
  nextBtn.hidden = true;

  answerInput.focus();
}

// PARSE USER ANSWER

function parseAnswer(input) {
  // Accept:
  // 2 2 3 5
  // 2,2,3,5
  // 2 x 2 x 3 x 5
  // 2 * 2 * 3 * 5
  // 2 × 2 × 3 × 5

  const cleaned = input
    .trim()
    .replace(/[×xX*,]/g, " ")
    .replace(/\s+/g, " ");

  if (!/^\d+( \d+)*$/.test(cleaned)) {
    return null;
  }

  const factors = cleaned.split(" ").map(Number);

  if (factors.some(n => !Number.isSafeInteger(n) || n < 2)) {
    return null;
  }

  return factors.sort((a, b) => a - b);
}

// CHECK ANSWER

function checkAnswer(event) {
  event.preventDefault();

  if (roundFinished) return;

  const userFactors = parseAnswer(answerInput.value);

  if (!userFactors) {
    showFeedback(
      "Enter whole numbers separated by spaces or multiplication signs.",
      "incorrect"
    );
    return;
  }

  const correct =
    userFactors.length === currentFactors.length &&
    userFactors.every(
      (factor, index) => factor === currentFactors[index]
    );

  if (correct) {
    handleCorrect();
  } else {
    handleIncorrect();
  }
}

// CORRECT ANSWER

function handleCorrect() {
  roundFinished = true;

  streak++;

  // 10 points normally, 5 if a hint was used.
  const points = hintUsed ? 5 : 10;

  score += points;

  if (score > best) {
    best = score;

    try {
      localStorage.setItem("factorwangBest", best);
    } catch (error) {
      // Game still works if storage is unavailable.
    }
  }

  updateStats();

  showFeedback(
    `✓ Correct! +${points} points`,
    "correct"
  );

  finishRound();
}

// INCORRECT ANSWER

function handleIncorrect() {
  streak = 0;
  updateStats();

  showFeedback(
    "✗ Not quite! Try again.",
    "incorrect"
  );

  answerInput.select();
}

// SHOW HINT

function showHint() {
  if (roundFinished) return;

  hintUsed = true;

  const firstFactor = currentFactors[0];

  showFeedback(
    `Hint: ${firstFactor} is one of the prime factors.`,
    "info"
  );
}

// SKIP QUESTION

function skipQuestion() {
  if (roundFinished) return;

  streak = 0;
  updateStats();

  showFeedback(
    `Skipped! The answer was ${currentFactors.join(" × ")}.`,
    "info"
  );

  finishRound();
}

// FINISH ROUND

function finishRound() {
  roundFinished = true;

  answerInput.disabled = true;
  submitBtn.disabled = true;

  hintBtn.hidden = true;
  skipBtn.hidden = true;
  nextBtn.hidden = false;

  nextBtn.focus();
}

// UPDATE STATS

function updateStats() {
  scoreDisplay.textContent = score;
  streakDisplay.textContent = streak;
  bestDisplay.textContent = best;
}

// FEEDBACK

function showFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
}

// EVENT LISTENERS

answerForm.addEventListener("submit", checkAnswer);

hintBtn.addEventListener("click", showHint);

skipBtn.addEventListener("click", skipQuestion);

nextBtn.addEventListener("click", newRound);

difficultySelect.addEventListener("change", () => {
  score = 0;
  streak = 0;

  updateStats();
  newRound();
});

// START GAME

updateStats();
newRound();