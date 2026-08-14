import { initializeApp }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    onSnapshot,
    doc,
    serverTimestamp
    } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// -----------------------------------
// FIREBASE CONFIG
// -----------------------------------
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

// -----------------------------------
// HTML ELEMENTS
// -----------------------------------

const createGameBtn = document.getElementById("createGameBtn");
const gameCode = document.getElementById("gameCode");
const createPanel = document.getElementById("createPanel");
const gamePanel = document.getElementById("gamePanel");
const playersPanel = document.getElementById("playersPanel");
const winnerPanel = document.getElementById("winnerPanel");
const winnerName = document.getElementById("winnerName");
const winnerTeam = document.getElementById("winnerTeam");
const resetBtn = document.getElementById("resetBtn");
const teamAPlayers = document.getElementById("teamAPlayers");
const teamBPlayers = document.getElementById("teamBPlayers");

// -----------------------------------
// CURRENT GAME
// -----------------------------------

let currentGameId = null;

// -----------------------------------
// CREATE GAME CODE
// -----------------------------------

function generateGameCode() {
    const characters = "1234567890";
    let code = "";
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }
    return code;
}

// -----------------------------------
// CREATE GAME
// -----------------------------------

createGameBtn.addEventListener("click", async () => {
    const code = generateGameCode();

    try {
        const gameRef = await addDoc(
            collection(db, "universityChallengeGames"),
            {
                code: code,
                status: "waiting",
                winner: null,
                createdAt: serverTimestamp()
            }
        );

        currentGameId = gameRef.id;

        gameCode.textContent = code;
        createPanel.style.display = "none";
        gamePanel.style.display = "block";
        playersPanel.style.display = "block";
        winnerPanel.style.display = "block";

        listenToGame();
    } catch (error) {
        console.error(
            "Error creating game:",
            error
        );

        alert(
            "Could not create game."
        );
    }
});

// -----------------------------------
// LISTEN TO GAME
// -----------------------------------

function listenToGame() {
    if (!currentGameId) return;

    const gameRef = doc(db, "universityChallengeGames", currentGameId);

    onSnapshot(gameRef, (snapshot) => {
        if (!snapshot.exists()) {
            return;
        }

        const game = snapshot.data()

        // -----------------------------------
        // WINNER
        // -----------------------------------

        if (game.winner) {
            winnerName.textContent = game.winner.name;
            winnerTeam.textContent = "Team " + game.winner.team;
        } else {
            winnerName.textContent = "Nobody";
            winnerTeam.textContent = "-";
        }
    });

    // -----------------------------------
    // PLAYERS
    // -----------------------------------

    const playersRef = collection(db, "universityChallengeGames", currentGameId, "players");

    onSnapshot(playersRef, (snapshot) => {
        teamAPlayers.innerHTML = "";
        teamBPlayers.innerHTML = "";
        snapshot.forEach((playerSnapshot) => {
            const player = playerSnapshot.data();
            const li = document.createElement("li");
            li.textContent = player.name;
            if (player.team === "A") {
                teamAPlayers.appendChild(li);
            } else if (player.team === "B") {
                teamBPlayers.appendChild(li);
            }
        });
    });
}

// -----------------------------------
// RESET BUZZERS
// -----------------------------------

resetBtn.addEventListener("click", async () => {

    if (!currentGameId) return;

    try {
        const gameRef = doc(db, "universityChallengeGames", currentGameId);

        await updateDoc(gameRef, {
            winner: null,
            status: "waiting"
        });
    } catch (error) {
        console.error("Error resetting buzzers:", error);
    }
});