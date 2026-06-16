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

// 1. Initialize Avatar on Page Load (NOW SYNCS WITH DATABASE)
async function initializeUserAvatar() {
    const displayUser = localStorage.getItem("jct_logged_in_user");
    if (!displayUser) return; // Guests handle differently or fallback to default

    // Step A: Load instantly from local storage so the UI doesn't look empty
    let savedAvatar = localStorage.getItem('jct_avatar_' + displayUser) || AVATAR_LIST[0];
    applyAvatarToUI(savedAvatar);

    // Step B: Ask the database for the permanent avatar (in case they logged in on a new phone)
    try {
        const res = await fetch(`${BACKEND_URL}/api/users/profile/${displayUser}`);
        if (res.ok) {
            const data = await res.json();
            if (data.avatar_url) {
                // Save it locally and update the UI
                localStorage.setItem('jct_avatar_' + displayUser, data.avatar_url);
                applyAvatarToUI(data.avatar_url);
            }
        }
    } catch(err) {
        console.warn("Could not sync avatar from database.");
    }
}

// Helper to update the images on screen
function applyAvatarToUI(avatarSrc) {
    const mainProfileImg = document.getElementById("main-profile-avatar");
    if (mainProfileImg) mainProfileImg.src = avatarSrc;
    
    const navProfileImg = document.getElementById("nav-avatar-img");
    if (navProfileImg) navProfileImg.src = avatarSrc;
}

// Run immediately on page load
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

// 7. Save Final Selection (NOW SAVES TO DATABASE)
window.saveAvatar = async function() {
    const displayUser = localStorage.getItem("jct_logged_in_user");
    if (!displayUser) {
        alert("Guests cannot save avatars permanently.");
        closeAvatarModal();
        return;
    }

    // 1. Save locally for instant speed
    localStorage.setItem('jct_avatar_' + displayUser, temporarySelectedAvatar);
    applyAvatarToUI(temporarySelectedAvatar);
    closeAvatarModal();

    // 2. Push to Supabase Database so it saves across all phones/devices!
    try {
        await fetch(`${BACKEND_URL}/api/users/avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: displayUser, 
                avatar_url: temporarySelectedAvatar 
            })
        });
    } catch(err) {
        console.error("Failed to push avatar to database.");
    }
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

    // 1. Fetch Requests (Now uses DB avatar)
    fetch(`${BACKEND_URL}/api/friends/requests/${displayUser}`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                document.getElementById("friend-requests-wrapper").style.display = "block";
                const list = document.getElementById("friend-requests-list");
                list.innerHTML = "";
                data.forEach(req => {
                    const avatar = req.avatar_url; // From Database!
                    localStorage.setItem('jct_avatar_' + req.sender_username, avatar); // Cache it for chat

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

    // 2. Fetch Friend List (Now uses DB avatar)
    fetch(`${BACKEND_URL}/api/friends/list/${displayUser}`)
        .then(res => res.json())
        .then(friends => {
            const list = document.getElementById("friend-list");
            if (friends.length > 0) list.innerHTML = "";
            friends.forEach(friend => {
                const avatar = friend.avatar_url; // From Database!
                localStorage.setItem('jct_avatar_' + friend.username, avatar); // Cache it for chat
                addFriendToUI(friend.username, avatar);
            });
        });
}

// Run init on load
document.addEventListener("DOMContentLoaded", initFriendsSystem);

// ================= FRIEND SEARCH LOGIC =================
window.openAddFriendModal = function() {
    openModal("add-friend-modal");
    document.getElementById("friend-search-input").value = "";
    searchFriend(); // Instantly load available users when modal opens!
}

// ================= FRIEND SEARCH LOGIC =================
window.searchFriend = async function() {
    const query = document.getElementById("friend-search-input").value.trim();
    const displayUser = localStorage.getItem("jct_logged_in_user");
    const resultsDiv = document.getElementById("friend-search-results");

    try {
        const res = await fetch(`${BACKEND_URL}/api/users/search?q=${query}&current_user=${displayUser}`);
        const users = await res.json();
        
        resultsDiv.innerHTML = "";
        if (users.length === 0) {
            resultsDiv.innerHTML = `<p style="color:#ff4d4d; text-align:center;">No believers found.</p>`;
            return;
        }

        users.forEach(u => {
            // Uses DB avatar!
            const avatar = u.avatar_url || "static/image/defaultAvatar.jpg"; 
            resultsDiv.innerHTML += `
                <div class="friend-bar">
                    <div class="friend-info">
                        <img src="${avatar}" class="friend-avatar">
                        <span class="friend-name">${u.username}</span>
                    </div>
                    <button class="profile-btn" style="padding: 5px 15px; font-size:0.9rem;" onclick="sendFriendRequest('${u.username}')">
                        <i class="fas fa-user-plus"></i> Add
                    </button>
                </div>
            `;
        });
    } catch(err) {
        resultsDiv.innerHTML = `<p style="color:#ff4d4d; text-align:center;">Search failed to connect.</p>`;
    }
}

// ================= DYNAMIC CHAT DATE LOGIC =================

// Helper to safely parse Supabase database timestamps into valid Javascript Date objects
function parseDBDate(dateString) {
    if (!dateString) return new Date();
    
    let safeDate = dateString;
    
    // 1. Replace space with T (e.g., 2026-06-08 05:18:20 -> 2026-06-08T05:18:20)
    if (typeof safeDate === 'string' && safeDate.includes(' ')) {
        safeDate = safeDate.replace(' ', 'T');
    }
    
    // 2. Remove the microseconds which break browser parsers (.304492)
    if (typeof safeDate === 'string' && safeDate.includes('.')) {
        safeDate = safeDate.split('.')[0];
    }
    
    // 3. Append 'Z' to tell the browser it is UTC time (Global Time)
    if (typeof safeDate === 'string' && !safeDate.endsWith('Z') && !safeDate.includes('+')) {
        safeDate += 'Z';
    }
    
    return new Date(safeDate);
}

// Helper to calculate "Today", "Yesterday", or "8 June 2026"
function formatChatDate(dateString) {
    const msgDate = parseDBDate(dateString);
    if (isNaN(msgDate.getTime())) return "Unknown Date"; // Failsafe

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
        return "Today";
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    } else {
        // Enforces exact layout: "8 June 2026"
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return msgDate.toLocaleDateString('en-GB', options); 
    }
}

// The master function to render messages with dynamic dates
window.renderChatMessages = function(messages, currentUser, friendUsername) {
    const chatArea = document.getElementById("chat-messages-area");
    chatArea.innerHTML = "";
    let lastDatePrinted = "";

    messages.forEach(msg => {
        const msgDateLabel = formatChatDate(msg.created_at);
        
        // If the date changes from the previous message, insert a Divider!
        if (msgDateLabel !== lastDatePrinted) {
            chatArea.innerHTML += `<div class="chat-date-divider">${msgDateLabel}</div>`;
            lastDatePrinted = msgDateLabel;
        }

        const isMe = msg.sender === currentUser;
        const rowClass = isMe ? "me" : "friend";
        const avatar = isMe ? (localStorage.getItem('jct_avatar_' + currentUser) || "static/image/defaultAvatar.jpg") 
                            : (localStorage.getItem('jct_avatar_' + friendUsername) || "static/image/defaultAvatar.jpg");

        // Format the small time string (e.g., "01:18 PM") using local timezone
        const msgDateObj = parseDBDate(msg.created_at);
        const timeStr = isNaN(msgDateObj.getTime()) ? "" : msgDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        chatArea.innerHTML += `
            <div class="chat-bubble-row ${rowClass}">
                ${!isMe ? `<img src="${avatar}" style="width:30px; height:30px; border-radius:50%; border:1px solid #8b5a2b; object-fit:cover;">` : ''}
                <div class="chat-bubble">
                    ${msg.message}
                    <span style="display:block; font-size:0.75rem; color:#888; text-align:right; margin-top:5px;">
                        ${timeStr} ${isMe ? '<i class="fas fa-check-double tick-blue"></i>' : ''}
                    </span>
                </div>
            </div>
        `;
    });
    
    // Auto-scroll to the newest message seamlessly
    setTimeout(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    }, 50);
}

// Make sure your openChat function calls renderChatMessages:
window.openChat = async function(friendName, friendAvatar) {
    activeChatFriend = friendName;
    document.getElementById('chat-friend-name').innerText = friendName;
    document.getElementById('chat-friend-avatar').src = friendAvatar;
    document.getElementById('chat-friend-status').innerText = "Online"; 
    
    openModal('chat-modal');
    
    const displayUser = localStorage.getItem("jct_logged_in_user");
    try {
        const res = await fetch(`${BACKEND_URL}/api/chat/history?user1=${displayUser}&user2=${friendName}`);
        const messages = await res.json();
        
        // Pass the messages into our new dynamic renderer!
        renderChatMessages(messages, displayUser, friendName);
    } catch (err) {
        document.getElementById("chat-messages-area").innerHTML = "<p style='text-align:center; color:red;'>Failed to load messages.</p>";
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

// ================= VIEW FRIEND PROFILE =================
window.openFriendProfile = async function(username, avatarSrc) {
    document.getElementById("fp-username").innerText = username;
    document.getElementById("fp-avatar").src = avatarSrc; // Fast initial load
    
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
        
        // REAL-TIME AVATAR UPDATE: Check if they updated their picture recently!
        if (data.avatar_url) {
            document.getElementById("fp-avatar").src = data.avatar_url;
            localStorage.setItem('jct_avatar_' + username, data.avatar_url);
            
            // Also update the tiny picture on the main Friend List in the background!
            const friendListImg = document.querySelector(`#friend-bar-${username} .friend-avatar`);
            if (friendListImg) friendListImg.src = data.avatar_url;
        }

        document.getElementById("fp-time").innerText = data.active_time || 0;
        document.getElementById("fp-hp").innerText = data.holypower || 0;
        document.getElementById("fp-streak").innerText = data.daily_streak || 0;
        document.getElementById("fp-quizzes").innerText = data.quizzes_passed || 0;
        document.getElementById("fp-quests").innerText = data.quests_done || 0;

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

// ================= WHATSAPP-STYLE CHAT SYSTEM =================
window.openChat = function(username, avatarSrc) {
    activeChatFriend = username;
    document.getElementById("chat-friend-name").innerText = username;
    
    // Pull the freshest avatar from the cache we just updated
    const freshAvatar = localStorage.getItem('jct_avatar_' + username) || avatarSrc;
    document.getElementById("chat-friend-avatar").src = freshAvatar;
    
    document.getElementById("emoji-picker").style.display = "none";
    cachedChatData = ""; 
    
    openModal("chat-modal");

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

// ================= QUIZ ENGINE LOGIC =================
const QUIZ_BANK = [
    // --- EASY (15 Questions) ---
    { q: "What is the first book of the Bible?", opts: ["Exodus", "Genesis", "Leviticus", "Numbers"], ans: 1, diff: "easy" },
    { q: "Who was swallowed by a great fish?", opts: ["Peter", "Paul", "Jonah", "Moses"], ans: 2, diff: "easy" },
    { q: "How many days did God take to create the world before resting?", opts: ["5", "6", "7", "3"], ans: 1, diff: "easy" },
    { q: "Who defeated the giant Goliath with a sling and a stone?", opts: ["Saul", "Solomon", "David", "Jonathan"], ans: 2, diff: "easy" },
    { q: "What was the name of Jesus' earthly father?", opts: ["Joseph", "John", "Zechariah", "Simeon"], ans: 0, diff: "easy" },
    { q: "How many original apostles did Jesus choose?", opts: ["10", "12", "14", "40"], ans: 1, diff: "easy" },
    { q: "In which river was Jesus baptized?", opts: ["Nile", "Tigris", "Jordan", "Euphrates"], ans: 2, diff: "easy" },
    { q: "Who is the earthly mother of Jesus?", opts: ["Elizabeth", "Martha", "Sarah", "Mary"], ans: 3, diff: "easy" },
    { q: "What is the last book of the New Testament?", opts: ["Acts", "Jude", "Revelation", "Romans"], ans: 2, diff: "easy" },
    { q: "Where was Jesus born?", opts: ["Nazareth", "Bethlehem", "Jerusalem", "Galilee"], ans: 1, diff: "easy" },
    { q: "Who built the Ark to survive the great flood?", opts: ["Abraham", "Moses", "Noah", "Enoch"], ans: 2, diff: "easy" },
    { q: "Who was sold into slavery in Egypt by his brothers?", opts: ["Jacob", "Esau", "Isaac", "Joseph"], ans: 3, diff: "easy" },
    { q: "What did Jesus turn into wine at the wedding in Cana?", opts: ["Juice", "Bread", "Water", "Dirt"], ans: 2, diff: "easy" },
    { q: "Which disciple betrayed Jesus?", opts: ["Peter", "Judas Iscariot", "Thomas", "John"], ans: 1, diff: "easy" },
    { q: "Who received the Ten Commandments from God on Mount Sinai?", opts: ["Aaron", "Joshua", "Elijah", "Moses"], ans: 3, diff: "easy" },

    // --- MEDIUM (15 Questions) ---
    { q: "Who wrote the majority of the Psalms?", opts: ["David", "Moses", "Asaph", "Solomon"], ans: 0, diff: "medium" },
    { q: "Who was the very first King of Israel?", opts: ["David", "Solomon", "Saul", "Samuel"], ans: 2, diff: "medium" },
    { q: "What is the longest chapter in the Bible?", opts: ["Psalm 23", "Psalm 119", "Isaiah 53", "Psalm 150"], ans: 1, diff: "medium" },
    { q: "How many years did the Israelites wander in the wilderness?", opts: ["30", "40", "50", "100"], ans: 1, diff: "medium" },
    { q: "Who wrote the majority of the New Testament epistles?", opts: ["Paul", "Peter", "John", "James"], ans: 0, diff: "medium" },
    { q: "Which Gospel writer was known as the 'beloved physician'?", opts: ["Matthew", "Luke", "Mark", "John"], ans: 1, diff: "medium" },
    { q: "Which disciple denied Jesus three times?", opts: ["Judas", "Thomas", "Peter", "Andrew"], ans: 2, diff: "medium" },
    { q: "What was the name of the short tax collector who climbed a tree to see Jesus?", opts: ["Matthew", "Levi", "Nicodemus", "Zacchaeus"], ans: 3, diff: "medium" },
    { q: "Which of these is NOT a Fruit of the Spirit mentioned in Galatians 5?", opts: ["Joy", "Patience", "Courage", "Gentleness"], ans: 2, diff: "medium" },
    { q: "What did God use to lead the Israelites through the wilderness by day?", opts: ["A pillar of fire", "A pillar of cloud", "An angel", "A shining star"], ans: 1, diff: "medium" },
    { q: "Who was the oldest man recorded in the Bible, living 969 years?", opts: ["Adam", "Noah", "Enoch", "Methuselah"], ans: 3, diff: "medium" },
    { q: "What was the name of the sea that Moses parted?", opts: ["Dead Sea", "Mediterranean Sea", "Red Sea", "Sea of Galilee"], ans: 2, diff: "medium" },
    { q: "Which prophet was taken up to heaven in a chariot of fire?", opts: ["Elisha", "Enoch", "Isaiah", "Elijah"], ans: 3, diff: "medium" },
    { q: "Who was the strong man whose hair was cut by Delilah?", opts: ["Gideon", "Samson", "Jephthah", "Boaz"], ans: 1, diff: "medium" },
    { q: "What type of bird brought an olive branch back to Noah's Ark?", opts: ["Raven", "Eagle", "Dove", "Sparrow"], ans: 2, diff: "medium" },

    // --- HARD (15 Questions) ---
    { q: "Who was the father of John the Baptist?", opts: ["Zacharias", "Joseph", "Simeon", "Zebedee"], ans: 0, diff: "hard" },
    { q: "What specific wood was Noah commanded to use for the Ark?", opts: ["Cedar", "Acacia", "Gopher", "Oak"], ans: 2, diff: "hard" },
    { q: "On what island was John exiled when he wrote Revelation?", opts: ["Crete", "Cyprus", "Patmos", "Malta"], ans: 2, diff: "hard" },
    { q: "Who was the only female Judge of Israel mentioned in the Bible?", opts: ["Ruth", "Esther", "Deborah", "Miriam"], ans: 2, diff: "hard" },
    { q: "Who replaced Judas Iscariot as an Apostle?", opts: ["Paul", "Matthias", "Barnabas", "Silas"], ans: 1, diff: "hard" },
    { q: "What was the Apostle Paul's profession by trade?", opts: ["Fisherman", "Carpenter", "Tentmaker", "Tax Collector"], ans: 2, diff: "hard" },
    { q: "Who is recorded in Acts as the first Christian martyr?", opts: ["Stephen", "James", "Peter", "Paul"], ans: 0, diff: "hard" },
    { q: "What language was the majority of the New Testament originally written in?", opts: ["Hebrew", "Greek", "Aramaic", "Latin"], ans: 1, diff: "hard" },
    { q: "Which Archangel appeared to Mary to announce the birth of Jesus?", opts: ["Michael", "Raphael", "Gabriel", "Uriel"], ans: 2, diff: "hard" },
    { q: "How many minor prophets are there in the Old Testament?", opts: ["5", "10", "12", "14"], ans: 2, diff: "hard" },
    { q: "Who was the king of Judea when Jesus was born?", opts: ["Pilate", "Caesar Augustus", "Herod the Great", "Agrippa"], ans: 2, diff: "hard" },
    { q: "Who interpreted King Nebuchadnezzar’s dream of the great statue?", opts: ["Joseph", "Isaiah", "Ezekiel", "Daniel"], ans: 3, diff: "hard" },
    { q: "What is the name of the pool where Jesus healed a paralyzed man in John 5?", opts: ["Siloam", "Bethesda", "Gihon", "Hezekiah"], ans: 1, diff: "hard" },
    { q: "In Revelation, what is the name of the star that fell to earth and poisoned the waters?", opts: ["Wormwood", "Lucifer", "Abaddon", "Leviathan"], ans: 0, diff: "hard" },
    { q: "Who was Paul’s primary companion during his first missionary journey?", opts: ["Silas", "Timothy", "Barnabas", "Luke"], ans: 2, diff: "hard" },

    // --- DIFFICULT (15 Questions) ---
    { q: "Which Old Testament prophet married a prostitute named Gomer as a symbol of God's relationship with Israel?", opts: ["Amos", "Hosea", "Micah", "Malachi"], ans: 1, diff: "difficult" },
    { q: "What was the name of the false god to whom apostate Israelites sacrificed their children in the Valley of Hinnom?", opts: ["Molech", "Dagon", "Asherah", "Baal"], ans: 0, diff: "difficult" },
    { q: "Who was the high priest during the trial and crucifixion of Jesus?", opts: ["Annas", "Caiaphas", "Gamaliel", "Alexander"], ans: 1, diff: "difficult" },
    { q: "In Daniel's vision of the four beasts, what animal represented the first beast?", opts: ["Bear", "Leopard", "Lion", "Dragon"], ans: 2, diff: "difficult" },
    { q: "Who was the false prophet hired by Balak to curse Israel, whose donkey spoke to him?", opts: ["Jannes", "Hananiah", "Elymas", "Balaam"], ans: 3, diff: "difficult" },
    { q: "In Revelation, what is the name of the 'destroyer' angel of the abyss?", opts: ["Apollyon", "Beelzebub", "Belial", "Legion"], ans: 0, diff: "difficult" },
    { q: "Which New Testament letter contains the statement: 'Faith without works is dead'?", opts: ["Romans", "Galatians", "Hebrews", "James"], ans: 3, diff: "difficult" },
    { q: "Who was the Roman centurion in Caesarea who sent for Peter and received the Holy Spirit?", opts: ["Julius", "Claudius", "Cornelius", "Augustus"], ans: 2, diff: "difficult" },
    { q: "Which Israelite king aggressively promoted the worship of Baal alongside his wife, Jezebel?", opts: ["Jeroboam", "Ahab", "Manasseh", "Omri"], ans: 1, diff: "difficult" },
    { q: "Who was the sorcerer in Paphos who tried to buy the power of the Holy Spirit with money?", opts: ["Elymas", "Simon the Sorcerer", "Jannes", "Jambres"], ans: 1, diff: "difficult" },
    { q: "What is the name of the place where Jesus was crucified, meaning 'Place of a Skull'?", opts: ["Gethsemane", "Golgotha", "Moriah", "Zion"], ans: 1, diff: "difficult" },
    { q: "Who was the brother of Moses and the first High Priest of Israel?", opts: ["Hur", "Eleazar", "Phinehas", "Aaron"], ans: 3, diff: "difficult" },
    { q: "In the Parable of the Sower, what does the seed represent?", opts: ["Money", "The Word of God", "Good Deeds", "Love"], ans: 1, diff: "difficult" },
    { q: "Which prophet confronted King David about his sin with Bathsheba?", opts: ["Samuel", "Nathan", "Gad", "Ahijah"], ans: 1, diff: "difficult" },
    { q: "What was the name of the city that God destroyed with fire and brimstone alongside Gomorrah?", opts: ["Nineveh", "Jericho", "Sodom", "Tyre"], ans: 2, diff: "difficult" },

    // --- EXTREME (15 Questions) ---
    { q: "What was the name of Moses' Midianite wife?", opts: ["Miriam", "Zipporah", "Keturah", "Hagar"], ans: 1, diff: "extreme" },
    { q: "Which King of Judah was stricken with leprosy after attempting to burn incense in the temple?", opts: ["Hezekiah", "Josiah", "Uzziah", "Ahaz"], ans: 2, diff: "extreme" },
    { q: "In Ezekiel’s vision of the chariot of God, the four living creatures had four faces: a man, a lion, an eagle, and a...", opts: ["Bear", "Ox", "Ram", "Serpent"], ans: 1, diff: "extreme" },
    { q: "Which Old Testament book does not mention the name of God explicitly?", opts: ["Song of Solomon", "Lamentations", "Ruth", "Esther"], ans: 3, diff: "extreme" },
    { q: "What was the specific name of the valley where David defeated Goliath?", opts: ["Valley of Elah", "Valley of Achor", "Valley of Jezreel", "Valley of Hinnom"], ans: 0, diff: "extreme" },
    { q: "Who was the left-handed judge who killed Eglon, the fat king of Moab?", opts: ["Shamgar", "Gideon", "Othniel", "Ehud"], ans: 3, diff: "extreme" },
    { q: "In Revelation, what color is the horse ridden by the rider named Death?", opts: ["Black", "Pale (Ashen)", "Red", "White"], ans: 1, diff: "extreme" },
    { q: "According to Levitical law, on the Day of Atonement, the high priest cast lots over two goats. One was sacrificed; what was the other called?", opts: ["The Passover Lamb", "The Scapegoat", "The Free Offering", "The Firstfruit"], ans: 1, diff: "extreme" },
    { q: "Who was the silversmith in Ephesus who was struck blind by Paul?", opts: ["Demetrius", "Elymas (Bar-Jesus)", "Alexander", "Sceva"], ans: 1, diff: "extreme" },
    { q: "What was the name of the false goddess often worshipped alongside Baal in the Old Testament, represented by wooden poles?", opts: ["Astarte", "Asherah", "Ishtar", "Diana"], ans: 1, diff: "extreme" },
    { q: "Who was the Jewish leader that led the rebuilding of the walls of Jerusalem after the Babylonian exile?", opts: ["Ezra", "Zerubbabel", "Nehemiah", "Haggai"], ans: 2, diff: "extreme" },
    { q: "In Paul's letters, who abandoned him 'because he loved this present world'?", opts: ["Titus", "Demas", "Crescens", "Alexander"], ans: 1, diff: "extreme" },
    { q: "Which prophet was commanded to eat food cooked over cow dung as a sign to Israel?", opts: ["Jeremiah", "Isaiah", "Amos", "Ezekiel"], ans: 3, diff: "extreme" },
    { q: "Who was the king of Babylon who went insane and lived like a wild animal for seven years?", opts: ["Belshazzar", "Darius", "Cyrus", "Nebuchadnezzar"], ans: 3, diff: "extreme" },
    { q: "What was the name of Abraham’s father?", opts: ["Nahor", "Haran", "Terah", "Lot"], ans: 2, diff: "extreme" },

    // --- INSANE (15 Questions) ---
    { q: "What were the exact dimensions (in cubits) of the Ark of the Covenant?", opts: ["3 x 1.5 x 1.5", "2.5 x 1.5 x 1.5", "4 x 2 x 2", "5 x 3 x 3"], ans: 1, diff: "insane" },
    { q: "Who was the judge of Israel who killed 600 Philistines with an oxgoad?", opts: ["Ibzan", "Jair", "Shamgar", "Elon"], ans: 2, diff: "insane" },
    { q: "In Genesis, who was the grandfather of Nimrod?", opts: ["Ham", "Cush", "Shem", "Japheth"], ans: 0, diff: "insane" },
    { q: "What was the name of the Egyptian sun god whose worship was humiliated by the plague of darkness?", opts: ["Osiris", "Horus", "Anubis", "Ra (Amon-Ra)"], ans: 3, diff: "insane" },
    { q: "In Revelation 9, how long are the demonic 'locusts' allowed to torment mankind?", opts: ["3 months", "5 months", "7 months", "12 months"], ans: 1, diff: "insane" },
    { q: "What was the name of the man who fell out of a third-story window while Paul was preaching?", opts: ["Eutychus", "Trophimus", "Erastus", "Philemon"], ans: 0, diff: "insane" },
    { q: "Who was the mother of King Solomon?", opts: ["Michal", "Abigail", "Bathsheba", "Ahinoam"], ans: 2, diff: "insane" },
    { q: "What is the longest single name found in the Bible (Isaiah 8:1)?", opts: ["Tilgath-pilneser", "Zaphnath-paaneah", "Maher-shalal-hash-baz", "Chushan-rishathaim"], ans: 2, diff: "insane" },
    { q: "According to Proverbs 30, who is the author of the 'sayings' in that specific chapter?", opts: ["Lemuel", "Agur", "Solomon", "Hezekiah"], ans: 1, diff: "insane" },
    { q: "What was the name of the servant whose ear Peter cut off in the Garden of Gethsemane?", opts: ["Caiaphas", "Rufus", "Malchus", "Jairus"], ans: 2, diff: "insane" },
    { q: "In 2 Kings, who drove his chariot 'like a madman'?", opts: ["Ahab", "Jehu", "Joram", "Hazael"], ans: 1, diff: "insane" },
    { q: "What was the name of the well where Isaac and Rebekah’s servant met?", opts: ["Beer-lahai-roi", "Beersheba", "Bethel", "Hebron"], ans: 0, diff: "insane" },
    { q: "Which tribe of Israel was NOT given an allotment of land in Canaan?", opts: ["Simeon", "Dan", "Levi", "Issachar"], ans: 2, diff: "insane" },
    { q: "Who was the man who stretched out his hand to steady the Ark of the Covenant and was struck dead?", opts: ["Abinadab", "Uzzah", "Ahio", "Perez"], ans: 1, diff: "insane" },
    { q: "What was the name of Moses' father?", opts: ["Amram", "Izhar", "Kohath", "Hebron"], ans: 0, diff: "insane" },

    // --- IMPOSSIBLE (15 Questions) ---
    { q: "In 2 Samuel 24, when David numbered the people, exactly how many 'valiant men that drew the sword' were in Israel (excluding Judah)?", opts: ["500,000", "800,000", "1,000,000", "1,200,000"], ans: 1, diff: "impossible" },
    { q: "In Nehemiah 3, which specific gate was repaired by Joiada the son of Paseah?", opts: ["The Sheep Gate", "The Old Gate", "The Fish Gate", "The Valley Gate"], ans: 1, diff: "impossible" },
    { q: "Who was the father of Aholiab (who helped build the Tabernacle)?", opts: ["Uri", "Hur", "Ahisamach", "Bezaleel"], ans: 2, diff: "impossible" },
    { q: "In the genealogy of Genesis 5, exactly how old was Mahalalel when he died?", opts: ["930", "962", "969", "975"], ans: 2, diff: "impossible" },
    { q: "According to Ezra 2, exactly how many men returned from Babylon who belonged to the family of Parosh?", opts: ["1,254", "2,172", "2,752", "3,112"], ans: 1, diff: "impossible" },
    { q: "What were the names of Job's three daughters born to him after his restoration?", opts: ["Jemimah, Keziah, and Keren-Happuch", "Rachel, Leah, and Dinah", "Tamar, Zilpah, and Milcah", "Zipporah, Jael, and Keturah"], ans: 0, diff: "impossible" },
    { q: "In Jeremiah 38, who was the Ethiopian eunuch who rescued Jeremiah from the muddy cistern?", opts: ["Ebed-Melech", "Gedaliah", "Pashhur", "Irijah"], ans: 0, diff: "impossible" },
    { q: "In Numbers 33, what was the exact number of the firstborn males of the Israelites counted by Moses?", opts: ["22,000", "22,273", "23,105", "25,000"], ans: 1, diff: "impossible" },
    { q: "Who was the king of Eglon killed by Joshua in Joshua 10?", opts: ["Hoham", "Piram", "Adoni-Zedek", "Debir"], ans: 3, diff: "impossible" },
    { q: "In 1 Chronicles 2, who is listed as the mother of Amasa?", opts: ["Abigail", "Zeruiah", "Ephrath", "Azubah"], ans: 1, diff: "impossible" },
    { q: "Which minor prophet specifically mentions the 'valley of Shittim'?", opts: ["Joel", "Obadiah", "Micah", "Nahum"], ans: 1, diff: "impossible" },
    { q: "What was the exact weight of Goliath's spearhead?", opts: ["300 shekels of iron", "400 shekels of iron", "500 shekels of iron", "600 shekels of iron"], ans: 3, diff: "impossible" },
    { q: "In 2 Kings 25, who was the captain of the guard who burned down the temple of Jerusalem?", opts: ["Nebuzaradan", "Rabshakeh", "Tartak", "Rabsaris"], ans: 0, diff: "impossible" },
    { q: "Who was the maternal grandfather of King Jehoiachin?", opts: ["Elnathan", "Hilkiah", "Pedaiah", "Adaiah"], ans: 0, diff: "impossible" },
    { q: "In Acts 27, what was the specific name of the Alexandrian ship that Paul sailed on toward Rome?", opts: ["It is not named", "Castor and Pollux", "The Adramyttium", "The Euroclydon"], ans: 0, diff: "impossible" }
];

let activeQuestions = [];
let currentQIndex = 0;
let quizLives = 3;
let selectedOptIndex = -1;
let quizInterval;
let quizMode = 'daily'; 
let maxQuestions = 10;

// NEW TIMER VARIABLES
let questionsCorrect = 0;
let quizStartTime = 0;
let activeTimerInterval;

function getSGMidnightTimer() {
    const now = new Date();
    const sgTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    sgTime.setUTCHours(23, 59, 59, 999);
    return sgTime.getTime() - (8 * 60 * 60 * 1000);
}

// 1. Open the Menu safely!
window.openQuizMenu = function() {
    const isGuest = !!localStorage.getItem("jct_guest_user") && !localStorage.getItem("jct_logged_in_user");
    if (isGuest) return alert("Please register an account to play the Quiz!");
    
    // Always reset the view to show the menu buttons first
    document.getElementById("quiz-menu-main").style.display = "block";
    document.getElementById("quiz-cooldown-screen").style.display = "none";
    
    openModal("quiz-menu-modal");
}

// 2. Click "Daily Quiz" from Menu
window.startDailyQuizFlow = function() {
    const todaySG = new Date(new Date().getTime() + (8 * 60 * 60 * 1000)).toISOString().substring(0, 10);

    // SAFETY FORMATTER: Extract ONLY the YYYY-MM-DD from the user's last quiz date
    let lastDate = "";
    if (window.userLastQuizDate) {
        lastDate = String(window.userLastQuizDate).substring(0, 10);
    }

    if (lastDate === todaySG) {
        // ALREADY COMPLETED TODAY: Swap view INSIDE the Menu Modal
        // DO NOT CLOSE THE MODAL!
        document.getElementById("quiz-menu-main").style.display = "none";
        document.getElementById("quiz-cooldown-screen").style.display = "flex";
        startQuizCooldown(); 
    } else {
        // NOT COMPLETED: Close Menu and open actual Quiz Modal
        closeModal("quiz-menu-modal");
        setTimeout(() => {
            quizMode = 'daily';
            startActualQuiz(); 
            openModal("quiz-modal");
        }, 400);
    }
}

// ================= RESTORED COOLDOWN TIMER FUNCTION =================
function startQuizCooldown() {
    const timerDisplay = document.getElementById("quiz-cd-timer");
    
    function updateCooldown() {
        const diff = getSGMidnightTimer() - Date.now();
        if (diff <= 0) { 
            timerDisplay.innerText = "Ready!"; 
            clearInterval(quizInterval); 
            // Auto-refresh so they can immediately play if they waited until midnight!
            setTimeout(() => location.reload(), 2000);
        } else {
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            timerDisplay.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }

    clearInterval(quizInterval);
    updateCooldown(); // Run instantly so it doesn't show 00:00:00 for a second
    quizInterval = setInterval(updateCooldown, 1000);
}

// NEW FUNCTION: Let user go back from Cooldown Screen to Menu
window.backToQuizMenu = function() {
    clearInterval(quizInterval); // Stop timer
    // Instantly swap the view back to the buttons without closing the modal
    document.getElementById("quiz-cooldown-screen").style.display = "none";
    document.getElementById("quiz-menu-main").style.display = "block";
}

// 3. Click a Difficulty from Menu
window.startDifficultyQuiz = function(difficulty) {
    closeModal("quiz-menu-modal");
    
    setTimeout(() => {
        document.getElementById("quiz-q-screen").style.display = "flex"; 
        quizMode = difficulty; 
        
        activeQuestions = QUIZ_BANK
            .filter(q => q.diff === difficulty)
            .sort(() => 0.5 - Math.random())
            .slice(0, 15);
            
        maxQuestions = activeQuestions.length; 
        openModal("quiz-modal");
        
        resetQuizState();
        loadQuestion();
    }, 400);
}

window.startActualQuiz = function() {
    document.getElementById("quiz-q-screen").style.display = "flex";
    
    const pickQuestions = (difficulty, count) => {
        return QUIZ_BANK.filter(q => q.diff === difficulty).sort(() => 0.5 - Math.random()).slice(0, count);
    };

    activeQuestions = [
        ...pickQuestions("easy", 2),
        ...pickQuestions("medium", 2),
        ...pickQuestions("hard", 2),
        ...pickQuestions("difficult", 1),
        ...pickQuestions("extreme", 1),
        ...pickQuestions("insane", 1),
        ...pickQuestions("impossible", 1)
    ];

    maxQuestions = activeQuestions.length;
    resetQuizState();
    loadQuestion();
}

function resetQuizState() {
    currentQIndex = 0;
    quizLives = 3;
    questionsCorrect = 0;
    document.getElementById("life-1").classList.remove("life-lost");
    document.getElementById("life-2").classList.remove("life-lost");
    document.getElementById("life-3").classList.remove("life-lost");
    
    // Start Timer
    quizStartTime = Date.now();
    clearInterval(activeTimerInterval);
    activeTimerInterval = setInterval(updateTimerUI, 1000);
    updateTimerUI();
}

function updateTimerUI() {
    const diff = Math.floor((Date.now() - quizStartTime) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    document.getElementById("quiz-timer-display").innerText = `${m}:${s}`;
}

function loadQuestion() {
    selectedOptIndex = -1;
    document.getElementById("quiz-submit-btn").style.display = "block";
    document.getElementById("quiz-progress").innerText = `Question ${currentQIndex + 1} / ${maxQuestions}`;
    
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
    if (document.getElementById(`opt-${idx}`).classList.contains('wrong')) return; 
    selectedOptIndex = idx;
    document.querySelectorAll('.quiz-option').forEach(el => el.classList.remove('selected'));
    document.getElementById(`opt-${idx}`).classList.add('selected');
}

window.submitQuizAnswer = function() {
    if (selectedOptIndex === -1) return alert("Please select an answer first.");
    
    const qData = activeQuestions[currentQIndex];
    const selectedBtn = document.getElementById(`opt-${selectedOptIndex}`);

    if (selectedOptIndex === qData.ans) {
        selectedBtn.classList.remove('selected');
        selectedBtn.classList.add('correct');
        document.getElementById("quiz-submit-btn").style.display = "none";
        questionsCorrect++;
        
        setTimeout(() => {
            currentQIndex++;
            if (currentQIndex >= maxQuestions) finalizeQuiz('pass');
            else loadQuestion();
        }, 2000);
    } else {
        selectedBtn.classList.remove('selected');
        selectedBtn.classList.add('wrong');
        quizLives--;
        document.getElementById(`life-${quizLives + 1}`).classList.add("life-lost");
        selectedOptIndex = -1; 
        
        if (quizLives <= 0) {
            document.getElementById("quiz-submit-btn").style.display = "none";
            const correctBtn = document.getElementById(`opt-${qData.ans}`);
            if (correctBtn) {
                correctBtn.classList.remove('selected');
                correctBtn.classList.add('correct');
            }
            setTimeout(() => finalizeQuiz('fail'), 2500);
        }
    }
}

window.resignQuiz = function() {
    if(confirm("Are you sure you want to resign? You will fail this quiz.")) {
        finalizeQuiz('fail');
    }
}

async function finalizeQuiz(status) {
    clearInterval(activeTimerInterval); // Stop timer
    document.getElementById("quiz-q-screen").style.display = "none";
    const displayUser = localStorage.getItem("jct_logged_in_user");
    
    const timeTakenSeconds = Math.floor((Date.now() - quizStartTime) / 1000);
    const m = Math.floor(timeTakenSeconds / 60);
    const s = timeTakenSeconds % 60;
    const timeString = `${m}m ${s}s`;

    if (quizMode === 'daily') {
        if (status === 'pass') alert(`🎉 Congratulations! You passed the daily quiz in ${timeString}!\n+1000 Holy Power\n+500 XP`);
        else alert(`❌ You failed today's quiz after ${timeString}. You got ${questionsCorrect} correct. Read your Bible and try again tomorrow!`);
        window.userLastQuizDate = new Date(new Date().getTime() + (8 * 60 * 60 * 1000)).toISOString().split('T')[0];
    } else {
        const diffName = quizMode.toUpperCase();
        if (status === 'pass') alert(`🎉 Great job! You conquered the ${diffName} challenge in ${timeString}!`);
        else alert(`❌ You ran out of lives on the ${diffName} challenge after ${timeString}. You got ${questionsCorrect} correct. Keep studying and try again!`);
    }

    if (!isGuest && displayUser) {
        try {
            await fetch(`${BACKEND_URL}/api/quiz/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: displayUser, 
                    status: status, 
                    mode: quizMode,
                    correct_count: questionsCorrect,
                    time_taken: timeTakenSeconds
                })
            });
        } catch (err) { console.error("Failed to save quiz stats"); }
    }

    if (quizMode === 'daily') location.reload(); 
    else closeModal("quiz-modal"); 
}

// ================= FETCH QUIZ LEADERBOARD =================
window.openQuizLeaderboard = async function(mode) {
    const displayUser = localStorage.getItem("jct_logged_in_user") || "";
    const title = mode === 'daily' ? 'Daily Quiz' : mode.charAt(0).toUpperCase() + mode.slice(1) + ' Quiz';
    document.getElementById('mode-lb-title').innerText = `${title} Leaderboard`;
    document.getElementById('my-mode-record').innerText = "Loading...";
    document.getElementById('mode-lb-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center; color:#cbb27d;">Loading Leaders...</td></tr>`;
    
    openModal('quiz-mode-leaderboard-modal');

    try {
        const res = await fetch(`${BACKEND_URL}/api/quiz/leaderboard/${mode}?currentUser=${displayUser}`);
        const data = await res.json();

        // 1. Set User Record
        if (data.userRecord) {
            const m = Math.floor(data.userRecord.time_taken / 60);
            const s = data.userRecord.time_taken % 60;
            document.getElementById('my-mode-record').innerHTML = `
                <i class="fas fa-check-circle" style="color:#52c41a;"></i> ${data.userRecord.correct_count} Correct 
                &nbsp;|&nbsp; <i class="fas fa-stopwatch" style="color:#4da6ff;"></i> ${m}m ${s}s 
                &nbsp;|&nbsp; <span class="status-${data.userRecord.status}">${data.userRecord.status.toUpperCase()}</span>
            `;
        } else {
            document.getElementById('my-mode-record').innerText = "No record found. Play a quiz!";
        }

        // 2. Populate Table
        const tbody = document.getElementById('mode-lb-tbody');
        tbody.innerHTML = "";
        
        if (data.topRecords.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No data yet. Be the first!</td></tr>`;
            return;
        }

        data.topRecords.forEach((record, index) => {
            const rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "rank-other";
            const rankIcon = index === 0 ? "🏆 1st" : index === 1 ? "🥈 2nd" : index === 2 ? "🥉 3rd" : `${index + 1}th`;
            const m = Math.floor(record.time_taken / 60).toString().padStart(2, '0');
            const s = (record.time_taken % 60).toString().padStart(2, '0');
            
            tbody.innerHTML += `
                <tr>
                    <td class="${rankClass}">${rankIcon}</td>
                    <td style="font-weight:bold;">${record.username}</td>
                    <td style="color:#52c41a; font-weight:bold;">${record.correct_count}</td>
                    <td style="color:#4da6ff;">${m}:${s}</td>
                    <td class="status-${record.status}">${record.status.toUpperCase()}</td>
                </tr>
            `;
        });
    } catch (err) {
        document.getElementById('mode-lb-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Failed to load leaderboard.</td></tr>`;
    }
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

// RENAME FUNCTION TO AVOID CONFLICT WITH PROFILE MODALS!
window.openDiscipleModal = function(card, index) {
    const modal = document.getElementById('disciple-modal');
    if (!modal) return;

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
};

window.closeDiscipleModal = function() {
    const modal = document.getElementById('disciple-modal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 400); // Matches CSS transition time
};

// Attach click events to the "More Info" buttons securely
document.querySelectorAll('.disciple-card, .tree-card').forEach((card, index) => {
    const btn = card.querySelector('.more-info-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents card hover trigger
            openDiscipleModal(card, index);
        });
    }
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