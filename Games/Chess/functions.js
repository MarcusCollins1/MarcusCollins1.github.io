import {
    board
} from "./chess.js"

export function findValidMoves(rowIdx, colIdx) {
    const cellValue = board[rowIDx][colIdx];
    if (cellValue === "") return;
    const pieceColour = cellValue[0];
    const piece = cellValue[1];
    if (pieceColour !== currTurn) return;
    console.log(pieceColour, piece);
}