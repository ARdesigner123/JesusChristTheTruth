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

// Generate sparkles at constant rate
setInterval(createSparkle, 250); // slightly more spaced