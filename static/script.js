// ================= MOBILE MENU & NAV =================
const menuIcon = document.getElementById("menuIcon");
const dropdown = document.getElementById("dropdownMenu");

if(menuIcon && dropdown) {
    menuIcon.addEventListener("click", () => {
        dropdown.style.display = (dropdown.style.display === "block") ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && !menuIcon.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}

// ================= NAV INDICATOR (FIXED ANIMATION) =================
const indicator = document.querySelector(".nav-indicator");
const links = document.querySelectorAll(".nav-links a");

window.addEventListener("load", () => {
    const active = document.querySelector(".nav-links a.active");
    if (active && indicator) {
        indicator.style.opacity = "1";
        moveIndicator(active);
    }
});

links.forEach(link => {
    link.addEventListener("click", function() {
        document.querySelector(".nav-links a.active")?.classList.remove("active");
        this.classList.add("active");
        if(indicator) moveIndicator(this);
    });

    link.addEventListener("mouseenter", function() {
        if(indicator) { 
            indicator.style.opacity = "1";
            moveIndicator(this); 
        }
    });

    link.addEventListener("mouseleave", function() {
        const active = document.querySelector(".nav-links a.active");
        if (active && indicator) moveIndicator(active);
    });
});

function moveIndicator(element) {
    if(!indicator) return;
    
    const li = element.parentElement; 
    const linkWidth = element.offsetWidth;
    const linkLeft = li.offsetLeft + element.offsetLeft;
    const linkTop = li.offsetTop + element.offsetTop;
    const linkHeight = element.offsetHeight;

    indicator.style.width = `${linkWidth + 24}px`;
    indicator.style.left = `${linkLeft - 12}px`;
    indicator.style.top = `${linkTop - ((46 - linkHeight) / 2)}px`;
}

// ================= CURSOR GLOW =================
const glow = document.createElement("div");
glow.classList.add("cursor-glow");
document.body.appendChild(glow);

document.addEventListener("mousemove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
});

// ================= BULLETPROOF ACTIVE TIME TRACKER & GUEST UI =================
const normalUser = localStorage.getItem("jct_logged_in_user");
const guestUser = localStorage.getItem("jct_guest_user");
const currentUser = normalUser || guestUser;
const isGuest = !normalUser && !!guestUser; 

// HIDE PROFILE ICON IF GUEST
document.addEventListener("DOMContentLoaded", () => {
    if (isGuest || !currentUser) {
        const navProfileIcon = document.querySelector('.nav-profile-icon');
        if (navProfileIcon) navProfileIcon.style.display = 'none';

        // Also hide it inside the mobile hamburger dropdown
        const mobileProfileLink = document.querySelector('.mobile-nav-links a[href="profile.html"]');
        if (mobileProfileLink && mobileProfileLink.parentElement) {
            mobileProfileLink.parentElement.style.display = 'none';
        }
    }
});

const BACKEND_URL = "https://jesusbackend.onrender.com";
let sessionSeconds = 0;

// Master function to sync time to the database
function syncTime(isAsync = true) {
    if (!currentUser || sessionSeconds <= 0) return;
    
    const timeToSync = sessionSeconds;
    sessionSeconds = 0; // Reset immediately to prevent duplicate counting
    
    // 3. IMPORTANT: Include the isGuest flag in the payload so the backend knows which table to update!
    const payload = JSON.stringify({ 
        username: currentUser, 
        time_added: timeToSync, 
        isGuest: isGuest 
    });

    if (!isAsync && navigator.sendBeacon) {
        // sendBeacon guarantees delivery when closing the tab, clicking a link, or logging out
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`${BACKEND_URL}/api/update-time`, blob);
    } else {
        // Normal background sync
        fetch(`${BACKEND_URL}/api/update-time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
        }).catch(() => {
            sessionSeconds += timeToSync; // If internet drops, save the time for the next sync
        });
    }
}

// Master function to send heartbeat and get live count
function sendHeartbeat() {
    if (!currentUser) return;
    
    // 1. Send Ping to tell server we are alive
    fetch(`${BACKEND_URL}/api/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser })
    }).catch(() => {});

    // 2. Fetch the total number of live users
    fetch(`${BACKEND_URL}/api/live-count`)
        .then(res => res.json())
        .then(data => {
            const liveCountBadge = document.getElementById("live-user-count");
            if (liveCountBadge) {
                liveCountBadge.textContent = data.count;
            }
        })
        .catch(() => {});
}

if (currentUser) {
    // Fire immediately upon load
    sendHeartbeat();

    // Tick up every 1 second for active time
    setInterval(() => {
        sessionSeconds++;
    }, 1000);

    // Background sync active time every 5 seconds
    setInterval(() => {
        syncTime(true);
    }, 5000);

    // NEW: Send heartbeat every 10 seconds to keep user "Live"
    setInterval(() => {
        sendHeartbeat();
    }, 10000);

    // Sync if they close the browser tab, refresh, or click a link to another page
    window.addEventListener("beforeunload", () => {
        syncTime(false);
    });
    
    // Sync if they switch to another app/tab on their phone
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'hidden') {
            syncTime(false);
        }
    });
}

// ================= LEADERBOARD LOGIC =================
let lbTimerInterval;
let currentLbCategory = 'time';
let currentLbPeriod = 'daily';

window.switchView = function(viewName) {
    document.getElementById("view-profile").style.display = viewName === 'profile' ? 'block' : 'none';
    document.getElementById("view-leaderboard").style.display = viewName === 'leaderboard' ? 'block' : 'none';
    
    document.getElementById("tab-profile").classList.toggle("active", viewName === 'profile');
    document.getElementById("tab-leaderboard").classList.toggle("active", viewName === 'leaderboard');

    if (viewName === 'leaderboard') {
        setLbCategory('time'); // Default to Time -> Daily
    }
}

// Switches between Time, Holy Power, Quizzes, Quests, Streak
window.setLbCategory = function(cat) {
    currentLbCategory = cat;
    
    // Highlight correct category button
    document.querySelectorAll('.lb-cat-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`cat-btn-${cat}`).classList.add('active');

    // UI Adjustments based on category
    const periodTabs = document.getElementById('lb-period-container');
    const timerWrapper = document.getElementById('lb-timer-wrapper');
    const scoreHeader = document.getElementById('lb-score-header');

    if (cat === 'time') {
        periodTabs.style.display = 'flex';
        timerWrapper.style.display = 'inline-block';
        scoreHeader.innerText = "Active Time";
        loadLeaderboard(currentLbPeriod); // Load the last used period (or daily)
    } else {
        periodTabs.style.display = 'none';
        timerWrapper.style.display = 'none';
        
        // Update table header text
        if (cat === 'holypower') scoreHeader.innerText = "Holy Power";
        if (cat === 'quizzes') scoreHeader.innerText = "Quizzes Done";
        if (cat === 'quests') scoreHeader.innerText = "Quests Done";
        if (cat === 'streak') scoreHeader.innerText = "Daily Streak";
        
        loadLeaderboard('all_time'); // Non-time categories are absolute totals
    }
}

// Loads the actual data into the table
window.loadLeaderboard = function(periodOverride) {
    if (periodOverride) currentLbPeriod = periodOverride;
    
    // Highlight correct period button (only matters if we are in 'time' category)
    document.querySelectorAll('.lb-period-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().replace(" ", "_") === currentLbPeriod);
    });

    const tbody = document.getElementById("lb-tbody");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#cbb27d;">Loading Leaders...</td></tr>`;

    // Fetch using BOTH category and period
    fetch(`${BACKEND_URL}/api/leaderboard?category=${currentLbCategory}&period=${currentLbPeriod}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("lb-total-users").innerText = data.totalUsers;
            tbody.innerHTML = "";

            if (data.users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No data yet.</td></tr>`;
                return;
            }

            // Determine Rewards (ONLY applies to Time Leaderboard)
            let periodRewards = [];
            if (currentLbCategory === 'time') {
                if (currentLbPeriod === 'daily') periodRewards = [200, 100, 50];
                else if (currentLbPeriod === 'weekly') periodRewards = [2000, 1500, 1000];
                else if (currentLbPeriod === 'monthly') periodRewards = [15000, 10000, 7500];
            }

            data.users.forEach((user, index) => {
                const rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "rank-other";
                const rankIcon = index === 0 ? "🏆 1st" : index === 1 ? "🥈 2nd" : index === 2 ? "🥉 3rd" : `${index + 1}th`;
                
                // The backend tells us exactly which column it sorted by
                const scoreValue = user[data.sortCol] || 0;
                
                // Formatting icons based on category
                let scoreDisplay = scoreValue;
                if (currentLbCategory === 'holypower') scoreDisplay = `${scoreValue} <i class="fas fa-coins" style="color:gold;"></i>`;
                else if (currentLbCategory === 'streak') scoreDisplay = `${scoreValue} <i class="fas fa-fire" style="color:#ff6600;"></i>`;
                
                // Determine Reward Text
                let rewardText = "-";
                if (currentLbCategory === 'time' && currentLbPeriod !== 'all_time' && index < 3) {
                    // Added XP to the visual display!
                    rewardText = `+${periodRewards[index]} <i class="fas fa-coins"></i> & <span style="color:#4da6ff; font-weight:bold;">+${periodRewards[index]} XP</span>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td class="${rankClass}">${rankIcon}</td>
                        <td style="font-weight:bold;">${user.username}</td>
                        <td style="color:#a67c52; font-weight:bold;">${scoreDisplay}</td>
                        <td style="color:#ffd700;">${rewardText}</td>
                    </tr>
                `;
            });

            // Handle Countdown Timer (Only matters for 'time')
            clearInterval(lbTimerInterval);
            if (currentLbCategory === 'time') {
                if (currentLbPeriod === 'all_time') {
                    document.getElementById("lb-countdown").innerText = "Never (Lifetime)";
                } else {
                    let targetTime = 0;
                    if (currentLbPeriod === 'daily') targetTime = data.timers.daily_reset;
                    if (currentLbPeriod === 'weekly') targetTime = data.timers.weekly_reset;
                    if (currentLbPeriod === 'monthly') targetTime = data.timers.monthly_reset;

                    lbTimerInterval = setInterval(() => {
                        const now = Date.now();
                        const diff = targetTime - now;

                        if (diff <= 0) {
                            document.getElementById("lb-countdown").innerText = "Resetting...";
                            clearInterval(lbTimerInterval);
                            setTimeout(() => loadLeaderboard(currentLbPeriod), 3000); // Reload board
                        } else {
                            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            const s = Math.floor((diff % (1000 * 60)) / 1000);
                            
                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                            const dayString = days > 0 ? `${days}d ` : "";

                            document.getElementById("lb-countdown").innerText = 
                                `${dayString}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        }
                    }, 1000);
                }
            }
        });
}

// ================= AVATAR LOGIC =================
const AVATAR_LIST = [
    'static/image/defaultAvatar.jpg',
    'static/image/avatar2.jpg',
    'static/image/avatar3.jpg',
    'static/image/avatar4.jpg',
    'static/image/avatar5.jpg',
    'static/image/avatar6.jpg',
    'static/image/avatar7.jpg'
];

let temporarySelectedAvatar = "";

// 1. Initialize Avatar on Page Load
function initializeUserAvatar() {
    const displayUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user") || "Unknown";
    const savedAvatar = localStorage.getItem('jct_avatar_' + displayUser) || AVATAR_LIST[0];
    
    // Apply to Main Profile Arch
    const mainProfileImg = document.getElementById("main-profile-avatar");
    if (mainProfileImg) mainProfileImg.src = savedAvatar;
    
    // Apply to tiny Navbar Icon
    const navProfileImg = document.getElementById("nav-avatar-img");
    if (navProfileImg) navProfileImg.src = savedAvatar;
}
initializeUserAvatar();

// 2. Open Modal and Generate Grid
window.openAvatarModal = function() {
    const displayUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user") || "Unknown";
    const savedAvatar = localStorage.getItem('jct_avatar_' + displayUser) || AVATAR_LIST[0];
    temporarySelectedAvatar = savedAvatar;

    const modal = document.getElementById("avatar-modal");
    const grid = document.getElementById("avatar-grid");
    const previewImg = document.getElementById("avatar-preview-img");
    const discardBtn = document.getElementById("discard-btn");

    if(!modal || !grid) return;

    // Reset Grid
    grid.innerHTML = "";

    // Generate Default Avatars
    AVATAR_LIST.forEach(src => {
        const div = document.createElement("div");
        div.className = `avatar-option ${src === savedAvatar ? 'selected' : ''}`;
        div.onclick = () => selectAvatar(src, div);
        div.innerHTML = `<img src="${src}" alt="Avatar Option">`;
        grid.appendChild(div);
    });

    // Generate Custom Upload Box
    const customSaved = localStorage.getItem('jct_custom_photo_' + displayUser);
    
    if (customSaved) {
        // Show their custom photo as a clickable option in the grid!
        const customDiv = document.createElement("div");
        customDiv.className = `avatar-option ${customSaved === savedAvatar ? 'selected' : ''}`;
        customDiv.onclick = () => selectAvatar(customSaved, customDiv);
        customDiv.innerHTML = `<img src="${customSaved}" alt="Custom Avatar">`;
        grid.appendChild(customDiv);
        discardBtn.style.display = "block";
    } else {
        discardBtn.style.display = "none";
    }

    // Always add the Upload Button at the end
    const uploadBtn = document.createElement("div");
    uploadBtn.className = "avatar-option avatar-upload-box";
    uploadBtn.onclick = () => document.getElementById("custom-avatar-upload").click();
    uploadBtn.innerHTML = `<i class="fas fa-upload"></i> Upload`;
    grid.appendChild(uploadBtn);

    // Set preview
    previewImg.src = temporarySelectedAvatar;

    // Show Modal with Fade/Grow Animation
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
}

// 3. Close Modal
window.closeAvatarModal = function() {
    const modal = document.getElementById("avatar-modal");
    if(modal) {
        modal.classList.remove("show");
        setTimeout(() => modal.style.display = "none", 400); // Wait for fade-out animation
    }
}

// 4. Handle Clicking a Grid Item
window.selectAvatar = function(src, clickedElement) {
    temporarySelectedAvatar = src;
    document.getElementById("avatar-preview-img").src = src;

    // Remove 'selected' class from all, add to clicked
    document.querySelectorAll(".avatar-option").forEach(el => el.classList.remove("selected"));
    clickedElement.classList.add("selected");
}

// 5. Handle Custom Photo Upload (Base64 conversion)
window.handleCustomAvatar = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Optional: Size limit check (e.g., 2MB max for localStorage safety)
    if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large! Please choose an image under 2MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const displayUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user") || "Unknown";
        
        // Save the custom photo to storage
        localStorage.setItem('jct_custom_photo_' + displayUser, dataUrl);
        
        // Automatically select it and refresh grid
        localStorage.setItem('jct_avatar_' + displayUser, dataUrl); 
        openAvatarModal(); 
    };
    reader.readAsDataURL(file);
}

// 6. Discard Custom Photo
window.discardCustomPhoto = function() {
    if(!confirm("Are you sure you want to delete your custom uploaded photo?")) return;
    
    const displayUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user") || "Unknown";
    localStorage.removeItem('jct_custom_photo_' + displayUser);
    
    // Revert to default avatar
    localStorage.setItem('jct_avatar_' + displayUser, AVATAR_LIST[0]);
    openAvatarModal();
}

// 7. Save Final Selection
window.saveAvatar = function() {
    const displayUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user") || "Unknown";
    localStorage.setItem('jct_avatar_' + displayUser, temporarySelectedAvatar);
    
    // Apply changes instantly
    initializeUserAvatar();
    closeAvatarModal();
}

// ================= SECURE LOGOUT =================
const logoutBtns = document.querySelectorAll(".logout-btn");

logoutBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.preventDefault(); // Stop immediate redirection
        
        // 1. Force a final time sync using sendBeacon
        syncTime(false);

        // 2. Destroy ALL session data securely
        localStorage.removeItem("jct_logged_in_user");
        localStorage.removeItem("jct_guest_user");
        
        // 3. Now redirect back to login
        window.location.href = "index.html"; 
    });
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

// ================= RANK SYSTEM LOGIC =================
function calculateRank(xp) {
    if (xp >= 50000) return { name: "Apostle", prev: 40000, next: 50000, maxed: true };
    if (xp >= 40000) return { name: "Elder", prev: 40000, next: 50000 };
    if (xp >= 32000) return { name: "Witness", prev: 32000, next: 40000 };
    if (xp >= 25000) return { name: "Worker", prev: 25000, next: 32000 };
    if (xp >= 17000) return { name: "Servant", prev: 17000, next: 25000 };
    if (xp >= 10000) return { name: "Disciple", prev: 10000, next: 17000 };
    if (xp >= 5000)  return { name: "Sheep", prev: 5000, next: 10000 };
    if (xp >= 2000)  return { name: "Follower", prev: 2000, next: 5000 };
    if (xp >= 500)   return { name: "Believer", prev: 500, next: 2000 };
    return { name: "Seeker", prev: 0, next: 500 };
}

// ================= PROFILE PAGE LOGIC =================
const profileUsernameEl = document.getElementById("profile-username");
const rankDisplayNameEl = document.getElementById("rank-display-name"); // Added this to detect the Rank page!

// Run this logic if we are on the Profile page OR the Rank page
if (profileUsernameEl || rankDisplayNameEl) {
    const displayUser = localStorage.getItem("jct_logged_in_user") || localStorage.getItem("jct_guest_user") || "Unknown Believer";
    
    if (profileUsernameEl) profileUsernameEl.textContent = displayUser;

    const activeTimeEl = document.getElementById("stat-active-time");
    const holyPowerEl = document.getElementById("stat-holy-power");
    const streakEl = document.getElementById("stat-streak");
    const currentActiveDisplay = document.getElementById("current-active-display");
    const milestoneFill = document.getElementById("milestone-fill");
    const nextTarget = document.getElementById("next-milestone-target");
    const nextReward = document.getElementById("next-milestone-reward");
    const milestoneContainer = document.querySelector(".milestone-container");

    const isGuestProfile = !!localStorage.getItem("jct_guest_user") && !localStorage.getItem("jct_logged_in_user");

    if (isGuestProfile && milestoneContainer) {
        milestoneContainer.innerHTML = `
            <h3 style="color:#ff4d4d; font-family:'Cinzel', serif;">Guests Cannot Earn Holy Power</h3>
            <p style="color:#a67c52; font-family:'Cardo', serif;">Please register an official account to unlock Holy Power, milestones, and ranks!</p>
        `;
        if (holyPowerEl) holyPowerEl.textContent = "0";
    }

    if (activeTimeEl) activeTimeEl.textContent = "Updating...";
    if (rankDisplayNameEl) rankDisplayNameEl.textContent = "Loading...";

    // Ping backend to fetch the current synced stats and rank data
    fetch(`${BACKEND_URL}/api/update-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: displayUser, time_added: 0, isGuest: isGuestProfile })
    })
    .then(res => res.json())
    .then(data => {
        const totalTime = data.total_time || 0;
        if (activeTimeEl) activeTimeEl.textContent = totalTime;
        
        if (!isGuestProfile) {
            const userXP = data.xp || 0;
            const rankData = calculateRank(userXP);
            
            // Update Profile Elements (If on profile.html)
            const rankText = document.getElementById("profile-rank-text");
            const xpText = document.getElementById("profile-xp-text");
            if (rankText) rankText.textContent = rankData.name;
            if (xpText) xpText.textContent = userXP;

            if (currentActiveDisplay) currentActiveDisplay.textContent = totalTime;
            if (holyPowerEl) holyPowerEl.textContent = data.holypower || 0;
            if (streakEl) streakEl.textContent = data.daily_streak || 0;

            // Inside the 'fetch' response in PROFILE PAGE LOGIC
            const quizzesEl = document.getElementById("stat-quizzes");
            const questsEl = document.getElementById("stat-quests");
            if (quizzesEl) quizzesEl.textContent = data.quizzes_passed || 0; // FIXED: Maps to passed
            if (questsEl) questsEl.textContent = data.quests_done || 0;
            window.userLastQuizDate = data.last_quiz_date;
            
            // Update Milestones
            if (nextTarget) nextTarget.textContent = data.next_milestone;
            if (nextReward) nextReward.innerHTML = `${data.next_reward} Holy Power <i class="fas fa-coins"></i>`;
            const nextXP = document.getElementById("next-milestone-xp");
            if (nextXP) nextXP.innerHTML = `+${data.next_xp} XP`;
            
            if (milestoneFill) {
                const range = data.next_milestone - data.prev_milestone;
                const progress = totalTime - data.prev_milestone;
                const percentage = Math.min(100, Math.max(0, (progress / range) * 100));
                milestoneFill.style.width = percentage + "%";
            }

            // ================= UPDATE RANK PAGE TIMELINE =================
            if (rankDisplayNameEl) {
                rankDisplayNameEl.textContent = rankData.name;
                document.getElementById("rank-xp-current").textContent = userXP;
                document.getElementById("rank-xp-next").textContent = rankData.maxed ? "MAX" : rankData.next;

                // Progress Bar calculation
                const rankProgressFill = document.getElementById("rank-progress-fill");
                if (rankProgressFill) {
                    if (rankData.maxed) {
                        rankProgressFill.style.width = "100%";
                    } else {
                        const rankRange = rankData.next - rankData.prev;
                        const rankProgress = userXP - rankData.prev;
                        const rankPercent = Math.min(100, Math.max(0, (rankProgress / rankRange) * 100));
                        rankProgressFill.style.width = rankPercent + "%";
                    }
                }

                // Timeline Visuals (Unlocks previous steps and highlights current)
                document.querySelectorAll('.rank-step').forEach(step => {
                    const reqXP = parseInt(step.getAttribute('data-req'));
                    step.classList.remove('current');
                    
                    if (userXP >= reqXP) {
                        step.classList.remove('locked');
                    }
                    if (step.id === `step-${rankData.name}`) {
                        step.classList.add('current');
                    }
                });
            }
        } else {
             if (rankDisplayNameEl) rankDisplayNameEl.textContent = "Guest (Unranked)";
        }
    })
    .catch(err => {
        if (activeTimeEl) activeTimeEl.textContent = "?";
        if (currentActiveDisplay && !isGuestProfile) currentActiveDisplay.textContent = "?";
        if (rankDisplayNameEl) rankDisplayNameEl.textContent = "Error Loading";
    });
}

// Button Placeholders
window.changeAvatar = function() {
    alert("Avatar selection is coming soon! You will be able to unlock new avatars with Holy Power.");
}

window.addFriend = function() {
    const friend = prompt("Enter the username of the brother/sister you want to add:");
    if(friend && friend.trim() !== "") {
        alert("Friend request sent to " + friend + "!");
    }
}

// ================= FRIENDS & CHAT SYSTEM LOGIC =================
let activeChatFriend = "";

window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove("closing");
        modal.style.display = "flex";
        setTimeout(() => modal.classList.add("show"), 10);
    }
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add("closing");
        modal.classList.remove("show");
        setTimeout(() => modal.style.display = "none", 300);
    }
}

// Initialize Friends on Profile Load
function initFriendsSystem() {
    const displayUser = localStorage.getItem("jct_logged_in_user");
    if (!displayUser || isGuest) return; // Guests can't have friends

    // 1. Fetch Requests
    fetch(`${BACKEND_URL}/api/friends/requests/${displayUser}`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                document.getElementById("friend-requests-wrapper").style.display = "block";
                const list = document.getElementById("friend-requests-list");
                list.innerHTML = "";
                data.forEach(req => {
                    const avatar = localStorage.getItem('jct_avatar_' + req.sender_username) || "static/image/defaultAvatar.jpg";
                    list.innerHTML += `
                        <div class="friend-bar" id="req-${req.sender_username}">
                            <div class="friend-info">
                                <img src="${avatar}" class="friend-avatar">
                                <span class="friend-name">${req.sender_username}</span>
                            </div>
                            <div class="friend-actions">
                                <button class="safe-btn" style="background:#52c41a;" onclick="respondToRequest('${req.sender_username}', 'accept')">Accept</button>
                                <button class="danger-btn" onclick="respondToRequest('${req.sender_username}', 'decline')">Decline</button>
                            </div>
                        </div>
                    `;
                });
            }
        });

    // 2. Fetch Friend List
    fetch(`${BACKEND_URL}/api/friends/list/${displayUser}`)
        .then(res => res.json())
        .then(friends => {
            const list = document.getElementById("friend-list");
            if (friends.length > 0) list.innerHTML = "";
            friends.forEach(friend => {
                const avatar = localStorage.getItem('jct_avatar_' + friend) || "static/image/defaultAvatar.jpg";
                addFriendToUI(friend, avatar);
            });
        });
}

// Run init on load
document.addEventListener("DOMContentLoaded", initFriendsSystem);

window.openAddFriendModal = function() {
    openModal("add-friend-modal");
    document.getElementById("friend-search-results").innerHTML = "";
    document.getElementById("friend-search-input").value = "";
}

window.searchFriend = async function() {
    const query = document.getElementById("friend-search-input").value.trim();
    if(!query) return;
    
    const displayUser = localStorage.getItem("jct_logged_in_user");
    const resultsDiv = document.getElementById("friend-search-results");
    resultsDiv.innerHTML = `<p style="color:#cbb27d; text-align:center;">Searching...</p>`;

    try {
        const res = await fetch(`${BACKEND_URL}/api/users/search?q=${query}&current_user=${displayUser}`);
        const users = await res.json();
        
        resultsDiv.innerHTML = "";
        if (users.length === 0) {
            resultsDiv.innerHTML = `<p style="color:#ff4d4d; text-align:center;">No users found.</p>`;
            return;
        }

        users.forEach(u => {
            const avatar = localStorage.getItem('jct_avatar_' + u.username) || "static/image/defaultAvatar.jpg";
            resultsDiv.innerHTML += `
                <div class="friend-bar">
                    <div class="friend-info">
                        <img src="${avatar}" class="friend-avatar">
                        <span class="friend-name">${u.username}</span>
                    </div>
                    <button class="profile-btn" style="padding: 5px 15px; font-size:0.9rem;" onclick="sendFriendRequest('${u.username}')"><i class="fas fa-user-plus"></i></button>
                </div>
            `;
        });
    } catch(err) {
        resultsDiv.innerHTML = `<p style="color:#ff4d4d; text-align:center;">Search failed.</p>`;
    }
}

window.sendFriendRequest = async function(receiver) {
    const displayUser = localStorage.getItem("jct_logged_in_user");
    try {
        const res = await fetch(`${BACKEND_URL}/api/friends/request`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sender: displayUser, receiver })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`Friend request sent to ${receiver}!`);
            closeModal("add-friend-modal");
        } else {
            alert(data.error);
        }
    } catch (err) { alert("Network error."); }
}

window.respondToRequest = async function(sender, action) {
    const displayUser = localStorage.getItem("jct_logged_in_user");
    await fetch(`${BACKEND_URL}/api/friends/respond`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ sender, receiver: displayUser, action })
    });

    document.getElementById(`req-${sender}`).remove();
    if(document.getElementById("friend-requests-list").innerHTML.trim() === "") {
        document.getElementById("friend-requests-wrapper").style.display = "none";
    }

    if (action === 'accept') {
        const avatar = localStorage.getItem('jct_avatar_' + sender) || "static/image/defaultAvatar.jpg";
        addFriendToUI(sender, avatar);
    }
}

function addFriendToUI(username, avatarSrc) {
    const list = document.getElementById("friend-list");
    if(list.innerHTML.includes("no friends yet")) list.innerHTML = "";
    
    list.innerHTML += `
        <div class="friend-bar" id="friend-bar-${username}">
            <div class="friend-info">
                <img src="${avatarSrc}" class="friend-avatar">
                <span class="friend-name">${username}</span>
            </div>
            <div class="friend-actions">
                <i class="fas fa-comment-dots f-icon f-chat" title="Chat" onclick="openChat('${username}', '${avatarSrc}')"></i>
                <i class="fas fa-id-badge f-icon f-profile" title="View Profile" onclick="openFriendProfile('${username}', '${avatarSrc}')"></i>
                <i class="fas fa-user-minus f-icon f-unfriend" title="Unfriend" onclick="openUnfriendModal('${username}')"></i>
            </div>
        </div>
    `;
}

// ================= NEW: VIEW FRIEND PROFILE =================
window.openFriendProfile = async function(username, avatarSrc) {
    document.getElementById("fp-username").innerText = username;
    document.getElementById("fp-avatar").src = avatarSrc;
    
    // Reset defaults while loading
    document.getElementById("fp-time").innerText = "...";
    document.getElementById("fp-hp").innerText = "...";
    document.getElementById("fp-streak").innerText = "...";
    document.getElementById("fp-quizzes").innerText = "...";
    document.getElementById("fp-quests").innerText = "...";
    document.getElementById("fp-rank").innerText = "Loading...";

    openModal("friend-profile-modal");

    try {
        const res = await fetch(`${BACKEND_URL}/api/users/profile/${username}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        document.getElementById("fp-time").innerText = data.active_time || 0;
        document.getElementById("fp-hp").innerText = data.holypower || 0;
        document.getElementById("fp-streak").innerText = data.daily_streak || 0;
        document.getElementById("fp-quizzes").innerText = data.quizzes_passed || 0; // FIXED: Maps to passed
        document.getElementById("fp-quests").innerText = data.quests_done || 0;

        // Calculate and display correct Rank using their XP!
        const friendXP = data.xp || 0;
        const friendRankData = calculateRank(friendXP);
        document.getElementById("fp-rank").innerText = friendRankData.name;

    } catch (err) {
        document.getElementById("fp-time").innerText = "?";
        document.getElementById("fp-hp").innerText = "?";
        document.getElementById("fp-rank").innerText = "Error";
    }
}

let friendToRemove = "";
window.openUnfriendModal = function(username) {
    friendToRemove = username;
    document.getElementById("unfriend-name").innerText = username;
    openModal("unfriend-modal");
}

window.confirmUnfriend = async function() {
    if(friendToRemove) {
        const displayUser = localStorage.getItem("jct_logged_in_user");
        await fetch(`${BACKEND_URL}/api/friends/remove`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userA: displayUser, userB: friendToRemove })
        });

        document.getElementById(`friend-bar-${friendToRemove}`).remove();
        friendToRemove = "";
        
        const list = document.getElementById("friend-list");
        if(list.innerHTML.trim() === "") {
            list.innerHTML = `<p style="color:#a67c52; font-family:'Cardo', serif; text-align:center;">You have no friends yet. Add someone!</p>`;
        }
    }
    closeModal("unfriend-modal");
}

// 4. WhatsApp-Style Chat System (Connected to DB)
let chatPollInterval;
let cachedChatData = "";
let currentFriendIsOnline = false;

window.openChat = function(username, avatarSrc) {
    activeChatFriend = username;
    document.getElementById("chat-friend-name").innerText = username;
    document.getElementById("chat-friend-avatar").src = avatarSrc;
    document.getElementById("emoji-picker").style.display = "none";
    cachedChatData = ""; // Reset cache so it forces a render
    
    openModal("chat-modal");

    // Instantly load, then poll every 3 seconds for new messages/status
    pollChatData(); 
    chatPollInterval = setInterval(pollChatData, 3000);
}

// Custom close function to stop the polling when chat is closed
window.closeChatModal = function() {
    clearInterval(chatPollInterval);
    closeModal('chat-modal');
}

window.toggleEmojiPicker = function() {
    const picker = document.getElementById("emoji-picker");
    picker.style.display = picker.style.display === "none" ? "grid" : "none";
}

window.addEmoji = function(emoji) {
    const input = document.getElementById("chat-msg-input");
    input.value += emoji;
    input.focus();
}

window.handleChatEnter = function(e) {
    if(e.key === "Enter") sendChatMessage();
}

window.sendChatMessage = async function(customImgSrc = null) {
    const input = document.getElementById("chat-msg-input");
    const text = input.value.trim();
    if(!text && !customImgSrc) return;
    
    const displayUser = localStorage.getItem("jct_logged_in_user");
    
    // Optimistic UI update (shows instantly before DB confirms)
    let contentHtml = text ? text : `<img src="${customImgSrc}">`;
    appendChatBubble(contentHtml, "me", localStorage.getItem('jct_avatar_' + displayUser), "sent", currentFriendIsOnline);
    input.value = "";
    document.getElementById("emoji-picker").style.display = "none";
    
    // Save to Database
    await fetch(`${BACKEND_URL}/api/chat/send`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            sender: displayUser,
            receiver: activeChatFriend,
            message: text || null,
            file_url: customImgSrc || null
        })
    });

    pollChatData(); // Force immediate refresh to get correct DB status
}

window.handleChatUpload = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image too large! Max 2MB."); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        sendChatMessage(e.target.result); 
    };
    reader.readAsDataURL(file);
}

function appendChatBubble(content, side, avatarSrc, readStatus, friendOnline) {
    const area = document.getElementById("chat-messages-area");
    
    let ticksHtml = "";
    if (side === "me") {
        if (readStatus === "read") {
            ticksHtml = `<i class="fas fa-check-double msg-ticks tick-blue" title="Read"></i>`; // 2 Blue Ticks
        } else if (friendOnline) {
            ticksHtml = `<i class="fas fa-check-double msg-ticks tick-grey" title="Delivered"></i>`; // 2 Grey Ticks
        } else {
            ticksHtml = `<i class="fas fa-check msg-ticks tick-grey" title="Sent"></i>`; // 1 Grey Tick
        }
    }

    area.innerHTML += `
        <div class="chat-bubble-row ${side}">
            <img src="${avatarSrc}" class="chat-avatar-small" style="width:30px; height:30px;">
            <div class="chat-bubble">${content} ${ticksHtml}</div>
        </div>
    `;
    area.scrollTop = area.scrollHeight;
}

// Master function that runs every 3 seconds to fetch status and messages
async function pollChatData() {
    const displayUser = localStorage.getItem("jct_logged_in_user");
    if (!displayUser || !activeChatFriend) return;

    try {
        // 1. Fetch Friend's Online Status
        const statusRes = await fetch(`${BACKEND_URL}/api/users/status/${activeChatFriend}`);
        const statusData = await statusRes.json();
        currentFriendIsOnline = statusData.online;
        
        const statusText = document.getElementById("chat-friend-status");
        if(currentFriendIsOnline) {
            statusText.innerText = "Online";
            statusText.style.color = "#52c41a"; // Green
        } else {
            statusText.innerText = "Offline";
            statusText.style.color = "#a67c52"; // Brown/Grey
        }

        // 2. Tell the database we have read their messages
        await fetch(`${BACKEND_URL}/api/chat/read`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sender: activeChatFriend, receiver: displayUser })
        });

        // 3. Fetch latest chat history
        const res = await fetch(`${BACKEND_URL}/api/chat/history?user1=${displayUser}&user2=${activeChatFriend}`);
        const history = await res.json();
        
        // Prevent re-rendering the whole chat if nothing changed (stops flickering)
        const newCacheData = JSON.stringify(history);
        if (newCacheData === cachedChatData) return; 
        cachedChatData = newCacheData;

        // Render UI
        const area = document.getElementById("chat-messages-area");
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        area.innerHTML = `<div class="chat-date-divider">${today}</div>`;
        
        history.forEach(msg => {
            const side = msg.sender === displayUser ? "me" : "friend";
            const avatar = localStorage.getItem('jct_avatar_' + msg.sender) || "static/image/defaultAvatar.jpg";
            const content = msg.message ? msg.message : `<img src="${msg.file_url}">`;
            
            appendChatBubble(content, side, avatar, msg.read_status, currentFriendIsOnline);
        });

    } catch(err) {
        console.error("Chat sync error");
    }
}

// ================= DAILY QUIZ LOGIC =================
const QUIZ_BANK = [
    // --- EASY ---
    { q: "What is the first book of the Bible?", opts: ["Exodus", "Genesis", "Leviticus", "Numbers"], ans: 1, diff: "easy" },
    { q: "Who was swallowed by a great fish?", opts: ["Peter", "Paul", "Jonah", "Moses"], ans: 2, diff: "easy" },
    { q: "How many days did God take to create the world?", opts: ["5", "6", "7", "3"], ans: 1, diff: "easy" },
    { q: "Who defeated the giant Goliath?", opts: ["Saul", "Solomon", "David", "Jonathan"], ans: 2, diff: "easy" },
    { q: "What was the name of Jesus' earthly father?", opts: ["Joseph", "John", "Zechariah", "Simeon"], ans: 0, diff: "easy" },
    { q: "How many original apostles did Jesus choose?", opts: ["10", "12", "14", "40"], ans: 1, diff: "easy" },
    { q: "In which river was Jesus baptized?", opts: ["Nile", "Tigris", "Jordan", "Euphrates"], ans: 2, diff: "easy" },
    { q: "Who is the earthly mother of Jesus?", opts: ["Elizabeth", "Martha", "Sarah", "Mary"], ans: 3, diff: "easy" },

    // --- MEDIUM ---
    { q: "Who wrote the majority of the Psalms?", opts: ["David", "Moses", "Asaph", "Solomon"], ans: 0, diff: "medium" },
    { q: "Where did Jesus perform His first miracle turning water into wine?", opts: ["Jerusalem", "Bethlehem", "Cana", "Nazareth"], ans: 2, diff: "medium" },
    { q: "Who was the very first King of Israel?", opts: ["David", "Solomon", "Saul", "Samuel"], ans: 2, diff: "medium" },
    { q: "What is the longest book in the Bible?", opts: ["Isaiah", "Psalms", "Jeremiah", "Genesis"], ans: 1, diff: "medium" },
    { q: "How many years did the Israelites wander in the wilderness?", opts: ["30", "40", "50", "100"], ans: 1, diff: "medium" },
    { q: "Who wrote the majority of the New Testament epistles?", opts: ["Paul", "Peter", "John", "James"], ans: 0, diff: "medium" },
    { q: "Which Gospel writer was known as the 'beloved physician'?", opts: ["Matthew", "Luke", "Mark", "John"], ans: 1, diff: "medium" },
    { q: "Which disciple denied Jesus three times before the rooster crowed?", opts: ["Judas", "Thomas", "Peter", "Andrew"], ans: 2, diff: "medium" },
    { q: "What was the name of the tax collector who climbed a tree to see Jesus?", opts: ["Matthew", "Levi", "Nicodemus", "Zacchaeus"], ans: 3, diff: "medium" },

    // --- HARD ---
    { q: "Who was the father of John the Baptist?", opts: ["Zacharias", "Joseph", "Simeon", "Zebedee"], ans: 0, diff: "hard" },
    { q: "What specific wood was Noah commanded to use for the Ark?", opts: ["Cedar", "Acacia", "Gopher", "Oak"], ans: 2, diff: "hard" },
    { q: "On what island was John exiled when he wrote Revelation?", opts: ["Crete", "Cyprus", "Patmos", "Malta"], ans: 2, diff: "hard" },
    { q: "Who was the only female Judge of Israel?", opts: ["Ruth", "Esther", "Deborah", "Miriam"], ans: 2, diff: "hard" },
    { q: "Who replaced Judas Iscariot as an Apostle?", opts: ["Paul", "Matthias", "Barnabas", "Silas"], ans: 1, diff: "hard" },
    { q: "What was the Apostle Paul's profession by trade?", opts: ["Fisherman", "Carpenter", "Tentmaker", "Tax Collector"], ans: 2, diff: "hard" },
    { q: "Who is recorded as the first Christian martyr?", opts: ["Stephen", "James", "Peter", "Paul"], ans: 0, diff: "hard" },
    { q: "What language was the majority of the New Testament originally written in?", opts: ["Hebrew", "Greek", "Aramaic", "Latin"], ans: 1, diff: "hard" },
    { q: "Which Archangel appeared to Mary to announce the birth of Jesus?", opts: ["Michael", "Raphael", "Gabriel", "Uriel"], ans: 2, diff: "hard" },

    // --- DIFFICULT ---
    { q: "In what year did the Great Schism split the Catholic and Eastern Orthodox churches?", opts: ["1054", "1517", "325", "1095"], ans: 0, diff: "difficult" },
    { q: "Who authored 'Institutes of the Christian Religion'?", opts: ["Martin Luther", "John Calvin", "Thomas Aquinas", "John Wesley"], ans: 1, diff: "difficult" },
    { q: "The First Council of Nicaea, which formulated the Nicene Creed, took place in what year?", opts: ["100 AD", "451 AD", "325 AD", "787 AD"], ans: 2, diff: "difficult" },
    { q: "Which Protestant Reformer famously nailed the 95 Theses to the Wittenberg door?", opts: ["Ulrich Zwingli", "John Knox", "Jan Hus", "Martin Luther"], ans: 3, diff: "difficult" },
    { q: "How many ecumenical councils are generally recognized by the Eastern Orthodox Church?", opts: ["Seven", "Three", "Twelve", "Twenty-One"], ans: 0, diff: "difficult" },
    { q: "What is the Catholic dogma that asserts Mary was conceived without original sin?", opts: ["Virgin Birth", "Immaculate Conception", "Theotokos", "Assumption"], ans: 1, diff: "difficult" },

    // --- EXTREME ---
    { q: "Which Pope initiated the First Crusade in 1095 AD?", opts: ["Pope Gregory VII", "Pope Innocent III", "Pope Urban II", "Pope Boniface VIII"], ans: 2, diff: "extreme" },
    { q: "Who translated the Bible into Latin, creating the 'Vulgate'?", opts: ["Augustine", "Thomas Aquinas", "Jerome", "Clement"], ans: 2, diff: "extreme" },
    { q: "What heresy denies the Trinity by claiming God merely acts in three different 'modes' or forms?", opts: ["Arianism", "Pelagianism", "Nestorianism", "Modalism (Sabellianism)"], ans: 3, diff: "extreme" },
    { q: "In Catholic theology, what is the term for the bread and wine substantially changing into Christ's body and blood?", opts: ["Transubstantiation", "Consubstantiation", "Memorialism", "Sacramental Union"], ans: 0, diff: "extreme" },
    { q: "Which book of the Bible is famous for being the only one that never explicitly mentions God?", opts: ["Ruth", "Song of Solomon", "Esther", "Ecclesiastes"], ans: 2, diff: "extreme" },
    { q: "The 'Filioque' controversy, a major cause of the Great Schism, was about the Holy Spirit proceeding from the Father and...", opts: ["The Virgin Mary", "The Church", "The Apostles", "The Son"], ans: 3, diff: "extreme" },

    // --- INSANE ---
    { q: "Who was the chief defender of Trinitarianism against Arius at the Council of Nicaea?", opts: ["Athanasius", "Tertullian", "Cyril of Alexandria", "Basil the Great"], ans: 0, diff: "insane" },
    { q: "The Synod of Dort (1618-1619) was convened to officially address and condemn the teachings of whom?", opts: ["John Calvin", "Jacobus Arminius", "Michael Servetus", "Erasmus"], ans: 1, diff: "insane" },
    { q: "Which early church father wrote the monumental work 'The City of God'?", opts: ["Justin Martyr", "Irenaeus", "Augustine of Hippo", "Origen"], ans: 2, diff: "insane" },
    { q: "Which early Christian heresy taught that the physical world is inherently evil and salvation requires secret spiritual knowledge?", opts: ["Arianism", "Docetism", "Donatism", "Gnosticism"], ans: 3, diff: "insane" },
    { q: "What was the name of the first anti-pope who reigned during the Western Schism from Avignon starting in 1378?", opts: ["Clement VII", "Benedict XIII", "Alexander V", "John XXIII"], ans: 0, diff: "insane" },

    // --- IMPOSSIBLE ---
    { q: "Who authored the 'Summa Theologica', highly influential in Catholic scholasticism?", opts: ["Thomas Aquinas", "Bonaventure", "Peter Lombard", "Duns Scotus"], ans: 0, diff: "impossible" },
    { q: "In Eastern Orthodox theology, what is the specific term used for the transformative process of achieving union with God?", opts: ["Kenosis", "Theosis", "Hypostasis", "Oikonomia"], ans: 1, diff: "impossible" },
    { q: "Which early Christian sect believed Jesus was entirely distinct from the cruel Creator God of the Old Testament?", opts: ["Montanism", "Apollinarianism", "Marcionism", "Novatianism"], ans: 2, diff: "impossible" },
    { q: "What 1648 treaty ended the Thirty Years' War and established the principle of 'cuius regio, eius religio'?", opts: ["Treaty of Tordesillas", "Edict of Nantes", "Diet of Worms", "Peace of Westphalia"], ans: 3, diff: "impossible" },
    { q: "In the Book of Revelation, which of the seven churches was accused of being 'lukewarm' and making Christ sick?", opts: ["Ephesus", "Laodicea", "Smyrna", "Pergamum"], ans: 1, diff: "impossible" },
    { q: "The 'Tetragrammaton' refers to the four Hebrew letters used for the name of God. What are they?", opts: ["ELOH", "ADON", "YHWH", "SHAD"], ans: 2, diff: "impossible" }
];

let activeQuestions = [];
let currentQIndex = 0;
let quizLives = 3;
let selectedOptIndex = -1;
let quizInterval;

function getSGMidnightTimer() {
    const now = new Date();
    const sgTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    sgTime.setUTCHours(23, 59, 59, 999);
    return sgTime.getTime() - (8 * 60 * 60 * 1000);
}

// Ensure the profile HTML has an ID for quizzes! (Add `id="stat-quizzes"` to the html)
window.openQuizModal = function() {
    if (isGuest) return alert("Please register an account to play the Daily Quiz!");

    const todaySG = new Date(new Date().getTime() + (8 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    document.getElementById("quiz-start-screen").style.display = "none";
    document.getElementById("quiz-cooldown-screen").style.display = "none";
    document.getElementById("quiz-q-screen").style.display = "none";

    if (window.userLastQuizDate === todaySG) {
        document.getElementById("quiz-cooldown-screen").style.display = "block";
        startQuizCooldown();
    } else {
        document.getElementById("quiz-start-screen").style.display = "block";
    }
    openModal("quiz-modal");
}

function startQuizCooldown() {
    clearInterval(quizInterval);
    quizInterval = setInterval(() => {
        const diff = getSGMidnightTimer() - Date.now();
        if (diff <= 0) { document.getElementById("quiz-cd-timer").innerText = "Ready!"; clearInterval(quizInterval); } 
        else {
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            document.getElementById("quiz-cd-timer").innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

window.startDailyQuiz = function() {
    document.getElementById("quiz-start-screen").style.display = "none";
    document.getElementById("quiz-q-screen").style.display = "block";
    
    // Shuffle and pick 10
    activeQuestions = [...QUIZ_BANK].sort(() => 0.5 - Math.random()).slice(0, 10);
    currentQIndex = 0;
    quizLives = 3;
    document.getElementById("life-1").classList.remove("life-lost");
    document.getElementById("life-2").classList.remove("life-lost");
    document.getElementById("life-3").classList.remove("life-lost");

    loadQuestion();
}

function loadQuestion() {
    selectedOptIndex = -1;
    document.getElementById("quiz-submit-btn").style.display = "block";
    document.getElementById("quiz-progress").innerText = `Question ${currentQIndex + 1} / 10`;
    
    const qData = activeQuestions[currentQIndex];
    document.getElementById("quiz-question-text").innerText = qData.q;
    
    const badge = document.getElementById("quiz-difficulty");
    badge.className = `diff-badge ${qData.diff}`;
    badge.innerText = qData.diff.charAt(0).toUpperCase() + qData.diff.slice(1);

    const optsContainer = document.getElementById("quiz-options-container");
    optsContainer.innerHTML = "";
    qData.opts.forEach((opt, idx) => {
        optsContainer.innerHTML += `<button class="quiz-option" id="opt-${idx}" onclick="selectQuizOption(${idx})">${opt}</button>`;
    });
}

window.selectQuizOption = function(idx) {
    if (document.getElementById(`opt-${idx}`).classList.contains('wrong')) return; // Can't select wrong ones
    selectedOptIndex = idx;
    document.querySelectorAll('.quiz-option').forEach(el => el.classList.remove('selected'));
    document.getElementById(`opt-${idx}`).classList.add('selected');
}

window.submitQuizAnswer = function() {
    if (selectedOptIndex === -1) return alert("Please select an answer first.");
    
    const qData = activeQuestions[currentQIndex];
    const selectedBtn = document.getElementById(`opt-${selectedOptIndex}`);

    if (selectedOptIndex === qData.ans) {
        // Correct!
        selectedBtn.classList.remove('selected');
        selectedBtn.classList.add('correct');
        document.getElementById("quiz-submit-btn").style.display = "none";
        
        setTimeout(() => {
            currentQIndex++;
            if (currentQIndex >= 10) finalizeQuiz('pass');
            else loadQuestion();
        }, 2000);
    } else {
        // Wrong!
        selectedBtn.classList.remove('selected');
        selectedBtn.classList.add('wrong');
        quizLives--;
        document.getElementById(`life-${quizLives + 1}`).classList.add("life-lost");
        selectedOptIndex = -1; // Reset selection so they must guess again
        
        if (quizLives <= 0) {
            setTimeout(() => finalizeQuiz('fail'), 1000);
        }
    }
}

window.resignQuiz = function() {
    if(confirm("Are you sure you want to resign? You will fail today's quiz.")) {
        finalizeQuiz('fail');
    }
}

async function finalizeQuiz(status) {
    document.getElementById("quiz-q-screen").style.display = "none";
    
    if (status === 'pass') {
        alert("🎉 Congratulations! You passed the daily quiz!\n+1000 Holy Power\n+500 XP");
    } else {
        alert("❌ You failed today's quiz. Read your Bible and try again tomorrow!");
    }

    const displayUser = localStorage.getItem("jct_logged_in_user");
    window.userLastQuizDate = new Date(new Date().getTime() + (8 * 60 * 60 * 1000)).toISOString().split('T')[0];

    await fetch(`${BACKEND_URL}/api/quiz/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: displayUser, status: status })
    });

    // Refresh UI Profile
    location.reload(); 
}

// ================= DIVINE SCROLL REVEAL =================
const revealElements = () => {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // We use a small timeout to let the CSS transitions breathe
                entry.target.classList.add("active");
                // Remove the 'reveal' class once 'active' is set to clean up logic
                entry.target.classList.remove("reveal");
            }
        });
    }, observerOptions);

    const targets = document.querySelectorAll(".gospel-block, .disciple-card, .tree-reveal, .trinity-reveal");
    targets.forEach((el, index) => {
        observer.observe(el);
        // Stagger the entrance
        el.style.transitionDelay = `${(index % 3) * 0.1}s`;
    });
};

document.addEventListener('DOMContentLoaded', revealElements);

// ================= DISCIPLE CARD PARTICLES =================
document.querySelectorAll('.disciple-card, .tree-card').forEach(card => {
    let particleInterval;

    card.addEventListener('mouseenter', () => {
        // Initial burst of 5 particles
        for(let i=0; i<5; i++) createParticle(card); 
        
        // Steady stream of 3 particles
        particleInterval = setInterval(() => {
            for(let i=0; i<3; i++) createParticle(card);
        }, 150); 
    });

    card.addEventListener('mouseleave', () => {
        clearInterval(particleInterval);
    });
});

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'gospel-particle'; 
    
    // Fallback if container is not passed (for global particles)
    const targetContainer = container.tagName ? container : document.body;

    const size = Math.random() * 5 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Position logic
    const x = Math.random() * targetContainer.offsetWidth;
    const y = Math.random() * targetContainer.offsetHeight;
    
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.position = "absolute";
    particle.style.zIndex = "10";
    particle.style.pointerEvents = "none";

    targetContainer.appendChild(particle);

    const destinationX = (Math.random() - 0.5) * 150;
    const destinationY = (Math.random() - 0.5) * 150;

    const anim = particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${destinationX}px, ${destinationY}px) scale(0)`, opacity: 0 }
    ], {
        duration: 1200 + Math.random() * 800,
        easing: 'ease-out'
    });

    anim.onfinish = () => particle.remove();
}

// Global ambient sparkles
setInterval(() => createParticle(document.querySelector('.gospel')), 300);

// Data for the Modals
const discipleData = {
    "Saint Simon Peter": {
        bio: "Simon Peter, originally a fisherman on the Sea of Galilee, became the 'Rock' upon which the Church was built. Known for his fiery and impulsive nature, he was the first to declare Jesus as the Messiah. Despite denying Christ three times, he was restored and became the bold leader of the early church in Jerusalem and later Rome. He is traditionally believed to have been crucified upside down, feeling unworthy to die in the same manner as his Lord.",
        mission: "To lead the Apostles and establish the Church's foundation."
    },
    "Saint Andrew": {
        bio: "The brother of Peter and a former disciple of John the Baptist, Andrew was the very first Apostle called by Jesus. He is often called the 'Protocletos' (First Called). Andrew was known for bringing others to Christ, including his own brother. He preached across Asia Minor and Greece. Tradition holds that he was martyred on an X-shaped cross (St. Andrew's Cross), continuing to preach to onlookers for two days until he passed.",
        mission: "Bringing individuals to Christ and spreading the Gospel to the East."
    },
    "Saint James the Greater": {
        bio: "The son of Zebedee and brother of John, James was part of the 'inner circle' (Peter, James, and John) who witnessed the Transfiguration and the Agony in Gethsemane. He was known for his intense zeal, earning the nickname 'Son of Thunder.' James was the first of the Twelve to be martyred, beheaded by King Herod Agrippa I in 44 AD. He remains the patron saint of Spain.",
        mission: "Boldly proclaiming the Kingdom and pioneering missionary work."
    },
    "Saint John the Beloved": {
        bio: "The youngest Apostle and the 'disciple whom Jesus loved,' John was the only Apostle who did not flee during the Crucifixion, staying at the foot of the cross. He was entrusted with the care of Mary, the mother of Jesus. John wrote the Fourth Gospel, three epistles, and the Book of Revelation while exiled on the Island of Patmos. He is the only Apostle traditionally believed to have died of old age.",
        mission: "To testify to the divinity of Christ through the theology of Love."
    },
    "Saint Philip": {
        bio: "Philip was from Bethsaida, the same town as Peter and Andrew. He was the one who famously told Nathanael, 'Come and see.' Philip was a practical man; he was the one Jesus questioned about how to feed the 5,000. He spent his later years preaching in Phrygia (modern-day Turkey), where he eventually met his martyrdom.",
        mission: "Direct evangelism and serving the practical needs of the growing church."
    },
    "Saint Bartholomew": {
        bio: "Also known as Nathanael, he was the man Jesus called 'an Israelite in whom there is no guile.' Initially skeptical of anything from Nazareth, he became a devoted follower after a brief conversation with Christ. Historical accounts suggest he traveled as far as India and Armenia to spread the Gospel. He suffered a particularly brutal martyrdom, being flayed alive for his faith.",
        mission: "Spreading the light of Christ to the furthest reaches of the East."
    },
    "Saint Matthew": {
        bio: "Formerly known as Levi, Matthew was a tax collector in Capernaum—a profession loathed by his fellow Jews. When Jesus said 'Follow me,' Matthew left his wealthy lifestyle behind immediately. He wrote the First Gospel, primarily for a Jewish audience, to prove that Jesus was the fulfillment of Old Testament prophecies. He later preached in Ethiopia and Persia.",
        mission: "Documenting the fulfillment of the Law through the life of Christ."
    },
    "Saint Thomas": {
        bio: "Often unfairly remembered only as 'Doubting Thomas,' he was actually a man of great courage who once said, 'Let us also go, that we may die with him.' While he struggled to believe in the Resurrection until he saw the wounds, his confession 'My Lord and my God!' is one of the most profound in the Bible. He is credited with bringing Christianity to India, where he was martyred.",
        mission: "Bringing the Gospel to distant lands and overcoming doubt through faith."
    },
    "Saint James the Lesser": {
        bio: "The son of Alphaeus, he is called 'the Less' likely because he was younger or shorter than the other James. He played a massive role in the early church as the first Bishop of Jerusalem. Known for his deep prayer life and holiness, he was eventually pushed from the pinnacle of the Temple and beaten to death when he refused to deny Christ.",
        mission: "Preserving the purity and law of the early church in Jerusalem."
    },
    "Saint Jude Thaddeus": {
        bio: "Not to be confused with Judas Iscariot, Jude (or Thaddeus) was the brother of James the Lesser. He wrote the Epistle of Jude to warn against false teachers. He is the patron saint of 'lost causes' or 'desperate situations,' symbolizing the hope that Christ offers when all seems lost. He preached in Mesopotamia and Armenia.",
        mission: "Encouraging the faithful to contend for the faith in difficult times."
    },
    "Saint Simon the Zealot": {
        bio: "Before following Jesus, Simon belonged to the Zealots, a political group dedicated to the violent overthrow of the Roman occupation. His transformation is a testament to Christ's peace—he went from a man of political violence to a man of spiritual salvation. He is said to have preached in Egypt and Persia alongside St. Jude.",
        mission: "Channeling earthly passion into the spiritual zeal for the Kingdom."
    },
    "Saint Matthias": {
        bio: "Matthias was a follower of Jesus from the beginning, having witnessed the baptism of John and the Resurrection. After Judas Iscariot's death, the Apostles cast lots, and the Holy Spirit chose Matthias to take his place among the Twelve. He was a faithful witness who preached in Judea and modern-day Georgia.",
        mission: "Filling the void left by betrayal and maintaining the apostolic witness."
    },
    "Judas Iscariot": {
        bio: "Judas was the treasurer of the group, but his heart was corrupted by greed. He is the tragic figure who betrayed Jesus for thirty pieces of silver with a kiss in the Garden of Gethsemane. His life serves as a somber warning that proximity to Jesus does not guarantee a changed heart. Overcome with remorse but lacking repentance, he took his own life shortly after the betrayal.",
        mission: "The fulfillment of prophecy through the mystery of betrayal."
    },
    "God The Father": {
        bio: "The one true God, Creator of the universe. In Christian theology, He is the first person of the Trinity, whose love for humanity was so great that He sent His only Son.",
        mission: "To love, create, and offer salvation to the world."
    },
    "Virgin Mary": {
        bio: "Chosen by God to be the earthly mother of Jesus through the miraculous conception by the Holy Spirit. Her faithful obedience ('Let it be done to me') changed the course of human history. While honored in ancient traditions for her 'Perpetual Virginity,' many biblical scholars and Protestant traditions note that after the virgin birth of Jesus, she and Joseph went on to have a natural marriage, giving birth to His earthly brothers: James, Joses, Simon, and Jude.",
        mission: "To bear the Savior of the world and anchor the Holy Family."
    },
    "Saint Joseph": {
        bio: "A righteous carpenter from the line of David. He served as the earthly father and protector of Jesus, guiding the Holy Family through exile in Egypt and raising Jesus in Nazareth. After the miraculous birth of Christ, he and Mary raised a bustling household together, bringing up Jesus alongside His younger brothers—James, Joses, Jude, and Simon—and their sisters.",
        mission: "To protect, provide for, and faithfully lead the Holy Family."
    },
    "Jesus Christ": {
        bio: "The central figure of Christianity, the Messiah, and the Son of God. He lived a sinless life, performed miracles, and willingly died on the cross to pay the penalty for human sin, rising again on the third day.",
        mission: "To bring salvation and eternal life to all who believe."
    },
    "James the Just": {
        bio: "Also known as James, brother of the Lord. He initially did not believe in Jesus but became a prominent leader in the early Jerusalem Church after encountering the resurrected Christ. He authored the Book of James.",
        mission: "Leading the early Jewish Christians in Jerusalem."
    },
    "Jude": {
        bio: "Often identified as the author of the Epistle of Jude, he initially doubted Jesus' divinity alongside his brothers. After the resurrection, he became a steadfast believer and a vital leader in the early Christian community, warning the church against false teachers.",
        mission: "To contend earnestly for the faith and protect the early church from corruption."
    },
    "Simon": {
        bio: "Simon (or Simeon) was one of the brothers of Jesus. Tradition holds that after the martyrdom of James the Just, Simon succeeded him as the second bishop of Jerusalem, guiding the Jewish Christian community through the turbulent times of the Jewish-Roman wars.",
        mission: "Shepherding and protecting the Jewish Christian community in Jerusalem."
    },
    "Joses": {
        bio: "Also known as Joseph, Joses is mentioned in the Gospels as one of Jesus' brothers. While less is recorded about his specific leadership compared to James and Jude, he was part of the devoted holy family that formed the core of the early believers after the Resurrection.",
        mission: "Serving faithfully within the foundational roots of the early church."
    }
};

function openModal(card, index) {
    const modal = document.getElementById('disciple-modal');
    const name = card.querySelector('h3').innerText;
    const img = card.querySelector('img').src;
    const occ = card.querySelector('.occupation').innerText;

    // Fill content
    document.getElementById('modal-name').innerText = name;
    document.getElementById('modal-img').src = img;
    document.getElementById('modal-occupation').innerText = occ;
    document.getElementById('modal-bio').innerText = discipleData[name]?.bio || "Biography coming soon...";

    // CLEAR OLD THEMES
    modal.classList.remove('slide-left', 'slide-top', 'slide-right', 'judas-theme');

    // CHECK IF IT'S JUDAS
    if (name === "Judas Iscariot") {
        modal.classList.add('judas-theme');
    }

    // Determine Direction based on row position
    const position = (index % 3); 
    if (position === 0) modal.classList.add('slide-left');
    else if (position === 1) modal.classList.add('slide-top');
    else modal.classList.add('slide-right');

    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeModal() {
    const modal = document.getElementById('disciple-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 600); // Matches CSS transition time
}

// Attach click events to the "More Info" buttons
document.querySelectorAll('.disciple-card, .tree-card').forEach((card, index) => {
    const btn = card.querySelector('.more-info-btn');
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents card hover trigger
        openModal(card, index);
    });
});

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