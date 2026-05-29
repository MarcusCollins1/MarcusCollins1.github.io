import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    setDoc,
    updateDoc,
    serverTimestamp,
    doc,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

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

export async function submitQuizForm(data) {
    try {
        const name = data.name;

        const submissionsRef = collection(db, "quizzes", "2024", "submissions");
        const snapshot = await getDocs(submissionsRef);
        const submissions = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
        }));
        
        if (Object.values(submissions).some(item => item.id === name)) {
            alert("Name already taken");
            return;
        }

        const submissionRef = doc(db, "quizzes", "2024", "submissions", name);

        await setDoc(submissionRef, {
            updatedAt: serverTimestamp()
        }, { merge: true });

        await updateDoc(submissionRef, {
            ...data
        });

        alert("Successfully uploaded answers");
    } catch (error) {
        console.error(error);
    }
}
