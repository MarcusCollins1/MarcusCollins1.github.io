import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion
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
const gameArea = document.getElementById("gameArea");

const LEVELS = await getLevels();

let currentUser = null;
let todaysLevel = null;
let midnightTimer = null;

async function getLevels() {
    const response = await fetch("levels.json");
    return await response.json();
}

function userDoc(uid) {
    return doc(db, "family-framed-users", uid);
}

function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function msUntilNextMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next - now
}

function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
}

async function ensureUserProgress(uid) {
    const ref = userDoc(uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        const initialData = {
            completedLevelIds: [],
            dailyLevelDate: "",
            dailyLevelId: ""
        };
        await setDoc(ref, initialData);
        return initialData;
    }
    return snap.data();
}

function pickTodaysLevel(progress) {
    const completed = Array.isArray(progress.completedLevelIds)
        ? progress.completedLevelIds
        : [];
    
    const unplayed = LEVELS.fill(level => !completed.includes(level));
    const pool = unplayed.length > 0 ? unplayed : LEVELS;

    return randomChoice(pool);
}

function renderLevel(level) {
    if (!level) {
        statusText.textContent = "No level loaded.";
        return;
    }
    statusText.textContent = `Today's level: ${localDateKey()}`;
}

async function loadTodaysLevel() {
    if (!currentUser) return;

    const today = localDateKey();
    const ref = userDoc(currentUser.uid);
    const progress = await ensureUserProgress(currentUser.uid);

    if (progress.dailyLevelDate === today && progress.dailyLevelId) {
        todaysLevel = LEVELS.find(level => level.id === progress.dailyLevelId) || null;
    } else {
        todaysLevel = pickTodaysLevel(progress);
        await updateDoc(ref, {
            dailyLevelDate: today,
            dailyLevelId: todaysLevel
        });
    }

    renderLevel(todaysLevel);
    scheduleMidnightRefresh();
}

function scheduleMidnightRefresh() {
    if (midnightTimer) clearTimeout(midnightTimer);

    midnightTimer = setTimeout(async () => {
        if (currentUser) {
            await loadTodaysLevel();
        }
    }, msUntilNextMidnight() + 1000);
}

async function completeCurrentLevel() {
    if (!currentUser || !todaysLevel) return;

    const ref = userDoc(currentUser.uid);
    await updateDoc(ref, {
        completedLevelIds: arrayUnion(todaysLevel)
    });

    statusText.textContent = "Level completed. Come back tomorrow for the next one.";
}

backBtn.addEventListener("click", () => {
    location.href = "familyFramed.html";
});

logoutBtn?.addEventListener("click", async () => {
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

        currentUser = user;
        await loadTodaysLevel();
    });
}

init();