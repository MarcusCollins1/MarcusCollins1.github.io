function checkForCheck(board) {
    const whiteKing = findKing(board, "w");
    const blackKing = findKing(board, "b");

    const whiteInCheck = whiteKing && isSquareAttacked(board, whiteKing.row, whiteKing.col, "b");
    const blackInCheck = blackKing && isSquareAttacked(board, blackKing.row, blackKing.col, "w");

    if (whiteInCheck && !hasLegalMove(board, "w")) return "wcm";
    if (blackInCheck && !hasLegalMove(board, "b")) return "bcm";

    if (whiteInCheck) return "w";
    if (blackInCheck) return "b";

    return null;
}

function findKing(board, color) {
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            if (board[row][col] === `${color}k`) {
                return { row, col };
            }
        }
    }
    return null;
}

function hasLegalMove(board, color) {
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            const piece = board[row][col];
            if (piece === "" || piece[0] !== color) continue;

            const moves = getPseudoLegalMoves(board, row, col);
            for (const [toRow, toCol] of moves) {
                const copy = board.map(r => [...r]);
                copy[toRow][toCol] = copy[row][col];
                copy[row][col] = "";

                const kingPos = findKing(copy, color);
                if (!kingPos) continue;

                const enemy = color === "w" ? "b" : "w";
                if (!isSquareAttacked(copy, kingPos.row, kingPos.col, enemy)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getPseudoLegalMoves(board, row, col) {
    const piece = board[row][col];
    if (piece === "") return [];

    const color = piece[0];
    const type = piece[1];
    const moves = [];

    const addIfValid = (r, c) => {
        if (r < 0 || r >= 8 || c < 0 || c >= 8) return;
        const target = board[r][c];
        if (target === "" || target[0] !== color) {
            moves.push([r, c]);
        }
    };

    switch (type) {
        case "p": {
            const dir = color === "w" ? -1 : 1;
            const startRow = color === "w" ? 6 : 1;

            // one step forward
            if (board[row + dir] && board[row + dir][col] === "") {
                moves.push([row + dir, col]);

                // two steps forward from starting row
                if (row === startRow && board[row + 2 * dir] && board[row + 2 * dir][col] === "") {
                    moves.push([row + 2 * dir, col]);
                }
            }

            // captures
            for (const dc of [-1, 1]) {
                const r = row + dir;
                const c = col + dc;
                if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const target = board[r][c];
                    if (target !== "" && target[0] !== color) {
                        moves.push([r, c]);
                    }
                }
            }
            break;
        }

        case "n": {
            const jumps = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            for (const [dr, dc] of jumps) addIfValid(row + dr, col + dc);
            break;
        }

        case "b":
        case "r":
        case "q": {
            const directions = [];
            if (type === "b" || type === "q") {
                directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
            }
            if (type === "r" || type === "q") {
                directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
            }

            for (const [dr, dc] of directions) {
                let r = row + dr;
                let c = col + dc;
                while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    if (board[r][c] === "") {
                        moves.push([r, c]);
                    } else {
                        if (board[r][c][0] !== color) {
                            moves.push([r, c]);
                        }
                        break;
                    }
                    r += dr;
                    c += dc;
                }
            }
            break;
        }

        case "k": {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    addIfValid(row + dr, col + dc);
                }
            }
            break;
        }
    }

    return moves;
}

function isSquareAttacked(board, row, col, attackerColor) {
    const enemy = attackerColor;

    // pawn attacks
    const pawnRow = enemy === "w" ? row + 1 : row - 1;
    for (const dc of [-1, 1]) {
        const c = col + dc;
        if (pawnRow >= 0 && pawnRow < 8 && c >= 0 && c < 8) {
            if (board[pawnRow][c] === `${enemy}p`) return true;
        }
    }

    // knight attacks
    const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightMoves) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (board[r][c] === `${enemy}n`) return true;
        }
    }

    // rook / queen lines
    const straight = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dr, dc] of straight) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const p = board[r][c];
            if (p !== "") {
                if (p[0] === enemy && (p[1] === "r" || p[1] === "q")) return true;
                break;
            }
            r += dr;
            c += dc;
        }
    }

    // bishop / queen lines
    const diagonal = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of diagonal) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const p = board[r][c];
            if (p !== "") {
                if (p[0] === enemy && (p[1] === "b" || p[1] === "q")) return true;
                break;
            }
            r += dr;
            c += dc;
        }
    }

    // king attacks
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (board[r][c] === `${enemy}k`) return true;
            }
        }
    }

    return false;
}