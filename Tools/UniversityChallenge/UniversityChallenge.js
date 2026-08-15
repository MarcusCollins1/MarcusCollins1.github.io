// ==========================================
// FIREBASE
// ==========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    deleteDoc,
    onSnapshot,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    getDatabase,
    ref,
    onDisconnect,
    set,
    onValue,
    remove
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// ==========================================
// FIREBASE CONFIG
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyA_CXSZVz6meJgcJyktktWNmPtLmeFNXn0",
    authDomain: "marcus-collins-github-website.firebaseapp.com",
    projectId: "marcus-collins-github-website",
    databaseURL: "https://marcus-collins-github-website-default-rtdb.europe-west1.firebasedatabase.app",
    storageBucket: "marcus-collins-github-website.firebasestorage.app",
    messagingSenderId: "328004594228",
    appId: "1:328004594228:web:47074e07c446a328bbf861",
    measurementId: "G-6M9HBX4E3Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

// ==========================================
// HTML ELEMENTS
// ==========================================

const gameCodeInput = document.getElementById("gameCodeInput");
const nameInput = document.getElementById("nameInput");
const teamSelect = document.getElementById("teamSelect");
const joinBtn = document.getElementById("joinBtn");
const errorMessage = document.getElementById("errorMessage");
const joinPanel = document.getElementById("joinPanel");
const gamePanel = document.getElementById("gamePanel");
const gameCodeDisplay = document.getElementById("gameCodeDisplay");
const playerInfo = document.getElementById("playerInfo");
const status = document.getElementById("status");
const buzzBtn = document.getElementById("buzzBtn");
const winner = document.getElementById("winner");
const winnerTeam = document.getElementById("winnerTeam");

// ==========================================
// PLAYER STATE
// ==========================================

let currentGameId = null;
let currentPlayerId = null;
let currentPlayerName = null;
let currentTeam = null;
let teamAName;
let teamBName;
let gameUnsubscribe = null;

// ==========================================
// FIND GAME
// ==========================================

async function findGame(code) {
    const gamesRef = collection(db, "universityChallengeGames");

    const gamesQuery = query(gamesRef, where("code", "==", code));

    const snapshot = await getDocs(gamesQuery);

    if (snapshot.empty) return null;

    const gameDoc = snapshot.docs[0];

    return {
        id: gameDoc.id,
        data: gameDoc.data()
    };
}

// ==========================================
// JOIN GAME
// ==========================================

joinBtn.addEventListener("click", async () => {
    errorMessage.textContent = "";

    const code = gameCodeInput.value.trim().toUpperCase();

    const name = nameInput.value.trim();
    
    const team = teamSelect.value;

    if (!code) {
        errorMessage.textContent = "Please enter a game code.";
        return;
    }

    if (!name) {
        errorMessage.textContent = "Please enter your name.";

        return;
    }

    joinBtn.disabled = true;

    joinBtn.textContent = "Joining...";

    try {
        const game = await findGame(code);

        if (!game) {
            throw new Error(
                "Game not found."
            );
        }

        // Save player
        const playersRef = collection(db, "universityChallengeGames", game.id, "Players");
        const playerDoc = await addDoc(
            playersRef,
            {
                name: name,
                team: team,
                createdAt: serverTimestamp()
            }
        );

        // Save local player information
        currentGameId = game.id;
        currentPlayerId = playerDoc.id;
        currentPlayerName = name;
        currentTeam = team;

        // Update realtime database
        const presenceRef = ref(realtimeDb, `presence/${currentGameId}/${currentPlayerId}`);
        await onDisconnect(presenceRef).remove();

        await set(presenceRef, {
            name: currentPlayerName,
            team: currentTeam
        });

        const adminPresenceRef = ref(realtimeDb, `presence/${currentGameId}/admin`);

        onValue(adminPresenceRef, async (snapshot) => {
            if (snapshot.exists()) {
                return;
            }
            await deleteGame(currentGameId);
        });

        // Update team names
        teamAName = game.data.teamAName;
        teamBName = game.data.teamBName;

        // Update UI
        gameCodeDisplay.textContent = "Game: " + code;

        playerInfo.textContent = name + " - " + (team === "A" ? teamAName : teamBName);

        joinPanel.style.display = "none";

        gamePanel.style.display = "block";

        // Start listing to game
        listenToGame();
    } catch(error) {
        console.error(error);

        errorMessage.textContent = error.message || "Could not join game.";
    }
    joinBtn.disabled = false;
    joinBtn.textContent = "Join Game";
});

// ==========================================
// LISTEN TO GAME
// ==========================================

function listenToGame() {
    if (!currentGameId) return;

    const gameRef = doc(db, "universityChallengeGames", currentGameId);

    gameUnsubscribe = onSnapshot(
        gameRef,
        (snapshot) => {
            if (!snapshot.exists()) {
                status.textContent = "Game no longer exists.";
                buzzBtn.disabled = true;
                return;
            }

            const game = snapshot.data();

            // ==========================================
            // SOMEONE HAS WON
            // ==========================================

            if (game.winner) {
                buzzBtn.disabled = true;

                winner.textContent = game.winner.name;

                winnerTeam.textContent = (game.winner.team === "A" ? teamAName : teamBName) + " buzzed first";

                if (game.winner.playerId === currentPlayerId) {
                    status.textContent = "YOU BUZZED FIRST!";
                } else {
                    status.textContent = game.winner.name + " buzzed first.";
                }
            }

            // ==========================================
            // NO WINNER
            // ==========================================

            else {
                winner.textContent = "";
                winnerTeam.textContent = "";

                status.textContent = "Buzz in!";

                buzzBtn.disabled = false;
            }

            // ==========================================
            // UPDATE TEAM NAMES
            // ==========================================
            teamAName = game.teamAName;
            teamBName = game.teamBName;
            playerInfo.textContent = currentPlayerName + " - " + (currentTeam === "A" ? teamAName : teamBName);
        }
    );
}

// ==========================================
// BUZZ
// ==========================================

buzzBtn.addEventListener("click", async () => {
    if (!currentGameId) return;
    if (!currentPlayerId) return;

    // Immediately disabled the button to prevent accidental double clicks
    buzzBtn.disabled = true;

    const gameRef = doc(db, "universityChallengeGames", currentGameId);

    try {
        await runTransaction(
            db,
            async (transaction) => {
                const gameSnapshot = await transaction.get(gameRef);

                if (!gameSnapshot.exists()) {
                    throw new Error("Game does not exist.")
                };
                const game = gameSnapshot.data();

                // Someone already won
                if (game.winner) return;

                // WE WON
                transaction.update(gameRef, {
                    winner: {
                        name: currentPlayerName,
                        team: currentTeam,
                        playerId: currentPlayerId,
                        timestamp: serverTimestamp()
                    }
                });
            }
        );
    } catch (error) {
        console.error("Buzz error:", error);

        status.textContent = "There was an error."
    }
});

// -----------------------------------
// DELETE GAME
// -----------------------------------

async function deleteGame(gameId) {
    try {
        // Delete from firestore
        const playersRef = collection(db, "universityChallengeGames", gameId, "Players");
        const playersSnapshot = await getDocs(playersRef);
        for (const playerSnapshot of playersSnapshot.docs) {
            await deleteDoc(playerSnapshot.ref);
        }
        const gameRef = doc(db, "universityChallengeGames", gameId);
        await deleteDoc(gameRef);
        // Delete from realtime database
        remove(ref(realtimeDb, `presence/${gameId}`));
    } catch (error) {
        console.error("Error deleting game:", error);
    }
}