import {
    getSubmissionIds,
    getSubmission,
} from "./editFireBase.js";

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
    const data = getSubmission(value);
    console.log(data);
    data.forEach((key, value) => {
        const curr = document.getElementById(key);
        curr.value = value;
    });
}

submissionSelect.addEventListener("change", (event) => {
    submissionSelectChange(event.target.value);
});

populateSubmissionSelect();
