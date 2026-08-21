// ==========================================
// FIREBASE
// ==========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    deleteDoc,
    onSnapshot,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// FIREBASE CONFIG
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyA_CXSZVz6meJgcJyktktWNmPtLmeFNXn0",
    authDomain: "marcus-collins-github-website.firebaseapp.com",
    projectId: "marcus-collins-github-website",
    databaseURL: "https://marcus-collins-github-website-default-rtdb.europe-west1.firebasedatabase.app",
    storageBucket: "marcus-collins-github-website.firebasestorage.app",
    messagingSenderId: "328004594228",
    appId: "1:328004594228:web:47074e07c446a328bbf861",
    measurementId: "G-6M9HBX4E3Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// HTML ELEMENTS
// ==========================================

const typeSelect = document.getElementById("questionType");
const starterFields = document.getElementById("starterFields");
const setFields = document.getElementById("setFields");
const categorySelect = document.getElementById("category");
const otherCategory = document.getElementById("otherCategory");

// ==========================================
// TYPE SELECT CHANGE
// ==========================================

typeSelect.addEventListener("change", () => {
    const isStarter = typeSelect.value === "starter";
    
    starterFields.hidden = !isStarter;
    setFields.hidden = isStarter;
});

// ==========================================
// CATEGORY SELECT CHANGE
// ==========================================

categorySelect.addEventListener("change", () => {
    otherCategory.hidden = categorySelect.value !== "other";
});

// ==========================================
// ADD STARTER
// ==========================================

// ==========================================
// ADD SET
// ==========================================