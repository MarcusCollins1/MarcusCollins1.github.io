const reveals = document.querySelectorAll(".reveal");
const navLinks = document.querySelectorAll("nav a");
const carousel = document.getElementById("portraitCarousel");

if (carousel) {
    // repeat the first picture
    const firstClone = carousel.firstElementChild.cloneNode(true);
    carousel.appendChild(firstClone);

    const slides = carousel.querySelectorAll(".slide");
    let current = 0;
    let autoSlide;

    function goToSlide(index) {
        current = index % slides.length;
        carousel.scrollTo({
            left: current * carousel.clientWidth,
            behavior: "smooth"
        });
    }

    function nextSlide() {
        current ++;
        goToSlide(current);
        // loop back to start
        if (current === slides.length - 1) {
            setTimeout(() => {
                carousel.style.scrollBehavior = "auto";
                current = 0;
                carousel.scrollLeft = 0;
                requestAnimationFrame(() => {
                    carousel.style.scrollBehavior = "smooth";
                });
            }, 500);
        }
    }

    function startAutoSlide() {
        stopAutoSlide();
        autoSlide = setInterval(nextSlide, 3000);
    }
    function stopAutoSlide() {
        clearInterval(autoSlide);
    }

    carousel.addEventListener("pointerdown", stopAutoSlide);
    carousel.addEventListener("pointerup", startAutoSlide);
    carousel.addEventListener("pointerleave", startAutoSlide);

    carousel.addEventListener("scroll", () => {
        // optional: add subtle fade/scale logic here later
        current = Math.round(carousel.scrollLeft / carousel.clientWidth);
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
    startAutoSlide();
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
