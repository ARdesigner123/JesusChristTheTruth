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
    const textSequenceBox = document.getElementById("text-sequence");
    const bibleRef = document.getElementById("bible-reference"); // NEW REFERENCE ELEMENT
    const cracksSvg = document.getElementById("cracks-svg");
    const lightning = document.getElementById("lightning");
    const shatterContainer = document.getElementById("shatter-container");
    const bgVideo = document.getElementById("bg-video");
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

    // --- Start Sequence on Click ---
    introOverlay.addEventListener("click", startAnimation, { once: true });

    async function startAnimation() {
        startScreen.style.display = "none";
        
        // Fade in the Bible reference
        bibleRef.style.opacity = "1";

        // Show Phrases
        for (let i = 0; i < phrases.length; i++) {
            await showPhrase(phrases[i]);
        }

        // Draw Cracks from center
        cracksSvg.classList.add("crack-active");
        await new Promise(r => setTimeout(r, 2200));

        // Fade out Bible reference just before the shatter/flash
        bibleRef.style.opacity = "0";

        // Lightning Flash
        lightning.classList.add("lightning-flash");

        // Shatter Effect
        setTimeout(() => {
            explodeScreen();
            
            bgVideo.muted = false; 
            bgVideo.play();
            bgVideo.style.opacity = "1";
            
            introOverlay.style.background = "transparent";
            cracksSvg.style.display = "none";

            setTimeout(() => {
                introOverlay.style.display = "none";
                generateStars(); 
                mainUi.classList.remove("hidden");
            }, 800);

        }, 200); 
    }

    function showPhrase(text) {
        return new Promise((resolve) => {
            textSequenceBox.textContent = text;
            textSequenceBox.style.opacity = "1"; 
            setTimeout(() => {
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

    authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        authMessage.classList.remove("success");
        authMessage.textContent = "";

        const username = userField.value.trim();
        const password = passField.value.trim();

        if (isLoginMode) {
            const savedUser = localStorage.getItem("jct_username");
            const savedPass = localStorage.getItem("jct_password");

            if (!savedUser) {
                authMessage.textContent = "User not found. Please register first.";
                return;
            }

            if (username !== savedUser || password !== savedPass) {
                authMessage.textContent = "Incorrect username or password.";
                return;
            }

            authMessage.classList.add("success");
            authMessage.textContent = "Login successful! Redirecting...";
            setTimeout(() => {
                window.location.href = "main.html";
            }, 1000);

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

            localStorage.setItem("jct_username", username);
            localStorage.setItem("jct_password", password);

            authMessage.classList.add("success");
            authMessage.textContent = "Registration successful! Redirecting...";
            setTimeout(() => {
                window.location.href = "main.html";
            }, 1000);
        }
    });

    // ================= AUTHENTICATION LOGIC =================
    // IMPORTANT: Change this to your Render.com URL once it is deployed!
    // For local testing on your computer, keep it as http://localhost:3000
    const BACKEND_URL = "https://jesusbackend.onrender.com"; 

    // ... (Keep your existing variable declarations and toggle logic here) ...

    // Handle Form Submission with Real Backend
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        authMessage.classList.remove("success");
        authMessage.style.color = "#ff4d4d"; // Reset to red
        authMessage.textContent = "Processing..."; // Loading state

        const username = userField.value.trim();
        const password = passField.value.trim();

        if (isLoginMode) {
            // --- REAL BACKEND LOGIN ---
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

                // Success
                authMessage.classList.add("success");
                authMessage.style.color = "#4caf50";
                authMessage.textContent = "Login successful! Redirecting...";
                setTimeout(() => {
                    window.location.href = "main.html";
                }, 1000);

            } catch (err) {
                authMessage.textContent = "Failed to connect to the server.";
            }

        } else {
            // --- REAL BACKEND REGISTER ---
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
                    authMessage.textContent = data.error; // Displays "Username is already taken"
                    return;
                }

                // Success
                authMessage.classList.add("success");
                authMessage.style.color = "#4caf50";
                authMessage.textContent = "Registration successful! Redirecting...";
                setTimeout(() => {
                    window.location.href = "main.html";
                }, 1000);

            } catch (err) {
                authMessage.textContent = "Failed to connect to the server.";
            }
        }
    });
});