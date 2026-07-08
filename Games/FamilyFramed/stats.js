import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_CXSZVz6meJgcJyktktWNmPtLmeFNXn0",
    authDomain: "marcus-collins-github-website.firebaseapp.com",
    projectId: "marcus-collins-github-website",
    storageBucket: "marcus-collins-github-website.firebasestorage.app",
    messagingSenderId: "328004594228",
    appId: "1:328004594228:web:47074e07c446a328bbf861",
    measurementId: "G-6M9HBX4E3Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const backBtn = document.getElementById("backBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusText = document.getElementById("statusText");
const statsGrid = document.getElementById("statsGrid");
const distributionSection = document.getElementById("distributionSection");
const playedStat = document.getElementById("playedStat");
const wonStat = document.getElementById("wonStat");
const percentStat = document.getElementById("percentStat");
const distributionBars = document.getElementById("distributionBars");

function userDoc(uid) {
    return doc(db, "family-framed-users", uid);
}

function getResultStats(completedLevelIds) {
    const entries = completedLevelIds && typeof completedLevelIds === "object"
        ? Object.entries(completedLevelIds)
        : [];

    const played = entries.length;
    const wins = entries.filter(([, value]) => Number(value) >= 1 && Number(value) <= 6);
    const won = wins.length;
    const percentWon = played > 0 ? Math.round((won / played) * 100) : 0;

    const distribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0
    };

    for (const [, value] of wins) {
        const num = Number(value);
        if (distribution[num] !== undefined) {
            distribution[num]++;
        }
    }

    return { played, won, percentWon, distribution };
}

function renderDistribution(distribution) {
    distributionBars.innerHTML = "";

    const maxCount = Math.max(...Object.values(distribution), 1);

    for (let i = 1; i <= 6; i++) {
        const count = distribution[i] || 0;
        const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

        const row = document.createElement("div");
        row.className = "bar-row";

        const label = document.createElement("div");
        label.className = "bar-label";
        label.textContent = String(i);

        const track = document.createElement("div");
        track.className = "bar-track";

        const fill = document.createElement("div");
        fill.className = "bar-fill";
        fill.style.width = `${widthPercent}%`;

        track.appendChild(fill);

        const countEl = document.createElement("div");
        countEl.className = "bar-count";
        countEl.textContent = String(count);

        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(countEl);

        distributionBars.appendChild(row);
    }
}

async function loadStats(user) {
    const snap = await getDoc(userDoc(user.uid));

    if (!snap.exists()) {
        statusText.textContent = "No stats found yet.";
        statsGrid.classList.remove("hidden");
        distributionSection.classList.remove("hidden");
        playedStat.textContent = "0";
        wonStat.textContent = "0";
        percentStat.textContent = "0%";
        renderDistribution({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
        return;
    }

    const data = snap.data();
    const completedLevelIds = data.completedLevelIds || {};
    const { played, won, percentWon, distribution } = getResultStats(completedLevelIds);

    statusText.textContent = "";
    statsGrid.classList.remove("hidden");
    distributionSection.classList.remove("hidden");

    playedStat.textContent = String(played);
    wonStat.textContent = String(won);
    percentStat.textContent = `${percentWon}%`;

    renderDistribution(distribution);
}

backBtn.addEventListener("click", () => {
    location.href = "familyFramed.html";
});

logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        location.href = "familyFramed.html";
    } catch (error) {
        console.error("Logout failed:", error);
    }
});

async function init() {
    try {
        await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
        console.warn("Could not set auth persistence:", error);
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            location.href = "familyFramed.html";
            return;
        }

        try {
            await loadStats(user);
        } catch (error) {
            console.error("Failed to load stats:", error);
            statusText.textContent = "Could not load stats.";
        }
    });
}

init();