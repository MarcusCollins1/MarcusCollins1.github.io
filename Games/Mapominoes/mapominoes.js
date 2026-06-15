import { Game, Player, Card, Sea } from "./classes.js";
import {
    bordersTransit,
    getAllowedCountriesAt,
    getAllowedSeasAt,
    getElementByRowCol,
} from "./functions.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    deleteField,
    onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_CXSZVz6meJgcJyktktWNmPtLmeFNXn0",
    authDomain: "marcus-collins-github-website.firebaseapp.com",
    projectId: "marcus-collins-github-website",
    storageBucket: "marcus-collins-github-website.firebasestorage.app",
    messagingSenderId: "328004594228",
    appId: "1:328004594228:web:47074e07c446a328bbf861",
    measurementId: "G-6M9HBX4E3Z",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const gamePinValue = window.localStorage.getItem("gamePin");
const nameValue = window.localStorage.getItem("name");
const hostValue = window.localStorage.getItem("host");

if (!gamePinValue || !nameValue || hostValue === null) {
    window.location.href = "./home.html";
}

const gamePin = String(gamePinValue);
const name = String(nameValue);
const host = hostValue === "true";
const gameKey = gamePin;
const gamesRef = doc(db, "Mapominoes", "Games");

export const el = {
    returnBtn: document.getElementById("returnBtn"),
    infoContainer: document.getElementById("infoContainer"),
    gamePinP: document.getElementById("gamePinP"),
    packsP: document.getElementById("packsP"),
    playersList: document.getElementById("playersList"),
    startBtn: document.getElementById("startBtn"),
    waitingForGameToStartP: document.getElementById("waitingForGameToStartP"),
    boardContainer: document.getElementById("boardContainer"),
    board: document.getElementById("board"),
    centerBtn: document.getElementById("centerBtn"),
    skipTurnBtn: document.getElementById("skipTurnBtn"),
    highlightCardsBtn: document.getElementById("highlightCardsBtn"),
    unhighlightCardsBtn: document.getElementById("unhighlightCardsBtn"),
    playerHand: document.getElementById("playerHand"),
    playerHandWhiteSpace: document.getElementById("playerHandWhiteSpace"),
    getTransitCardDiv: document.getElementById("getTransitCardDiv"),
    getTransitCardCountriesUl: document.getElementById("getTransitCardCountriesUl"),
    getTransitCardSeasUl: document.getElementById("getTransitCardSeasUl"),
    gameEndDiv: document.getElementById("gameEndDiv"),
    finishedOrderOl: document.getElementById("finishedOrderOl"),
    returnHomeBtn: document.getElementById("returnHomeBtn"),
};
window.el = el;

export const boardState = {};
window.boardState = boardState;

export let player = null;
window.player = player;

let allCards = [];
let allSeas = [];
let packNames = [];
let playerNames = [];
let playing = false;
let isPlayerTurn = false;
let gameInitialized = false;
let assetsLoaded = false;
let handLoaded = false;
let lastBoardSignature = "";
let index = -1;

let isBoardDragging = false;
let boardStartX = 0;
let boardStartY = 0;
let boardX = 0;
let boardY = 0;
let boardScale = 1;
const minBoardScale = 0.5;
const maxBoardScale = 4;

let draggingCardName = "";
let draggingCard = null;
let mustPlayOff = false;
let mustPlayOffRow = null;
let mustPlayOffCol = null;
let resolveTransitChoice = null;

const cardWidth = 80;
const cardHeight = 128;
const boardCols = 101;
const boardRows = 101;
el.board.style.width = `${cardWidth * boardCols}px`;
el.board.style.height = `${cardHeight * boardRows}px`;

function gameData() {
    return window.__mapominoesGameData ?? null;
}

function setGameData(data) {
    window.__mapominoesGameData = data;
}

function setPlayer(nextPlayer) {
    player = nextPlayer;
    window.player = player;
}

function gameSnapshotToData(snapshot) {
    if (!snapshot.exists()) {
        return null;
    }
    const data = snapshot.data() ?? {};
    return data[gameKey] ?? null;
}

function gamesDoc() {
    return doc(db, "Mapominoes", "Games");
}

function toPlainCard(card) {
    if (card && typeof card.toDict === "function") {
        return card.toDict();
    }

    return {
        name: card.name,
        borders: Array.isArray(card.borders) ? [...card.borders] : [],
        seas: Array.isArray(card.seas) ? [...card.seas] : [],
        image: card.image ?? "",
    };
}

function serializeBoardCell(card, isTransit = false) {
    return {
        kind: card instanceof Sea ? "sea" : "country",
        card: toPlainCard(card),
        transit: Boolean(isTransit),
    };
}

function hydrateBoardCell(cell) {
    if (!cell || !cell.card) {
        return null;
    }

    if (cell.kind === "sea") {
        const sea = new Sea(cell.card.name, cell.card.image);
        sea.isTransit = Boolean(cell.transit);
        return sea;
    }

    const card = new Card(
        cell.card.name,
        cell.card.borders ?? [],
        cell.card.seas ?? [],
        cell.card.image
    );
    card.isTransit = Boolean(cell.transit);
    return card;
}

function clearBoard() {
    for (const key of Object.keys(boardState)) {
        delete boardState[key];
    }
    el.board.innerHTML = "";
}

function updateBoardTransform() {
    el.board.style.transform = `translate(-50%, -50%) translate(${boardX}px, ${boardY}px) scale(${boardScale})`;
}

function centerBoard() {
    boardX = 0;
    boardY = 0;
    boardScale = 1;
    updateBoardTransform();
}

function addCardToBoard(card, row, col, isTransit = false) {
    boardState[`${row}-${col}`] = card;
    card.isTransit = Boolean(isTransit);

    const cardElement = document.createElement("div");
    cardElement.classList.add("card-on-board");
    if (isTransit) {
        cardElement.classList.add("transit-on-board");
    }

    cardElement.dataset.row = String(row);
    cardElement.dataset.col = String(col);
    cardElement.id = `${card.name}-${row}-${col}`;
    cardElement.style.gridRow = String(row);
    cardElement.style.gridColumn = String(col);
    cardElement.style.backgroundImage = `url(${String(card.image).replace(/ /g, "_")})`;

    el.board.appendChild(cardElement);
}

function renderBoard(boardData) {
    const signature = JSON.stringify(boardData ?? {});
    if (signature === lastBoardSignature) {
        return;
    }

    lastBoardSignature = signature;
    clearBoard();

    for (const [key, cell] of Object.entries(boardData ?? {})) {
        const [rowStr, colStr] = key.split("-");
        const row = Number(rowStr);
        const col = Number(colStr);
        const card = hydrateBoardCell(cell);

        if (!Number.isFinite(row) || !Number.isFinite(col) || !card) {
            continue;
        }

        addCardToBoard(card, row, col, Boolean(cell.transit));
    }
}

function setBoardVisibility(visible) {
    el.boardContainer.style.display = visible ? "flex" : "none";
}

function setHandVisibility(visible) {
    el.playerHand.style.display = visible ? "flex" : "none";
    el.playerHandWhiteSpace.style.display = visible ? "block" : "none";
}

function renderPlayersList(players) {
    el.playersList.innerHTML = "";
    players.forEach((playerName) => {
        const li = document.createElement("li");
        if (playerName === name) {
            const strong = document.createElement("strong");
            strong.textContent = playerName;
            li.appendChild(strong);
        } else {
            li.textContent = playerName;
        }
        el.playersList.appendChild(li);
    });
}

function renderLobby(game) {
    const players = Array.isArray(game?.players) ? game.players : [];
    const packs = Array.isArray(game?.packs) ? game.packs : [];

    playerNames = players;
    packNames = packs;

    el.gamePinP.textContent = `Game PIN: ${gamePin}`;
    el.packsP.textContent = `Packs: ${packs.join(", ")}`;
    renderPlayersList(players);

    if (host) {
        el.startBtn.style.display = "block";
        el.startBtn.disabled = players.length < 2 || Boolean(game?.playing);
        el.waitingForGameToStartP.style.display = "none";
    } else {
        el.startBtn.style.display = "none";
        el.waitingForGameToStartP.style.display = game?.playing ? "none" : "block";
    }
}

async function loadAssetsOnce() {
    if (assetsLoaded) {
        return;
    }

    allCards = [];
    allSeas = [];

    for (const packName of packNames) {
        const countriesRef = doc(db, "Mapominoes", "Packs", packName, "Countries");
        const countriesSnap = await getDoc(countriesRef);
        const countries = countriesSnap.exists() ? (countriesSnap.data() ?? {}) : {};

        for (const [countryName, countryData] of Object.entries(countries)) {
            allCards.push(
                new Card(
                    countryName,
                    countryData.Borders ?? countryData.borders ?? [],
                    countryData.Seas ?? countryData.seas ?? [],
                    `./Images/Cards/${packName}/${countryName}.jpg`
                )
            );
        }

        const seasRef = doc(db, "Mapominoes", "Packs", packName, "Seas");
        const seasSnap = await getDoc(seasRef);
        const seas = seasSnap.exists() ? (seasSnap.data() ?? {}) : {};

        for (const [seaName] of Object.entries(seas)) {
            allSeas.push(new Sea(seaName, `./Images/Cards/Seas/${seaName}.jpg`));
        }
    }

    assetsLoaded = true;
}

export function getCardByName(cardName) {
    return allCards.find((card) => card.name === cardName) ?? null;
}

function getSeaByName(seaName) {
    return allSeas.find((sea) => sea.name === seaName) ?? null;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getStartCardIdx(cards) {
    const idx = cards.findIndex((card) => Array.isArray(card.borders) && card.borders.length >= 3);
    return idx >= 0 ? idx : 0;
}

function makeHands(cards, numPlayers, startCardIdx) {
    const hands = Array.from({ length: numPlayers }, () => []);
    let currentPlayer = 0;

    cards.forEach((card, idx) => {
        if (idx === startCardIdx) {
            return;
        }
        hands[currentPlayer].push(card.toDict());
        currentPlayer = (currentPlayer + 1) % numPlayers;
    });

    return hands;
}

async function startGame() {
    const game = gameData();
    if (!game) {
        return;
    }

    if (!Array.isArray(game.players) || game.players.length < 2) {
        alert("Need at least 2 players to start the game.");
        return;
    }

    await loadAssetsOnce();

    const deck = shuffle([...allCards]);
    const startCardIdx = getStartCardIdx(deck);
    const startCard = deck[startCardIdx];
    const centerRow = Math.ceil(boardRows / 2);
    const centerCol = Math.ceil(boardCols / 2);

    const hands = makeHands(deck, game.players.length, startCardIdx);
    const handsByPlayer = Object.fromEntries(hands.map((hand, idx) => [game.players[idx], hand]));
    const transitsByPlayer = Object.fromEntries(game.players.map((playerName) => [playerName, 2]));

    await updateDoc(gamesRef, {
        [`${gameKey}.hands`]: handsByPlayer,
        [`${gameKey}.transits`]: transitsByPlayer,
        [`${gameKey}.board`]: {
            [`${centerRow}-${centerCol}`]: serializeBoardCell(startCard, false),
        },
        [`${gameKey}.startingCard`]: startCard.toDict(),
        [`${gameKey}.turn`]: 0,
        [`${gameKey}.playing`]: true,
        [`${gameKey}.finishedOrder`]: [],
    });

    el.startBtn.disabled = true;
}

async function leaveGame() {
    const game = gameData();
    if (!game) {
        return;
    }

    if (host) {
        await updateDoc(gamesRef, {
            [gameKey]: deleteField(),
        });
        return;
    }

    const players = Array.isArray(game.players) ? game.players.filter((playerName) => playerName !== name) : [];
    await updateDoc(gamesRef, {
        [`${gameKey}.players`]: players,
        [`${gameKey}.hands.${name}`]: deleteField(),
        [`${gameKey}.transits.${name}`]: deleteField(),
    });
}

async function returnHome() {
    try {
        await leaveGame();
    } finally {
        window.location.href = "./home.html";
    }
}

function startBoardDrag(event) {
    isBoardDragging = true;
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    boardStartX = clientX;
    boardStartY = clientY;
    el.board.style.cursor = "grabbing";
}

function moveBoard(event) {
    if (!isBoardDragging) {
        return;
    }

    event.preventDefault();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const dx = clientX - boardStartX;
    const dy = clientY - boardStartY;

    boardStartX = clientX;
    boardStartY = clientY;
    boardX += dx;
    boardY += dy;
    updateBoardTransform();
}

function stopBoardDrag() {
    isBoardDragging = false;
    el.board.style.cursor = "grab";
}

function cancelBoardDrag() {
    isBoardDragging = false;
    el.board.style.cursor = "grab";
}

let initialPinchDistance = null;

function handleTouchMove(event) {
    if (event.touches.length !== 2) {
        return;
    }

    event.preventDefault();
    const [touch1, touch2] = event.touches;
    const pinchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
    );

    if (initialPinchDistance === null) {
        initialPinchDistance = pinchDistance;
        return;
    }

    const pinchScale = pinchDistance / initialPinchDistance;
    boardScale *= pinchScale;
    boardScale = Math.max(minBoardScale, Math.min(maxBoardScale, boardScale));
    initialPinchDistance = pinchDistance;
    updateBoardTransform();
}

function handleTouchEnd() {
    initialPinchDistance = null;
}

function clearPossiblePositions() {
    document.querySelectorAll(".possible").forEach((possible) => possible.remove());
}

function addPossibleToBoard(row, col, numBorders) {
    const possibleElement = document.createElement("div");
    possibleElement.classList.add("possible");
    possibleElement.dataset.row = String(row);
    possibleElement.dataset.col = String(col);
    possibleElement.style.gridRow = String(row);
    possibleElement.style.gridColumn = String(col);
    possibleElement.setAttribute("numBorders", String(numBorders));

    possibleElement.addEventListener("dragover", (event) => {
        event.preventDefault();
    });

    possibleElement.addEventListener("drop", async (event) => {
        event.preventDefault();
        clearPossiblePositions();

        const target = event.currentTarget;
        const row = Number(target.dataset.row);
        const col = Number(target.dataset.col);
        const numBorders = Number(target.getAttribute("numBorders") ?? 0);
        const isTransit = draggingCardName.startsWith("transit");

        if (isTransit) {
            mustPlayOff = true;
            mustPlayOffRow = row;
            mustPlayOffCol = col;

            const allowedCountries = getAllowedCountriesAt(row, col);
            const allowedSeas = getAllowedSeasAt(row, col);
            const chosenCard = await getTransitCard(allowedCountries, allowedSeas);

            if (chosenCard instanceof Card || chosenCard instanceof Sea) {
                await placeCard(chosenCard, row, col, true, numBorders);
                await removeTransitFromHand();
            }
            return;
        }

        mustPlayOff = false;
        if (draggingCard) {
            await placeCard(draggingCard, row, col, false, numBorders);
            await removeCardFromHandByName(draggingCardName);

            if (numBorders <= 1) {
                await endTurnRemote();
            }
        }
    });

    el.board.appendChild(possibleElement);
}

let resolveTransitPromise = null;

async function getTransitCard(countryNames, seaNames) {
    el.getTransitCardDiv.style.display = "block";
    el.getTransitCardCountriesUl.innerHTML = "";
    el.getTransitCardSeasUl.innerHTML = "";

    const buttons = [];

    countryNames.forEach((countryName) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = countryName;
        button.addEventListener("click", () => {
            el.getTransitCardDiv.style.display = "none";
            if (resolveTransitPromise) {
                resolveTransitPromise(getCardByName(countryName));
                resolveTransitPromise = null;
            }
        });
        el.getTransitCardCountriesUl.appendChild(button);
        buttons.push(button);
    });

    seaNames.forEach((seaName) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = seaName;
        button.addEventListener("click", () => {
            el.getTransitCardDiv.style.display = "none";
            if (resolveTransitPromise) {
                resolveTransitPromise(getSeaByName(seaName));
                resolveTransitPromise = null;
            }
        });
        el.getTransitCardSeasUl.appendChild(button);
        buttons.push(button);
    });

    if (buttons.length === 0) {
        el.getTransitCardDiv.style.display = "none";
        alert("No valid transit options here.");
        return null;
    }

    return new Promise((resolve) => {
        resolveTransitPromise = resolve;
    });
}

async function placeCard(card, row, col, isTransit, numBorders) {
    addCardToBoard(card, row, col, isTransit);
    await updateDoc(gamesRef, {
        [`${gameKey}.board.${row}-${col}`]: serializeBoardCell(card, isTransit),
    });

    if (numBorders > 1) {
        return;
    }
}

async function persistHand() {
    if (!player) {
        return;
    }

    await updateDoc(gamesRef, {
        [`${gameKey}.hands.${name}`]: player.toPlainCards(),
    });
}

async function persistTransitCount() {
    if (!player) {
        return;
    }

    await updateDoc(gamesRef, {
        [`${gameKey}.transits.${name}`]: player.numTransits,
    });
}

async function removeCardFromHandByName(cardName) {
    if (!player) {
        return;
    }

    player.removeCardFromHandByName(cardName);
    renderHand();
    await persistHand();
}

async function removeTransitFromHand() {
    if (!player) {
        return;
    }

    player.numTransits = Math.max(0, player.numTransits - 1);
    renderHand();
    await persistTransitCount();
}

function renderHand() {
    el.playerHand.innerHTML = "";

    if (!player) {
        setHandVisibility(false);
        return;
    }

    player.cards.forEach((card) => {
        const cardElement = document.createElement("div");
        cardElement.id = card.name;
        cardElement.classList.add("card-in-hand");
        if (!isPlayerTurn) {
            cardElement.classList.add("disabled");
        }
        cardElement.dataset.cardName = card.name;
        cardElement.style.backgroundImage = `url(${String(card.image).replace(/ /g, "_")})`;
        cardElement.draggable = isPlayerTurn;

        cardElement.addEventListener("dragstart", () => {
            draggingCard = card;
            draggingCardName = card.name;
            renderPossiblePositions();
        });

        cardElement.addEventListener("dragend", () => {
            clearPossiblePositions();
            draggingCard = null;
            draggingCardName = "";
        });

        el.playerHand.appendChild(cardElement);
    });

    for (let i = 0; i < (player.numTransits ?? 0); i += 1) {
        const transitElement = document.createElement("div");
        transitElement.id = `transit-${i}`;
        transitElement.classList.add("transit-in-hand");
        if (!isPlayerTurn) {
            transitElement.classList.add("disabled");
        }
        transitElement.draggable = isPlayerTurn;

        transitElement.addEventListener("dragstart", () => {
            draggingCard = null;
            draggingCardName = `transit-${i}`;
            renderPossiblePositions();
        });

        transitElement.addEventListener("dragend", () => {
            clearPossiblePositions();
            draggingCardName = "";
        });

        el.playerHand.appendChild(transitElement);
    }

    setHandVisibility(true);
}

function getPositionsOfPossibles() {
    if (!draggingCardName) {
        return {};
    }

    const isTransit = draggingCardName.startsWith("transit");
    const directions = [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
    ];
    const numBorders = {};

    if (mustPlayOff) {
        if (isTransit) {
            return {};
        }

        const key = `${mustPlayOffRow}-${mustPlayOffCol}`;
        if (Object.hasOwn(boardState, key)) {
            directions.forEach(([dRow, dCol]) => {
                const nextKey = `${mustPlayOffRow + dRow}-${mustPlayOffCol + dCol}`;
                if (!Object.hasOwn(boardState, nextKey)) {
                    numBorders[nextKey] = 0;
                }
            });
        }
    } else {
        for (const key of Object.keys(boardState)) {
            const [row, col] = key.split("-").map((value) => Number(value));
            directions.forEach(([dRow, dCol]) => {
                const nextKey = `${row + dRow}-${col + dCol}`;
                if (!Object.hasOwn(boardState, nextKey)) {
                    numBorders[nextKey] = 0;
                }
            });
        }
    }

    if (isTransit) {
        for (const key of Object.keys(numBorders)) {
            const [row, col] = key.split("-").map((value) => Number(value));
            if (getAllowedCountriesAt(row, col).length + getAllowedSeasAt(row, col).length === 0 || bordersTransit(row, col)) {
                numBorders[key] = null;
            }
        }
        return Object.fromEntries(Object.entries(numBorders).filter(([, value]) => value !== null));
    }

    if (!draggingCard) {
        return {};
    }

    for (const key of Object.keys(boardState)) {
        const [row, col] = key.split("-").map((value) => Number(value));
        const currCard = boardState[key];

        directions.forEach(([dRow, dCol]) => {
            const nextKey = `${row + dRow}-${col + dCol}`;
            if (!(nextKey in numBorders)) {
                return;
            }

            const element = getElementByRowCol(row, col);
            if (element && element.classList.contains("transit-on-board")) {
                numBorders[nextKey] = null;
                return;
            }

            if (currCard instanceof Card) {
                if (currCard.borders.includes(draggingCard.name)) {
                    if (numBorders[nextKey] !== null) {
                        numBorders[nextKey] += 1;
                    }
                } else {
                    numBorders[nextKey] = null;
                }
            } else if (currCard instanceof Sea) {
                if (draggingCard.seas.includes(currCard.name)) {
                    if (numBorders[nextKey] !== null) {
                        numBorders[nextKey] += 1;
                    }
                } else {
                    numBorders[nextKey] = null;
                }
            } else {
                numBorders[nextKey] = null;
            }
        });
    }

    return Object.fromEntries(Object.entries(numBorders).filter(([, value]) => value !== null));
}

function renderPossiblePositions() {
    clearPossiblePositions();
    const positions = getPositionsOfPossibles();
    for (const [key, numBorders] of Object.entries(positions)) {
        const [row, col] = key.split("-").map((value) => Number(value));
        addPossibleToBoard(row, col, numBorders);
    }
}

async function skipTurn() {
    const currentGame = gameData();
    if (!player || !currentGame || index < 0) {
        return;
    }

    player.numTransits += 1;
    renderHand();

    const nextTurn = (currentGame.turn + 1) % playerNames.length;
    await updateDoc(gamesRef, {
        [`${gameKey}.transits.${name}`]: player.numTransits,
        [`${gameKey}.turn`]: nextTurn,
    });

    endTurn();
}

function highlightCards() {
    if (!player) {
        return;
    }

    for (const cardElement of el.playerHand.children) {
        if (!cardElement.classList.contains("card-in-hand")) {
            continue;
        }

        draggingCardName = cardElement.id;
        draggingCard = getCardByName(draggingCardName);

        if (Object.keys(getPositionsOfPossibles()).length === 0) {
            cardElement.classList.add("blurred");
        }
    }

    draggingCard = null;
    draggingCardName = "";
}

function unhighlightCards() {
    for (const cardElement of el.playerHand.children) {
        cardElement.classList.remove("blurred");
    }
}

async function startTurn() {
    if (!player) {
        return;
    }

    isPlayerTurn = true;
    el.skipTurnBtn.disabled = false;
    el.highlightCardsBtn.disabled = false;
    el.unhighlightCardsBtn.disabled = false;

    document.querySelectorAll(".card-in-hand").forEach((cardElement) => {
        cardElement.classList.remove("disabled");
        cardElement.draggable = true;
    });

    document.querySelectorAll(".transit-in-hand").forEach((transitElement) => {
        transitElement.classList.remove("disabled");
        transitElement.draggable = true;
    });
}

function endTurn() {
    isPlayerTurn = false;
    el.skipTurnBtn.disabled = true;
    el.highlightCardsBtn.disabled = true;
    el.unhighlightCardsBtn.disabled = true;

    document.querySelectorAll(".card-in-hand").forEach((cardElement) => {
        cardElement.classList.add("disabled");
        cardElement.draggable = false;
    });

    document.querySelectorAll(".transit-in-hand").forEach((transitElement) => {
        transitElement.classList.add("disabled");
        transitElement.draggable = false;
    });
}

async function endTurnRemote() {
    const currentGame = gameData();
    if (!currentGame || index < 0) {
        return;
    }

    const nextTurn = (currentGame.turn + 1) % playerNames.length;
    await updateDoc(gamesRef, {
        [`${gameKey}.turn`]: nextTurn,
    });
    endTurn();
}

function renderGameOver(finishedOrder) {
    el.gameEndDiv.style.display = "block";
    el.finishedOrderOl.innerHTML = "";

    finishedOrder.forEach((playerName) => {
        const li = document.createElement("li");
        li.textContent = playerName;
        el.finishedOrderOl.appendChild(li);
    });
}

async function syncFromGame(game) {
    if (!game) {
        if (!host) {
            alert("Game deleted");
            window.location.href = "./home.html";
        }
        return;
    }

    setGameData(game);
    renderLobby(game);

    if (game.playing && !gameInitialized) {
        gameInitialized = true;
        setPlayer(new Player(name));
        index = Array.isArray(game.players) ? game.players.indexOf(name) : -1;
        await loadAssetsOnce();
        setBoardVisibility(true);
        setHandVisibility(true);
    }

    if (game.playing) {
        if (!handLoaded && game.hands && Array.isArray(game.hands[name])) {
            const cards = game.hands[name].map((cardData) => new Card(
                cardData.name,
                cardData.borders ?? [],
                cardData.seas ?? [],
                cardData.image
            ));
            const numTransits = game.transits?.[name] ?? 2;
            player.dealCards(cards, numTransits);
            handLoaded = true;
            renderHand();
        } else if (player && game.transits && Object.hasOwn(game.transits, name)) {
            player.numTransits = game.transits[name];
            renderHand();
        }

        renderBoard(game.board ?? {});

        if (index === game.turn) {
            if (!isPlayerTurn) {
                await startTurn();
            }
        } else if (isPlayerTurn) {
            endTurn();
        }

        if (Array.isArray(game.finishedOrder) && game.finishedOrder.length > 0) {
            renderGameOver(game.finishedOrder);
        }
    } else {
        endTurn();
        setBoardVisibility(false);
        if (host) {
            el.startBtn.disabled = (Array.isArray(game.players) ? game.players.length : 0) < 2;
        }
    }
}

function listenToGame() {
    onSnapshot(gamesRef, (snapshot) => {
        const game = gameSnapshotToData(snapshot);
        void syncFromGame(game);
    });
}

function attachHandDragScroll() {
    let isHandDragging = false;
    let handStartX = 0;
    let scrollLeft = 0;

    el.playerHand.addEventListener("mousedown", (event) => {
        if (event.target.classList.contains("card-in-hand") || event.target.classList.contains("transit-in-hand")) {
            return;
        }

        isHandDragging = true;
        handStartX = event.pageX - el.playerHand.offsetLeft;
        scrollLeft = el.playerHand.scrollLeft;
        el.playerHand.style.cursor = "grabbing";

        document.querySelectorAll(".card-in-hand, .transit-in-hand").forEach((cardElement) => {
            cardElement.style.pointerEvents = "none";
        });
    });

    el.playerHand.addEventListener("mousemove", (event) => {
        if (!isHandDragging) {
            return;
        }

        event.preventDefault();
        const x = event.pageX - el.playerHand.offsetLeft;
        const walk = (x - handStartX) * 2;
        el.playerHand.scrollLeft = scrollLeft - walk;
    });

    const stopDraggingHand = () => {
        isHandDragging = false;
        el.playerHand.style.cursor = "grab";

        document.querySelectorAll(".card-in-hand, .transit-in-hand").forEach((cardElement) => {
            cardElement.style.pointerEvents = "";
        });
    };

    el.playerHand.addEventListener("mouseup", stopDraggingHand);
    el.playerHand.addEventListener("mouseleave", stopDraggingHand);
}

function attachBoardEvents() {
    el.board.addEventListener("wheel", (event) => {
        event.preventDefault();
        const zoomSpeed = 0.1;
        boardScale += event.deltaY < 0 ? zoomSpeed : -zoomSpeed;
        boardScale = Math.max(minBoardScale, Math.min(maxBoardScale, boardScale));
        updateBoardTransform();
    }, { passive: false });

    el.board.addEventListener("mousedown", startBoardDrag);
    el.board.addEventListener("mousemove", moveBoard);
    el.board.addEventListener("mouseup", stopBoardDrag);
    el.board.addEventListener("mouseleave", cancelBoardDrag);

    el.board.addEventListener("touchstart", startBoardDrag, { passive: true });
    el.board.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.board.addEventListener("touchend", handleTouchEnd);
    el.board.addEventListener("touchcancel", handleTouchEnd);
}

function attachButtonEvents() {
    el.returnBtn.addEventListener("click", () => {
        void returnHome();
    });
    el.returnHomeBtn.addEventListener("click", () => {
        void returnHome();
    });
    el.centerBtn.addEventListener("click", centerBoard);
    el.skipTurnBtn.addEventListener("click", () => {
        void skipTurn();
    });
    el.highlightCardsBtn.addEventListener("click", highlightCards);
    el.unhighlightCardsBtn.addEventListener("click", unhighlightCards);
    el.startBtn.addEventListener("click", () => {
        void startGame();
    });
}

function attachUnloadEvents() {
    window.addEventListener("pagehide", () => {
        void leaveGame();
    });

    window.addEventListener("beforeunload", () => {
        void leaveGame();
    });
}

function init() {
    el.gamePinP.textContent = `Game PIN: ${gamePin}`;
    el.infoContainer.style.display = "block";

    if (host) {
        el.startBtn.style.display = "block";
    } else {
        el.waitingForGameToStartP.style.display = "block";
    }

    attachBoardEvents();
    attachHandDragScroll();
    attachButtonEvents();
    attachUnloadEvents();
    listenToGame();
}

init();

window.getCardByName = getCardByName;
window.boardState = boardState;
window.__mapominoesGameData = null;
