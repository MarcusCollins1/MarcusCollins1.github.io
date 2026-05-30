import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    runTransaction,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const db = getFirestore(app);

await signInAnonymously(auth);

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");

let currentRoom = null;
let mySymbol = null;

joinBtn.onclick = joinRoom;

async function joinRoom() {
    const roomId = roomInput.value.trim();

    if (!roomId) return;

    currentRoom = roomId;

    const gameRef = doc(db, "games", roomId);

    const snapshot = await getDoc(gameRef);

    if (!snapshot.exists()) {
        await setDoc(gameRef, {
            board: ["", "", "", "", "", "", "", "", ""],
            turn: "X",
            playerX: auth.currentUser.uid,
            playerO: null,
            winner: null,
        });
        mySymbol = "X";
    } else {
        const game = snapshot.data();

        if (!game.playerO) {
            await updateDoc(gameRef, {
                playerO: auth.currentUser.uid
            });

            mySymbol = "O";
        } else {
            if (game.playerX === auth.currentUser.uid) {
                mySymbol = "X";
            }
            if (game.playerO === auth.currentUser.uid) {
                mySymbol = "O";
            }
        }
    }
    listenToGame();
}

async function leaveGame() {
    if (!currentRoom || !auth.currentUser) return;

    const gameRef = doc(db, "games", currentRoom);

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(gameRef);

        if (!snapshot.exists()) return;

        const game = snapshot.data();
        const uid = auth.currentUser.uid;
        if (game.playerX !== uid && game.playerO !== uid) return;

        transaction.delete(gameRef);
    });

    currentRoom = null;
    mySymbol = null;
    statusEl.textContent = "Game Deleted";
    renderBoard(["", "", "", "", "", "", "", "", ""]);
}

function listenToGame() {
    const gameRef = doc(db, "games", currentRoom);

    onSnapshot(gameRef, snapshot => {
        if (!snapshot.exists) {
            statusEl.textContent = "The other player left. Game deleted.";
            renderBoard(["", "", "", "", "", "", "", "", ""]);
            return;
        }

        const game = snapshot.data();

        renderBoard(game.board);

        if (game.winner) {
            statusEl.textContent = `Winner: ${game.winner}`;
        } else {
            statusEl.textContent = `You are ${mySymbol} | Turn: ${game.turn}`;
        }
    });
}

function renderBoard(board) {
    const cells = document.querySelectorAll(".cell");

    board.forEach((value, index) => {
        cells[index].textContent = value;
    });
}

document.querySelectorAll(".cell").forEach(cell => {
    cell.onclick = async () => {
        if (!currentRoom) return;

        const index = Number(cell.dataset.index);

        const gameRef = doc(db, "games", currentRoom);

        await runTransaction(db, async transaction => {
            const snapshot = await transaction.get(gameRef);
            const game = snapshot.data();
            if (game.winner) return;
            if (game.turn !== mySymbol) return;
            if (game.board[index] !== "") return;

            const board = [...game.board];
            board[index] = mySymbol;
            const winner = getWinner(board);
            
            transaction.update(gameRef, {
                board,
                turn:
                    mySymbol === "X"
                        ? "O"
                        : "X",
                winner
            });
        });
    };
});

function getWinner(board) {
    const wins = [
        [0,1,2],
        [3,4,5],
        [6,7,8],

        [0,3,6],
        [1,4,7],
        [2,5,8],

        [0,4,8],
        [2,4,6]
    ];
    for (const line of wins) {
        const [a,b,c] = line;
        if (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {
            return board[a];
        }
    }
    return null;
}

window.addEventListener("pagehide", () => {
    if (currentRoom) leaveGame();
});
