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
            if (cellValue === "") continue;
            const cell = document.getElementById(`${rowIdx+1}-${colIdx+1}`);
            cell.style.backgroundImage = `url(./Images/Pieces/${setInUse}/${cellValue}.png)`;
        }
    }
}


resetBoard();
renderBoard();