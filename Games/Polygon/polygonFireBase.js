import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    getDoc,
    setDoc,
    getDocs,
    deleteDoc,
    doc,
    addDoc,
    serverTimestamp,
    arrayUnion,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";

import {
    loadUserWords,
    getFound
} from "./polygon.js";

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
const analytics = getAnalytics(app);

async function addDocument(collectionName, fields) {
    await addDoc(collection(db, collectionName), {
        ...fields,
        createdAt: serverTimestamp()
    });
}

// ---------- login / signup UI ----------
const loginButton = document.getElementById("login-button");
const authOverlay = document.getElementById("authOverlay");
const accountOverlay = document.getElementById("accountOverlay");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const signupBtn = document.getElementById("signupBtn");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authMsg = document.getElementById("authMsg");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const userBar = document.getElementById("userBar");
const currentUsernameAuth = document.getElementById("currentUsernameAuth");
const currentUsernameAccount = document.getElementById("currentUsernameAccount");
const currentPasswordAccount = document.getElementById("currentPasswordAccount");
const showHideCurrentPasswordAccountButton = document.getElementById("showHideCurrentPasswordAccountButton");
const showHideCurrentPasswordAccountButtonImage = document.getElementById("showHideCurrentPasswordAccountButtonImage");
const closeAccountBtn = document.getElementById("closeAccountBtn");

let currentUser = JSON.parse(localStorage.getItem("polygonCurrentUser") || "null");

function showLoggedInUser(username) {
    currentUsernameAuth.textContent = username;
    userBar.classList.remove("hidden");
    loginButton.textContent = "Account";
}

function clearLoggedInUser() {
    currentUser = null;
    localStorage.removeItem("polygonCurrentUser");
    userBar.classList.add("hidden");
    loginButton.textContent = "Login / Sign up";
}

if (currentUser?.username) {
    showLoggedInUser(currentUser.username);
}

function openAuthBox() {
    authMsg.textContent = "";
    authUsername.value = "";
    authPassword.value = "";
    authOverlay.classList.remove("hidden");
}

function closeAuthBox() {
    authOverlay.classList.add("hidden");
    authMsg.textContent = "";
    authUsername.value = "";
    authPassword.value = "";
}

function openAccountBox() {
    currentUsernameAccount.textContent = currentUser.username;
    currentPasswordAccount.textContent = "********";
    accountOverlay.classList.remove("hidden");
}

function closeAccountBox() {
    accountOverlay.classList.add("hidden");
    currentUsernameAccount.textContent = "";
    currentPasswordAccount.textContent = "";
}

loginButton.addEventListener("click", () => {
    if (!currentUser) {
        openAuthBox();
    } else {
        openAccountBox();
    }
});
closeAuthBtn.addEventListener("click", closeAuthBox);
closeAccountBtn.addEventListener("click", closeAccountBox);
showHideCurrentPasswordAccountButton.addEventListener("click", () => {
    if (currentPasswordAccount.textContent == "********") {
        currentPasswordAccount.textContent = currentUser.password;
        showHideCurrentPasswordAccountButtonImage.src = "closed-eye-icon.png";
    } else {
        currentPasswordAccount.textContent = "********";
        showHideCurrentPasswordAccountButtonImage.src = "eye-icon.png";
    }
});

logoutBtn.addEventListener("click", () => {
    clearLoggedInUser();
});

async function signup() {
    const username = authUsername.value.trim();
    const password = authPassword.value;

    if (!username || !password) {
        authMsg.textContent = "Enter a username and password.";
        return;
    }

    const userRef = doc(db, "users", username);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        authMsg.textContent = "That username already exists.";
        return;
    }

    await setDoc(userRef, {
        username,
        password,
        createdAt: serverTimestamp()
    });

    currentUser = { username, password };
    localStorage.setItem("polygonCurrentUser", JSON.stringify(currentUser));
    showLoggedInUser(username);

    closeAuthBox();
    window.getFound?.().forEach((word) => {
        addWordForToday(word);
    });
}

async function login() {
    const username = authUsername.value.trim();
    const password = authPassword.value;

    if (!username || !password) {
        authMsg.textContent = "Enter a username and password.";
        return;
    }

    const userRef = doc(db, "users", username);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        authMsg.textContent = "User not found.";
        return;
    }

    const data = userSnap.data();

    if (data.password !== password) {
        authMsg.textContent = "Incorrect password.";
        return;
    }

    currentUser = { username, password };
    localStorage.setItem("polygonCurrentUser", JSON.stringify(currentUser));
    showLoggedInUser(username);

    closeAuthBox();
    window.loadUserWords?.();
}

signupBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await signup();
});
loginSubmitBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await login();
});


export async function addWordForToday(word) {
    if (!currentUser) return;

    // Example: 2026-05-20
    const today = new Date().toISOString().split("T")[0];

    // users/{username}/days/{date}
    const dayRef = doc(
        db,
        "users",
        currentUser.username,
        "days",
        today
    );

    // Create/update document
    await setDoc(dayRef, {
        updatedAt: serverTimestamp()
    }, { merge: true });

    // Add word to array
    await updateDoc(dayRef, {
        words: arrayUnion(word)
    });
}

export async function getWordsForToday() {
    if (!currentUser) return [];

    // Example: 2026-05-20
    const today = new Date().toISOString().split("T")[0];

    // users/{username}/days/{date}
    const dayRef = doc(
        db,
        "users",
        currentUser.username,
        "days",
        today
    );

    const snap = await getDoc(dayRef);

    if (!snap.exists()) return [];

    const data = snap.data();

    return data.words || [];
}
