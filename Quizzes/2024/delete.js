import {
    getNames,
    deleteSubmission,
} from "./deleteFireBase.js"
const nameList = document.getElementById("nameList");

async function populateNameList() {
    const names = await getNames();
    names.forEach(name => {
        const li = document.createElement("li");
        li.className = "name-item";
        
        const span = document.createElement("span");
        span.textContent = name;
        li.appendChild(span);

        const btn = document.createElement("button");
        btn.className = "delete-button";
        btn.textContent = "Delete";
        btn.onclick = function () {
            deleteSubmission(name);
            populateNameList();
        };
        li.appendChild(btn);

        nameList.appendChild(li);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (prompt("Enter password:") === "delete") {
        populateNameList();
        document.body.style.display = "block";
    }
});
