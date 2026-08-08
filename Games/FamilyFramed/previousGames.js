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
const prevGamesContainer = document.getElementById("prevGamesContainer");

function userDoc(uid) {
    return doc(db, "family-framed-users", uid);
}

async function loadPrevGames(user) {
    const snap = await getDoc(userDoc(user.uid));

    if (!snap.exists) {
        statusText.textContent = "No previous games found yet.";
        return;
    }

    const data = snap.data();
    const completedLevelIds = data.completedLevelIds || {};
    statusText.textContent = "";
    prevGamesContainer.classList.remove("hidden");

    populatePrevGamesContainer(completedLevelIds);
}

function populatePrevGamesContainer(completedLevelIds) {
    prevGamesContainer.innerHTML = "";

    Object.entries(completedLevelIds).forEach(([levelName, score]) => {
        const levelCard = document.createElement("div");
        levelCard.className = "level-card";

        const title = document.createElement("div");
        title.className = "level-title";
        title.textContent = levelName;

        const imagesWrap = document.createElement("div");
        imagesWrap.className = "level-images";

        for (let i = 1; i <= 6; i++) {
            const imgWrapper = document.createElement("div");
            imgWrapper.classList = "imgWrapper";
            if (i < score) {
                imgWrapper.style.setProperty("--filter-color", "#c92121");
            } else if (i === score) {
                imgWrapper.style.setProperty("--filter-color", "#00ff88");
            }

            const img = document.createElement("img");
            img.src = `Images/${levelName}/${i}.jpg`;
            img.alt = levelName;
            img.className = "level-image";

            imgWrapper.appendChild(img);
            imagesWrap.appendChild(imgWrapper);
        }

        levelCard.appendChild(title);
        levelCard.appendChild(imagesWrap);
        prevGamesContainer.appendChild(levelCard);
    });
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
            await loadPrevGames(user);
        } catch (error) {
            console.error("Failed to load previous games:", error);
            statusText.textContent = "Could not load previous games."
        }
    });
}

init();