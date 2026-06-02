// ================= CURSOR GLOW =================
const glow = document.createElement("div");
glow.classList.add("cursor-glow");
document.body.appendChild(glow);

document.addEventListener("mousemove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
});

document.addEventListener("DOMContentLoaded", () => {
    
    // --- Elements ---
    const introOverlay = document.getElementById("intro-overlay");
    const startScreen = document.getElementById("start-screen");
    const skipHint = document.getElementById("skip-hint");
    const textSequenceBox = document.getElementById("text-sequence");
    const bibleRef = document.getElementById("bible-reference");
    const cracksSvg = document.getElementById("cracks-svg");
    const lightningBg = document.getElementById("lightning");
    const lightningBolt = document.getElementById("lightning-bolt");
    const particleContainer = document.getElementById("particle-container"); // NEW
    const shatterContainer = document.getElementById("shatter-container");
    const bgVideo = document.getElementById("bg-video");
    const introAudio = document.getElementById("intro-audio");
    const mainUi = document.getElementById("main-ui");
    const crossContainer = document.getElementById("cross-container");

    const phrases = [
        "I AM THE ALPHA",
        "AND THE OMEGA",
        "THE FIRST",
        "AND THE LAST",
        "THE BEGINNING",
        "AND THE END"
    ];

    let isSkipped = false;
    let introRunning = false;

    function generateStars() {
        for(let i = 0; i < 20; i++) {
            let star = document.createElement("div");
            star.classList.add("star");
            star.style.left = (Math.random() * 200 - 50) + "%";
            star.style.top = (Math.random() * 200 - 50) + "%";
            star.style.animationDuration = (Math.random() * 1.5 + 1.5) + "s";
            star.style.animationDelay = (Math.random() * 2) + "s";
            star.style.setProperty('--tx', (Math.random() * 100 - 50) + "px");
            star.style.setProperty('--ty', (Math.random() * 100 - 50) + "px");
            crossContainer.appendChild(star);
        }
    }

    async function attemptAutoplay() {
        try {
            await introAudio.play();
            startScreen.style.display = "none";
            runAnimationSequence();
        } catch (err) {
            startScreen.style.display = "block";
            introOverlay.addEventListener("click", () => {
                if (!introRunning) {
                    startScreen.style.display = "none";
                    introAudio.play();
                    runAnimationSequence();
                }
            }, { once: true });
        }
    }

    attemptAutoplay();

    introOverlay.addEventListener("click", () => {
        if (introRunning && !isSkipped) {
            skipIntro();
        }
    });

    function skipIntro() {
        isSkipped = true;
        introAudio.pause(); 
        
        bgVideo.muted = false; 
        bgVideo.play();
        bgVideo.style.opacity = "1";
        
        introOverlay.style.display = "none";
        cracksSvg.style.display = "none";
        lightningBg.style.display = "none";
        lightningBolt.style.display = "none";
        if(particleContainer) particleContainer.innerHTML = '';
        
        if (!crossContainer.querySelector('.star')) {
            generateStars();
        }
        mainUi.classList.remove("hidden");
    }

    async function runAnimationSequence() {
        introRunning = true;
        skipHint.style.display = "block"; 
        
        if (isSkipped) return;
        bibleRef.style.opacity = "1";

        for (let i = 0; i < phrases.length; i++) {
            if (isSkipped) return;
            await showPhrase(phrases[i]);
        }

        if (isSkipped) return;
        cracksSvg.classList.add("crack-active");
        
        await new Promise(r => {
            let elapsed = 0;
            let interval = setInterval(() => {
                elapsed += 100;
                if (isSkipped || elapsed >= 2200) { // Wait for slow crack glow
                    clearInterval(interval);
                    r();
                }
            }, 100);
        });

        if (isSkipped) return;
        bibleRef.style.opacity = "0";
        
        // 1. Trigger Lightning
        lightningBg.classList.add("lightning-flash");
        lightningBolt.classList.add("bolt-strike");

        // 2. Trigger Electric Particles almost immediately
        setTimeout(() => {
            if (!isSkipped) explodeParticles();
        }, 50);

        // 3. Trigger Heavy Glass Shatter a fraction of a second later
        setTimeout(() => {
            if (isSkipped) return;
            explodeScreen(); 
            
            bgVideo.muted = false; 
            bgVideo.play();
            bgVideo.style.opacity = "1";
            
            introOverlay.style.background = "transparent";
            cracksSvg.style.display = "none";
            skipHint.style.display = "none";

            setTimeout(() => {
                if (isSkipped) return;
                introOverlay.style.display = "none";
                if(particleContainer) particleContainer.innerHTML = ''; 
                if (!crossContainer.querySelector('.star')) generateStars(); 
                mainUi.classList.remove("hidden");
            }, 800);

        }, 400); // 400ms delay gives particles time to be seen before glass breaks
    }

    function showPhrase(text) {
        return new Promise((resolve) => {
            if (isSkipped) return resolve();
            textSequenceBox.textContent = text;
            textSequenceBox.style.opacity = "1"; 
            setTimeout(() => {
                if (isSkipped) return resolve();
                textSequenceBox.style.opacity = "0"; 
                setTimeout(() => resolve(), 400); 
            }, 1000); 
        });
    }

    // --- THE NEW ELECTRIC PARTICLES ---
    function explodeParticles() {
        if (!particleContainer) return;
        const count = 150; // Lots of electric sparks
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement("div");
            particle.classList.add("electric-particle");
            
            // Thin and long to look like electric splinters
            const width = Math.random() * 2 + 1; // 1-3px thin
            const height = Math.random() * 30 + 10; // 10-40px long
            particle.style.width = width + "px";
            particle.style.height = height + "px";

            // Start near the center (within 5% of center)
            const startXOffset = (Math.random() * 10 - 5); 
            const startYOffset = (Math.random() * 10 - 5); 
            particle.style.left = `calc(50% + ${startXOffset}vw)`;
            particle.style.top = `calc(50% + ${startYOffset}vh)`;

            particleContainer.appendChild(particle);
            void particle.offsetWidth; // force reflow

            // Move AWAY from center at moderate speed
            const angle = Math.random() * Math.PI * 2; 
            const distance = Math.random() * 80 + 100; // 100-180vw away
            const transX = Math.cos(angle) * distance + "vw";
            const transY = Math.sin(angle) * distance + "vh";
            
            // Point the particle exactly in the direction it's traveling
            const rot = (angle * 180 / Math.PI + 90) + "deg"; 

            particle.style.setProperty('--tx', transX);
            particle.style.setProperty('--ty', transY);
            particle.style.setProperty('--rot', rot);

            particle.classList.add("particle-blast");

            setTimeout(() => particle.remove(), 1200); 
        }
    }

    function explodeScreen() {
        for(let i = 0; i < 70; i++) {
            let shard = document.createElement("div");
            shard.classList.add("shard");
            let size = Math.random() * 25 + 10;
            shard.style.width = size + "vw";
            shard.style.height = size + "vw";
            let clip = `polygon(${Math.random()*100}% ${Math.random()*100}%, ${Math.random()*100}% ${Math.random()*100}%, ${Math.random()*100}% ${Math.random()*100}%)`;
            shard.style.clipPath = clip;
            shatterContainer.appendChild(shard);
            void shard.offsetWidth; 
            
            let angle = Math.random() * Math.PI * 2;
            let distance = Math.random() * 100 + 100; 
            let transX = Math.cos(angle) * distance + "vw";
            let transY = Math.sin(angle) * distance + "vh";
            let rot = (Math.random() * 1080 - 540) + "deg"; 
            
            shard.style.transform = `translate(-50%, -50%) translate(${transX}, ${transY}) rotate(${rot})`;
            shard.classList.add("fly");
            
            setTimeout(() => shard.style.opacity = "0", 400);
        }
    }

    // ================= AUTHENTICATION LOGIC =================
const BACKEND_URL = "https://jesusbackend.onrender.com"; 

let isLoginMode = true; 
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const authForm = document.getElementById("auth-form");
const authMessage = document.getElementById("auth-message");

const userField = document.getElementById("username");
const passField = document.getElementById("password");

btnLogin.addEventListener("click", (e) => {
    e.preventDefault();
    isLoginMode = true;
    btnLogin.classList.add("active");
    btnRegister.classList.remove("active");
    formTitle.textContent = "Login to Your Account";
    submitBtn.textContent = "Login";
    authMessage.textContent = ""; 
});

btnRegister.addEventListener("click", (e) => {
    e.preventDefault();
    isLoginMode = false;
    btnRegister.classList.add("active");
    btnLogin.classList.remove("active");
    formTitle.textContent = "Create an Account";
    submitBtn.textContent = "Register";
    authMessage.textContent = ""; 
});

function validateUsername(user) {
    if (user.length < 8 || user.length > 20) return "Username must be 8 to 20 characters.";
    if (!/^[A-Za-z0-9]/.test(user)) return "Username cannot start with a special character.";
    if (!/[A-Z]/.test(user)) return "Username must contain at least one uppercase letter.";
    if (!/[a-z]/.test(user)) return "Username must contain at least one lowercase letter.";
    if (!/\d/.test(user)) return "Username must contain at least one number.";
    return null; 
}

function validatePassword(pass) {
    if (pass.length < 8 || pass.length > 30) return "Password must be 8 to 30 characters.";
    if (!/^[A-Za-z0-9]/.test(pass)) return "Password cannot start with a special character.";
    if (!/[A-Z]/.test(pass)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pass)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(pass)) return "Password must contain at least one number.";
    if (!/[^a-zA-Z0-9]/.test(pass)) return "Password must contain at least one special character.";
    return null; 
}

// Single Form Submission handling Real Backend
authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authMessage.classList.remove("success");
    authMessage.style.color = "#ff4d4d"; 
    authMessage.textContent = "Processing..."; 

    const username = userField.value.trim();
    const password = passField.value.trim();

    if (isLoginMode) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                authMessage.textContent = data.error;
                return;
            }

            // CRITICAL FIX: Save normal user and DESTROY any old guest cookies!
            localStorage.setItem("jct_logged_in_user", username);
            localStorage.removeItem("jct_guest_user");

            authMessage.classList.add("success");
            authMessage.style.color = "#4caf50";
            authMessage.textContent = "Login successful! Redirecting...";
            setTimeout(() => window.location.href = "main.html", 1000);

        } catch (err) {
            authMessage.textContent = "Failed to connect to the server.";
        }

    } else {
        const userError = validateUsername(username);
        if (userError) {
            authMessage.textContent = userError;
            return;
        }

        const passError = validatePassword(password);
        if (passError) {
            authMessage.textContent = passError;
            return;
        }

        // --- FETCH COUNTRY IP BEFORE REGISTERING ---
        let userCountry = "Unknown";
        try {
            const geoRes = await fetch("https://ipapi.co/json/");
            const geoData = await geoRes.json();
            if (geoData.country_name) userCountry = geoData.country_name;
        } catch (err) {
            console.warn("Could not fetch location data.");
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, country: userCountry }) 
            });

            const data = await response.json();

            if (!response.ok) {
                authMessage.textContent = data.error; 
                return;
            }

            // CRITICAL FIX: Save normal user and DESTROY any old guest cookies!
            localStorage.setItem("jct_logged_in_user", username);
            localStorage.removeItem("jct_guest_user");

            authMessage.classList.add("success");
            authMessage.style.color = "#4caf50";
            authMessage.textContent = "Registration successful! Redirecting...";
            setTimeout(() => window.location.href = "main.html", 1000);

        } catch (err) {
            authMessage.textContent = "Failed to connect to the server. Note: Render free tier can take 50 seconds to wake up.";
        }
    }
});

// ================= GUEST LOGIN LOGIC =================
const btnGuest = document.getElementById("btn-guest");

if (btnGuest) {
    btnGuest.addEventListener("click", async () => {
        authMessage.classList.remove("success");
        authMessage.style.color = "#ffd700"; 
        authMessage.textContent = "Entering as Guest..."; 

        // 1. Get Country
        let userCountry = "Unknown";
        try {
            const geoRes = await fetch("https://ipapi.co/json/");
            const geoData = await geoRes.json();
            if (geoData.country_name) userCountry = geoData.country_name;
        } catch (err) {}

        // 2. Check if they were already a guest before
        const savedGuest = localStorage.getItem("jct_guest_user");

        try {
            const response = await fetch(`${BACKEND_URL}/api/guest-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestName: savedGuest, country: userCountry }) 
            });

            const data = await response.json();

            if (!response.ok) {
                authMessage.style.color = "#ff4d4d";
                authMessage.textContent = data.error; 
                return;
            }

            // 3. Save guest identity and CLEAR normal user identity to prevent overlap
            localStorage.setItem("jct_guest_user", data.guestName);
            localStorage.removeItem("jct_logged_in_user");

            authMessage.classList.add("success");
            authMessage.style.color = "#4caf50";
            authMessage.textContent = `Welcome, ${data.guestName}! Redirecting...`;
            setTimeout(() => window.location.href = "main.html", 1000);

        } catch (err) {
            authMessage.style.color = "#ff4d4d";
            authMessage.textContent = "Failed to connect to the server.";
        }
    });
}
});