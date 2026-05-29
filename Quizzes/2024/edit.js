import {
    getSubmissionIds,
    getSubmission,
} from "./editFireBase.js";

const submissionSelect = document.getElementById("submissionSelect");
const quizFormFieldSet = document.getElementById("quizFormFieldSet");

async function populateSubmissionSelect() {
    const options = await getSubmissionIds();
    options.forEach(option => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        submissionSelect.appendChild(opt);
    });
}

async function submissionSelectChange(value) {
    const data = await getSubmission(value);
    for (const [key, value] of Object.entries(data)) {
        const curr = document.getElementById(key);
        if (curr) {
            curr.value = value;
        }
    }
    updater2q6Container();
    updater2q9Container();
    quizFormFieldSet.disabled = false;
}

submissionSelect.addEventListener("change", (event) => {
    submissionSelectChange(event.target.value);
});





const form = document.getElementById("quizForm");
const draggables = document.querySelectorAll(".draggable");
const droppables = document.querySelectorAll(".droppable");
const r2q9Container = document.getElementById("r2q9Container");
const sortedOrderInput = document.getElementById("r2q9");

function updater2q6Container() {
    const order = document.getElementById("r2q6").value.split(",");
    document.getElementById("polymerType1").appendChild([...document.querySelectorAll("p")].find(el => el.textContent.trim() === order[0]));
    document.getElementById("polymerType2").appendChild([...document.querySelectorAll("p")].find(el => el.textContent.trim() === order[1]));
    document.getElementById("polymerType3").appendChild([...document.querySelectorAll("p")].find(el => el.textContent.trim() === order[2]));
}

function updater2q9Container() {
    const order = document.getElementById("r2q9").value.split(",");
    order.forEach(val => {
        r2q9Container.appendChild([...document.querySelectorAll("div")].find(el => el.textContent.trim() === val));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    populateSubmissionSelect();
});
