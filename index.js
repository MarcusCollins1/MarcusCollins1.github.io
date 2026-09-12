const toggleButton = document.getElementById("progressToggle");
const progressContainer = document.getElementById("progressContainer")


function createProgress(year, stars, maxStars) {
    const percentage = Math.min(
        100, Math.max(0, (stars / maxStars) * 100)
    );

    const card = document.createElement("div");
    card.className = "aoc-card";

    card.innerHTML = `
        <div class="aoc-header">
            <div class="aoc-year">${year}</div>
            <div class="aoc-tag">${Math.round(percentage)}%</div>
        </div>

        <div class="aoc-stars">
            ⭐ ${stars} / ${maxStars}
        </div>

        <div class="progress-track">
            <div class="progress-bar"></div>
        </div>

        <div class="aoc-percentage">
            ${percentage.toFixed(1)}% complete
        </div>
    `;

    const progressBar = card.querySelector(".progress-bar");

    requestAnimationFrame(() => {
        progressBar.style.width = `${percentage}%`;
    });

    progressContainer.appendChild(card);
}

async function loadProgress() {
    const response = await fetch(
        "https://raw.githubusercontent.com/MarcusCollins1/advent-of-code/main/aoc-progress.json"
    );

    if (!response.ok) {
        throw new Error(`Could not load progress: ${response.status}`);
    }

    const progress = await response.json();

    const years = Object.entries(progress).map(([year, stars]) => ({
        year: Number(year),
        stars,
        maxStars: Number(year) <= 2024 ? 50 : 24
    }));

    years.forEach(({ year, stars, maxStars }) => {
        createProgress(year, stars, maxStars);
    });

    document.getElementById("progressLoading").style.display = "none";
    toggleButton.classList.remove("hidden");
}

loadProgress().catch(error => {
    console.error(error);
});

toggleButton.addEventListener("click", () => {
    const collapsed = progressContainer.classList.toggle("collapsed");

    toggleButton.textContent = collapsed
        ? "Show yearly progress ▼"
        : "Hide yearly progress ▲";
});

toggleButton.classList.remove("hidden");
document.getElementById("progressLoading").style.display = "none";