// ================= QUEST DATA =================
const questsDB = {
    daily: [], // Will be dynamically loaded from the database
    weekly: [
        { title: "Weekly Scholar", desc: "Pass 7 quizzes this week.", progress: 2, max: 7, rewardHP: 50, rewardXP: 100 },
        { title: "Sabbath Rest", desc: "Spend 2 hours active this week.", progress: 45, max: 120, rewardHP: 40, rewardXP: 80 },
        { title: "Social Butterfly", desc: "Make 3 new friends.", progress: 1, max: 3, rewardHP: 20, rewardXP: 50 },
        { title: "Knowledge Seeker", desc: "Complete a Hard Quiz.", progress: 0, max: 1, rewardHP: 30, rewardXP: 60 },
        { title: "Consecration", desc: "Earn 100 Holy Power this week.", progress: 30, max: 100, rewardHP: 50, rewardXP: 0 },
        { title: "Messenger", desc: "Send 10 chat messages.", progress: 4, max: 10, rewardHP: 15, rewardXP: 30 },
        { title: "Steadfast", desc: "Maintain a 5-day streak.", progress: 2, max: 5, rewardHP: 60, rewardXP: 120 },
        { title: "Champion of Light", desc: "Rank top 10 on Weekly Leaderboard.", progress: 0, max: 1, rewardHP: 100, rewardXP: 200 }
    ],
    monthly: [
        { title: "Monthly Devotion", desc: "Pass 30 quizzes this month.", progress: 5, max: 30, rewardHP: 150, rewardXP: 300 },
        { title: "True Believer", desc: "Maintain a 20-day streak.", progress: 2, max: 20, rewardHP: 200, rewardXP: 400 },
        { title: "Theologian", desc: "Complete 5 Hard Quizzes.", progress: 0, max: 5, rewardHP: 100, rewardXP: 250 },
        { title: "Guide Others", desc: "Have 10 friends on your friend list.", progress: 1, max: 10, rewardHP: 50, rewardXP: 100 },
        { title: "Pilgrimage", desc: "Spend 10 hours active this month.", progress: 2, max: 10, rewardHP: 200, rewardXP: 350 },
        { title: "Generosity", desc: "Update your avatar frame 3 times.", progress: 1, max: 3, rewardHP: 20, rewardXP: 50 },
        { title: "Exalted", desc: "Reach Seeker rank or higher.", progress: 0, max: 1, rewardHP: 100, rewardXP: 200 },
        { title: "Saintly Presence", desc: "Rank top 3 on Monthly Leaderboard.", progress: 0, max: 1, rewardHP: 500, rewardXP: 1000 }
    ]
};

// ================= STATE VARIABLES =================
let currentPeriod = 'daily';
let currentPage = 0;
const itemsPerPage = 3;
let currentUser = localStorage.getItem('username') || 'guest'; // Assumes you have a way to grab the user

// ================= CORE FUNCTIONS =================

window.onload = async () => {
    startQuestCountdown();
    await fetchDailyQuests();
    renderQuests();
};

// SG Countdown Timer Function
function startQuestCountdown() {
    setInterval(() => {
        const now = new Date();
        // Calculate Singapore time by forcing UTC + 8
        const sgTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (8 * 3600000));
        
        const nextMidnight = new Date(sgTime);
        nextMidnight.setHours(24, 0, 0, 0); // Next day at 00:00:00
        
        const diff = nextMidnight - sgTime;
        
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('quest-countdown').innerText = 
            `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }, 1000);
}

// Fetch dynamic daily quests from server
async function fetchDailyQuests() {
    if(currentUser === 'guest') return; 
    
    try {
        const response = await fetch(`/api/quests/daily/${currentUser}`);
        const data = await response.json();
        
        if(data && data.assigned_quests) {
            // Map the progress to the quests before inserting them into our frontend DB
            questsDB.daily = data.assigned_quests.map(quest => ({
                ...quest,
                progress: data.progress[quest.id] || 0
            }));
        }
    } catch (error) {
        console.error("Failed to load daily quests");
    }
}

window.switchMainTab = function(view) {
    document.getElementById('view-quests').style.display = view === 'quests' ? 'block' : 'none';
    document.getElementById('view-achievements').style.display = view === 'achievements' ? 'block' : 'none';
    document.getElementById('tab-quests').classList.toggle('active', view === 'quests');
    document.getElementById('tab-achievements').classList.toggle('active', view === 'achievements');
};

window.switchPeriod = function(period) {
    currentPeriod = period;
    currentPage = 0;
    document.querySelectorAll('.q-period-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`period-${period}`).classList.add('active');
    renderQuests();
};

window.changeQuestPage = function(direction) {
    const list = questsDB[currentPeriod];
    const maxPage = Math.ceil(list.length / itemsPerPage) - 1;
    currentPage += direction;
    if (currentPage < 0) currentPage = 0;
    if (currentPage > maxPage) currentPage = maxPage;
    renderQuests();
};

function generateQuestCardHTML(quest, progressPercent) {
    return `
        <div class="quest-card">
            <div class="quest-info">
                <h3>${quest.title}</h3>
                <p>${quest.desc}</p>
                <div class="q-progress-bg">
                    <div class="q-progress-fill" style="width: ${progressPercent}%;"></div>
                </div>
                <span class="q-progress-text">${quest.progress} / ${quest.max}</span>
            </div>
            <div class="quest-rewards">
                <span class="reward-holy">+${quest.rewardHP} <i class="fas fa-coins"></i></span>
                <span class="reward-xp">+${quest.rewardXP} XP</span>
            </div>
        </div>
    `;
}

function renderQuests() {
    const container = document.getElementById('quest-list-container');
    const completedContainer = document.getElementById('completed-quest-list-container');
    const paginationUI = document.getElementById('quest-pagination-ui');
    const indicator = document.getElementById('q-page-indicator');
    
    // UI Elements for Daily Splitting
    const activeTitle = document.getElementById('active-quests-title');
    const completedTitle = document.getElementById('completed-quests-title');

    container.innerHTML = "";
    completedContainer.innerHTML = "";
    
    const list = questsDB[currentPeriod];

    // ================= DAILY LOGIC =================
    if (currentPeriod === 'daily') {
        paginationUI.style.display = 'none'; // Hide pagination for daily
        activeTitle.style.display = 'block';
        completedTitle.style.display = 'block';
        
        let activeCount = 0;
        let completedCount = 0;

        list.forEach(quest => {
            const progressPercent = Math.min((quest.progress / quest.max) * 100, 100);
            const html = generateQuestCardHTML(quest, progressPercent);

            if (quest.progress >= quest.max) {
                completedContainer.innerHTML += html;
                completedCount++;
            } else {
                container.innerHTML += html;
                activeCount++;
            }
        });

        // Fallbacks if sections are empty
        if(activeCount === 0) container.innerHTML = `<p style="text-align:center; padding: 20px; color: #a67c52;">All daily quests completed! Rest well.</p>`;
        if(completedCount === 0) completedContainer.innerHTML = `<p style="text-align:center; padding: 20px; color: #7f8c8d;">No quests completed yet today.</p>`;

    } else {
        // ================= WEEKLY / MONTHLY LOGIC =================
        paginationUI.style.display = 'flex';
        activeTitle.style.display = 'none';
        completedTitle.style.display = 'none';

        const startIndex = currentPage * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedList = list.slice(startIndex, endIndex);

        const maxPage = Math.ceil(list.length / itemsPerPage);
        indicator.innerText = `Page ${currentPage + 1} of ${maxPage}`;

        paginatedList.forEach(quest => {
            const progressPercent = Math.min((quest.progress / quest.max) * 100, 100);
            container.innerHTML += generateQuestCardHTML(quest, progressPercent);
        });

        const btns = document.querySelectorAll('.q-page-btn');
        btns[0].disabled = currentPage === 0;
        btns[1].disabled = currentPage === maxPage - 1 || maxPage === 0;
    }
}