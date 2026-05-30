:root {
    --bg: #0f172a;
    --panel: #111827;
    --panel-2: #1f2937;
    --text: #e5e7eb;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --accent-2: #22c55e;
    --gold: #fbbf24;
    --silver: #cbd5e1;
    --bronze: #d97706;
    --border: rgba(255, 255, 255, 0.08);
    --shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    padding: 32px 16px 48px;
    font-family: Arial, Helvetica, sans-serif;
    color: var(--text);
    background: 
        radial-gradient(circle at top, rgba(56, 189, 248, 0.18), transparent 35%),
        linear-gradient(180deg, #020617 0%, var(--bg) 100%);
}
h1 {
    margin: 18px 0 28px;
    text-align: center;
    font-size: clamp(2rem, 5vw, 3.25rem);
    letter-spacing: 0.04em;
}
button {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 5px 10px;
    margin: 4px;
    font-size: large;
    cursor: pointer;
}

.return-button {
    background-color: cadetblue;
    color: darkorchid;
    font-weight: bold;
}
.return-button:hover {
    background-color: darkorchid;
    color: cadetblue;
}
.leaderboard {
    width: min(900px, 100%);
    margin: 0 auto;
    background: rgba(17, 24, 39, 0.88);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: var(--shadow);
    backdrop-filter: blur(10px);
}
.leaderboard-header,
.leaderboard-row {
    display: grid;
    grid-template-columns: 110px 1fr 120px;
    align-items: center;
    gap: 12px;
}
.leaderboard-header {
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.85rem;
    border-bottom: 1px solid var(--border);
}
.leaderboard-row {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0));
    transition: transform 0.2s ease, background 0.2s ease;
}
.leaderboard-row:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: scale(1.01);
}
.leaderboard-row:last-child {
    border-bottom: none;
}
.leaderboard-row .rank {
    font-weight: 800;
    font-size: 1.05rem;
}
.leaderboard-row .name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.leaderboard-row .score {
    justify-self: end;
    font-weight: 800;
    color: var(--accent);
}
.leaderboard-row:nth-child(1) .rank {
    color: var(--gold);
}
.leaderboard-row:nth-child(2) .rank {
    color: var(--silver);
}
.leaderboard-row:nth-child(3) .rank {
    color: var(--bronze);
}

#leaderboardEntries {
    display: flex;
    flex-direction: column;
}

@media (max-width: 640px) {
    .leaderboard-header,
    .leaderboard-entry {
        grid-template-columns: 70px, 1fr, 80px;
        padding: 14px 14px;
    }
    .leaderboard-header {
        font-size: 0.72rem;
    }
    .name {
        font-size: 0.95;
    }
}
