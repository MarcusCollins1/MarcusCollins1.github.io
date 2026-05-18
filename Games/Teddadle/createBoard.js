const board = document.getElementById("board");

for (let r = 0; r < 6; r++) {
    const row = document.createElement("div");
    row.className = "row";

    for (let c = 0; c < 5; c++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        row.appendChild(tile);
    }

    board.appendChild(row);
}
