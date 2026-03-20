// ================= MOBILE MENU =================
const menuIcon = document.getElementById("menuIcon");
const dropdown = document.getElementById("dropdownMenu");

menuIcon.addEventListener("click", () => {
    // Toggle display
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
    } else {
        dropdown.style.display = "block";
    }
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !menuIcon.contains(e.target)) {
        dropdown.style.display = "none";
    }
});

// ================= NAV INDICATOR =================
const indicator = document.querySelector(".nav-indicator");
const links = document.querySelectorAll(".nav-links a");

// Set initial active position
window.addEventListener("load", () => {
    const active = document.querySelector(".nav-links a.active");
    if (active) moveIndicator(active);
});

links.forEach(link => {
    // Click event
    link.addEventListener("click", function() {
        document.querySelector(".nav-links a.active")?.classList.remove("active");
        this.classList.add("active");
        moveIndicator(this);
    });

    // Hover effect
    link.addEventListener("mouseenter", function() {
        moveIndicator(this);
        indicator.style.opacity = "1";
    });

    link.addEventListener("mouseleave", function() {
        const active = document.querySelector(".nav-links a.active");
        if (active) moveIndicator(active);
    });
});

function moveIndicator(element) {
    const rect = element.getBoundingClientRect();
    const parentRect = element.parentElement.parentElement.getBoundingClientRect();

    // Calculate position relative to the navbar
    indicator.style.width = rect.width + 20 + "px";
    indicator.style.left = rect.left - parentRect.left - 10 + "px";
    indicator.style.top = rect.top - parentRect.top - 5 + "px";
    indicator.style.opacity = "1";
}

// ================= CURSOR GLOW =================

const glow = document.createElement("div");
glow.classList.add("cursor-glow");
document.body.appendChild(glow);

document.addEventListener("mousemove", (e) => {
    glow.style.left = e.pageX + "px";
    glow.style.top = e.pageY + "px";
});

// ================= CROSS EFFECT =================
const cross = document.querySelector(".cross-effect");

function createSparkle() {
    const sparkle = document.createElement("span");
    sparkle.classList.add("sparkle");

    // Random size small/big stars
    const size = Math.random() * 6 + 2; // 2px - 8px
    sparkle.style.width = `${size}px`;
    sparkle.style.height = `${size}px`;

    // Random start position around the **entire cross area**
    const crossWidth = cross.offsetWidth + 96; // include horizontal bar width
    const crossHeight = cross.offsetHeight;
    const offsetX = Math.random() * crossWidth - crossWidth/2;
    const offsetY = Math.random() * crossHeight - crossHeight/2;
    sparkle.style.left = `${cross.offsetWidth/2 + offsetX}px`;
    sparkle.style.top = `${cross.offsetHeight/2 + offsetY}px`;

    // Random drift direction
    const driftX = Math.random() * 120 - 60; // -60 to 60 px
    const driftY = Math.random() * 80 - 40;  // -40 to 40 px
    sparkle.style.setProperty('--drift-x', `${driftX}px`);
    sparkle.style.setProperty('--drift-y', `${driftY}px`);

    // Random rotation
    sparkle.style.setProperty('--rotate', `${Math.random() * 360}deg`);

    // Random animation duration
    const duration = Math.random() * 2 + 2; // 2-4s
    sparkle.style.animation = `sparkleDrift ${duration}s ease-in-out forwards`;

    cross.appendChild(sparkle);

    // Remove sparkle after animation
    sparkle.addEventListener("animationend", () => {
        sparkle.remove();
    });
}

// ================= GOSPEL PARTICLES =================
const gospelSection = document.querySelector(".gospel");

function createParticle() {
    const particle = document.createElement("span");
    particle.classList.add("gospel-particle");

    const container = document.querySelector(".gospel-container");

    const rect = container.getBoundingClientRect();

    // Randomly pick which edge to spawn from
    const edge = Math.floor(Math.random() * 4);

    let x, y, driftX, driftY;

    switch(edge) {
        case 0: // TOP
            x = Math.random() * rect.width;
            y = 0;
            driftX = (Math.random() - 0.5) * 40;
            driftY = -60 - Math.random() * 60;
            break;

        case 1: // RIGHT
            x = rect.width;
            y = Math.random() * rect.height;
            driftX = 40 + Math.random() * 40;
            driftY = (Math.random() - 0.5) * 40;
            break;

        case 2: // BOTTOM
            x = Math.random() * rect.width;
            y = rect.height;
            driftX = (Math.random() - 0.5) * 40;
            driftY = 60 + Math.random() * 60;
            break;

        case 3: // LEFT
            x = 0;
            y = Math.random() * rect.height;
            driftX = -40 - Math.random() * 40;
            driftY = (Math.random() - 0.5) * 40;
            break;
    }

    particle.style.left = x + "px";
    particle.style.top = y + "px";

    // Random size
    const size = Math.random() * 5 + 2;
    particle.style.width = size + "px";
    particle.style.height = size + "px";

    // Drift direction
    particle.style.setProperty('--drift-x', driftX + "px");
    particle.style.setProperty('--drift-y', driftY + "px");

    // Duration
    const duration = Math.random() * 3 + 4;
    particle.style.animationDuration = duration + "s";

    container.appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, duration * 1000);
}

// ================= SCROLL REVEAL =================
const blocks = document.querySelectorAll(".gospel-block");

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
}, { 
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
});

blocks.forEach((block, index) => {
    observer.observe(block);

    // Add slight delay for each block
    block.style.transitionDelay = `${index * 0.1}s`;
});

// Spawn particles
setInterval(createParticle, 300);

// Generate sparkles at constant rate
setInterval(createSparkle, 250); // slightly more spaced