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
    orderBy,
    limit,
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

const questionForm = document.getElementById("questionForm");
const typeSelect = document.getElementById("questionType");
const starterFields = document.getElementById("starterFields");
const starterQuestion = document.getElementById("starterQuestion");
const starterAnswer = document.getElementById("starterAnswer");
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
// ADD QUESTION
// ==========================================

questionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const questionType = typeSelect.value;
    
    if (questionType === "starter") {
        // STARTER
        const question = starterQuestion.value;
        const answer = starterAnswer.value;
        const category = categorySelect.value === "other" ? otherCategory.value.trim() : categorySelect.options[categorySelect.selectedIndex].text;
        const minTimesUsed = await getMinimumTimesUsedStarters();
        const docRef = await addDoc(
            collection(db, "universityChallenge", "questions", "starters"),
            {
                question: question,
                answer: answer,
                category: category,
                timesUsed: minTimesUsed
            }
        );
    } else if (questionType === "set") {
        // SET
    } else {
        throw new Error(`Question type (${questionType}) is not valid`);
    }
});

// ==========================================
// GET MINIMUM TIMES USED
// ==========================================

async function getMinimumTimesUsedStarters() {
    const startersRef = collection(db, "universityChallenge", "questions", "starters");
    const q = query(
        startersRef,
        orderBy("timesUsed", "asc"),
        limit(1)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return 0;
    return snapshot.docs[0].data().timesUsed;
}

async function getMinimumTimesUsedSets() {
    const startersRef = collection(db, "universityChallenge", "questions", "sets");
    const q = query(
        startersRef,
        orderBy("timesUsed", "asc"),
        limit(1)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return 0;
    return snapshot.docs[0].data().timesUsed;
}