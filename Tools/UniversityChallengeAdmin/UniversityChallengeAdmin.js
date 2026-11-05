
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    onSnapshot,
    increment,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    getDatabase,
    ref,
    set,
    remove,
    onDisconnect
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
// BUZZER SOUND
// ==========================================

let audioContext = null;

function playBuzzSound() {
    try {
        if (!audioContext) {
            audioContext = new AudioContext();
        }

        if (audioContext.state !== "running") return;

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
            880,
            audioContext.currentTime
        );

        gain.gain.setValueAtTime(
            0.3,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 0.4
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4);

    } catch (error) {
        console.error("Could not play buzzer sound:", error);
    }
}

// Browsers require user interaction before audio can play.
document.addEventListener("click", () => {
    if (!audioContext) {
        audioContext = new AudioContext();
    }

    audioContext.resume().catch(console.error);
}, { once: true });

// ==========================================
// HTML ELEMENTS
// ==========================================

const elements = {
    createGameBtn: document.getElementById("createGameBtn"),
    createPanel: document.getElementById("createPanel"),
    gamePanel: document.getElementById("gamePanel"),
    teamsPanel: document.getElementById("teamsPanel"),
    winnerPanel: document.getElementById("winnerPanel"),
    gameCode: document.getElementById("gameCode"),
    hideGameCodeBtn: document.getElementById("hideGameCodeBtn"),
    teamAName: document.getElementById("teamAName"),
    teamBName: document.getElementById("teamBName"),
    teamAPlayers: document.getElementById("teamAPlayers"),
    teamBPlayers: document.getElementById("teamBPlayers"),
    teamAScore: document.getElementById("teamAScore"),
    teamBScore: document.getElementById("teamBScore"),
    winnerName: document.getElementById("winnerName"),
    winnerTeam: document.getElementById("winnerTeam"),
    resetBtn: document.getElementById("resetBtn"),
    deleteGameBtn: document.getElementById("deleteGameBtn")
};

const scoreButtons = document.querySelectorAll(".scoreBtn");

// ==========================================
// ADMIN STATE
// ==========================================

const state = {
    gameId: null,
    gameCode: null,
    teamAName: "Team A",
    teamBName: "Team B",
    creating: false,
    deleting: false,
    resetting: false,
    unsubscribers: [],
    adminPresenceRef: null
};

// ==========================================
// HELPERS
// ==========================================

function gameDocument() {
    return doc(db, "universityChallengeGames", state.gameId);
}

function playersCollection() {
    return collection(
        db,
        "universityChallengeGames",
        state.gameId,
        "Players"
    );
}

function getTeamName(team) {
    return team === "A" ? state.teamAName : state.teamBName;
}

function addListener(unsubscribe) {
    state.unsubscribers.push(unsubscribe);
}

function cleanupListeners() {
    state.unsubscribers.forEach(unsubscribe => unsubscribe());
    state.unsubscribers = [];
}

function reportError(message, error) {
    console.error(message, error);
    alert(message);
}

// ==========================================
// GENERATE GAME CODE
// ==========================================

function generateGameCode() {
    const numbers = new Uint32Array(6);
    crypto.getRandomValues(numbers);

    return Array.from(numbers, number => number % 10).join("");
}

// ==========================================
// CREATE GAME
// ==========================================

elements.createGameBtn.addEventListener("click", createGame);

async function createGame() {
    if (state.creating || state.gameId) return;

    state.creating = true;
    elements.createGameBtn.disabled = true;
    elements.createGameBtn.textContent = "Creating...";

    try {
        // Use the six-digit code as the document ID.
        // This prevents ambiguous code lookups.
        // A transaction or create-only backend operation
        // is still needed for guaranteed collision safety.
        let code;
        let gameRef;

        for (let attempt = 0; attempt < 10; attempt++) {
            code = generateGameCode();

            gameRef = doc(db, "universityChallengeGames", code);

            const existing = await getDoc(gameRef);

            if (!existing.exists()) break;

            if (attempt === 9) {
                throw new Error("Could not generate a unique game code.");
            }
        }

        await setDoc(gameRef, {
            code,
            status: "waiting",
            winner: null,
            teamAName: "Team A",
            teamBName: "Team B",
            teamAScore: 0,
            teamBScore: 0,
            createdAt: serverTimestamp()
        });

        state.gameId = gameRef.id;
        state.gameCode = code;

        state.adminPresenceRef = ref(
            realtimeDb,
            `presence/${state.gameId}/admin`
        );

        await onDisconnect(state.adminPresenceRef).remove();
        await set(state.adminPresenceRef, true);

        elements.gameCode.textContent = code;

        elements.createPanel.style.display = "none";
        elements.gamePanel.style.display = "block";
        elements.teamsPanel.style.display = "block";
        elements.winnerPanel.style.display = "block";

        listenToGame();
        listenToPlayers();

    } catch (error) {
        reportError("Could not create game.", error);
    } finally {
        state.creating = false;
        elements.createGameBtn.disabled = false;
        elements.createGameBtn.textContent = "Create Game";
    }
}

// ==========================================
// LISTEN TO GAME
// ==========================================

function listenToGame() {
    let previousWinnerId = null;
    let initialized = false;

    addListener(onSnapshot(gameDocument(), snapshot => {
        if (!snapshot.exists()) return;

        const game = snapshot.data();

        state.teamAName = game.teamAName || "Team A";
        state.teamBName = game.teamBName || "Team B";

        if (document.activeElement !== elements.teamAName) {
            elements.teamAName.value = state.teamAName;
        }

        if (document.activeElement !== elements.teamBName) {
            elements.teamBName.value = state.teamBName;
        }

        elements.teamAScore.textContent = game.teamAScore ?? 0;
        elements.teamBScore.textContent = game.teamBScore ?? 0;

        // ==========================================
        // DETECT NEW BUZZ
        // ==========================================

        const currentWinnerId = game.winner?.playerId ?? null;

        if (
            initialized &&
            currentWinnerId !== null &&
            previousWinnerId === null
        ) {
            playBuzzSound();
        }

        previousWinnerId = currentWinnerId;
        initialized = true;

        // ==========================================
        // DISPLAY WINNER
        // ==========================================

        if (game.winner) {
            elements.winnerName.textContent = game.winner.name;
            elements.winnerTeam.textContent =
                getTeamName(game.winner.team);
        } else {
            elements.winnerName.textContent = "Nobody";
            elements.winnerTeam.textContent = "-";
        }

    }, error => {
        reportError("Could not update game information.", error);
    }));
}

// ==========================================
// LISTEN TO PLAYERS
// ==========================================

function listenToPlayers() {
    addListener(onSnapshot(playersCollection(), snapshot => {
        elements.teamAPlayers.replaceChildren();
        elements.teamBPlayers.replaceChildren();

        snapshot.forEach(playerSnapshot => {
            const player = playerSnapshot.data();

            if (!["A", "B"].includes(player.team)) return;

            const listItem = document.createElement("li");
            const name = document.createElement("span");
            const removeButton = document.createElement("button");

            name.textContent = player.name;

            removeButton.type = "button";
            removeButton.className = "remove-button";
            removeButton.textContent = "Remove";
            removeButton.setAttribute(
                "aria-label",
                `Remove ${player.name}`
            );

            removeButton.addEventListener("click", async () => {
                removeButton.disabled = true;

                try {
                    await deleteDoc(playerSnapshot.ref);
                } catch (error) {
                    reportError("Could not remove player.", error);
                    removeButton.disabled = false;
                }
            });

            listItem.append(name, removeButton);

            const list = player.team === "A"
                ? elements.teamAPlayers
                : elements.teamBPlayers;

            list.appendChild(listItem);
        });
    }, error => {
        reportError("Could not update player list.", error);
    }));
}

// ==========================================
// SHOW / HIDE GAME CODE
// ==========================================

elements.hideGameCodeBtn.addEventListener("click", () => {
    const hidden = elements.gameCode.style.visibility === "hidden";

    elements.gameCode.style.visibility =
        hidden ? "visible" : "hidden";

    elements.hideGameCodeBtn.textContent =
        hidden ? "Hide Game Code" : "Show Game Code";
});

// ==========================================
// CHANGE TEAM NAMES
// ==========================================

async function updateTeamName(team, input) {
    if (!state.gameId) return;

    const name = input.value.trim();

    if (!name || name.length > 40) {
        alert("Team names must contain 1 to 40 characters.");
        input.value = getTeamName(team);
        return;
    }

    input.disabled = true;

    try {
        await updateDoc(gameDocument(), {
            [`team${team}Name`]: name
        });
    } catch (error) {
        reportError("Could not update team name.", error);
        input.value = getTeamName(team);
    } finally {
        input.disabled = false;
    }
}

elements.teamAName.addEventListener("change", () => {
    updateTeamName("A", elements.teamAName);
});

elements.teamBName.addEventListener("change", () => {
    updateTeamName("B", elements.teamBName);
});

// ==========================================
// SCORE BUTTONS
// ==========================================

scoreButtons.forEach(button => {
    button.addEventListener("click", async () => {
        if (!state.gameId) return;

        const team = button.dataset.team;
        const amount = Number(button.dataset.amount);

        if (
            !["A", "B"].includes(team) ||
            !Number.isFinite(amount)
        ) {
            return;
        }

        button.disabled = true;

        try {
            await updateDoc(gameDocument(), {
                [`team${team}Score`]: increment(amount)
            });
        } catch (error) {
            reportError("Could not update score.", error);
        } finally {
            button.disabled = false;
        }
    });
});

// ==========================================
// RESET BUZZERS
// ==========================================

elements.resetBtn.addEventListener("click", async () => {
    if (!state.gameId || state.resetting) return;

    state.resetting = true;
    elements.resetBtn.disabled = true;

    try {
        await updateDoc(gameDocument(), {
            winner: null,
            status: "waiting"
        });
    } catch (error) {
        reportError("Could not reset buzzers.", error);
    } finally {
        state.resetting = false;
        elements.resetBtn.disabled = false;
    }
});

// ==========================================
// DELETE GAME
// ==========================================

elements.deleteGameBtn.addEventListener("click", async () => {
    if (!state.gameId || state.deleting) return;

    const confirmed = confirm(
        "Delete this game and remove all players? This cannot be undone."
    );

    if (!confirmed) return;

    state.deleting = true;
    elements.deleteGameBtn.disabled = true;

    try {
        // Delete player documents in batches.
        // Firestore batches have a write limit.
        const players = await getDocs(playersCollection());

        const batchSize = 400;

        for (let i = 0; i < players.docs.length; i += batchSize) {
            const batch = writeBatch(db);

            players.docs
                .slice(i, i + batchSize)
                .forEach(player => batch.delete(player.ref));

            await batch.commit();
        }

        await deleteDoc(gameDocument());

        if (state.adminPresenceRef) {
            await remove(ref(
                realtimeDb,
                `presence/${state.gameId}`
            ));
        }

        cleanupListeners();

        window.location.reload();

    } catch (error) {
        reportError("Could not delete game completely.", error);
        state.deleting = false;
        elements.deleteGameBtn.disabled = false;
    }
});

// ==========================================
// CLEANUP
// ==========================================

window.addEventListener("pagehide", cleanupListeners);
