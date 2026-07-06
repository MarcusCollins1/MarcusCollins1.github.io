import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
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
const auth = getAuth(app);

const backBtn = document.getElementById("backBtn");
const logoutBtn = document.getElementById("logoutBtn");
const startGameBtn = document.getElementById("startGameBtn");
const welcomeText = document.getElementById("welcomeText");
const gameArea = document.getElementById("gameArea");

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

startGameBtn?.addEventListener("click", () => {
    welcomeText.textContent = "Game started!";
});

async function init() {
    try {
        await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
        console.warn("Could not set auth persistence:", error);
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            const name = user.displayName || "Player";
            welcomeText.textContent = `Welcome, ${name}!`;
            gameArea.classList.remove("hidden");
        } else {
            location.href = "familyFramed.html";
        }
    });
}

init();