import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
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
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { useRef } from "react";

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
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

const playBtn = document.getElementById("playBtn");
const previousGamesBtn = document.getElementById("previousGamesBtn");
const statsBtn = document.getElementById("statsBtn");
const loginBtn = document.getElementById("loginBtn");

const loginModal = document.getElementById("loginModal");
const authTitle = document.getElementById("authTitle");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const authError = document.getElementById("authError");
const submitAuthBtn = document.getElementById("submitAuthBtn");
const toggleAuthModeBtn = document.getElementById("toggleAuthModeBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");

let loggedIn = false;
let authMode = "login"; // "login" or "signup"
let explicitlyCreatingAccount = false;

function normalizeUsername(username) {
    return username.trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._-]/g, "")
}

function usernameToEmail(username) {
    const clean = normalizeUsername(username);
    return `${clean}@familyframed.local`;
}

const USER_COLLECTION = "family-framed-users";

async function getFamilyFramedAccount(uid) {
    const userRef = doc(db, USER_COLLECTION, uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data();
}

async function createFamilyFramedAccount(user, username) {
    const userRef = doc(db, USER_COLLECTION, user.uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
        return snapshot.data();
    }

    const data = {
        username,
        createdAt: serverTimestamp()
    };
    
    await setDoc(useRef, data);
    return data;
}

function setProtectedButtonsEnabled(enabled) {
    playBtn.disabled = !enabled;
    previousGamesBtn.disabled = !enabled;
    statsBtn.disabled = !enabled;
}

function setAuthModalMode(mode) {
    authMode = mode;
    authTitle.textContent = mode === "login" ? "Log in" : "Sign up";
    submitAuthBtn.textContent = mode === "login" ? "Log in" : "Create account";
    toggleAuthModeBtn.textContent =
        mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in";
    authError.textContent = "";
}

function showLogin(mode = "login") {
    setAuthModalMode(mode);
    loginModal.classList.remove("hidden");
    usernameInput.focus();
}

function hideLogin() {
    loginModal.classList.add("hidden");
    authError.textContent = "";
    usernameInput.value = "";
    passwordInput.value = "";
}

async function logout() {
    await signOut(auth);
}

async function handleAuthSubmit() {
    const username = normalizeUsername(usernameInput.value);
    const password = passwordInput.value;

    if (!username || !password) {
        authError.textContent = "Enter a username and password.";
        return;
    }

    try {
        const email = usernameToEmail(username);

        if (authMode === "signup") {
            explicitlyCreatingAccount = true;
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: username });
            await createFamilyFramedAccount(cred.user, username);
        } else {
            explicitlyCreatingAccount = false;
            await signInWithEmailAndPassword(auth, email, password);
        }

        hideLogin();
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            authError.textContent = "That username is already taken.";
        } else if (error.code === "auth/invalid-credential") {
            authError.textContent = "Wrong username or password.";
        } else if (error.code === "auth/weak-password") {
            authError.textContent = "Password should be at least 6 characters.";
        } else {
            authError.textContent = "Login failed. Try again.";
        }
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        loggedIn = false;
        setProtectedButtonsEnabled(false);
        loginBtn.textContent = "Login / Sign up";
        return;
    }

    try {
        // Firebase has remembered a user.
        // Check that this user actually belongs to Family Framed.
        const account = await getFamilyFramedAccount(user.uid);

        if (!account) {
            console.log(
                "Authenticated Firebase user does not have a Family Framed account."
            );

            loggedIn = false;
            setProtectedButtonsEnabled(false);
            loginBtn.textContent = "Login / Sign up";

            // Remove the Firebase session from this page.
            await signOut(auth);

            return;
        }

        // They have a Family Framed document,
        // so they're allowed into the game.
        loggedIn = true;
        setProtectedButtonsEnabled(true);

        const username =
            account.username ||
            user.displayName ||
            "User";

        loginBtn.textContent = `Logout (${username})`;

    } catch (error) {
        console.error(
            "Failed to check Family Framed account:",
            error
        );

        loggedIn = false;
        setProtectedButtonsEnabled(false);
        loginBtn.textContent = "Login / Sign up";
    }
});

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

submitAuthBtn.addEventListener("click", handleAuthSubmit);

toggleAuthModeBtn.addEventListener("click", () => {
    setAuthModalMode(authMode === "login" ? "signup" : "login");
});

closeAuthBtn.addEventListener("click", hideLogin);

loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
        hideLogin();
    }
});

passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        handleAuthSubmit();
    }
});

usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        handleAuthSubmit();
    }
})