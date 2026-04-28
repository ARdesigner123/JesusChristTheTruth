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
    const lightning = document.getElementById("lightning");
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

    // --- Dynamic Golden Star Generator ---
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

    // --- Attempt Autoplay & Handle Browser Blocks ---
    async function attemptAutoplay() {
        try {
            // Attempt to play audio immediately
            await introAudio.play();
            // If we get here, the browser allowed autoplay!
            startScreen.style.display = "none";
            runAnimationSequence();
        } catch (err) {
            // Browser blocked autoplay (Standard security feature)
            // Show "Click to begin" instead
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

    // Start attempting autoplay on load
    attemptAutoplay();

    // --- Skip Logic ---
    introOverlay.addEventListener("click", () => {
        if (introRunning && !isSkipped) {
            skipIntro();
        }
    });

    function skipIntro() {
        isSkipped = true;
        introAudio.pause(); // Cut the music
        
        // Immediately reveal main UI
        bgVideo.muted = false; 
        bgVideo.play();
        bgVideo.style.opacity = "1";
        
        introOverlay.style.display = "none";
        cracksSvg.style.display = "none";
        
        if (!crossContainer.querySelector('.star')) {
            generateStars();
        }
        mainUi.classList.remove("hidden");
    }

    // --- Core Animation Sequence ---
    async function runAnimationSequence() {
        introRunning = true;
        skipHint.style.display = "block"; // Show "Click to skip"
        
        if (isSkipped) return;
        bibleRef.style.opacity = "1";

        for (let i = 0; i < phrases.length; i++) {
            if (isSkipped) return;
            await showPhrase(phrases[i]);
        }

        if (isSkipped) return;
        cracksSvg.classList.add("crack-active");
        
        // Wait 2.2 seconds but allow skip interruption
        await new Promise(r => {
            let elapsed = 0;
            let interval = setInterval(() => {
                elapsed += 100;
                if (isSkipped || elapsed >= 2200) {
                    clearInterval(interval);
                    r();
                }
            }, 100);
        });

        if (isSkipped) return;
        bibleRef.style.opacity = "0";
        lightning.classList.add("lightning-flash");

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
                if (!crossContainer.querySelector('.star')) generateStars(); 
                mainUi.classList.remove("hidden");
            }, 800);

        }, 200); 
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

    function explodeScreen() {
        for(let i = 0; i < 60; i++) {
            let shard = document.createElement("div");
            shard.classList.add("shard");
            let size = Math.random() * 20 + 5;
            shard.style.width = size + "vw";
            shard.style.height = size + "vw";
            let clip = `polygon(${Math.random()*100}% ${Math.random()*100}%, ${Math.random()*100}% ${Math.random()*100}%, ${Math.random()*100}% ${Math.random()*100}%)`;
            shard.style.clipPath = clip;
            shatterContainer.appendChild(shard);
            void shard.offsetWidth;
            let transX = (Math.random() * 400 - 200) + "vw";
            let transY = (Math.random() * 400 - 200) + "vh";
            let rot = (Math.random() * 1080 - 540) + "deg"; 
            shard.style.transform = `translate(-50%, -50%) translate(${transX}, ${transY}) rotate(${rot})`;
            shard.classList.add("fly");
            setTimeout(() => shard.style.opacity = "0", 200);
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

    // UI Toggles
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

    // Validation
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
        authMessage.style.color = "#ff4d4d"; // Reset to red
        authMessage.textContent = "Processing..."; // Loading state

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

            try {
                const response = await fetch(`${BACKEND_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    authMessage.textContent = data.error; 
                    return;
                }

                authMessage.classList.add("success");
                authMessage.style.color = "#4caf50";
                authMessage.textContent = "Registration successful! Redirecting...";
                setTimeout(() => window.location.href = "main.html", 1000);

            } catch (err) {
                authMessage.textContent = "Failed to connect to the server. Note: Render free tier can take 50 seconds to wake up.";
            }
        }
    });
});