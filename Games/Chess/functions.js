import {
    board,
    currTurn,
    setCurrTurn,
} from "./chess.js"
import {
    checkForCheck
} from "./check.js"

const canWhiteCastle = [true, true];
const canBlackCastle = [true, true];

let validMoves = [];
let currRow;
let currCol;

function positionInBoard(row, col) {
    return (0 <= row) && (row < board.length) && (0 <= col) && (col < board[0].length);
}

export function findValidMoves(rowIdx, colIdx) {
    if (validMoves.some(
        ([r, c]) => r == rowIdx && c == colIdx
    )) {
        makeMove(rowIdx, colIdx);
        return;
    }
    validMoves = [];
    const cellValue = board[rowIdx][colIdx];
    if (cellValue === "") {
        renderValidMoves();
        return;
    }
    const pieceColour = cellValue[0];
    const piece = cellValue[1];
    if (pieceColour !== currTurn)  {
        renderValidMoves();
        return;
    }
    
    currRow = rowIdx;
    currCol = colIdx;

    let dirs = [];
    let newRow;
    let newCol;

    switch (piece) {
        // Bishop
        case "b":
            dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            for (const dir of dirs) {
                [newRow, newCol] = [rowIdx, colIdx];
                while (true) {
                    newRow += dir[0];
                    newCol += dir[1];
                    if (!positionInBoard(newRow, newCol)) break;
                    const newPiece = board[newRow][newCol];
                    if (newPiece === "") {
                        validMoves.push([newRow, newCol]);
                    } else if (newPiece[0] !== currTurn) {
                        validMoves.push([newRow, newCol]);
                        break;
                    } else {
                        break;
                    }
                }
            }
            break;
        // King
        case "k":
            dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            for (const dir of dirs) {
                [newRow, newCol] = [rowIdx+dir[0], colIdx+dir[1]];
                if (!positionInBoard(rowIdx, colIdx)) continue;
                const newPiece = board[newRow][newCol];
                if (newPiece === "") {
                    validMoves.push([newRow, newCol]);
                } else if (newPiece[0] !== currTurn) {
                    validMoves.push([newRow, newCol]);
                    continue;
                } else {
                    continue;
                }
            }
            // Check for castle
            if (pieceColour === "w") {
                if (canWhiteCastle[0]) {
                    if ((board[7][1] === "") && (board[7][2] === "") && (board[7][3] === "")) {
                        validMoves.push([7, 2])
                    }
                }
                if (canWhiteCastle[1]) {
                    if ((board[7][5] === "") && (board[7][6] === "")) {
                        validMoves.push([7, 6])
                    }
                }
            } else {
                if (canBlackCastle[0]) {
                    if ((board[0][1] === "") && (board[0][2] === "") && (board[0][3] === "")) {
                        validMoves.push([0, 2])
                    }
                }
                if (canBlackCastle[1]) {
                    if ((board[0][5] === "") && (board[0][6] === "")) {
                        validMoves.push([0, 6])
                    }
                }
            }
            break
        // Knight
        case "n":
            dirs = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            for (const dir of dirs) {
                [newRow, newCol] = [rowIdx+dir[0], colIdx+dir[1]];
                if (!positionInBoard(newRow, newCol)) continue;
                const newPiece = board[newRow][newCol];
                if (newPiece === "") {
                    validMoves.push([newRow, newCol]);
                } else if (newPiece[0] !== currTurn) {
                    validMoves.push([newRow, newCol]);
                    continue;
                } else {
                    continue;
                }
            }
            break
        // Pawn
        case "p":
            if (pieceColour === "w") {
                // Can move 1 up
                [newRow, newCol] = [rowIdx-1, colIdx];
                if (positionInBoard(newRow, newCol)) {
                    if (board[newRow][newCol] === "") {
                        validMoves.push([newRow, newCol]);
                    }
                }
                // Can move 2 up
                if (rowIdx == 6) {
                    [newRow, newCol] = [rowIdx-2, colIdx];
                    if (positionInBoard(newRow, newCol)) {
                        if (board[newRow][newCol] === "" && board[newRow+1][newCol] === "") {
                            validMoves.push([newRow, newCol]);
                        }
                    }
                }
                // Can move diagonal
                // Up-Left
                [newRow, newCol] = [rowIdx-1, colIdx-1];
                if (positionInBoard(newRow, newCol)) {
                    if (board[newRow][newCol] !== "" && board[newRow][newCol][0] === "b") {
                        validMoves.push([newRow, newCol]);
                    }
                }
                // Up-Right
                [newRow, newCol] = [rowIdx-1, colIdx+1];
                if (positionInBoard(newRow, newCol)) {
                    if (board[newRow][newCol] !== "" && board[newRow][newCol][0] === "b") {
                        validMoves.push([newRow, newCol]);
                    }
                }
            } else {
                // Can move 1 down
                [newRow, newCol] = [rowIdx+1, colIdx];
                if (positionInBoard(newRow, newCol)) {
                    if (board[newRow][newCol] === "") {
                        validMoves.push([newRow, newCol]);
                    }
                }
                // Can move 2 down
                if (rowIdx == 1) {
                    [newRow, newCol] = [rowIdx+2, colIdx];
                    if (positionInBoard(newRow, newCol)) {
                        if (board[newRow][newCol] === "" && board[newRow+1][newCol] === "") {
                            validMoves.push([newRow, newCol]);
                        }
                    }
                }
                // Can move diagonal
                // Down-Left
                [newRow, newCol] = [rowIdx+1, colIdx-1];
                if (positionInBoard(newRow, newCol)) {
                    if (board[newRow][newCol] !== "" && board[newRow][newCol][0] === "w") {
                        validMoves.push([newRow, newCol]);
                    }
                }
                // Down-Right
                [newRow, newCol] = [rowIdx+1, colIdx+1];
                if (positionInBoard(newRow, newCol)) {
                    if (board[newRow][newCol] !== "" && board[newRow][newCol][0] === "w") {
                        validMoves.push([newRow, newCol]);
                    }
                }
            }
            break
        // Queen
        case "q":
            dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            for (const dir of dirs) {
                [newRow, newCol] = [rowIdx, colIdx];
                while (true) {
                    newRow += dir[0];
                    newCol += dir[1];
                    if (!positionInBoard(newRow, newCol)) break;
                    const newPiece = board[newRow][newCol];
                    if (newPiece === "") {
                        validMoves.push([newRow, newCol]);
                    } else if (newPiece[0] !== currTurn) {
                        validMoves.push([newRow, newCol]);
                        break;
                    } else {
                        break;
                    }
                }
            }
            break
        // Rook
        case "r":
            dirs = [[-1, 0], [0, -1], [0, 1], [1, 0]];
            for (const dir of dirs) {
                [newRow, newCol] = [rowIdx, colIdx];
                while (true) {
                    newRow += dir[0];
                    newCol += dir[1];
                    if (!positionInBoard(newRow, newCol)) break;
                    const newPiece = board[newRow][newCol];
                    if (newPiece === "") {
                        validMoves.push([newRow, newCol]);
                    } else if (newPiece[0] !== currTurn) {
                        validMoves.push([newRow, newCol]);
                        break;
                    } else {
                        break;
                    }
                }
            }
            break
    }
    checkValidMoves();
    renderValidMoves();
}

function checkValidMoves() {
    const newValidMoves = [];
    for (const [row, col] of validMoves) {
        const currBoard = board.map(row => [...row]);

        // Check for castle
        if (currBoard[currRow][currCol] !== "" && currBoard[currRow][currCol][1] === "k" && (Math.abs(row-currRow)+Math.abs(col-currCol) === 2)) {
            if (col == 1) {
                currBoard[row][2] = currBoard[row][0];
                currBoard[row][0] = "";
            } else if (col === 6) {
                currBoard[row][5] = currBoard[row][7];
                currBoard[row][7] = "";
            }
        }
        currBoard[row][col] = currBoard[currRow][currCol];
        currBoard[currRow][currCol] = "";

        const isCheck = checkForCheck(currBoard);
        if (isCheck === currTurn) continue;

        newValidMoves.push([row, col]);
    }
    validMoves = newValidMoves;
}

function renderValidMoves() {
    Array.from(document.getElementsByClassName("dot")).forEach(dot => dot.remove());
    for (const [row, col] of validMoves) {
        const cell = document.getElementById(`${row+1}-${col+1}`)
        const img = document.createElement("img");
        img.src = "./Images/Dot.png"
        img.classList = "dot";
        cell.appendChild(img);
    }
}

function makeMove(row, col) {
    // Check for castle
    if (board[currRow][currCol] !== "" && board[currRow][currCol][1] === "k" && (Math.abs(row-currRow)+Math.abs(col-currCol) === 2)) {
        if (col === 1) {
            board[row][2] = board[row][0];
            board[row][0] = "";
        } else if (col === 6) {
            board[row][5] = board[row][7]
            board[row][7] = "";
        }
    }
    board[row][col] = board[currRow][currCol];
    board[currRow][currCol] = "";

    if (currTurn === "w") {
        setCurrTurn("b");
    }
    else {
        setCurrTurn("w");
    }
}