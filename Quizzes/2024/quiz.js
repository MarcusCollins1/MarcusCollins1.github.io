const form = document.getElementById("form");
const draggables = document.querySelectorAll(".draggable");
const droppables = document.querySelectorAll(".droppable");
const r2q9Container = document.getElementById("r2q9Container");
const sortedOrderInput = document.getElementById("r2q9");

let draggingElement = null;

document.addEventListener("DOMContentLoaded", () => {
    updater2q6Order();
    updater2q9Order();
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    console.log(data);
});

draggables.forEach(draggable => {
    draggable.dataset.originalParent = draggable.parentElement.id;

    draggable.addEventListener("dragstart", event => {
        event.dataTransfer.setData("text/plain", event.target.id);
    });

    draggable.addEventListener("click", event => {
        if (event.target.parentElement.classlist.contains("droppable")) {
            const originalParent = document.getElementById(draggable.dataset.originalParent);
            if (originalParent) originalParent.append(draggable);
        }
    });
});

droppables.forEach(droppable => {
    const defaultText = droppable.children[0];

    droppable.addEventListener("dragover", event => {
        event.preventDefault();
    });

    droppable.addEventListener("drop", event => {
        event.preventDefault();
        try {
            const draggableId = event.dataTransfer.getData("text/plain");
            const draggableElement = document.getElementById(draggableId);
            const dropTarget = event.currentTarget;

            Array.from(dropTarget.children).forEach(child => {
                if (child !== defaultText) {
                    child.click();
                }
            });

            dropTarget.appendChild(draggableElement);

            updater2q6Order();
        } catch (error) {
            console.error(error);
        }
    });
});

r2q9Container.addEventListener("dragstart", (event) => {
    draggingElement = event.target;
    event.target.classlist.add("dragging");
});
r2q9Container.addEventListener("dragend", (event) => {
    event.target.classlist.remove("dragging");
    updater2q9Order();
});
r2q9Container.addEventListener("dragover", (event) => {
    event.preventDefault();
    const draggingOverElement = getDragAfterElement(r2q9Container, event.clientY);
    if (draggingOverElement == null) {
        r2q9Container.appendChild(draggingElement);
    } else {
        r2q9Container.insertBefore(draggingElement, draggingOverElement);
    }
});

function getDragAfterElement(container, y) {
    const sortableItems = [...container.querySelectorAll(".sortable-item:not(.dragging)")];
    return sortableItems.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset < closest.offset) {
            return {offset: offset, element: child};
        } else {
            return closest;
        }
    },
    { offset: Number.NEGATIVE_INFINITY }).element;
}

function updater2q6Order() {
    const matchOrder = Array.from(droppables).map(droppable => {
        const draggable = droppable.querySelector(".draggable");
        return draggable ? draggable.textContent.trim() : "";
    }).join(",");
    document.getElementById("r2q6").value = matchOrder;
}

function updater2q9Order() {
    const currentOrder = Array.from(r2q9Container.children).map((child) =>
        child.textContent.trim());
    sortedOrderInput.value = currentOrder.join(",");
}