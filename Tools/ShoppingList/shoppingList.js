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
    updateDoc,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";

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

const form = document.getElementById("itemForm");
const input = document.getElementById("itemInput");
const list = document.getElementById("itemsList");

const itemsRef = collection(db, "shoppingItems");
const itemsQuery = query(itemsRef, orderBy("createdAt", "desc"));

function renderItem(id, data) {
    const li = document.createElement("li");
    li.className = data.checked ? "checked" : "";

    const left = document.createElement("div");
    left.className = "item-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = data.checked;

    const label = document.createElement("span");
    label.textContent = data.name;

    checkbox.addEventListener("change", async () => {
        await updateDoc(doc(db, "shoppingItems", id), {
            checked: checkbox.checked
        });
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "shoppingItems", id));
    });

    left.appendChild(checkbox);
    left.appendChild(label);
    li.appendChild(left);
    li.appendChild(removeBtn);
    list.appendChild(li);
}

onSnapshot(itemsQuery, (snapshot) => {
    list.innerHTML = "";
    snapshot.forEach((docSnap) => {
        renderItem(docSnap.id, docSnap.data());
    });
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = input.value.trim();
    if (!name) return;

    await addDoc(itemsRef, {
        name,
        checked: false,
        createdAt: serverTimestamp()
    });

    input.value = "";
    input.focus();
});