import { getSubmissionIds } from "./editFireBase.js";

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
    console.log("Selected:", value);
}

submissionSelect.addEventListener("change", (event) => {
    submissionSelectChange(event.target.value);
});

populateSubmissionSelect();
