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
    getDoc,
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

const temperatureText = document.getElementById("temperatureText");
const vsysText = document.getElementById("vsysText");

// ==========================================
// UPDATE TEXTS
// ==========================================

async function updateTexts() {
    const ref = doc(db, "devices", "pico_01");
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
        const data = snapshot.data();

        temperatureText.textContent = data.temperature;
        vsysText.textContent = data.vsys;
    }
}

updateTexts()