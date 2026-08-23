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
    updateDoc,
    increment,
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

const questionType = document.getElementById("questionType");
const getQuestionBtn = document.getElementById("getQuestionBtn");
const questionCard = document.getElementById("questionCard");
const questionTypeLabel = document.getElementById("questionTypeLabel");
const categoryLabel = document.getElementById("categoryLabel");
const questionContent = document.getElementById("questionContent");
const skipBtn = document.getElementById("skipBtn");
const nextBtn = document.getElementById("nextBtn");
const status = document.getElementById("status");

// ==========================================
// VARIABLES
// ==========================================
let currentQuestion = null;
let currentQuestionType = null;

// ==========================================
// GET QUESTION COLLECTION
// ==========================================

function getQuestionCollection(type) {
    if (type === "starter") {
        return collection(db, "universityChallenge", "questions", "starters");
    }
    if (type === "set") {
        return collection(db, "universityChallenge", "questions", "sets");
    }
    throw new Error(`Invalid question type: ${type}`);
}

// ==========================================
// LOAD A LEAST-USED QUESTION
// ==========================================

async function loadQuestion(type, excludeId = null) {
    const questionCollection = getQuestionCollection(type);

    const q = query(questionCollection, orderBy("timesUsed", "asc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    let documents = snapshot.docs;

    const minimumTimesUsed = documents[0].data().timesUsed ?? 0;

    documents = documents.filter((d) => {
        const timesUsed = d.data().timesUsed ?? 0;
        return timesUsed == minimumTimesUsed;
    });

    const withoutCurrent = documents.filter((d) => d.id !== excludeId);

    if (withoutCurrent.length > 0) {
        documents = withoutCurrent;
    }

    const selected = documents[Math.floor(Math.random() * documents.length)];

    return {
        id: selected.id,
        data: selected.data()
    };
}

// ==========================================
// LOAD QUESTIONS FROM A SET SUBCOLLECTION
// ==========================================

async function loadSetQuestions(setId) {
    const questionsRef = collection(
        db,
        "universityChallenge",
        "questions",
        "sets",
        setId,
        "questions"
    );
    const snapshot = await getDocs(questionsRef);

    return snapshot.docs.map((qDoc) => ({
        id: qDoc.id,
        data: qDoc.data()
    }));
}

// ==========================================
// DISPLAY QUESTION
// ==========================================

async function displayQuestion(type, questionDocument) {
    currentQuestion = questionDocument;
    currentQuestionType = type;

    const data = questionDocument.data;

    questionTypeLabel.textContent = type === "starter" ? "Starter" : "Set of 3";
    categoryLabel.textContent = data.category ?? "Uncatergorised";
    questionContent.innerHTML = "";

    if (type === "starter") {
        const questionElement = createQuestionElement(
            data.question,
            data.answer,
            null
        );

        questionElement.classList.add("starter-question");
        questionContent.appendChild(questionElement);
    } else {
        const questions = await loadSetQuestions(questionDocument.id);

        if (questions.length === 0) {
            throw new Error("This set does not contain any questions.");
        }

        questions.forEach((question, index) => {
            const questionElement = createQuestionElement(
                question.question,
                question.answer,
                index+1
            );

            questionElement.classList.add("set-question");
            questionContent.appendChild(questionElement);
        });
    }

    questionCard.classList.remove("hidden");
}

function createQuestionElement(question, answer, number) {
    const container = document.createElement("div");

    if (number !== null) {
        const numberElement = document.createElement("h2");
        numberElement.className = "question-number";
        numberElement.textContent = `Question ${number}`;
        container.appendChild(numberElement);
    }

    const questionElement = document.createElement("p");
    questionElement.className = "question-text";
    questionElement.textContent = question;
    container.appendChild(questionElement);

    const answerContainer = document.createElement("div");
    answerContainer.className = "answer-container";

    const answerButton = document.createElement("button");
    answerButton.type = "button";
    answerButton.className = "answer-button";
    answerButton.textContent = "Show answer";

    const answerElement = document.createElement("p");
    answerElement.className = "answer hidden";
    answerElement.textContent = answer;

    answerButton.addEventListener("click", () => {
        const isHidden = answerElement.classList.toggle("hidden");
        answerButton.textContent = isHidden ? "Show answer" : "Hide answer";
    });

    answerContainer.appendChild(answerButton);
    answerContainer.appendChild(answerElement);
    container.appendChild(answerContainer);

    return container;
}

// ==========================================
// GET QUESTION BUTTON
// ==========================================

getQuestionBtn.addEventListener("click", async () => {
    await getNextQuestion(questionType.value, null);
});

async function getNextQuestion(type, excludeId) {
    try {
        setLoading(true);
        status.textContent = "Loading..."

        const question = await loadQuestion(type, excludeId);

        if (!question) {
            questionCard.classList.add("hidden");
            status.textContent = `No ${type === "starter" ? "starter" : "sets"} have been added yet.`;
            return;
        }

        await displayQuestion(type, question);
        status.textContent = "";
    } catch (error) {
        console.error(error);
        status.textContent = "There was a problem loading the question.";
        questionCard.classList.add("hidden");
    } finally {
        setLoading(false);
    }
}

// ==========================================
// SKIP
// ==========================================

skipBtn.addEventListener("click", async () => {
    if (!currentQuestion || !currentQuestionType) return;

    await getNextQuestion(currentQuestionType, currentQuestion.id);
});

// ==========================================
// NEXT
// ==========================================

nextBtn.addEventListener("click", async () => {
    if (!currentQuestion || !currentQuestionType) return;
    
    try {
        setLoading(true);
        status.textContent = "Saving...";

        await updateDoc(
            doc(
                db,
                "universityChallenge",
                "questions",
                currentQuestionType === "starter" ? "starters" : "sets",
                currentQuestion.id
            ),
            {
                timesUsed: increment(1)
            }
        );

        const previousId = currentQuestion.id;
        await getNextQuestion(currentQuestionType, previousId);
    } catch (error) {
        console.error(error);
        status.textContent = "There was a problem saving the question";
        setLoading(false);
    }
});

// ==========================================
// UI HELPERS
// ==========================================

function setLoading(isLoading) {
    getQuestionBtn.disabled = isLoading;
    skipBtn.disabled = isLoading;
    nextBtn.disabled = isLoading;
}