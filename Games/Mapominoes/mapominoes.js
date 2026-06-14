import { bordersTransit, getAllowedCountriesAt, getAllowedSeasAt, getElementByRowCol } from "./functions.js";
import { Game, Player, Card, Sea, Pack } from "./classes.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getFirestore,
    doc,
    collection,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    deleteField,
    onSnapshot,
    arrayRemove,
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
const db = getFirestore(app);


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

const host = window.localStorage.getItem("host") == "true";
const gamePin = parseInt(window.localStorage.getItem("gamePin"));
const name = window.localStorage.getItem("name");

const cardWidth = 80;
const cardHeight = 128;
const boardCols = 101;
const boardRows = 101;
const boardWidth = cardWidth * boardCols;
const boardHeight = cardHeight * boardRows;

let packNames = [];
let playerNames = [];

let startingCardPlaced = false;

let isBoardDragging = false;
let boardStartX, boardStartY;
let boardX = 0;
let boardY = 0;
let boardScale = 1;
const minBoardScale = 0.5;
const maxBoardScale = 4;

export let player = null;
window.player = player;

let index = null;

let playing = false;
let isPlayerTurn = false;

el.returnBtn.addEventListener("click", returnHome);
el.returnHomeBtn.addEventListener("click", returnHome);

function listenToGame() {
    const gamesRef = doc(db, "Mapominoes", "Games");

    onSnapshot(gamesRef, snapshot => {
        if (!snapshot.exists()) return;
        if (!Object.hasOwn(snapshot.data(), gamePin.toString()) && !host) {
            // Game deleted
            alert("Game deleted");
            window.location.href = "./home.html";
        }
        const gameData = snapshot.data()[gamePin];
        updatePlayersList();
        if (gameData.playing && !playing) {
            gameStarted();
        }
        updateHand();
        if (snapshot.data()[gamePin].turn === index && !isPlayerTurn) {
            startTurn();
        }
        if (snapshot.data()[gamePin].startingCard && !startingCardPlaced) {
            const startingCardData = snapshot.data()[gamePin].startingCard;
            const startingCard = new Card(startingCardData.name, startingCardData.borders, startingCardData.seas, startingCardData.image);
            addCardToBoard(startingCard, Math.ceil(boardCols/2), Math.ceil(boardRows/2))
            startingCardPlaced = true;
        }
    });
}

async function leaveGame() {
    const gamesRef = doc(db, "Mapominoes", "Games");
    
    if (host) {
        await updateDoc(gamesRef, {
            [gamePin]: deleteField()
        })
    } else {
        await updateDoc(gamesRef, {
            [`${gamePin}.players`]: arrayRemove(name)
        });
    }
}
async function returnHome() {
    await leaveGame();
    window.location.href = "./home.html";
}

const startBoardDrag = (event) => {
    isBoardDragging = true;
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    boardStartX = clientX;
    boardStartY = clientY;
    el.board.style.cursor = "grabbing";
};
const moveBoard = (event) => {
    if (!isBoardDragging) return;
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
};
const stopBoardDrag = () => {
    isBoardDragging = false;
    el.board.style.cursor = "grab";
};
const cancelBoardDrag = () => {
    if (isBoardDragging) {
        isBoardDragging = false;
        el.board.style.cursor = "grab";
    }
}

const updateBoardTransform = () => {
    el.board.style.transform = `translate(-50%, -50%) translate(${boardX}px, ${boardY}px) scale(${boardScale})`;
}

el.board.addEventListener("wheel", (event) => {
    event.preventDefault();
    const zoomSpeed = 0.1;
    boardScale += event.deltaY < 0 ? zoomSpeed : -zoomSpeed;
    boardScale = Math.max(minBoardScale, Math.min(maxBoardScale, boardScale));
    updateBoardTransform();
});
let initialPinchDistance = null;
el.board.addEventListener("touchmove", (event) => {
    if (event.touches.length === 2) {
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
});
el.board.addEventListener(("touchend"), (event) => {
    initialPinchDistance = null;
});

el.board.addEventListener("mousedown", startBoardDrag);
el.board.addEventListener("mousemove", moveBoard);
el.board.addEventListener("mouseup", stopBoardDrag);
el.board.addEventListener("mouseleave", cancelBoardDrag);

el.board.addEventListener("touchstart", startBoardDrag);
el.board.addEventListener("touchmove", moveBoard);
el.board.addEventListener("touchend", stopBoardDrag);
el.board.addEventListener("touchcancel", stopBoardDrag);

function centerBoard() {
    boardX = 0;
    boardY = 0;
    boardScale = 1;
    updateBoardTransform();
}

export const boardState = {};

function addCardToBoard(card, row, col, isTransit = false) {
    if (isTransit) el.skipTurnBtn.disabled = true;
    const cardElement = document.createElement("div");
    cardElement.classList.add("card-on-board");
    if (isTransit) cardElement.classList.add("transit-on-board");
    cardElement.id = card.name;
    cardElement.style.backgroundImage = `url(${card.image.replace(/ /g, "_")})`;
    cardElement.style.gridRow = row;
    cardElement.style.gridColumn = col;

    el.board.appendChild(cardElement);
    boardScale[`${row}-${col}`] = card;
}
async function addPossibleToBoard(row, col, numBorders) {
    const possibleElement = document.createElement("div");
    possibleElement.classList.add("possible");
    possibleElement.style.gridRow = row;
    possibleElement.style.gridColumn = col;
    possibleElement.setAttribute("numBorders", numBorders);

    possibleElement.addEventListener("dragover", (event) => {
        event.preventDefault();
    });

    possibleElement.add("drop", async (event) => {
        event.preventDefault();
        unhighlightCards();
        const isTransit = draggingCardName.includes("transit");
        const row = parseInt(event.target.style.gridRow);
        const col = parseInt(event.target.style.gridColumn);
        const numBorders = parseInt(event.target.getAttribute("numBorders"));
        if (isTransit) {
            mustPlayOff = true;
            mustPlayOffRow = row;
            mustPlayOffCol = col;
            const card = await getTransitCard(getAllowedCountriesAt(row, col), getAllowedSeasAt(row, col));
            if (card instanceof Sea || card instanceof Card) {
                addCardToBoard(card, row, col, true);
                removeTransitFromHand();
                // Add firebase code
            } else {
                alert("Unknown type of card selected");
            }
        } else {
            mustPlayOff = false;
            addCardToBoard(draggingCard, row, col);
            removeCardFromHandByName(draggingCardName);
            // Add firebase code

            if (numBorders <= 1) {
                // end go
                endTurn();
                // Add firebase code
            }
        }
    });

    el.board.appendChild(possibleElement);
}

async function getTransitCard(countryNames, seaNames) {
    el.getTransitCardDiv.style.display = "block";
    el.getTransitCardCountriesUl.innerHTML = "";
    el.getTransitCardSeasUl.innerHTML = "";

    return new Promise((resolve) => {
        countryNames.forEach(countryName => {
            const countryNameElement = document.createElement("button");
            countryNameElement.textContent = countryName;
            countryNameElement.onclick = () => {
                el.getTransitCardDiv.style.display = "none";
                resolve(getCardByName(countryName));
            };
            el.getTransitCardCountriesUl.appendChild(countryNameElement);
        });
        seaNames.forEach(seaName => {
            const seaNameElement = document.createElement("button");
            seaNameElement.textContent = seaName;
            seaNameElement.onclick = () => {
                el.getTransitCardDiv.style.display = "none";
                resolve(getSeaByName(seaName));
            };
            el.getTransitCardSeasUl.appendChild(seaNameElement);
        });
    });
}

function selectTransitCard(cardName, isCountry) {
    if (isCountry) return getCardByName(cardName);
    else return getSeaByName(cardName);
    el.getTransitCardDiv.style.display = "none";
}

let isHandDragging = false;
let handStartX, scrollLeft;
let draggingCardName;
let draggingCard;

let mustPlayOff = false;
let mustPlayOffRow, mustPlayOffCol;

el.playerHand.addEventListener("mousedown", (event) => {
    if (event.target.classList.contains("card-in-hand")) return;
    isHandDragging = true;
    handStartX = event.pageX - el.playerHand.offsetLeft;
    scrollLeft = el.playerHand.scrollLeft;
    el.playerHand.style.cursor = "grabbing";

    const cards = document.querySelectorAll(".card-in-hand");
    cards.forEach(card => (card.style.pointerEvents = "none"));
});
el.playerHand.addEventListener("mousemove", (event) => {
    if (!isHandDragging) return;
    event.preventDefault();
    const x = event.pageX - el.playerHand.offsetLeft;
    const walk = (x - handStartX) * 2;
    el.playerHand.scrollLeft = scrollLeft - walk;
});
el.playerHand.addEventListener("mouseup", () => {
    isHandDragging = false;
    el.playerHand.style.cursor = "grab";

    const cards = document.querySelectorAll(".card-in-hand");
    cards.forEach(card => (card.style.pointerEvents = ""));
});
el.playerHand.addEventListener("mouseleave", () => {
    isHandDragging = false;
    
    const cards = document.querySelectorAll(".card-in-hand");
    cards.forEach(card => (card.style.pointerEvents = ""));
});

function renderHand() {
    el.playerHand.innerHTML = "";
    player.cards.forEach(card => {
        const cardElement = document.createElement("div");
        cardElement.id = card.name;
        cardElement.classList.add("card-in-hand");
        if (!isPlayerTurn) cardElement.classList.add("disabled");
        cardElement.style.backgroundImage = `url(${card.image.replace(/ /g, "_")})`;
        cardElement.draggable = isPlayerTurn;

        cardElement.addEventListener("dragstart", (event) => {
            draggingCard = card;
            draggingCardName = card.name;
            renderPossiblePositions();
        });
        cardElement.addEventListener("dragend", (event) => {
            destroyPossiblePositions();
        });
        el.playerHand.appendChild(cardElement);
    });
    for (let i = 0; i<player.numTransits; i++) {
        const transitElement = document.createElement("div");
        transitElement.id = `transit-${i}`;
        transitElement.classList.add("transit-in-hand");
        if (!isPlayerTurn) transitElement.classList.add("disabled");
        transitElement.draggable = isPlayerTurn;

        transitElement.addEventListener("dragstart", (event) => {
            draggingCardName = `transit-${i}`;
            renderPossiblePositions();
        });
        transitElement.addEventListener("dragend", (event) => {
            destroyPossiblePositions();
        });
        el.playerHand.appendChild(transitElement);
    }
    el.playerHand.style.display = "flex";
    el.playerHandWhiteSpace.style.display = "block";
}

function removeCardFromHandByName(cardName) {
    player.removeCardFromHandByName(cardName);
    renderHand();
}
function removeTransitFromHand() {
    player.numTransits -= 1;
    renderHand();
}

let allCards;
let allSeas;

function getCardByName(cardName) {
    for (const card of allCards) if (card.name === cardName) return card;
}
function getSeaByName(seaName) {
    for (const sea of allSeas) if (sea.name === seaName) return sea;
}

function getPositionsOfPossibles() {
    const isTransit = draggingCardName.includes("transit");
    const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const numBorders = {};
    if (mustPlayOff) {
        if (isTransit) return;
        const key = `${mustPlayOffRow}-${mustPlayOffCol}`;
        if (boardState.hasOwnProperty(key)) {
            const card = boardState[key];
            directions.forEach(([dRow, dCol]) => {
                if (!(`${mustPlayOffRow+dRow}-${mustPlayOffCol+dCol}` in boardState)) {
                    numBorders[`${mustPlayOffRow+dRow}-${mustPlayOffCol+dCol}`] = 0;
                }
            });
        }
    } else {
        for (const key in boardState) {
            const [row, col] = key.split("-").map(x => parseInt(x));
            if (boardState.hasOwnProperty(key)) {
                directions.forEach(([dRow, dCol]) => {
                    if (!(`${row+dRow}-${col+dCol}` in boardState)) {
                        numBorders[`${row+dRow}-${col+dCol}`] = 0;
                    }
                });
            }
        }
    }
    if (isTransit) {
        for (const key in numBorders) {
            const [row, col] = key.split("-").map(x => parseInt(x));
            if (numBorders.hasOwnProperty(key)) {
                if (((getAllowedCountriesAt(row, col).length + getAllowedSeasAt(row, col).length) === 0) || (bordersTransit(row, col))) numBorders[key] = null;
            }
        }
    } else {
        for (const key in boardState) {
            const [row, col] = key.split("-").map(x => parseInt(x));
            if (boardState.hasOwnProperty(key)) {
                const currCard = boardState[key];
                if (currCard instanceof Card) {
                    directions.forEach(([dRow, dCol]) => {
                        if (`${row+dRow}-${col+dCol}` in numBorders) {
                            if (currCard.borders.includes(draggingCard.name)) {
                                if (numBorders[`${row+dRow}-${col+dCol}`] !== null && !(getElementByRowCol(row, col).classList.contains("transit-on-board"))) {
                                    numBorders[`${row+dRow}-${col+dCol}`] += 1;
                                }
                            } else {
                                numBorders[`${row+dRow}-${col+dCol}`] = null;
                            }
                        }
                    });
                } else if (currCard instanceof Sea) {
                    directions.forEach(([dRow, dCol]) => {
                        if (`${row+dRow}-${col+dCol}` in numBorders) {
                            if (draggingCard.seas.includes(currCard.name)) {
                                if (numBorders[`${row+dRow}-${col+dCol}`] !== null && !(getElementByRowCol(row,col).classList.contains("transit-on-board"))) {
                                    numBorders[`${row+dRow}-${col+dCol}`] += 1;
                                }
                            } else {
                                numBorders[`${row+dRow}-${col+dCol}`] = null;
                            }
                        }
                    });
                } else {
                    alert("Unknown type of card");
                }
            }
        }
    }
    return Object.fromEntries(Object.entries(numBorders).filter(([key, value]) => value !== null));
}

function renderPossiblePositions() {
    const positions = getPositionsOfPossibles();
    for (const key of Object.keys(positions)) {
        const [row, col] = key.split("-").map(x => parseInt(x));
        addPossibleToBoard(row, col, positions[key]);
    }
}
function destroyPossiblePositions() {
    document.querySelectorAll(".possible").forEach(possible => possible.remove());
}

async function skipTurn() {
    player.numTransits += 1;
    renderHand();
    endTurn();
    // Add Firebase code
}

function highlightCards() {
    for (const card of el.playerHand.children) {
        if (card.classList.contains("transit-in-hands")) continue;
        draggingCardName = card.id;
        draggingCard = getCardByName(draggingCardName);
        if (Object.values(getPositionsOfPossibles()).filter(value => value !== null).length === 0) {
            card.classList.add("blurred");
        }
    }
}
function unhighlightCards() {
    for (const card of el.playerHand.children) {
        card.classList.remove("blurred");
    }
}

async function startTurn() {
    if (player.cards.length === 0) {
        // Add firebase code
        return;
    }
    isPlayerTurn = true;
    el.skipTurnBtn.disabled = false;
    el.highlightCardsBtn.disabled = false;
    el.unhighlightCardsBtn.disabled = false;
    document.querySelectorAll(".card-in-hand").forEach(card => {
        card.classList.remove("disabled");
        card.draggable = true;
    });
    document.querySelectorAll(".transit-in-hand").forEach(transit => {
        transit.classList.remove("disabled");
        transit.draggable = true;
    });
}

function endTurn() {
    isPlayerTurn = false;
    el.skipTurnBtn.disabled = true;
    el.highlightCardsBtn.disabled = true;
    el.unhighlightCardsBtn.disabled = true;
    document.querySelectorAll(".card-in-hand").forEach(card => {
        card.classList.add("disabled");
        card.draggable = false;
    });
    document.querySelectorAll(".transit-in-hand").forEach(transit => {
        transit.classList.add("disabled");
        transit.draggable = false;
    });
}

document.addEventListener("DOMContentLoaded", async function () {
    if (host) {
        el.startBtn.style.display = "block";
    } else {
        el.waitingForGameToStartP.style.display = "block";
    }
    el.infoContainer.style.display = "block";
    // Add firebase code

    el.gamePinP.textContent = `Game PIN: ${gamePin}`;
    updatePacksList();
    updatePlayersList();
});

async function updatePacksList() {
    // Get pack names from firebase
    const gameRef = doc(db, "Mapominoes", "Games");
    const snapshot = await getDoc(gameRef);
    const gameData = snapshot.data()[gamePin];
    packNames = gameData.packs;

    // Update packsP
    el.packsP.textContent = `Packs: ${packNames.join(", ")}`;
}

async function updatePlayersList() {
    // Get player names from firebase
    const gameRef = doc(db, "Mapominoes", "Games");
    const snapshot = await getDoc(gameRef);
    const gameData = snapshot.data()[gamePin];
    playerNames = gameData.players;
    // Update playersList
    el.playersList.innerHTML = "";
    playerNames.forEach(playerName => {
        const playerNameLi = document.createElement("li");
        if (playerName === name) {
            const strong = document.createElement("strong");
            strong.textContent = playerName;
            playerNameLi.appendChild(strong);
        } else {
            playerNameLi.textContent = playerName;
        }
        el.playersList.appendChild(playerNameLi);
    });
    if (!playing) {
        el.startBtn.disabled = playerNames.length < 2;
    }
}

async function updateHand() {
    if (!player) return;
    if (player.hand) return;
    const gamesRef = doc(db, "Mapominoes", "Games");
    const snapshot = await getDoc(gamesRef);
    const gameData = snapshot.data()[gamePin];
    
    if (Object.hasOwn(gameData.hands, name)) {
        const cards = gameData.hands[name];
        player.dealCards(cards.map(cardData => new Card(cardData.name, cardData.borders, cardData.seas, cardData.image)), 2);
        renderHand();
        el.boardContainer.style.display = "block";
    }
}

function getStartCardIdx() {
    let i = 0;
    while (true) {
        if (allCards[i].borders.length >= 3) return i;
        i++;
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

async function gameStarted() {
    playing = true;
    player = new Player(name);
    // Get all cards and seas
    allCards = [];
    allSeas = [];
    for (const packName of packNames) {
        const countriesRef = doc(db, "Mapominoes", "Packs", packName, "Countries");
        const countriesSnapshot = await getDoc(countriesRef);
        for (const [countryName, countryData] of Object.entries(countriesSnapshot.data())) {
            const currCard = new Card(countryName, countryData.Borders, countryData.Seas, `./Images/Cards/${packName}/${countryName}.jpg`);
            allCards.push(currCard);
        }
        const seasRef = doc(db, "Mapominoes", "Packs", packName, "Seas");
        const seasSnapshot = await getDoc(seasRef);
        for (const [seaName, seaData] of Object.entries(seasSnapshot.data())) {
            const currSea = new Sea(seaName, `./Images/Cards/Seas/${seaName}.jpg`);
            allSeas.push(currSea);
        }
    }

    if (host) {
        // Deal cards
        shuffle(allCards);
        const startCardIdx = getStartCardIdx();
        let pNum = 0;
        const numPlayers = playerNames.length;
        const hands = Array.from({ length: numPlayers }, () => []);
        allCards.forEach((card, idx) => {
            if (idx !== startCardIdx) {
                hands[pNum].push(card.toDict());
                pNum = (pNum + 1)%numPlayers;
            }
        });

        // Update on firebase
        const handsByPlayer = Object.fromEntries(
            hands.map((hand, idx) => [playerNames[idx], hand])
        );
        const gamesRef = doc(db, "Mapominoes", "Games");
        await updateDoc(gamesRef, {
            [`${gamePin}.hands`] : handsByPlayer
        });
        await updateDoc(gamesRef, {
            [`${gamePin}.startingCard`]: allCards[startCardIdx].toDict()
        });
    }
    
    const gamesRef = doc(db, "Mapominoes", "Games");
    const snapshot = await getDoc(gamesRef);
    const gameData = snapshot.data()[gamePin];
    index = gameData.players.indexOf(name);
    if (host) {
        await updateDoc(gamesRef, {
            [`${gamePin}.turn`]: 0
        });
    }
}

async function startGame() {
    // Add firebase code
    const gameRef = doc(db, "Mapominoes", "Games");
    await updateDoc(gameRef, {
        [`${gamePin}.playing`]: true,
    });
    el.startBtn.disabled = true;
}

function endGame(finishedOrder) {
    el.gameEndDiv.style.display = "block";

    el.finishedOrderOl.innerHTML = "";
    finishedOrder.forEach(playerName => {
        const playerNameLi = document.createElement("li");
        playerNameLi.textContent = playerName;
        el.finishedOrderOl.appendChild(playerNameLi);
    });
}

el.startBtn.addEventListener("click", startGame);
el.centerBtn.addEventListener("click", centerBoard);
el.skipTurnBtn.addEventListener("click", skipTurn);
el.highlightCardsBtn.addEventListener("click", highlightCards);
el.unhighlightCardsBtn.addEventListener("click", unhighlightCards);

window.addEventListener("pagehide", () => leaveGame)
listenToGame()
