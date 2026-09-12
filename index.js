const toggleButton = document.getElementById("progressToggle");
const progressContainer = document.getElementById("progressContainer")

async function getFileNames(owner, repo, path="") {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    );

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const files = await response.json();

    return files.map(file => file.name);
}

async function getStars(year) {
    const fileNames = await getFileNames(
        "MarcusCollins1",
        "advent-of-code",
        `AOC ${year}`
    );

    const pattern = /^Day \d+ Part \d+ \d{4}\.py$/;

    const matchingFiles = fileNames.filter(name => pattern.test(name));
    let count = matchingFiles.length;

    // console.log(year, matchingFiles);

    // AoC 2015-2024 has 50 stars.
    // AoC 2025 has 24 stars.
    const finalDay = year <= 2024 ? 25 : 12;
    const maxStars = year <= 2024 ? 50 : 24;

    const lastFile = `Day ${finalDay} Part 1 ${year}.py`;

    // Your repository apparently only has one of the two files
    // for the final day, so account for that here.
    if (count === maxStars - 1 && fileNames.includes(lastFile)) {
        count = maxStars;
    }

    return count;
}

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

const years = [
    {year: 2015, stars: await getStars(2015), maxStars: 50},
    {year: 2016, stars: await getStars(2016), maxStars: 50},
    {year: 2017, stars: await getStars(2017), maxStars: 50},
    {year: 2018, stars: await getStars(2018), maxStars: 50},
    {year: 2019, stars: await getStars(2019), maxStars: 50},
    {year: 2020, stars: await getStars(2020), maxStars: 50},
    {year: 2021, stars: await getStars(2021), maxStars: 50},
    {year: 2022, stars: await getStars(2022), maxStars: 50},
    {year: 2023, stars: await getStars(2023), maxStars: 50},
    {year: 2024, stars: await getStars(2024), maxStars: 50},
    {year: 2025, stars: await getStars(2025), maxStars: 24}
];

years.forEach(({year, stars, maxStars}) => {
    createProgress(year, stars, maxStars);
});

toggleButton.addEventListener("click", () => {
    const collapsed = progressContainer.classList.toggle("collapsed");

    toggleButton.textContent = collapsed
        ? "Show yearly progress ▼"
        : "Hide yearly progress ▲";
});

toggleButton.classList.remove("hidden");
document.getElementById("progressLoading").style.display = "none";