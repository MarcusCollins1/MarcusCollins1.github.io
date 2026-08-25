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
    updateDoc,
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

const starterCount = document.getElementById("starterCount");
const setCount = document.getElementById("setCount");
const questionCount = document.getElementById("questionCount");

const starterCategories = document.getElementById("starterCategories");
const setCategories = document.getElementById("setCategories");
const questionType = document.getElementById("questionType");
const searchInput = document.getElementById("searchInput");
const questionList = document.getElementById("questionList");
const editPanel = document.getElementById("editPanel");
const editTitle = document.getElementById("editTitle");
const closeEditBtn = document.getElementById("closeEditBtn");
const starterEdit = document.getElementById("starterEdit");
const setEdit = document.getElementById("setEdit");
const editStarterQuestion = document.getElementById("editStarterQuestion");
const editStarterAnswer = document.getElementById("editStarterAnswer");
const editSetQuestion1 = document.getElementById("editSetQuestion1");
const editSetAnswer1 = document.getElementById("editSetAnswer1");
const editSetQuestion2 = document.getElementById("editSetQuestion2");
const editSetAnswer2 = document.getElementById("editSetAnswer2");
const editSetQuestion3 = document.getElementById("editSetQuestion3");
const editSetAnswer3 = document.getElementById("editSetAnswer3");
const editCategory = document.getElementById("editCategory");
const editTimesUsed = document.getElementById("editTimesUsed");
const editStatus = document.getElementById("editStatus");
const saveButton = document.getElementById("saveButton");
const deleteButton = document.getElementById("deleteButton");

// ==========================================
// STATE
// ==========================================

let starters = [];
let sets = [];

let currentType = null;
let currentId = null;


// ==========================================
// FIRESTORE COLLECTIONS
// ==========================================

function getStartersCollection() {
    return collection(
        db,
        "universityChallenge",
        "questions",
        "starters"
    );
}

function getSetsCollection() {
    return collection(
        db,
        "universityChallenge",
        "questions",
        "sets"
    );
}

// ==========================================
// LOAD ALL STARTERS
// ==========================================

async function loadStarters() {
    const snapshot = await getDocs(getStartersCollection());

    starters = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
    }));
}

// ==========================================
// LOAD ALL SETS
// ==========================================

async function loadSets() {
    const snapshot = await getDocs(getSetsCollection());

    sets = [];

    for (const d of snapshot.docs) {
        const setData = {
            id: d.id,
            ...d.data(),
            questions: []
        };

        const questionsRef = collection(db, "universityChallenge", "questions", "sets", d.id, "questions");

        const questionsSnapshot = await getDocs(questionsRef);

        setData.questions = 
            questionsSnapshot.docs
                .map((qd) => ({
                    id: qd.id,
                    ...qd.data()
                }))
                .sort((a, b) => {
                    return (a.number ?? 0) - (b.number ?? 0);
                });

        sets.push(setData);
    }
}

// ==========================================
// LOAD EVERYTHING
// ==========================================

async function loadData() {
    try {
        questionList.innerHTML = "";

        await Promise.all([
            loadStarters(),
            loadSets()
        ]);

        updateStatistics();

        displayCategoryBreakdown();

        displayQuestionList();
    } catch (error) {
        console.error(error);

        questionList.innerHTML = "<p>There was a problem loading the questions.</p>";
        
    }
}

// ==========================================
// STATISTICS
// ==========================================

function updateStatistics() {
    starterCount.textContent = starters.length;

    setCount.textContent = sets.length;

    let totalQuestions = starters.length;
    for (const set of sets) {totalQuestions += set.questions.length;}

    questionCount.textContent = totalQuestions;
}

// ==========================================
// CATEGORY BREAKDOWN
// ==========================================

function countCategories(items) {
    const categoryCounts = {};

    for (const item of items) {
        const category = item.category?.trim() || "Uncategorised";

        if (!categoryCounts[category]) {
            categoryCounts[category] = 0;
        }
        categoryCounts[category]++;
    }
    return categoryCounts;
}

function displayCategoryBreakdown() {
    displayCategoryList(starterCategories, countCategories(starters));

    displayCategoryList(setCategories, countCategories(sets));
}

function displayCategoryList(container, categories) {
    container.innerHTML = "";

    const sortedCategories = Object.entries(categories).sort((a, b) => {
        return a[0].localeCompare(b[0]);
    });

    if (sortedCategories.length === 0) {
        container.innerHTML = "<p>No questions.</p>";
        return;
    }

    for (const [category, count] of sortedCategories) {
        const row = document.createElement("div");

        row.className = "category-row";
        row.innerHTML = `
            <span class="category-name">
                ${escapeHTML(category)}
            </span>

            <span class="category-count">
                ${count}
            </span>
        `;

        container.appendChild(row);
    }
}

// ==========================================
// DISPLAY QUESTION LIST
// ==========================================

function displayQuestionList() {

    questionList.innerHTML = "";

    const search =
        searchInput.value
            .trim().toLowerCase();

    const source = questionType.value === "starter" ? starters : sets;

    const filtered = 
        source.filter((item) => {{
            if (!search) return true;

            if (
                item.category?.toLowerCase().includes(search)
            ) return true;

            if (
                item.question?.toLowerCase().includes(search)
            ) return true;

            if (item.questions) {
                return item.questions.some((question) => {
                    return (
                        question.question?.toLowerCase().includes(search)
                        ||
                        question.answer?.toLowerCase().includes(search)
                    );
                });
            }

            return false;
        }});

        if (filtered.length === 0) {
            questionList.innerHTML = 
                "<p>No questions found.</p>";

            return;
        }

        filtered.forEach((item) => {
            const element = createQuestionListItem(item, questionType.value);
            questionList.appendChild(element);
        });
}

function createQuestionListItem(item, type) {
    const element = document.createElement("div");

    element.className = "question-item";

    const title = type === "starter" ? item.question : "Set of 3";

    let preview = "";

    if (type === "starter") {
        preview = `${item.question}<br>Answer: $${item.answer}`;
    } else {
        preview = item.questions.map((question) => {
            return `${question.number ?? ""}. ${question.question}`;
        }).join("<br>");
    }
    
    element.innerHTML = `
        <div class="question-item-header">

            <div class="question-item-title">
                ${escapeHTML(title)}
            </div>

            <div class="question-item-category">
                ${escapeHTML(item.category || "Uncategorised")}
            </div>

        </div>

        <div class="question-item-preview">
            ${escapeHTML(preview).replaceAll("&lt;br&gt;", "<br>")}
        </div>

        <div class="question-item-usage">
            Times used: ${item.timesUsed ?? 0}
        </div>
    `;

    element.addEventListener("click", () => {
        openEditPanel(type, item);
    });

    return element;
}

// ==========================================
// OPEN EDIT PANEL
// ==========================================

function openEditPanel(type, item)  {
    currentType = type;
    currentId = item.id;

    editPanel.classList.remove("hidden");

    editStatus.textContent = "";

    editCategory.value = item.category || "";

    editTimesUsed.textContent = item.timesUsed ?? 0;

    if (type === "starter") {
        editTitle.textContent = "Edit Starter";

        starterEdit.classList.remove("hidden");
        setEdit.classList.add("hidden");

        editStarterQuestion.value = item.question || "";

        editStarterAnswer.value = item.answer || "";
    } else {
        editTitle.textContent = "Edit Set";

        starterEdit.classList.add("hidden");
        setEdit.classList.remove("hidden");

        const questions = [...item.questions].sort((a, b) => {return (a.number ?? 0) - (b.number ?? 0);});

        const q1 = questions[0];
        const q2 = questions[1];
        const q3 = questions[2];

        editSetQuestion1.textContent = q1?.question || "";
        editSetAnswer1.textContent = q1?.answer || "";
        editSetQuestion2.textContent = q2?.question || "";
        editSetAnswer2.textContent = q2?.answer || "";
        editSetQuestion3.textContent = q3?.question || "";
        editSetAnswer3.textContent = q3?.answer || "";
    }

    editPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ==========================================
// CLOSE EDIT
// ==========================================

closeEditBtn.addEventListener("click", () => {
    editPanel.classList.add("hidden");

    currentType = null;
    currentId = null;
});

// ==========================================
// SAVE STARTER
// ==========================================

async function saveStarter() {
    if (
        editStarterQuestion.value.trim() === ""
        ||
        editStarterAnswer.value.trim() === ""
        ||
        editCategory.value.trim() === ""
    ) {
        editStatus.textContent = "Question, answer and category cannot be blank.";
        return;
    }

    const starterRef = doc(db, "universityChallenge", "questions", "starters", currentId);

    await updateDoc(
        starterRef,
        {
            question: editStarterQuestion.value.trim(),
            answer: editStarterAnswer.value.trim(),
            category: editCategory.value.trim()
        });
}

// ==========================================
// SAVE STARTER
// ==========================================

async function saveSet(params) {
    if (
        editCategory.value.trim() === ""
        ||
        editSetQuestion1.value.trim() === ""
        ||
        editSetAnswer1.value.trim() === ""
        ||
        editSetQuestion2.value.trim() === ""
        ||
        editSetAnswer2.value.trim() === ""
        ||
        editSetQuestion3.value.trim() === ""
        ||
        editSetAnswer3.value.trim() === ""
    ) {
        editStatus.textContent = "All questions, answers and category are required.";
        return;
    }

    const setRef = doc(db, "universityChallenge", "questions", "sets", currentId);

    await updateDoc(setRef, {category: editCategory.value.trim()});

    const currentSet = sets.find(
        (set) => set.id === currentId
    );

    if (!currentSet) {
        throw new Error("Set not found.");
    }

    const questions = [...currentSet.questions].sort((a, b) => {
        return (a.number ?? 0) - (b.number ?? 0);
    });

    const values = [
        {
            question: editSetQuestion1.value.trim(),
            answer: editSetAnswer1.value.trim()
        },
        {
            question: editSetQuestion2.value.trim(),
            answer: editSetAnswer2.value.trim()
        },
        {
            question: editSetQuestion3.value.trim(),
            answer: editSetAnswer3.value.trim()
        }
    ];

    for (let i = 0; i<3; i++) {
        if (!questions[i]) {continue;}

        const questionRef = doc(db, "universityChallenge", "questions", "sets", currentId, "questions", questions[i].id);

        await updateDoc(questionRef, {
            question: values[i].question,
            answer: values[i].answer,
            number: i+1
        });
    }
}

// ==========================================
// SAVE BUTTON
// ==========================================

saveButton.addEventListener("click", async () => {
    if (!currentType || !currentId) return;

    try {
        saveButton.disabled = true;
        deleteButton.disabled = true;

        editStatus.textContent = "Saving...";

        if (currentType === "starter") {
            await saveStarter();
        } else {
            await saveSet();
        }

        editStatus.textContent = "Changes saved.";

        await loadData();
    } catch (error) {
        console.error(error);

        editStatus.textContent = "There was a problem saving the changes.";
    } finally {
        saveButton.disabled = false;
        deleteButton.disabled = false;
    }
});

// ==========================================
// DELETE STARTER
// ==========================================

async function deleteStarter() {
    const starterRef = doc(db, "universityChallenge", "questions", "starters", currentId);
    await deleteDoc(starterRef);
}

// ==========================================
// DELETE SET
// ==========================================

async function deleteSet() {

    const currentSet =
        sets.find(
            (set) => set.id === currentId
        );

    if (!currentSet) {
        throw new Error("Set not found.");
    }

    /*
     * Firestore does not automatically delete
     * documents in a subcollection when its parent
     * document is deleted.
     *
     * Therefore we explicitly delete the three
     * question documents first.
     */

    for (const question of currentSet.questions) {

        const questionRef =
            doc(
                db,
                "universityChallenge",
                "questions",
                "sets",
                currentId,
                "questions",
                question.id
            );

        await deleteDoc(questionRef);
    }

    const setRef =
        doc(
            db,
            "universityChallenge",
            "questions",
            "sets",
            currentId
        );

    await deleteDoc(setRef);
}

// ==========================================
// DELETE BUTTON
// ==========================================

deleteButton.addEventListener(
    "click",
    async () => {

        if (!currentType || !currentId) {
            return;
        }

        const confirmed =
            confirm(
                currentType === "starter"
                    ? "Are you sure you want to delete this starter?"
                    : "Are you sure you want to delete this entire set?"
            );

        if (!confirmed) {
            return;
        }

        try {

            saveButton.disabled = true;
            deleteButton.disabled = true;

            editStatus.textContent =
                "Deleting...";

            if (currentType === "starter") {

                await deleteStarter();

            } else {

                await deleteSet();

            }

            editPanel.classList.add("hidden");

            currentType = null;
            currentId = null;

            await loadData();

        } catch (error) {

            console.error(error);

            editStatus.textContent =
                "There was a problem deleting the question.";

        } finally {

            saveButton.disabled = false;
            deleteButton.disabled = false;
        }
    }
);

// ==========================================
// FILTERS
// ==========================================

questionType.addEventListener("change", () => {
    displayQuestionList();
});

searchInput.addEventListener("input", () => {
    displayQuestionList();
});

// ==========================================
// HTML ESCAPING
// ==========================================

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ==========================================
// INITIAL LOAD
// ==========================================

loadData();