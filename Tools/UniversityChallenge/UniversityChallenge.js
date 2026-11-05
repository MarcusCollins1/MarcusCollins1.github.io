
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    onSnapshot,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    getDatabase,
    ref,
    onValue,
    onDisconnect,
    set,
    remove
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// ==========================================
// FIREBASE CONFIGURATION
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

const elements = {
    gameCodeInput: document.getElementById("gameCodeInput"),
    nameInput: document.getElementById("nameInput"),
    teamSelect: document.getElementById("teamSelect"),
    joinBtn: document.getElementById("joinBtn"),
    errorMessage: document.getElementById("errorMessage"),
    joinPanel: document.getElementById("joinPanel"),
    gamePanel: document.getElementById("gamePanel"),
    gameCodeDisplay: document.getElementById("gameCodeDisplay"),
    playerInfo: document.getElementById("playerInfo"),
    status: document.getElementById("status"),
    buzzBtn: document.getElementById("buzzBtn"),
    winner: document.getElementById("winner"),
    winnerTeam: document.getElementById("winnerTeam")
};

// ==========================================
// PLAYER STATE
// ==========================================

const state = {
    gameId: null,
    playerId: null,
    name: "",
    team: "",
    teamAName: "Team A",
    teamBName: "Team B",
    winner: null,
    gameExists: false,
    playerExists: false,
    connected: false,
    joining: false,
    buzzing: false,
    presenceRef: null,
    unsubscribers: []
};

elements.buzzBtn.disabled = true;

// ==========================================
// HELPERS
// ==========================================

function gameDocument() {
    return doc(db, "universityChallengeGames", state.gameId);
}

function playerDocument() {
    return doc(
        db,
        "universityChallengeGames",
        state.gameId,
        "Players",
        state.playerId
    );
}

function getTeamName(team) {
    return team === "A" ? state.teamAName : state.teamBName;
}

function showError(message) {
    elements.errorMessage.textContent = message;
}

function addListener(unsubscribe) {
    state.unsubscribers.push(unsubscribe);
}

function cleanupListeners() {
    for (const unsubscribe of state.unsubscribers) {
        unsubscribe();
    }

    state.unsubscribers = [];
}

function updateBuzzer() {
    const allowed =
        state.gameExists &&
        state.playerExists &&
        state.connected &&
        !state.winner &&
        !state.buzzing;

    elements.buzzBtn.disabled = !allowed;
}

function updateStatus() {
    if (!state.gameExists) {
        elements.status.textContent = "Game no longer exists.";
    } else if (!state.playerExists) {
        elements.status.textContent = "You have been removed.";
    } else if (!state.connected) {
        elements.status.textContent = "Connection lost. Reconnecting...";
    } else if (state.winner) {
        elements.status.textContent =
            state.winner.playerId === state.playerId
                ? "YOU BUZZED FIRST!"
                : `${state.winner.name} buzzed first.`;
    } else if (state.buzzing) {
        elements.status.textContent = "Sending buzz...";
    } else {
        elements.status.textContent = "Buzz in!";
    }

    updateBuzzer();
}

// ==========================================
// FIND GAME
// ==========================================

async function findGame(code) {
    const gamesQuery = query(
        collection(db, "universityChallengeGames"),
        where("code", "==", code)
    );

    const snapshot = await getDocs(gamesQuery);

    if (snapshot.empty) {
        throw new Error("Game not found.");
    }

    const game = snapshot.docs[0];

    return {
        id: game.id,
        ...game.data()
    };
}

// ==========================================
// JOIN GAME
// ==========================================

elements.joinBtn.addEventListener("click", joinGame);

async function joinGame() {
    if (state.joining || state.gameId) return;

    const code = elements.gameCodeInput.value.trim();
    const name = elements.nameInput.value.trim();
    const team = elements.teamSelect.value;

    showError("");

    if (!/^\d{6}$/.test(code)) {
        showError("Enter a valid six-digit game code.");
        return;
    }

    if (!name || name.length > 40) {
        showError("Enter a name between 1 and 40 characters.");
        return;
    }

    if (!["A", "B"].includes(team)) {
        showError("Select a valid team.");
        return;
    }

    state.joining = true;
    elements.joinBtn.disabled = true;
    elements.joinBtn.textContent = "Joining...";

    try {
        const game = await findGame(code);

        // A deterministic player document ID prevents two
        // identical names joining the same team simultaneously.
        const normalizedName = name.toLocaleLowerCase("en");
        const playerId = `${team}_${Array.from(
            new TextEncoder().encode(normalizedName),
            byte => byte.toString(16).padStart(2, "0")
        ).join("")}`;

        const playerRef = doc(
            db,
            "universityChallengeGames",
            game.id,
            "Players",
            playerId
        );

        await runTransaction(db, async transaction => {
            const gameSnapshot = await transaction.get(
                doc(db, "universityChallengeGames", game.id)
            );

            const existingPlayer = await transaction.get(playerRef);

            if (!gameSnapshot.exists()) {
                throw new Error("Game no longer exists.");
            }

            if (existingPlayer.exists()) {
                throw new Error("That name is already taken on your team.");
            }

            transaction.set(playerRef, {
                name,
                team,
                createdAt: serverTimestamp()
            });
        });

        state.gameId = game.id;
        state.playerId = playerId;
        state.name = name;
        state.team = team;
        state.teamAName = game.teamAName || "Team A";
        state.teamBName = game.teamBName || "Team B";
        state.gameExists = true;
        state.playerExists = true;

        elements.gameCodeDisplay.textContent = `Game: ${code}`;
        elements.playerInfo.textContent =
            `${name} - ${getTeamName(team)}`;

        elements.joinPanel.style.display = "none";
        elements.gamePanel.style.display = "block";

        listenToGame();
        listenToPlayer();
        listenToConnection();

        updateStatus();

    } catch (error) {
        console.error("Join error:", error);
        showError(error.message || "Could not join game.");
    } finally {
        state.joining = false;
        elements.joinBtn.disabled = false;
        elements.joinBtn.textContent = "Join Game";
    }
}

// ==========================================
// REALTIME CONNECTION / PRESENCE
// ==========================================

function listenToConnection() {
    state.presenceRef = ref(
        realtimeDb,
        `presence/${state.gameId}/${state.playerId}`
    );

    const connectedRef = ref(realtimeDb, ".info/connected");

    addListener(onValue(connectedRef, async snapshot => {
        state.connected = snapshot.val() === true;
        updateStatus();

        if (!state.connected || !state.playerExists || !state.gameExists) {
            return;
        }

        try {
            await onDisconnect(state.presenceRef).remove();

            await set(state.presenceRef, {
                name: state.name,
                team: state.team
            });
        } catch (error) {
            console.error("Presence error:", error);
            state.connected = false;
            updateStatus();
        }
    }, error => {
        console.error("Connection listener error:", error);
        state.connected = false;
        updateStatus();
    }));
}

// ==========================================
// GAME LISTENER
// ==========================================

function listenToGame() {
    addListener(onSnapshot(gameDocument(), snapshot => {
        state.gameExists = snapshot.exists();

        if (!state.gameExists) {
            state.winner = null;
            updateStatus();
            return;
        }

        const game = snapshot.data();

        state.winner = game.winner || null;
        state.teamAName = game.teamAName || "Team A";
        state.teamBName = game.teamBName || "Team B";

        elements.playerInfo.textContent =
            `${state.name} - ${getTeamName(state.team)}`;

        if (state.winner) {
            elements.winner.textContent = state.winner.name;
            elements.winnerTeam.textContent =
                `${getTeamName(state.winner.team)} buzzed first`;
        } else {
            elements.winner.textContent = "";
            elements.winnerTeam.textContent = "";
        }

        updateStatus();
    }, error => {
        console.error("Game listener error:", error);
        state.connected = false;
        updateStatus();
    }));
}

// ==========================================
// PLAYER LISTENER
// ==========================================

function listenToPlayer() {
    addListener(onSnapshot(playerDocument(), async snapshot => {
        state.playerExists = snapshot.exists();

        if (!state.playerExists && state.presenceRef) {
            try {
                await remove(state.presenceRef);
            } catch (error) {
                console.error("Presence removal error:", error);
            }
        }

        updateStatus();
    }, error => {
        console.error("Player listener error:", error);
        state.playerExists = false;
        updateStatus();
    }));
}

// ==========================================
// BUZZ
// ==========================================

elements.buzzBtn.addEventListener("click", async () => {
    if (
        !state.gameId ||
        !state.playerId ||
        !state.gameExists ||
        !state.playerExists ||
        !state.connected ||
        state.winner ||
        state.buzzing
    ) {
        return;
    }

    state.buzzing = true;
    updateStatus();

    try {
        await runTransaction(db, async transaction => {
            const gameRef = gameDocument();
            const playerRef = playerDocument();

            const gameSnapshot = await transaction.get(gameRef);
            const playerSnapshot = await transaction.get(playerRef);

            if (!gameSnapshot.exists()) {
                throw new Error("Game no longer exists.");
            }

            if (!playerSnapshot.exists()) {
                throw new Error("You have been removed.");
            }

            const game = gameSnapshot.data();

            if (game.winner) {
                return;
            }

            transaction.update(gameRef, {
                winner: {
                    playerId: state.playerId,
                    name: state.name,
                    team: state.team,
                    timestamp: serverTimestamp()
                }
            });
        });

    } catch (error) {
        console.error("Buzz error:", error);
        elements.status.textContent =
            error.message || "Could not send buzz.";
    } finally {
        state.buzzing = false;
        updateBuzzer();
    }
});

// ==========================================
// CLEANUP
// ==========================================

window.addEventListener("pagehide", () => {
    cleanupListeners();

    // Realtime Database onDisconnect handles presence
    // when the connection closes.
});
