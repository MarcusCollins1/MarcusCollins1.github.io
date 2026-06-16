import {
    board,
    currTurn,
} from "./chess.js"

export function findValidMoves(rowIdx, colIdx) {
    const cellValue = board[rowIDx][colIdx];
    if (cellValue === "") return;
    const pieceColour = cellValue[0];
    const piece = cellValue[1];
    if (pieceColour !== currTurn) return;
    console.log(pieceColour, piece);
    
    const validMoves = [];
    const dirs = [];

    switch (piece) {
        // Bishop
        case "b":
            dirs = [(-1, -1), (-1, 1), (1, -1), (1, 1)];
            for (const dir of dirs) {
                const [newRow, newCol] = rowIdx, colIdx;
                while (true) {
                    newRow += dir[0];
                    newCol += dir[1];
                    if (!((0 <= newRow < board.length) && (0 <= newCol <= board[0].length))) break;
                    const newPiece = board[newRow][newCol];
                    if (piece === "") {
                        validMoves.add((newRow, newCol));
                    } else if (piece[0] !== currTurn) {
                        validMoves.add((newRow, newCol));
                        break;
                    } else {
                        break;
                    }
                }
            }
            console.log(validMoves);
            break;
        // King
        case "k":
            break
        // Knight
        case "n":
            break
        // Pawn
        case "p":
            break
        // Queen
        case "q":
            break
        // Rook
        case "r":
            break
    }
    return validMoves;
}