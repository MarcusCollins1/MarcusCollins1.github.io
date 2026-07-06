const playBtn = document.getElementById("playBtn");
const previousGamesBtn = document.getElementById("previousGamesBtn");
const statsBtn = document.getElementById("statsBtn");
const loginBtn = document.getElementById("loginBtn");

let loggedIn = false;

playBtn.addEventListener("click", () => {
    if (loggedIn) {
        location.href = "game.html";
    }
});
previousGamesBtn.addEventListener("click", () => {
    if (loggedIn) {
        location.href = "previousGames.html";
    }
});
statsBtn.addEventListener("click", () => {
    if (loggedIn) {
        location.href = "stats.html";
    }
});

loginBtn.addEventListener("click", () => {
    if (loggedIn) {
        logout();
    } else {
        showLogin();
    }
});


function showLogin() {

}

function logout() {
    
}