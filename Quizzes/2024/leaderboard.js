import { getMarkedSubmissions } from "./leaderboardFireBase.js";

const leaderboardEntries = document.getElementById("leaderboardEntries");

function addEntry(rank, name, score) {
    const row = document.createElement("div");
    row.className = "leaderboard-row";

    row.innerHTML = `
        <span class="rank">${rank}</span>
        <span class="name">${name}</span>
        <span class="score">${score}</span>
    `;

    leaderboardEntries.appendChild(row);
}

function getScore(submission) {
    let score = 0;
    for (let round = 1; round <= 2; round++) {
        for (let question = 1; question <= 10; question++) {
            if (submission[`r${round}q${question}Checkbox`]) score++;
        }
    }
    return score;
}

async function populateLeaderboard() {
    const s = await getMarkedSubmissions();
    const submissions = s.map(submission => ({
        score: getScore(submission),
        name: submission.name
    }));

    submissions
        .sort((a, b) => b.score - a.score)
        .forEach((submission, i) => {
            addEntry(i+1, submission.name, submission.score);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    populateLeaderboard();
});
