const el = {
    returnBtn: document.getElementById("return-button"),

    chessTable: document.getElementById("chessTable"),
};

let setInUse = "Standard";

let board = [];

function resetBoard() {
    board = [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
    ];
}

function renderBoard() {
    if (board.length === 0) return;
    for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
        for (let colIdx = 0; colIdx < 8; colIdx++) {
            const cellValue = board[rowIdx][colIdx];
            const cell = document.getElementById(`${rowIdx+1}-${colIdx+1}`);
            // Clear the cell
            cell.innerHTML = "";
            // Add piece to cell
            if (cellValue === "") continue;
            cell.style.backgroundImage = `url(./Images/Pieces/${setInUse}/${cellValue}.png)`;
        }
    }
}

function findValidMoves(rowIDx, colIdx) {
    const piece = board[rowIDx][colIdx];
    if (piece === "") return;
    console.log(piece);
}


el.chessTable.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;

    const [row, col] = cell.id.split("-").map(Number);
    findValidMoves(row, col);
})

resetBoard();
renderBoard();