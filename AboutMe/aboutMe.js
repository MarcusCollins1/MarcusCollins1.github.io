const reveals = document.querySelectorAll(".reveal");
const navLinks = document.querySelectorAll("nav a");
const carousel = document.getElementById("portraitCarousel");

if (carousel) {
    const slides = carousel.querySelectorAll(".slide");

    carousel.addEventListener("scroll", () => {
        // optional: add subtle fade/scale logic here later
    });
    
    // optional keyboard support
    carousel.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
            carousel.scrollBy({ left: carousel.clientWidth, behavior: "smooth" });
        }
        if (e.key === "ArrowLeft") {
            carousel.scrollBy({ left: -carousel.clientWidth, behavior: "smooth" });
        }
    });
}

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
}, { threshold: 0.3 });

document.querySelectorAll("section").forEach(sec => {
    sectionObserver.observe(sec);
});
