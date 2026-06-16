const el = {
    returnBtn: document.getElementById("return-button"),

    chessTable: document.getElementById("chessTable"),
};

let setInUse = "Standard";

let board = [];
let currTurn;

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
    currTurn = "w";
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
    const cellValue = board[rowIDx][colIdx];
    if (cellValue === "") return;
    const pieceColour = cellValue[0];
    const piece = cellValue[1];
    if (pieceColour !== currTurn);
    console.log(pieceColour, piece);
}


el.chessTable.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;

    const [row, col] = cell.id.split("-").map(Number);
    findValidMoves(row-1, col-1);
})

resetBoard();
renderBoard();