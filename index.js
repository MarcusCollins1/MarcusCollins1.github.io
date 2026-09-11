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

getFileNames("MarcusCollins1", "advent-of-code")
    .then(names => console.log(names));

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

    const progressBar = card.querySelector(".progress.bar");

    requestAnimationFrame(() => {
        progressBar.style.width = `${percentage}%`;
    });

    document.getElementById("progress-container").appendChild(card);
}

createProgress(2017, 36, 50);