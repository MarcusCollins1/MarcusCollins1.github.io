const reveals = document.querySelectorAll(".reveal");
const navLinks = document.querySelectorAll("nav a");

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
}, { threshold: 0.18 });

reveals.forEach(el => {
    observer.observe(el);
});

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            navLinks.forEach(link => link.classList.remove("active"));
            const active = document.querySelector(`nav a[href="#${entry.target.id}"]`);
            if (active) active.classList.add("active");
        }
    });
}, { threshold: 0.6 });

document.querySelectorAll("section").forEach(sec => sectionObserver.observe(sec));

document.getElementById("stat1").addEventListener("click", () => {
    location.href = "#about";
});
document.getElementById("stat2").addEventListener("click", () => {
    location.href = "#skills";
});;
document.getElementById("stat3").addEventListener("click", () => {
    location.href = "#contact";
});;