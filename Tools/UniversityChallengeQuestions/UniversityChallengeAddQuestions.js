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
const setQuestion1 = document.getElementById("setQuestion1");
const setAnswer1 = document.getElementById("setAnswer1");
const setQuestion2 = document.getElementById("setQuestion2");
const setAnswer2 = document.getElementById("setAnswer2");
const setQuestion3 = document.getElementById("setQuestion3");
const setAnswer3 = document.getElementById("setAnswer3");

const categorySelect = document.getElementById("category");
const otherCategory = document.getElementById("otherCategory");
const status = document.getElementById("status");

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
        status.textContent = "";
        if (question === "") {
            status.textContent = "Question cannot be blank";
            return;
        }
        if (answer === "") {
            status.textContent = "Answer cannot be blank";
            return;
        }
        if (category === "") {
            status.textContent = "Category cannot be blank";
            return;
        }
        
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

        starterQuestion.value = "";
        starterAnswer.value = "";
        status.textContent = "Starter question added";

    } else if (questionType === "set") {
        // SET
        const question1 = setQuestion1.value;
        const answer1 = setAnswer1.value;
        const question2 = setQuestion2.value;
        const answer2 = setAnswer2.value;
        const question3 = setQuestion3.value;
        const answer3 = setAnswer3.value;
        const category = categorySelect.value === "other" ? otherCategory.value.trim() : categorySelect.options[categorySelect.selectedIndex].text;
        status.textContent = "";
        if (question1 === "") {
            status.textContent = "Question 1 cannot be blanked";
            return;
        }
        if (answer1 === "") {
            status.textContent = "Answer 1 cannot be blanked";
            return;
        }
        if (question2 === "") {
            status.textContent = "Question 2 cannot be blanked";
            return;
        }
        if (answer2 === "") {
            status.textContent = "Answer 2 cannot be blanked";
            return;
        }
        if (question3 === "") {
            status.textContent = "Question 3 cannot be blanked";
            return;
        }
        if (answer3 === "") {
            status.textContent = "Answer 3 cannot be blanked";
            return;
        }
        if (category === "") {
            status.textContent = "Category cannot be blank";
            return;
        }

        const minTimesUsed = getMinimumTimesUsedSets();

        const docRef = await addDoc(
            collection(db, "universityChallenge", "questions", "sets"),
            {
                category: category,
                timesUsed: minTimesUsed
            }
        );
        await addDoc(collection(docRef, "questions"), {
            question: question1,
            answer: answer1
        });
        await addDoc(collection(docRef, "questions"), {
            question: question2,
            answer: answer2
        });
        await addDoc(collection(docRef, "questions"), {
            question: question3,
            answer: answer3
        });
        setQuestion1.value = "";
        setAnswer1.value = "";
        setQuestion2.value = "";
        setAnswer2.value = "";
        setQuestion3.value = "";
        setAnswer3.value = "";
        status.textContent = "Set questions added";
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