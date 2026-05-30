import {
    getSubmissionIds,
    getSubmission,
    submitMarkedQuiz
} from "./markFireBase.js";

const submissionSelect = document.getElementById("submissionSelect");

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
}

submissionSelect.addEventListener("change", (event) => {
    submissionSelectChange(event.target.value);
});




const form = document.getElementById("quizForm");
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

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data["name"] = document.getElementById("name").value;
    data["marked"] = true;
    for (let round = 1; round <= 2; round++) {
        for (let question = 1; question <= 10; question++) {
            if (Object.hasOwn(data, `r${round}q${question}Checkbox`)) {
                data[`r${round}q${question}Checkbox`] = true;
            } else {
                data[`r${round}q${question}Checkbox`] = false;
            }
        }
    }
    
    submitMarkedQuiz(data);
});


document.addEventListener("DOMContentLoaded", () => {
    populateSubmissionSelect();
});
