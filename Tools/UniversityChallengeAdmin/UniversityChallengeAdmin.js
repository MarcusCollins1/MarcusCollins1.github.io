import { initializeApp }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    onSnapshot,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    getDatabase,
    get,
    ref,
    onDisconnect,
    set,
    onValue,
    remove
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// -----------------------------------
// FIREBASE CONFIG
// -----------------------------------
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

// -----------------------------------
// HTML ELEMENTS
// -----------------------------------

const createGameBtn = document.getElementById("createGameBtn");
const gameCode = document.getElementById("gameCode");
const hideGameCodeBtn = document.getElementById("hideGameCodeBtn");
const createPanel = document.getElementById("createPanel");
const gamePanel = document.getElementById("gamePanel");
const teamsPanel = document.getElementById("teamsPanel");
const scoreButtons = document.querySelectorAll(".scoreBtn");
const winnerPanel = document.getElementById("winnerPanel");
const winnerName = document.getElementById("winnerName");
const winnerTeam = document.getElementById("winnerTeam");
const resetBtn = document.getElementById("resetBtn");
const deleteGameBtn = document.getElementById("deleteGameBtn");
const teamAName = document.getElementById("teamAName");
const teamBName = document.getElementById("teamBName");
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
                teamAName: "Team A",
                teamBName: "Team B",
                createdAt: serverTimestamp()
            }
        );

        currentGameId = gameRef.id;

        const presenceRef = ref(realtimeDb, `presence/${currentGameId}`);
        onValue(presenceRef, async (snapshot) => {
            const presence = snapshot.val() || {};
            
            const connectedPlayerIds = new Set(
                Object.keys(presence).filter(
                    key => key !== "admin"
                )
            );

            const playersRef = collection(db, "universityChallengeGames", currentGameId, "Players");
            const firestorePlayers = await getDocs(playersRef);
            for (const playerSnapshot of firestorePlayers.docs) {
                const playerId = playerSnapshot.id;

                if (!connectedPlayerIds.has(playerId)) {
                    await deleteDoc(
                        doc(
                            db, "universityChallengeGames", currentGameId, "Players", playerId
                        )
                    );
                }
            }
        });
        const adminPresenceRef = ref(realtimeDb, `presence/${currentGameId}/admin`);
        await onDisconnect(adminPresenceRef).remove();
        await set(adminPresenceRef, true);

        gameCode.textContent = code;
        createPanel.style.display = "none";
        gamePanel.style.display = "block";
        teamsPanel.style.display = "block";
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

    const playersRef = collection(db, "universityChallengeGames", currentGameId, "Players");

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
// SHOW/HIDE GAME CODE
// -----------------------------------

hideGameCodeBtn.addEventListener("click", () => {
    if (gameCode.style.visibility === "hidden") {
        gameCode.style.visibility = "visible";
        hideGameCodeBtn.textContent = "Hide Game Code";
    } else {
        gameCode.style.visibility = "hidden";
        hideGameCodeBtn.textContent = "Show Game Code";
    }
})

// -----------------------------------
// CHANGE TEAM NAMES
// -----------------------------------

teamAName.addEventListener("change", async () => {
    await updateDoc(doc(db, "universityChallengeGames", currentGameId), {
        teamAName: teamAName.value
    });
});

teamBName.addEventListener("change", async () => {
    await updateDoc(doc(db, "universityChallengeGames", currentGameId), {
        teamBName: teamBName.value
    });
});

// -----------------------------------
// SCORE BUTTONS
// -----------------------------------

scoreButtons.forEach(button => {
    button.addEventListener("click", () => {
        const team = button.dataset.team;
        const amount = Number(button.dataset.amount);

        const scoreElement = document.getElementById(`team${team}Score`);

        let currentScore = Number(scoreElement.textContent);

        currentScore += amount;

        scoreElement.textContent = currentScore;
    });
});

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

// -----------------------------------
// DELETE GAME
// -----------------------------------
deleteGameBtn.addEventListener("click", deleteGame);

async function deleteGame() {
    try {
        // Delete from firestore
        const playersRef = collection(db, "universityChallengeGames", currentGameId, "Players");
        const playersSnapshot = await getDocs(playersRef);
        for (const playerSnapshot of playersSnapshot.docs) {
            await deleteDoc(playerSnapshot.ref);
        }
        const gameRef = doc(db, "universityChallengeGames", currentGameId);
        await deleteDoc(gameRef);
        // Delete from realtime database
        remove(ref(realtimeDb, `presence/${currentGameId}`));
        // Reload the page
        window.location.reload();
    } catch (error) {
        console.error("Error deleting game:", error);
    }
}

// -----------------------------------
// CHECK ALL GAMES IN FIRESTORE ARE ACTIVE
// -----------------------------------

const firestoreSnapshot = await getDocs(
    collection(db, "universityChallengeGames")
);

await Promise.all(
    firestoreSnapshot.docs.map(async (docSnapshot) => {
        const id = docSnapshot.id;

        const rtdbSnapshot = await get(
            ref(realtimeDb, `presence/${id}`)
        );

        if (!rtdbSnapshot.exists()) {
            await deleteDoc(
                doc(db, "universityChallengeGames", id)
            );
        }
    })
);